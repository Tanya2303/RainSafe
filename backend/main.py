"""
RainSafe Backend - Main Application (with Dependency Injection)
"""
import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from app.utils.database import db

import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

import motor.motor_asyncio
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    HTTPException,
    Query,
    Request,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.models.flood_predictor import FloodPredictor

# Import all necessary models
from app.models.schemas import (
    Alert,
    AssessmentSource,
    # DashboardResponse is redefined below to include stats
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
from app.utils.geocoder import reverse_geocode
from config.settings import RISK_THRESHOLDS

# Load environment variables
load_dotenv()

# --- Redefine Dashboard Models to match the latest version ---
# These models should ideally be in app/models/schemas.py
class DashboardStats(BaseModel):
    total_reports: int
    high_risk_count: int
    medium_risk_count: int

class DashboardResponse(BaseModel):
    map_points: List[MapPoint]
    stats: DashboardStats


# --- Dependency Injection Setup ---
def get_risk_service() -> RiskAssessmentService:
    """
    Dependency provider for the RiskAssessmentService.
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
    except Exception as e:
        print(f"⚠️ ML predictor initialization failed: {e}. Running without ML predictions.")
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


async def generate_and_send_alert_from_report(
    report_latitude: float,
    report_longitude: float,
    determined_risk_level: RiskLevel,
    report_description: str,
) -> Optional[Alert]:
    """
    Called internally when a report triggers a high enough risk to warrant an alert.
    """
    location_name = await reverse_geocode(report_latitude, report_longitude)

    message = f"Flood Warning: {report_description}. Risk Level: {determined_risk_level.value}."
    if determined_risk_level == RiskLevel.HIGH:
        message = f"Severe Flood Warning in {location_name}: {report_description}. Immediate action advised."
    elif determined_risk_level == RiskLevel.MEDIUM:
        message = f"Moderate Flood Risk in {location_name}: {report_description}. Exercise caution."

    alert_record = {
        "location_name": location_name,
        "risk_level": determined_risk_level,
        "message": message,
        "recipient": "all-subscribers-in-area",
        "source": AssessmentSource.HYBRID_HISTORICAL,
    }

    try:
        alerts_collection = db.get_collection("alerts")
        alert_record["sent_at"] = datetime.now(timezone.utc)
        result = await alerts_collection.insert_one(alert_record)
        alert_record["_id"] = str(result.inserted_id)
        print(f"Alert generated and saved: {alert_record['message']}")
        return Alert(**alert_record)
    except Exception as e:
        print(f"Error saving generated alert: {e}")
        return None

# --- API Endpoints ---
@app.get("/")
def read_root():
    """Health check endpoint."""
    return {"status": "RainSafe API is running!"}


@app.post("/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report: ReportCreate,
    background_tasks: BackgroundTasks,
    risk_service: RiskAssessmentService = Depends(get_risk_service),
):
    """Submit a new flood report with background risk assessment."""
    try:
        report_data = report.model_dump(by_alias=True)
        report_data["created_at"] = datetime.now(timezone.utc)
        nlp_analysis = await risk_service.analyze_description_with_nlp(report.description)
        report_data["nlp_analysis"] = nlp_analysis
        reports_collection = db.get_collection("reports")
        new_report_result = await reports_collection.insert_one(report_data)
        created_report_doc = await reports_collection.find_one({"_id": new_report_result.inserted_id})
        if not created_report_doc:
            raise HTTPException(status_code=500, detail="Failed to retrieve report.")
        created_report_doc["_id"] = str(created_report_doc["_id"])

        background_tasks.add_task(
            _assess_and_alert_task,
            lat=report.latitude, lon=report.longitude,
            description=report.description, predictor_state=app.state.predictor,
        )
        return ReportResponse(message="Report received and analyzed successfully!", data=Report(**created_report_doc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating report: {str(e)}")


async def _assess_and_alert_task(
    lat: float, lon: float, description: str, predictor_state: Optional[FloodPredictor]
):
    """Internal background task to assess risk and trigger alerts."""
    try:
        local_risk_service = RiskAssessmentService(database=db)
        prediction_result = await local_risk_service.get_risk_prediction(lat=lat, lon=lon, predictor=predictor_state)
        if prediction_result.final_risk in [RiskLevel.MEDIUM, RiskLevel.HIGH]:
            await generate_and_send_alert_from_report(
                report_latitude=lat, report_longitude=lon,
                determined_risk_level=prediction_result.final_risk,
                report_description=description,
            )
    except Exception as e:
        print(f"Background risk assessment task failed: {e}")


@app.get("/risk", response_model=RiskResponse)
async def get_risk(
    lat: float, lon: float, request: Request,
    risk_service: RiskAssessmentService = Depends(get_risk_service),
):
    """Get a hybrid flood risk assessment for a location."""
    try:
        prediction_result = await risk_service.get_risk_prediction(
            lat=lat, lon=lon, predictor=request.app.state.predictor
        )
        return RiskResponse(
            risk_level=prediction_result.final_risk,
            source=prediction_result.source,
            details=RiskAssessmentDetails(**prediction_result.model_dump()),
        )
    except Exception as e:
        return RiskResponse(
            risk_level=RiskLevel.UNKNOWN, source=AssessmentSource.ERROR,
            details=RiskAssessmentDetails(
                threshold_assessment=RiskLevel.UNKNOWN, ml_assessment=RiskLevel.UNKNOWN,
                user_reports_found=0, weather_data_found=False,
                contributing_factors=["An unexpected error occurred"],
                recommendation="Please try again later.", error=f"Error: {str(e)}",
            ),
        )


@app.get("/dashboard-data", response_model=DashboardResponse)
async def get_dashboard_data(
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
):
    """Get aggregated data for the frontend dashboard."""
    try:
        reports_collection = db.get_collection("reports")
        query = {}
        # Default to the last 48 hours if no time range is specified
        effective_start_time = start_time or (datetime.now(timezone.utc) - timedelta(hours=48))
        query["created_at"] = {"$gte": effective_start_time}
        if end_time:
            query["created_at"]["$lte"] = end_time

        recent_reports = await reports_collection.find(query).sort("created_at", -1).limit(100).to_list(length=100)

        map_points: List[MapPoint] = []
        high_risk_count = 0
        medium_risk_count = 0

        for report_doc in recent_reports:
            water_level = report_doc.get("water_level")
            report_risk = RiskLevel.LOW
            if water_level in [WaterLevel.KNEE_DEEP, WaterLevel.WAIST_DEEP, WaterLevel.CHEST_DEEP, WaterLevel.ABOVE_HEAD]:
                report_risk = RiskLevel.HIGH
                high_risk_count += 1
            elif water_level == WaterLevel.ANKLE_DEEP:
                report_risk = RiskLevel.MEDIUM
                medium_risk_count += 1
            
            map_points.append(MapPoint(
                id=str(report_doc["_id"]), latitude=report_doc["latitude"], longitude=report_doc["longitude"],
                risk_level=report_risk, source=AssessmentSource.USER_REPORT, details=report_doc["description"],
            ))
            
        stats = DashboardStats(
            total_reports=len(recent_reports),
            high_risk_count=high_risk_count,
            medium_risk_count=medium_risk_count
        )
        return DashboardResponse(map_points=map_points, stats=stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")


@app.post("/alerts", response_model=Alert, status_code=status.HTTP_201_CREATED)
async def send_alert(alert_data: Alert):
    """Manually send and log a new flood alert."""
    try:
        alert_record = alert_data.model_dump(by_alias=True)
        alert_record["sent_at"] = datetime.now(timezone.utc)
        if alert_record.get("_id") is None:
            alert_record.pop("_id", None)

        alerts_collection = db.get_collection("alerts")
        result = await alerts_collection.insert_one(alert_record)
        new_alert = await alerts_collection.find_one({"_id": result.inserted_id})
        if not new_alert:
            raise HTTPException(status_code=500, detail="Failed to retrieve new alert.")
        new_alert["_id"] = str(new_alert["_id"])
        return Alert(**new_alert)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send/log alert: {str(e)}")


@app.get("/alerts", response_model=List[Alert])
async def get_alerts():
    """Retrieve the most recent system alerts."""
    try:
        alerts_collection = db.get_collection("alerts")
        alerts_cursor = alerts_collection.find().sort("sent_at", -1).limit(50)
        alerts = await alerts_cursor.to_list(length=50)
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve alerts: {str(e)}")

