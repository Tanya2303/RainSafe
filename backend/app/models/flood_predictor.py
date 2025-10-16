import joblib
import os
import pandas as pd
from typing import List, Dict, Any

# --- THE FINAL, CORRECTED PATH ---
# Based on your file structure, the artifacts are inside the 'data' folder,
# which is in the same 'backend' directory where your main app runs.
_ARTIFACTS_DIR = 'data/ml_artifacts'

_MODEL_PATH = os.path.join(_ARTIFACTS_DIR, 'model.pkl')
_SCALER_PATH = os.path.join(_ARTIFACTS_DIR, 'scaler.pkl')
_FEATURES_PATH = os.path.join(_ARTIFACTS_DIR, 'model_features.pkl')

class FloodPredictor:
    def __init__(self):
        """
        Loads the final, specialized Bangalore model using the correct path.
        """
        self._model = None
        self._scaler = None
        self._feature_names = []
        self.is_ready = False

        print("--- Initializing Final Bangalore FloodPredictor ---")
        try:
            # Add a check to print the absolute path for debugging
            absolute_path = os.path.abspath(_ARTIFACTS_DIR)
            print(f"   - Verifying path: {absolute_path}")

            self._model = joblib.load(_MODEL_PATH)
            self._scaler = joblib.load(_SCALER_PATH)
            self._feature_names = joblib.load(_FEATURES_PATH)
            self.is_ready = True
            print("✅ All final Bangalore model artifacts loaded successfully.")
            print(f"   - Model is trained on {len(self._feature_names)} features.")
        except Exception as e:
            print(f"🚨 FATAL ERROR loading artifacts: {e}")
            print(f"🚨 Please ensure your .pkl files exist in the '{_ARTIFACTS_DIR}' directory.")

    def predict(self, input_data: List[Dict[str, Any]]) -> List[str]:
        """
        Makes predictions using live data for the specialized Bangalore model.
        """
        if not self.is_ready:
            return ["Unknown"] * len(input_data)
        try:
            # 1. Create a DataFrame using the *full list of columns* the model was trained on.
            #    This is the key step that solves the prediction bias.
            df = pd.DataFrame(input_data, columns=self._feature_names)

            # 2. Fill missing values. Live data will only provide a few weather features,
            #    so this correctly fills the other columns (like Altitude, Drainage_Capacity) with a neutral value (0).
            df.fillna(0, inplace=True)

            # 3. Scale the complete data and make a prediction.
            scaled_features = self._scaler.transform(df)       # type: ignore
            predictions = self._model.predict(scaled_features) # type: ignore
            
            # 4. Map the model's output (0 or 1) to the API's risk levels ('Low' or 'High').
            risk_map = {0: 'Low', 1: 'High'}
            return [risk_map.get(pred, 'Unknown') for pred in predictions]

        except Exception as e:
            print(f"🚨 ERROR during prediction: {e}")
            return ["Unknown"] * len(input_data)

