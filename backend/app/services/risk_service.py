import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.models.flood_predictor import FloodPredictor
from app.models.schemas import AssessmentSource, PredictionResult, RiskLevel
from app.utils.database import db
from app.utils.flood_zones import FloodZoneChecker
from config.settings import OPENWEATHER_API_KEY, RISK_THRESHOLDS

# Initialize FloodZoneChecker once; it loads KML polygons lazily.
flood_checker = FloodZoneChecker("data/bangalore_flood_zones.kml")


class RiskAssessmentService:
    """Handles the complete flood risk assessment logic."""

    def __init__(self, database, predictor: Optional[FloodPredictor] = None):
        self.db = database
        self.predictor = predictor
        self.weather_api_key: str = OPENWEATHER_API_KEY or ""

    async def fetch_weather_data(
        self, lat: float, lon: float
    ) -> Optional[Dict[str, Any]]:
        if not self.weather_api_key:
            print("⚠️ Missing OpenWeather API key.")
            return None
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_api_key}&units=metric"
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                res = await client.get(url)
                res.raise_for_status()
                return res.json()
        except Exception as e:
            print(f"⚠️ Weather fetch failed for ({lat},{lon}): {e}")
            return None

    async def get_recent_reports_count(self, lat: float, lon: float) -> int:
        collection = self.db.get_collection("reports")
        n_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        radius_km = 1.0
        query = {
            "created_at": {"$gte": n_hours_ago},
            "latitude": {
                "$gte": lat - (radius_km / 111),
                "$lte": lat + (radius_km / 111),
            },
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

    async def gather_features_for_prediction(
        self, lat: float, lon: float
    ) -> Dict[str, Any]:
        features: Dict[str, Any] = {}
        weather_data_found = False
        weather = await self.fetch_weather_data(lat, lon)

        # Fill weather features
        if weather and "main" in weather:
            weather_data_found = True
            temp = weather["main"].get("temp", 25)
            hum = weather["main"].get("humidity", 60)
            rainfall = weather.get("rain", {}).get("1h", 0)
        else:
            temp, hum, rainfall = 25, 60, 0

        features.update(
            {
                "Temperature": temp,
                "Humidity": hum,
                "Rainfall_Intensity": rainfall,
                "Latitude": lat,
                "Longitude": lon,
                "Altitude": 900,
                "River_Level": 5.0,
                "flood_proximity_score": 0,
            }
        )

        # Feature engineering consistent with model training
        features["rainfall_anomaly"] = (
            features["Rainfall_Intensity"] - 50
        )  # placeholder mean
        features["is_monsoon"] = 1 if 11 <= lat <= 19 else 0

        # Lazy evaluation: check if point is in flood zone only when needed
        features["in_flood_zone"] = int(flood_checker.is_in_flood_zone(lat, lon))

        return {"features": features, "weather_data_found": weather_data_found}
    def demo_override_risk(self, lat: float, lon: float) -> Optional[RiskLevel]:
        """Demo override for key points."""
        # Majestic → High
        if 12.9717 <= lat <= 12.9720 and 77.5943 <= lon <= 77.5946:
            return RiskLevel.HIGH
        # Koramangala → Medium
        if 12.9352 <= lat <= 12.9355 and 77.6244 <= lon <= 77.6247:
            return RiskLevel.MEDIUM
        # Kempegowda → Low
        if 13.0054 <= lat <= 13.0057 and 77.5704 <= lon <= 77.5707:
            return RiskLevel.LOW
        return None

    def decide_final_risk(
        self, threshold_risk: RiskLevel, ml_risk: RiskLevel, user_reports: int
    ) -> RiskLevel:
        
        # 1. User reports override
        if user_reports >= RISK_THRESHOLDS.get("user_reports_high_risk", 5):
            return RiskLevel.HIGH
        elif user_reports >= RISK_THRESHOLDS.get("user_reports_medium_risk", 2):
            return RiskLevel.MEDIUM

        # 2. ML prediction
        if ml_risk == RiskLevel.HIGH:
            return RiskLevel.HIGH
        elif ml_risk == RiskLevel.MEDIUM:
            return max(threshold_risk, RiskLevel.MEDIUM)

        # 3. Threshold-based fallback
        return threshold_risk

    async def get_risk_prediction(
        self, lat: float, lon: float, predictor: Optional[FloodPredictor] = None
    ) -> PredictionResult:
        user_reports = await self.get_recent_reports_count(lat, lon)
        predictor = self.predictor
        threshold_assessment = RiskLevel.LOW
        ml_assessment = RiskLevel.UNKNOWN
        contributing_factors: List[str] = []

        # Threshold-based risk assessment
        if user_reports > RISK_THRESHOLDS.get("user_reports_high_risk", 5):
            threshold_assessment = RiskLevel.HIGH
            contributing_factors.append(f"High recent reports: {user_reports}")
        elif user_reports > RISK_THRESHOLDS.get("user_reports_medium_risk", 2):
            threshold_assessment = RiskLevel.MEDIUM
            contributing_factors.append(f"Moderate recent reports: {user_reports}")

        features_data = await self.gather_features_for_prediction(lat, lon)
        weather_found = features_data["weather_data_found"]

        # ML-based prediction (if predictor is ready and weather data available)
        if predictor and predictor.is_ready and weather_found:
            try:
                prediction_result = predictor.predict([features_data["features"]])[0]
                ml_assessment = RiskLevel(prediction_result)
                contributing_factors.append(f"ML predicted: {ml_assessment.value}")
            except Exception as e:
                print(f"⚠️ ML prediction failed: {e}")
                contributing_factors.append("ML model error.")

        # Probabilities for final decision
        ml_prob = (
            0.7
            if ml_assessment == RiskLevel.HIGH
            else 0.5 if ml_assessment == RiskLevel.MEDIUM else 0.2
        )
        precip_pct = min(
            features_data["features"].get("Rainfall_Intensity", 0) * 10, 100
        )
        final_risk = self.decide_final_risk(
            threshold_risk=threshold_assessment,
            ml_risk=ml_assessment,
            user_reports=user_reports,
        )

        recommendations = {
            RiskLevel.LOW: "Conditions appear safe. Remain aware of weather changes.",
            RiskLevel.MEDIUM: "Potential for localized flooding. Exercise caution.",
            RiskLevel.HIGH: "High flood risk detected. Avoid travel in this area.",
        }

        return PredictionResult(
            final_risk=final_risk,
            source=AssessmentSource.HYBRID_HISTORICAL,
            threshold_assessment=threshold_assessment,
            ml_assessment=ml_assessment,
            user_reports_found=user_reports,
            weather_data_found=weather_found,
            contributing_factors=contributing_factors,
            recommendation=recommendations.get(
                final_risk, "Could not determine recommendation."
            ),
            error=None,
        )
