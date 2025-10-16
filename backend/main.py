"""
RainSafe Backend - Main Application (with Dependency Injection)
"""

import asyncio  # <--- NEW: Import for background tasks
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from app.utils.database import db

import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning)


import motor.motor_asyncio
from bson import ObjectId  # <--- NEW: Import for MongoDB ObjectId handling
from dotenv import load_dotenv
from fastapi import (  # <--- MODIFIED: Added BackgroundTasks and status
    BackgroundTasks,
    Depends,
    FastAPI,
    HTTPException,
    Query,
    Request,
    status,
)
from fastapi.middleware.cors import CORSMiddleware

from app.models.flood_predictor import FloodPredictor

# Import all necessary models
from app.models.schemas import (  # <--- MODIFIED: Added PredictionResult for risk_service.get_risk_prediction
    Alert,
    AssessmentSource,
    DashboardResponse,
    MapPoint,
    PredictionResult,
    Report,
    ReportCreate,
    ReportResponse,
    RiskAssessmentDetails,
    RiskLevel,
    RiskResponse,
    WaterLevel,
)

# --- Import our services and schemas ---
from app.services.risk_service import RiskAssessmentService
from app.utils.database import db
from app.utils.geocoder import reverse_geocode
from config.settings import RISK_THRESHOLDS

# Load environment variables
load_dotenv()


# --- Dependency Injection Setup ---
def get_risk_service() -> RiskAssessmentService:
    """
    Dependency provider for the RiskAssessmentService.
    FastAPI will call this function for endpoints that need the service.
    """
    return RiskAssessmentService(database=db)


# --- Lifespan function for startup and shutdown ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan for startup and shutdown events."""
    print("🚀 Starting RainSafe API...")

    if not await db.connect():
        raise RuntimeError("Failed to connect to MongoDB during startup.")

    try:
        app.state.predictor = FloodPredictor()
        print("✅ Flood predictor (ML) model loaded successfully.")
    except Exception as e:
        print(
            f"⚠️ ML predictor initialization failed: {e}. Running without ML predictions."
        )
        app.state.predictor = None

    yield

    print("🛑 Shutting down RainSafe API...")
    await db.disconnect()


# Initialize FastAPI with the lifespan manager
app = FastAPI(
    title="RainSafe API",
    version="1.2.0",
    description="A scalable and testable API for flood risk assessment.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- NEW: Helper function for generating and sending alerts ---
# PLACE THIS FUNCTION HERE, AFTER app.add_middleware AND BEFORE API ENDPOINTS
async def generate_and_send_alert_from_report(
    report_latitude: float,
    report_longitude: float,
    determined_risk_level: RiskLevel,
    report_description: str,
) -> Optional[Alert]:
    """
    Called internally when a report triggers a high enough risk to warrant an alert.
    It performs reverse geocoding and saves the alert to the database.
    """

    # 1. Reverse Geocode to get a human-readable location name
    location_name = await reverse_geocode(report_latitude, report_longitude)

    # 2. Construct the alert message based on risk and details
    message = f"Flood Warning: {report_description}. Risk Level: {determined_risk_level.value}."
    if determined_risk_level == RiskLevel.HIGH:
        message = f"Severe Flood Warning in {location_name}: {report_description}. Immediate action advised."
    elif determined_risk_level == RiskLevel.MEDIUM:
        message = f"Moderate Flood Risk in {location_name}: {report_description}. Exercise caution."

    # 3. Construct the alert dictionary directly instead of creating a Pydantic model instance first.
    #    This avoids the false positive Pylance error.
    alert_record = {
        "location_name": location_name,
        "risk_level": determined_risk_level,
        "message": message,
        "recipient": "all-subscribers-in-area",
        "source": AssessmentSource.HYBRID_HISTORICAL,
    }

    # 4. Save/Send the alert using your existing /alerts endpoint logic (or direct db call)
    try:
        alerts_collection = db.get_collection("alerts")
        # Use by_alias=True is no longer needed here as we are not dumping from a model
        alert_record["sent_at"] = datetime.now(timezone.utc)
        result = await alerts_collection.insert_one(alert_record)

        # The key in the dictionary is '_id', which matches the alias in the Pydantic model
        alert_record["_id"] = str(
            result.inserted_id
        )  # Convert ObjectId to string for response

        print(f"Alert generated and saved: {alert_record['message']}")
        # Now, create the Pydantic model for the response, which works because
        # the alert_record dictionary now contains all required fields (_id and sent_at).
        return Alert(**alert_record)
    except Exception as e:
        print(
            f"Error saving generated alert for {location_name} (Lat:{report_latitude}, Lon:{report_longitude}): {e}"
        )
        return None


# --- API Endpoints (Now using Dependency Injection) ---
@app.get("/")
def read_root():
    """Health check endpoint."""
    return {"status": "RainSafe API is running!"}


@app.post(
    "/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED
)  # <--- MODIFIED: Use status.HTTP_201_CREATED
async def create_report(
    report: ReportCreate,
    background_tasks: BackgroundTasks,  # <--- NEW: Add BackgroundTasks dependency
    risk_service: RiskAssessmentService = Depends(get_risk_service),
):
    """
    Submit a new flood report with non-blocking NLP analysis and background risk assessment.
    """
    try:
        report_data = report.model_dump(
            by_alias=True
        )  # <--- MODIFIED: Use by_alias=True
        report_data["created_at"] = datetime.now(timezone.utc)

        nlp_analysis = await risk_service.analyze_description_with_nlp(
            report.description
        )
        report_data["nlp_analysis"] = nlp_analysis

        reports_collection = db.get_collection("reports")
        new_report_result = await reports_collection.insert_one(report_data)

        created_report_doc = await reports_collection.find_one(
            {"_id": new_report_result.inserted_id}
        )
        if not created_report_doc:
            raise HTTPException(
                status_code=500, detail="Failed to retrieve newly created report."
            )

        created_report_doc["_id"] = str(created_report_doc["_id"])

        # --- NEW: Asynchronously assess risk and generate alert if necessary ---
        async def _assess_and_alert_task(
            lat: float,
            lon: float,
            description: str,
            predictor_state: Optional[FloodPredictor],
        ):
            """Internal task to assess risk and trigger alerts."""
            try:
                # Need a new instance for background task if it's not a global singleton
                # or ensure get_risk_service is dependency injected into the task correctly.
                # For simplicity, we'll instantiate it directly here.
                local_risk_service = RiskAssessmentService(database=db)

                prediction_result = await local_risk_service.get_risk_prediction(
                    lat=lat,
                    lon=lon,
                    predictor=predictor_state,  # Pass the predictor from app.state
                )
                final_risk = prediction_result.final_risk

                if final_risk in [RiskLevel.MEDIUM, RiskLevel.HIGH]:
                    await generate_and_send_alert_from_report(
                        report_latitude=lat,
                        report_longitude=lon,
                        determined_risk_level=final_risk,
                        report_description=description,
                    )
            except Exception as e:
                print(
                    f"Background task for risk assessment and alert generation failed for ({lat}, {lon}): {e}"
                )

        background_tasks.add_task(
            _assess_and_alert_task,
            lat=report.latitude,
            lon=report.longitude,
            description=report.description,
            predictor_state=app.state.predictor,  # Pass the predictor from app.state
        )

        return ReportResponse(
            message="Report received and analyzed successfully!",
            data=Report(**created_report_doc),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating report: {str(e)}")


@app.get("/risk", response_model=RiskResponse)
async def get_risk(
    lat: float,
    lon: float,
    request: Request,
    risk_service: RiskAssessmentService = Depends(get_risk_service),
):
    """Get a user-friendly, hybrid flood risk assessment for a location."""
    predictor = request.app.state.predictor
    # 🔹 Debug: Check if the ML model is ready
    if predictor is None:
        print("⚠️ Predictor not initialized in app.state")
    elif not predictor.is_ready:
        print("⚠️ Predictor loaded but ML artifacts are missing or failed to load")
    else:
        print("✅ Predictor is ready for ML predictions!")
    try:
        # <--- MODIFIED: Call the unified get_risk_prediction from risk_service ---
        prediction_result = await risk_service.get_risk_prediction(
            lat=lat,
            lon=lon,
            predictor=request.app.state.predictor,  # Pass the predictor from app.state
        )

        return RiskResponse(
            risk_level=prediction_result.final_risk,
            source=prediction_result.source,
            details=RiskAssessmentDetails(
                threshold_assessment=prediction_result.threshold_assessment,
                ml_assessment=prediction_result.ml_assessment,
                user_reports_found=prediction_result.user_reports_found,
                weather_data_found=prediction_result.weather_data_found,
                contributing_factors=prediction_result.contributing_factors,
                recommendation=prediction_result.recommendation,
                error=prediction_result.error,
            ),
        )
    except Exception as e:
        # Simplified error response
        return RiskResponse(
            risk_level=RiskLevel.UNKNOWN,
            source=AssessmentSource.ERROR,
            details=RiskAssessmentDetails(
                threshold_assessment=RiskLevel.UNKNOWN,
                ml_assessment=RiskLevel.UNKNOWN,
                user_reports_found=0,
                weather_data_found=False,
                contributing_factors=["An unexpected error occurred"],
                recommendation="Please try again later.",
                error=f"Error getting risk assessment: {str(e)}",
            ),
        )


@app.get("/dashboard-data", response_model=DashboardResponse)
async def get_dashboard_data(
    risk_service: RiskAssessmentService = Depends(get_risk_service),
    start_time: Optional[datetime] = Query(
        None, description="Start date/time for filtering reports (ISO format)"
    ),
    end_time: Optional[datetime] = Query(
        None, description="End date/time for filtering reports (ISO format)"
    ),
):
    """Get dashboard data for frontend."""
    try:
        reports_collection = db.get_collection("reports")

        query = {}
        if not start_time and not end_time:
            start_time = datetime.now(timezone.utc) - timedelta(hours=48)
            end_time = datetime.now(timezone.utc)
        elif not end_time:
            end_time = datetime.now(timezone.utc)
        elif not start_time:
            start_time = end_time - timedelta(hours=48)

        if start_time:
            query["created_at"] = {"$gte": start_time}
        if end_time:
            if "created_at" in query:
                query["created_at"]["$lte"] = end_time
            else:
                query["created_at"] = {"$lte": end_time}

        recent_reports_docs = (
            await reports_collection.find(query)
            .sort("created_at", -1)
            .limit(50)
            .to_list(length=50)
        )

        map_points: List[MapPoint] = []
        for report_doc in recent_reports_docs:
            report_id = str(report_doc.get("_id"))

            water_level_str = report_doc.get("water_level")
            report_risk_level = RiskLevel.LOW
            if water_level_str:
                try:
                    water_level_enum = WaterLevel(water_level_str)
                    if water_level_enum in [
                        WaterLevel.KNEE_DEEP,
                        WaterLevel.WAIST_DEEP,
                        WaterLevel.CHEST_DEEP,
                        WaterLevel.ABOVE_HEAD,
                    ]:
                        report_risk_level = RiskLevel.HIGH
                    elif water_level_enum == WaterLevel.ANKLE_DEEP:
                        report_risk_level = RiskLevel.MEDIUM
                except ValueError:
                    print(
                        f"Warning: Unknown water_level '{water_level_str}' in report {report_id}"
                    )

            map_points.append(
                MapPoint(
                    id=report_id,
                    latitude=report_doc["latitude"],
                    longitude=report_doc["longitude"],
                    risk_level=report_risk_level,
                    source=AssessmentSource.USER_REPORT,
                    details=report_doc["description"],
                )
            )

        return DashboardResponse(map_points=map_points, charts_data={})

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve dashboard data: {str(e)}"
        )


@app.post("/alerts", response_model=Alert, status_code=status.HTTP_201_CREATED)
async def send_alert(alert_data: Alert):
    """Manually send and log a new flood alert."""
    try:
        alert_record = alert_data.model_dump(by_alias=True)
        alert_record["sent_at"] = datetime.now(timezone.utc)

        # --- THE FIX IS HERE ---
        # Remove the '_id' field if it's None. This lets MongoDB generate a new, unique ID.
        if alert_record.get("_id") is None:
            alert_record.pop("_id", None)

        alerts_collection = db.get_collection("alerts")
        result = await alerts_collection.insert_one(alert_record)

        # Fetch the newly created document to get all its fields, including the new ID
        new_alert = await alerts_collection.find_one({"_id": result.inserted_id})
        if not new_alert:
            raise HTTPException(
                status_code=500, detail="Failed to retrieve newly created alert."
            )
        new_alert["_id"] = str(new_alert["_id"])

        return Alert(**new_alert)

    except Exception as e:
        # Catch the specific duplicate key error as well if needed, but this is a general catch
        raise HTTPException(
            status_code=500, detail=f"Failed to send/log alert: {str(e)}"
        )
