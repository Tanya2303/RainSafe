import os
from typing import Any, Dict, List

import joblib
import pandas as pd

_ARTIFACTS_DIR = "data/ml-artifacts"
_MODEL_PATH = os.path.join(_ARTIFACTS_DIR, "model.pkl")
_SCALER_PATH = os.path.join(_ARTIFACTS_DIR, "scaler.pkl")
_FEATURES_PATH = os.path.join(_ARTIFACTS_DIR, "model_features.pkl")


class FloodPredictor:
    """Load the trained Bangalore + Karnataka flood prediction model and make predictions."""

    def __init__(self):
        self._model = None
        self._scaler = None
        self._feature_names: List[str] = []
        self.is_ready = False

        print("--- Initializing FloodPredictor ---")
        try:
            self._model = joblib.load(_MODEL_PATH)
            self._scaler = joblib.load(_SCALER_PATH)
            self._feature_names = joblib.load(_FEATURES_PATH)
            self.is_ready = True
            print(f"✅ Model loaded with {len(self._feature_names)} features.")
        except Exception as e:
            print(f"🚨 Error loading model artifacts: {e}")

    def _prepare_dataframe(self, input_data: List[Dict[str, Any]]) -> pd.DataFrame:
        df = pd.DataFrame(input_data)

        # Ensure all required features exist
        for f in self._feature_names:
            if f not in df.columns:
                df[f] = 0  # default to 0 if missing

        # Keep only model features
        df = df[self._feature_names].copy()

        # Add engineered features if missing
        if "rainfall_anomaly" not in df.columns and "Rainfall_Intensity" in df.columns:
            df["rainfall_anomaly"] = (
                df["Rainfall_Intensity"] - df["Rainfall_Intensity"].mean()
            )
        if "is_monsoon" not in df.columns and "Latitude" in df.columns:
            df["is_monsoon"] = df["Latitude"].apply(
                lambda lat: 1 if 11 <= lat <= 19 else 0
            )

        df.fillna(0, inplace=True)
        scaled = self._scaler.transform(df)  # type: ignore
        return scaled

    def predict(self, input_data: List[Dict[str, Any]]) -> List[str]:
        if not self.is_ready:
            return ["Unknown"] * len(input_data)
        try:
            scaled = self._prepare_dataframe(input_data)
            preds = self._model.predict(scaled)  # type: ignore
            return ["Low" if p == 0 else "High" for p in preds]
        except Exception as e:
            print(f"🚨 Prediction error: {e}")
            return ["Unknown"] * len(input_data)

    def predict_proba(self, input_data: List[Dict[str, Any]]) -> List[float]:
        if not self.is_ready:
            return [0.5] * len(input_data)
        try:
            if not hasattr(self._model, "predict_proba"):
                return [0.5] * len(input_data)
            scaled = self._prepare_dataframe(input_data)
            proba = self._model.predict_proba(scaled)  # type: ignore
            return [p[1] for p in proba]  # probability of "High"
        except Exception as e:
            print(f"🚨 Probability prediction error: {e}")
            return [0.5] * len(input_data)
