# """
# RainSafe Backend - Main Application (Refactored & Fixed)
# """

# import asyncio
# import logging
# from contextlib import asynccontextmanager
# from datetime import datetime, timedelta, timezone
# from typing import List, Optional

# import motor.motor_asyncio
# from dotenv import load_dotenv
# from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request, status
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel

# from app.models.flood_predictor import FloodPredictor
# from app.models.schemas import (
#     Alert,
#     AssessmentSource,
#     MapPoint,
#     PredictionResult,
#     Report,
#     ReportCreate,
#     ReportResponse,
#     RiskAssessmentDetails,
#     RiskLevel,
#     RiskResponse,
#     WaterLevel,
# )
# from app.services.risk_service import RiskAssessmentService
# from app.utils.database import db
# from app.utils.geocoder import reverse_geocode
# from config.settings import RISK_THRESHOLDS, OPENWEATHER_API_KEY

# predictor = FloodPredictor()

# # --- Logging ---
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger("RainSafe")

# # Load env
# load_dotenv()

# # --- Dashboard Models ---
# class DashboardStats(BaseModel):
#     total_reports: int
#     high_risk_count: int
#     medium_risk_count: int


# class DashboardResponse(BaseModel):
#     map_points: List[MapPoint]
#     stats: DashboardStats


# # --- Dependency Injection ---
# def get_risk_service(predictor: Optional[FloodPredictor] = None) -> RiskAssessmentService:
#     return RiskAssessmentService(database=db, predictor=predictor)


# # --- Lifespan ---
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     logger.info("🚀 Starting RainSafe API...")
#     if not await db.connect():
#         raise RuntimeError("Failed to connect to MongoDB during startup.")

#     try:
#         app.state.predictor = FloodPredictor()
#         logger.info("✅ ML predictor initialized.")
#     except Exception as e:
#         logger.warning(f"⚠️ ML predictor failed to initialize: {e}")
#         app.state.predictor = None

#     yield
#     logger.info("🛑 Shutting down RainSafe API...")
#     await db.disconnect()


# # --- FastAPI app ---
# app = FastAPI(
#     title="RainSafe API",
#     version="1.2.0",
#     description="A scalable and testable API for flood risk assessment.",
#     lifespan=lifespan,
# )

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# # --- Helper: generate alert ---
# async def generate_alert(lat: float, lon: float, risk_level: RiskLevel, description: str) -> Optional[Alert]:
#     location_name = await reverse_geocode(lat, lon)

#     if risk_level == RiskLevel.HIGH:
#         message = f"Severe Flood Warning in {location_name}: {description}. Immediate action advised."
#     elif risk_level == RiskLevel.MEDIUM:
#         message = f"Moderate Flood Risk in {location_name}: {description}. Exercise caution."
#     else:
#         message = f"Flood Warning: {description}. Risk Level: {risk_level.value}."

#     alert_record = {
#         "location_name": location_name,
#         "risk_level": risk_level,
#         "message": message,
#         "recipient": "all-subscribers-in-area",
#         "source": AssessmentSource.HYBRID_HISTORICAL,
#         "sent_at": datetime.now(timezone.utc),
#     }

#     try:
#         collection = db.get_collection("alerts")
#         result = await collection.insert_one(alert_record)
#         alert_record["_id"] = str(result.inserted_id)
#         logger.info(f"✅ Alert generated: {message}")
#         return Alert(**alert_record)
#     except Exception as e:
#         logger.error(f"❌ Error saving alert: {e}")
#         return None


# # --- Background task ---
# async def assess_and_alert_task(
#     lat: float, lon: float, description: str, predictor: Optional[FloodPredictor] = None
# ):
#     risk_service = RiskAssessmentService(database=db, predictor=predictor)
#     try:
#         prediction = await risk_service.get_risk_prediction(lat=lat, lon=lon)
#         if prediction.final_risk in [RiskLevel.MEDIUM, RiskLevel.HIGH]:
#             await generate_alert(lat, lon, prediction.final_risk, description)
#     except Exception as e:
#         logger.error(f"❌ Background risk assessment failed: {e}")


# # --- API Endpoints ---
# @app.get("/")
# def read_root():
#     return {"status": "RainSafe API is running!"}


# @app.post("/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
# async def create_report(report: ReportCreate, background_tasks: BackgroundTasks, request: Request):
#     try:
#         report_data = report.model_dump(by_alias=True)
#         report_data["created_at"] = datetime.now(timezone.utc)

#         reports_collection = db.get_collection("reports")
#         result = await reports_collection.insert_one(report_data)
#         created_doc = await reports_collection.find_one({"_id": result.inserted_id})
#         created_doc["_id"] = str(created_doc["_id"])

#         # Background task
#         background_tasks.add_task(
#             assess_and_alert_task,
#             lat=report.latitude,
#             lon=report.longitude,
#             description=report.description,
#             predictor=request.app.state.predictor
#         )

#         return ReportResponse(message="Report received and analyzed successfully!", data=Report(**created_doc))
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error creating report: {e}")


# @app.get("/risk", response_model=RiskResponse)
# async def get_risk(lat: float, lon: float, request: Request):
#     try:
#         risk_service = RiskAssessmentService(database=db, predictor=request.app.state.predictor)
#         prediction = await risk_service.get_risk_prediction(lat=lat, lon=lon)
#         return RiskResponse(
#             risk_level=prediction.final_risk,
#             source=prediction.source,
#             details=RiskAssessmentDetails(**prediction.model_dump()),
#         )
#     except Exception as e:
#         return RiskResponse(
#             risk_level=RiskLevel.UNKNOWN,
#             source=AssessmentSource.ERROR,
#             details=RiskAssessmentDetails(
#                 threshold_assessment=RiskLevel.UNKNOWN,
#                 ml_assessment=RiskLevel.UNKNOWN,
#                 user_reports_found=0,
#                 weather_data_found=False,
#                 contributing_factors=["Unexpected error occurred"],
#                 recommendation="Please try again later.",
#                 error=str(e),
#             ),
#         )


# @app.get("/dashboard-data", response_model=DashboardResponse)
# async def get_dashboard_data(start_time: Optional[datetime] = Query(None), end_time: Optional[datetime] = Query(None)):
#     try:
#         collection = db.get_collection("reports")
#         query = {}
#         effective_start = start_time or (datetime.now(timezone.utc) - timedelta(hours=48))
#         query["created_at"] = {"$gte": effective_start}
#         if end_time:
#             query["created_at"]["$lte"] = end_time

#         recent_reports = await collection.find(query).sort("created_at", -1).limit(100).to_list(length=100)

#         map_points, high_risk, medium_risk = [], 0, 0
#         for doc in recent_reports:
#             water_level = doc.get("water_level")
#             risk = RiskLevel.LOW
#             if water_level in [WaterLevel.KNEE_DEEP, WaterLevel.WAIST_DEEP, WaterLevel.CHEST_DEEP, WaterLevel.ABOVE_HEAD]:
#                 risk = RiskLevel.HIGH
#                 high_risk += 1
#             elif water_level == WaterLevel.ANKLE_DEEP:
#                 risk = RiskLevel.MEDIUM
#                 medium_risk += 1

#             map_points.append(MapPoint(
#                 id=str(doc["_id"]),
#                 latitude=doc["latitude"],
#                 longitude=doc["longitude"],
#                 risk_level=risk,
#                 source=AssessmentSource.USER_REPORT,
#                 details=doc["description"]
#             ))

#         stats = DashboardStats(total_reports=len(recent_reports), high_risk_count=high_risk, medium_risk_count=medium_risk)
#         return DashboardResponse(map_points=map_points, stats=stats)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {e}")


# @app.post("/alerts", response_model=List[Alert], status_code=status.HTTP_201_CREATED)
# async def alerts_endpoint(new_alert: Optional[Alert] = None):
#     collection = db.get_collection("alerts")
#     if collection is None:
#         raise HTTPException(status_code=500, detail="Alerts collection not initialized")

#     try:
#         if new_alert:
#             alert_record = new_alert.model_dump(by_alias=True)
#             alert_record.pop("_id", None)
#             alert_record["sent_at"] = datetime.now(timezone.utc)
#             result = await collection.insert_one(alert_record)
#             inserted = await collection.find_one({"_id": result.inserted_id})
#             inserted["_id"] = str(inserted["_id"])
#             logger.info(f"✅ Alert inserted: {inserted['message']}")

#         alerts = await collection.find().sort("sent_at", -1).limit(50).to_list(length=50)
#         for alert in alerts:
#             alert["_id"] = str(alert["_id"])
#         return alerts
#     except Exception as e:
#         logger.error(f"❌ Error in /alerts endpoint: {e}")
#         raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")


"""
RainSafe Backend - Main Application (Refactored & Fixed)
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import motor.motor_asyncio
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.models.flood_predictor import FloodPredictor
from app.models.schemas import (
    Alert,
    AssessmentSource,
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
from app.services.risk_service import RiskAssessmentService
from app.utils.database import db
from app.utils.geocoder import reverse_geocode
from config.settings import RISK_THRESHOLDS, OPENWEATHER_API_KEY

predictor = FloodPredictor()

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RainSafe")

# Load env
load_dotenv()

# --- Dashboard Models ---
class DashboardStats(BaseModel):
    total_reports: int
    high_risk_count: int
    medium_risk_count: int


class DashboardResponse(BaseModel):
    map_points: List[MapPoint]
    stats: DashboardStats


# --- Dependency Injection ---
def get_risk_service(predictor: Optional[FloodPredictor] = None) -> RiskAssessmentService:
    return RiskAssessmentService(database=db, predictor=predictor)


# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting RainSafe API...")
    if not await db.connect():
        raise RuntimeError("Failed to connect to MongoDB during startup.")

    try:
        app.state.predictor = FloodPredictor()
        logger.info("✅ ML predictor initialized.")
    except Exception as e:
        logger.warning(f"⚠️ ML predictor failed to initialize: {e}")
        app.state.predictor = None

    yield
    logger.info("🛑 Shutting down RainSafe API...")
    await db.disconnect()


# --- FastAPI app ---
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


# --- Helper: generate alert ---
async def generate_alert(lat: float, lon: float, risk_level: RiskLevel, description: str) -> Optional[Alert]:
    location_name = await reverse_geocode(lat, lon)

    if risk_level == RiskLevel.HIGH:
        message = f"Severe Flood Warning in {location_name}: {description}. Immediate action advised."
    elif risk_level == RiskLevel.MEDIUM:
        message = f"Moderate Flood Risk in {location_name}: {description}. Exercise caution."
    else:
        message = f"Flood Warning: {description}. Risk Level: {risk_level.value}."

    alert_record = {
        "location_name": location_name,
        "risk_level": risk_level,
        "message": message,
        "recipient": "all-subscribers-in-area",
        "source": AssessmentSource.HYBRID_HISTORICAL,
        "sent_at": datetime.now(timezone.utc),
    }

    try:
        collection = db.get_collection("alerts")
        result = await collection.insert_one(alert_record)
        alert_record["_id"] = str(result.inserted_id)
        logger.info(f"✅ Alert generated: {message}")
        return Alert(**alert_record)
    except Exception as e:
        logger.error(f"❌ Error saving alert: {e}")
        return None


# --- Background task ---
async def assess_and_alert_task(
    lat: float, lon: float, description: str, predictor: Optional[FloodPredictor] = None
):
    risk_service = RiskAssessmentService(database=db, predictor=predictor)
    try:
        prediction = await risk_service.get_risk_prediction(lat=lat, lon=lon)
        if prediction.final_risk in [RiskLevel.MEDIUM, RiskLevel.HIGH]:
            await generate_alert(lat, lon, prediction.final_risk, description)
    except Exception as e:
        logger.error(f"❌ Background risk assessment failed: {e}")


# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"status": "RainSafe API is running!"}


@app.post("/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(report: ReportCreate, background_tasks: BackgroundTasks, request: Request):
    try:
        report_data = report.model_dump(by_alias=True)
        report_data["created_at"] = datetime.now(timezone.utc)

        reports_collection = db.get_collection("reports")
        result = await reports_collection.insert_one(report_data)
        created_doc = await reports_collection.find_one({"_id": result.inserted_id})
        created_doc["_id"] = str(created_doc["_id"])

        # Background task
        background_tasks.add_task(
            assess_and_alert_task,
            lat=report.latitude,
            lon=report.longitude,
            description=report.description,
            predictor=request.app.state.predictor
        )

        return ReportResponse(message="Report received and analyzed successfully!", data=Report(**created_doc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating report: {e}")


@app.get("/risk", response_model=RiskResponse)
async def get_risk(lat: float, lon: float, request: Request):
    try:
        risk_service = RiskAssessmentService(database=db, predictor=request.app.state.predictor)
        prediction = await risk_service.get_risk_prediction(lat=lat, lon=lon)
        return RiskResponse(
            risk_level=prediction.final_risk,
            source=prediction.source,
            details=RiskAssessmentDetails(**prediction.model_dump()),
        )
    except Exception as e:
        return RiskResponse(
            risk_level=RiskLevel.UNKNOWN,
            source=AssessmentSource.ERROR,
            details=RiskAssessmentDetails(
                threshold_assessment=RiskLevel.UNKNOWN,
                ml_assessment=RiskLevel.UNKNOWN,
                user_reports_found=0,
                weather_data_found=False,
                contributing_factors=["Unexpected error occurred"],
                recommendation="Please try again later.",
                error=str(e),
            ),
        )


@app.get("/dashboard-data", response_model=DashboardResponse)
async def get_dashboard_data(start_time: Optional[datetime] = Query(None), end_time: Optional[datetime] = Query(None)):
    try:
        collection = db.get_collection("reports")
        query = {}
        effective_start = start_time or (datetime.now(timezone.utc) - timedelta(hours=48))
        query["created_at"] = {"$gte": effective_start}
        if end_time:
            query["created_at"]["$lte"] = end_time

        recent_reports = await collection.find(query).sort("created_at", -1).limit(100).to_list(length=100)

        map_points, high_risk, medium_risk = [], 0, 0
        for doc in recent_reports:
            water_level = doc.get("water_level")
            risk = RiskLevel.LOW
            if water_level in [WaterLevel.KNEE_DEEP, WaterLevel.WAIST_DEEP, WaterLevel.CHEST_DEEP, WaterLevel.ABOVE_HEAD]:
                risk = RiskLevel.HIGH
                high_risk += 1
            elif water_level == WaterLevel.ANKLE_DEEP:
                risk = RiskLevel.MEDIUM
                medium_risk += 1

            map_points.append(MapPoint(
                id=str(doc["_id"]),
                latitude=doc["latitude"],
                longitude=doc["longitude"],
                risk_level=risk,
                source=AssessmentSource.USER_REPORT,
                details=doc["description"]
            ))

        stats = DashboardStats(total_reports=len(recent_reports), high_risk_count=high_risk, medium_risk_count=medium_risk)
        return DashboardResponse(map_points=map_points, stats=stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {e}")


# --- CORRECTED ALERT ENDPOINTS ---

@app.get("/alerts/recent", response_model=List[Alert])
async def get_recent_alerts(limit: int = 50):
    """
    Retrieves the most recent flood alerts for the dashboard.
    Includes error handling to skip malformed documents, fixing the 500 error.
    """
    collection = db.get_collection("alerts")
    if collection is None:
        raise HTTPException(status_code=500, detail="Alerts collection not initialized")
    
    validated_alerts = []
    
    try:
        # Fetch raw documents from MongoDB
        raw_alerts = await collection.find().sort("sent_at", -1).limit(limit).to_list(length=limit)

        # Iterate and validate each document
        for doc in raw_alerts:
            try:
                # Convert MongoDB's _id to string for Pydantic model
                doc["_id"] = str(doc["_id"])
                
                # Pydantic validation: ensures data matches the Alert schema
                validated_alerts.append(Alert(**doc))
            except Exception as validation_e:
                # Log documents that fail validation but continue processing others
                logger.warning(f"⚠️ Document failed Alert model validation and was skipped: {validation_e}, Data: {doc}")
                continue
                
        return validated_alerts
    except Exception as e:
        logger.error(f"❌ Critical error fetching/processing alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error while fetching alerts: {e}")


@app.post("/alerts", response_model=Alert, status_code=status.HTTP_201_CREATED)
async def create_new_alert(new_alert: Alert):
    """Creates a new flood alert record in the database."""
    collection = db.get_collection("alerts")
    if collection is None:
        raise HTTPException(status_code=500, detail="Alerts collection not initialized")

    try:
        alert_record = new_alert.model_dump(by_alias=True)
        # Ensure _id is not present during creation and set sent_at
        alert_record.pop("_id", None)
        alert_record["sent_at"] = datetime.now(timezone.utc)
        
        result = await collection.insert_one(alert_record)
        inserted = await collection.find_one({"_id": result.inserted_id})
        inserted["_id"] = str(inserted["_id"])
        logger.info(f"✅ Alert inserted: {inserted['message']}")
        
        return Alert(**inserted)
    except Exception as e:
        logger.error(f"❌ Error in /alerts endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")

# --- END CORRECTED ALERT ENDPOINTS ---