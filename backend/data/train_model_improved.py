"""
RainSafe - Improved RandomForest Model Training
Target: >50% accuracy for now with Bangalore + Karnataka data
"""

import os
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.preprocessing import StandardScaler

# --- Project Paths ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ML_ARTIFACTS_DIR = DATA_DIR / "ml-artifacts"
ML_ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

BLR_CSV = DATA_DIR / "bangalore_urban_flood_prediction.csv"
INDIA_CSV = DATA_DIR / "flood_risk_dataset_india.csv"

# --- Load Datasets ---
blr_df = pd.read_csv(BLR_CSV)
india_df = pd.read_csv(INDIA_CSV)

# --- Flood proximity for Bangalore (set 0 for now) ---
blr_df["flood_proximity_score"] = 0

# --- Karnataka filter in India data ---
india_df = india_df[
    (india_df["Latitude"] >= 11)
    & (india_df["Latitude"] <= 19)
    & (india_df["Longitude"] >= 74)
    & (india_df["Longitude"] <= 78)
].copy()

# --- Rename columns in India dataset to match BLR dataset ---
india_df.rename(
    columns={
        "Rainfall (mm)": "Rainfall_Intensity",
        "Elevation (m)": "Altitude",
        "Humidity (%)": "Humidity",
        "Water Level (m)": "River_Level",
        "Temperature (°C)": "Temperature",
        "Flood Occurred": "flood",
    },
    inplace=True,
)
india_df["flood_proximity_score"] = 0

# --- Common features ---
common_features = [
    "Altitude",
    "Rainfall_Intensity",
    "Temperature",
    "Humidity",
    "River_Level",
    "Latitude",
    "Longitude",
    "flood_proximity_score",
    "flood",
]

blr_df = blr_df[common_features]
india_df = india_df[common_features]

# --- Combine datasets and shuffle ---
combined_df = pd.concat([blr_df, india_df], ignore_index=True)
combined_df = combined_df.sample(frac=1, random_state=42).reset_index(drop=True)

print("Flood proximity stats (Bangalore only):")
print(blr_df["flood_proximity_score"].describe())
print(
    f"✅ Training with {len(common_features)-1} features, {len(combined_df)} total rows.\n"
)

# --- Feature Engineering (optional) ---
combined_df["rainfall_anomaly"] = (
    combined_df["Rainfall_Intensity"] - combined_df["Rainfall_Intensity"].mean()
)
combined_df["is_monsoon"] = combined_df["Latitude"].apply(
    lambda lat: 1 if 11 <= lat <= 19 else 0
)

# Update features list
features = [f for f in common_features if f != "flood"]
features += ["rainfall_anomaly", "is_monsoon"]

# --- Split Features & Target ---
X = combined_df[features]
y = combined_df["flood"]

# --- Train/Test Split ---
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print("\nTrain class balance:", pd.Series(y_train).value_counts(normalize=True))
print("Test class balance:", pd.Series(y_test).value_counts(normalize=True))

# --- Scale Features ---
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# --- Grid Search for Hyperparameters ---
param_grid = {
    "n_estimators": [100, 200],
    "max_depth": [8, 12, 16],
    "min_samples_leaf": [2, 4],
    "class_weight": ["balanced", None],
}
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
grid = GridSearchCV(
    RandomForestClassifier(random_state=42, n_jobs=-1),
    param_grid,
    cv=cv,
    scoring="accuracy",
    n_jobs=-1,
)
grid.fit(X_train_scaled, y_train)
print("\nBest parameters from grid search:", grid.best_params_)

# --- Final Model ---
model = grid.best_estimator_

# --- Evaluate ---
preds = model.predict(X_test_scaled)
print(f"\n🧠 RandomForest Accuracy: {accuracy_score(y_test, preds):.3f}")
print(classification_report(y_test, preds))

# --- Feature Importances ---
feature_importances = pd.Series(model.feature_importances_, index=X.columns)
print("Feature importances:\n", feature_importances.sort_values(ascending=False))

# --- Save Artifacts ---
with open(ML_ARTIFACTS_DIR / "model.pkl", "wb") as f:
    pickle.dump(model, f)
with open(ML_ARTIFACTS_DIR / "scaler.pkl", "wb") as f:
    pickle.dump(scaler, f)
with open(ML_ARTIFACTS_DIR / "model_features.pkl", "wb") as f:
    pickle.dump(list(X.columns), f)

print("\n✅ Final model artifacts saved successfully.")
