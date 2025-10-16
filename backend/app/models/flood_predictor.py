import joblib
import os
import pandas as pd
from typing import List, Dict, Any

# --- Define the Path ---
# We are using a simple path assuming the server runs from the project root ('/app' in Docker)
_ARTIFACTS_DIR = 'ml-artifacts'

_MODEL_PATH = os.path.join(_ARTIFACTS_DIR, 'model.pkl')
_SCALER_PATH = os.path.join(_ARTIFACTS_DIR, 'scaler.pkl')
_FEATURES_PATH = os.path.join(_ARTIFACTS_DIR, 'model_features.pkl')


class FloodPredictor:
    def __init__(self):
        """
        Loads the trained model artifacts with extra debugging checks.
        """
        self._model = None
        self._scaler = None
        self._feature_names = []
        self.is_ready = False

        print("\n--- 🕵️‍♂️ STARTING FLOOD PREDICTOR DEBUG 🕵️‍♂️ ---")
        try:
            # --- START: NEW DEBUGGING CODE ---
            # 1. Print the current working directory to know where we are.
            cwd = os.getcwd()
            print(f"   - Current Working Directory: {cwd}")

            # 2. Print the absolute path the script is trying to use.
            absolute_artifacts_path = os.path.abspath(_ARTIFACTS_DIR)
            print(f"   - Attempting to find artifacts in: {absolute_artifacts_path}")

            # 3. Check if this directory actually exists.
            if os.path.isdir(absolute_artifacts_path):
                print("   - ✅ Directory exists.")
                # 4. List all files inside the directory.
                files_in_dir = os.listdir(absolute_artifacts_path)
                print(f"   - Files found in directory: {files_in_dir}")
                if not files_in_dir:
                    print("   - 🚨 WARNING: The artifacts directory is EMPTY.")
            else:
                print("   - 🚨 FATAL: The artifacts directory DOES NOT EXIST at this path.")
            # --- END: NEW DEBUGGING CODE ---

            print("\n--- Loading Artifacts ---")
            self._model = joblib.load(_MODEL_PATH)
            self._scaler = joblib.load(_SCALER_PATH)
            self._feature_names = joblib.load(_FEATURES_PATH)
            self.is_ready = True
            print("✅ All model artifacts loaded successfully.")

        except Exception as e:
            print(f"🚨 FAILED to load artifacts. Error: {e}")
        
        print("--- 🕵️‍♂️ END FLOOD PREDICTOR DEBUG 🕵️‍♂️ ---\n")


    def predict(self, input_data: List[Dict[str, Any]]) -> List[str]:
        if not self.is_ready:
            return ["Unknown"] * len(input_data)
        try:
            df = pd.DataFrame(input_data, columns=self._feature_names)
            df.fillna(0, inplace=True)
            scaled_features = self._scaler.transform(df) # type: ignore
            predictions = self._model.predict(scaled_features) # type: ignore
            risk_map = {0: 'Low', 1: 'High'}
            return [risk_map.get(pred, 'Unknown') for pred in predictions]
        except Exception as e:
            print(f"🚨 ERROR during prediction: {e}")
            return ["Unknown"] * len(input_data)