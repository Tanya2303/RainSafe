import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

# These imports assume your project structure is correct
from app.models.flood_predictor import FloodPredictor
from app.models.schemas import PredictionResult, RiskLevel, AssessmentSource
from config.settings import OPENWEATHER_API_KEY, RISK_THRESHOLDS
from app.utils.database import db # Assuming 'db' is your database connection manager


class RiskAssessmentService:
    """Handles the complete flood risk assessment logic."""

    def __init__(self, database):
        self.db = database
        self.weather_api_key: str = OPENWEATHER_API_KEY or ""

    async def analyze_description_with_nlp(self, description: str) -> Dict[str, Any]:
        """A simple NLP analysis of the report description."""
        keywords = ["flood", "water", "rain", "rising", "overflow"]
        found_keywords = [kw for kw in keywords if kw in description.lower()]
        sentiment = "neutral"
        if any(k in description.lower() for k in ["severe", "dangerous", "urgent"]):
            sentiment = "negative"
        return {
            "keywords": found_keywords,
            "sentiment": sentiment,
            "summary": description[:60] + "..." if len(description) > 60 else description,
        }

    async def fetch_weather_data(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Fetches live weather data from OpenWeatherMap."""
        if not self.weather_api_key:
            print("⚠️ Missing OpenWeather API key. Cannot fetch weather data.")
            return None
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_api_key}&units=metric"
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                res = await client.get(url)
                res.raise_for_status()
                return res.json()
        except Exception as e:
            print(f"⚠️ Weather data fetch failed for ({lat}, {lon}): {e}")
            return None

    async def get_recent_reports_count(self, lat: float, lon: float) -> int:
        """Counts user reports submitted in the last 24 hours within a 1km radius."""
        collection = self.db.get_collection("reports")
        n_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        radius_km = 1.0
        query = {
            "created_at": {"$gte": n_hours_ago},
            "latitude": {"$gte": lat - (radius_km / 111), "$lte": lat + (radius_km / 111)},
            "longitude": {
                "$gte": lon - (radius_km / (111 * math.cos(math.radians(lat)))),
                "$lte": lon + (radius_km / (111 * math.cos(math.radians(lat)))),
            },
        }
        try:
            return await collection.count_documents(query)
        except Exception as e:
            print(f"⚠️ Error counting reports: {e}")
            return 0

    async def gather_features_for_prediction(self, lat: float, lon: float) -> Dict[str, Any]:
        """
        Builds a complete feature dictionary for the Bangalore model,
        combining live weather data with reasonable default values.
        """
        features: Dict[str, Any] = {}
        weather_data_found = False

        weather = await self.fetch_weather_data(lat, lon)
        if weather and "main" in weather:
            weather_data_found = True
            # --- Map live weather data to the EXACT training column names ---
            features["Temperature"] = weather["main"].get("temp", 0)
            features["Humidity"] = weather["main"].get("humidity", 0)
            features["Atmospheric_Pressure"] = weather["main"].get("pressure", 0)
            features["Rainfall_Intensity"] = weather.get("rain", {}).get("1h", 0)
        else:
            print(f"⚠️ No valid weather data found at {lat}, {lon}. Using defaults.")

        # --- Provide reasonable default values for features NOT available from the live weather API ---
        # These are based on the general characteristics of Bangalore.
        features.update({
            "Latitude": lat,
            "Longitude": lon,
            "Altitude": 900,  # Average altitude of Bangalore in meters
            "River_Level": 5.0, # A neutral, average river level on a scale of 0-10
            "Drainage_Capacity": 50.0, # Assuming a moderate capacity on a scale of 0-100
            "Drainage_System_Condition": 5.0, # Assuming an average condition on a scale of 0-10
            "Population_Density": 4381, # Average for Bangalore urban area
            "Urbanization_Level": 0.8, # High urbanization on a scale of 0-1
            # Note: Wind Speed is not in the Bangalore dataset, so we don't include it.
        })

        return {"features": features, "weather_data_found": weather_data_found}

    async def get_risk_prediction(
        self, lat: float, lon: float, predictor: Optional[FloodPredictor] = None
    ) -> PredictionResult:
        """
        Calculates the final hybrid risk by combining user reports and the ML model.
        """
        user_reports = 0
        ml_assessment = RiskLevel.UNKNOWN
        threshold_assessment = RiskLevel.LOW 
        contributing_factors: List[str] = []
        weather_found = False
        
        try:
            # --- Part 1: Threshold-Based Risk from User Reports ---
            user_reports = await self.get_recent_reports_count(lat, lon)
            if user_reports > RISK_THRESHOLDS.get("user_reports_high_risk", 5):
                threshold_assessment = RiskLevel.HIGH
                contributing_factors.append(f"High number of recent user reports ({user_reports}).")
            elif user_reports > RISK_THRESHOLDS.get("user_reports_medium_risk", 2):
                threshold_assessment = RiskLevel.MEDIUM
                contributing_factors.append(f"Moderate number of recent user reports ({user_reports}).")
            else:
                threshold_assessment = RiskLevel.LOW

            # --- Part 2: ML-Based Risk from Weather Data ---
            features_data = await self.gather_features_for_prediction(lat, lon)
            weather_found = features_data["weather_data_found"]

            if predictor and predictor.is_ready and weather_found:
                try:
                    prediction_result = predictor.predict([features_data["features"]])[0]
                    ml_assessment = RiskLevel(prediction_result)
                    contributing_factors.append(f"ML model predicted: {ml_assessment.value}.")
                except Exception as e:
                    print(f"⚠️ ML prediction failed: {e}")
                    contributing_factors.append("ML model prediction error.")
            else:
                contributing_factors.append("ML model not ready or weather data missing.")

            # --- Part 3: Combine Results for Final Risk ---
            if RiskLevel.HIGH in (threshold_assessment, ml_assessment):
                final_risk = RiskLevel.HIGH
            elif RiskLevel.MEDIUM in (threshold_assessment, ml_assessment):
                final_risk = RiskLevel.MEDIUM
            else:
                final_risk = RiskLevel.LOW
            
            recommendations = {
                RiskLevel.LOW: "Conditions appear safe. Remain aware of weather changes.",
                RiskLevel.MEDIUM: "Potential for localized flooding. Exercise caution.",
                RiskLevel.HIGH: "High flood risk detected. Avoid travel in this area.",
            }
            final_recommendation = recommendations.get(final_risk, "Could not determine recommendation.")

            return PredictionResult(
                final_risk=final_risk,
                source=AssessmentSource.HYBRID_HISTORICAL,
                threshold_assessment=threshold_assessment,
                ml_assessment=ml_assessment,
                user_reports_found=user_reports,
                weather_data_found=weather_found,
                contributing_factors=contributing_factors,
                recommendation=final_recommendation,
                error=None,
            )

        except Exception as e:
            print(f"🚨 Overall risk assessment failed: {e}")
            return PredictionResult(
                final_risk=RiskLevel.UNKNOWN, source=AssessmentSource.ERROR,
                threshold_assessment=RiskLevel.UNKNOWN, ml_assessment=RiskLevel.UNKNOWN,
                user_reports_found=user_reports, weather_data_found=weather_found,
                contributing_factors=["An unexpected system error occurred."],
                recommendation="Please try again later.", error=str(e),
            )