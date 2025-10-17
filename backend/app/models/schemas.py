from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# --- Enums for consistency and validation ---

class WaterLevel(str, Enum):
    """Enum for water level options."""
    ANKLE_DEEP = "Ankle-deep"
    KNEE_DEEP = "Knee-deep"
    WAIST_DEEP = "Waist-deep"
    CHEST_DEEP = "Chest-deep"
    ABOVE_HEAD = "Above head"


class RiskLevel(str, Enum):
    """Enum for risk level options."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    UNKNOWN = "Unknown"


class AssessmentSource(str, Enum):
    """Enum for risk assessment sources."""
    USER_REPORT = "user-report"
    HYBRID_HISTORICAL = "hybrid-historical"
    ML_PREDICTION = "ml-prediction"
    ERROR = "error"


# --- Report Models ---

class ReportBase(BaseModel):
    """Base model for a flood report, containing common fields."""
    latitude: float = Field(..., description="Latitude coordinate", ge=-90, le=90)
    longitude: float = Field(..., description="Longitude coordinate", ge=-180, le=180)
    description: str = Field(..., description="Description of the flood condition", min_length=10, max_length=500)
    water_level: Optional[WaterLevel] = Field(None, description="Estimated water level")


class ReportCreate(ReportBase):
    """Model for creating a new flood report."""
    pass


class Report(ReportBase):
    """Full report model, including database fields."""
    id: str = Field(..., alias="_id")
    created_at: datetime = Field(..., description="Timestamp of when the report was created")
    # Added nlp_analysis as it's part of your report creation flow
    nlp_analysis: Dict[str, Any] = Field({}, description="NLP analysis results of the description")

    class Config:
        # orm_mode = True # This is deprecated in Pydantic v2+, use from_attributes=True instead if needed
        from_attributes = True # Use from_attributes for Pydantic v2+ if mapping from ORM/ODM objects
        allow_population_by_field_name = True


class ReportResponse(BaseModel):
    """Response model for report submission."""
    message: str
    data: Report


# --- Alert Models ---

class Alert(BaseModel):
    id: Optional[str] = Field(None, alias="_id", description="Unique identifier for the alert")
    location_name: str = Field(..., description="Name of the location")
    risk_level: RiskLevel = Field(..., description="Risk level")
    message: str = Field(..., description="The content of the alert message")
    recipient: Optional[str] = Field(None, description="Alert recipient's email address or broadcast group")
    source: Optional[AssessmentSource] = Field(None, description="Source of the alert")
    sent_at: Optional[datetime] = Field(None, description="Timestamp when the alert was sent")

    class Config:
        from_attributes = True
        allow_population_by_field_name = True

# --- Risk Assessment Models ---

class RiskAssessmentDetails(BaseModel):
    """Detailed breakdown of the risk assessment."""
    threshold_assessment: RiskLevel
    ml_assessment: RiskLevel
    user_reports_found: int
    weather_data_found: bool
    contributing_factors: List[str] = Field(..., description="List of factors contributing to the risk assessment")
    recommendation: str = Field(..., description="Recommendation based on the final risk level")
    error: Optional[str] = None


class RiskResponse(BaseModel):
    """Risk assessment response model."""
    risk_level: RiskLevel = Field(..., description="Final risk assessment")
    source: AssessmentSource = Field(..., description="Assessment source")
    details: RiskAssessmentDetails = Field(..., description="Detailed assessment information")

# --- NEW: PredictionResult Model ---
class PredictionResult(BaseModel):
    """
    Model to encapsulate the full result of a unified risk prediction,
    combining various assessment aspects before forming the final RiskResponse.
    This helps in passing comprehensive data between service layers.
    """
    final_risk: RiskLevel = Field(..., description="The ultimate calculated risk level for the location.")
    source: AssessmentSource = Field(..., description="The primary source or method used for this final assessment.")
    threshold_assessment: RiskLevel = Field(..., description="Risk level determined by threshold-based rules (e.g., recent reports, static data).")
    ml_assessment: RiskLevel = Field(..., description="Risk level predicted by the machine learning model.")
    user_reports_found: int = Field(..., description="Number of recent user reports contributing to the assessment.")
    weather_data_found: bool = Field(..., description="Indicates if relevant weather data was available for ML prediction.")
    contributing_factors: List[str] = Field(..., description="Detailed list of factors that informed the final risk level.")
    recommendation: str = Field(..., description="Actionable advice based on the final risk level.")
    error: Optional[str] = Field(None, description="Any error message encountered during the prediction process.")


# --- Weather Data Models ---

class Coordinates(BaseModel):
    """Model for geographic coordinates."""
    type: str = "Point"
    coordinates: List[float]


class CurrentWeather(BaseModel):
    """Model for current weather conditions."""
    temp: float
    humidity: int
    weather_condition: str
    rain_1h_mm: float
    pressure: int
    wind_speed: float


class WeatherData(BaseModel):
    """Weather data model for a city."""
    city_name: str
    coordinates: Coordinates
    current_weather: CurrentWeather
    forecast_data: List[dict]  # Keeping forecast_data as a list of dicts for now
    fetched_at: datetime


# --- Dashboard Models ---

class MapPoint(BaseModel):
    """Map point for the dashboard."""
    id: str
    latitude: float
    longitude: float
    risk_level: RiskLevel
    source: AssessmentSource
    details: str


class DashboardResponse(BaseModel):
    """Dashboard data response model."""
    map_points: List[MapPoint]
    charts_data: Dict[str, Any]