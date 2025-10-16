"""
Configuration settings for RainSafe Backend
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Configuration
API_TITLE = "RainSafe API"
API_VERSION = "1.0.0"
API_DESCRIPTION = "Flood risk assessment and weather monitoring API"

# Database Configuration
MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = "rainsafe_db"

# External API Configuration
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"

# Target Cities for Weather Data
TARGET_CITIES = [
    {"name": "Bengaluru", "lat": 12.9716, "lon": 77.5946},
    {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777},
    {"name": "Delhi", "lat": 28.7041, "lon": 77.1025},
    {"name": "Chennai", "lat": 13.0827, "lon": 80.2707},
    {"name": "Kolkata", "lat": 22.5726, "lon": 88.3639},
]

# ML Model Configuration
MODEL_PATH = "data/ml_artifacts/model.pkl"
SCALER_PATH = "data/ml_artifacts/scaler.pkl"
FEATURES_PATH = "data/ml_artifacts/model_features.pkl"

# Risk Assessment Configuration
RISK_THRESHOLDS = {
    "HIGH_WATER_LEVEL": ["Knee-deep", "Waist-deep", "Chest-deep", "Above head"],
    "MEDIUM_WATER_LEVEL": ["Ankle-deep"],
    "WEATHER_THRESHOLDS": {
        "heavy_rain": 10,  # mm/h
        "humidity_high": 80,  # %
    },
    "user_reports_medium_risk": 2,  # Trigger medium risk if more than 2 reports are found
    "user_reports_high_risk": 5     # Trigger high risk if more than 5 reports are found
}

# Cron Configuration
CRON_INTERVAL_MINUTES = 30
CRON_SCRIPT_PATH = "scripts/run_weather_cron.sh"

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = "logs/rainsafe.log"
