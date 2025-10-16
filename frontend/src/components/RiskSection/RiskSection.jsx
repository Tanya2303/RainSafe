// components/RiskSection/RiskSection.jsx
import React, { useState } from "react";
import Map, { Marker, NavigationControl, ScaleControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const API_BASE = import.meta.env.VITE_API_BASE || ""; // e.g. http://localhost:8000

// SAMPLE_RESPONSE kept for fallback / dev
const SAMPLE_RESPONSE = {
  risk_level: "Medium",
  source: "hybrid-historical",
  details: {
    threshold_assessment: "Medium",
    ml_assessment: "Unknown",
    user_reports_found: 4,
    weather_data_found: true,
    "contributing factors": [
      "Moderate number of reports (4).",
      "ML model not ready or missing data."
    ],
    recommendation: "Potential local flooding - be cautious.",
    error: null,
  },
};

const colorForRisk = (r) => {
  if (!r) return "bg-gray-300 text-gray-800";
  const key = String(r).toLowerCase();
  if (key === "high") return "bg-red-500 text-white";
  if (key === "medium") return "bg-amber-500 text-black";
  if (key === "low") return "bg-green-500 text-white";
  return "bg-gray-300 text-gray-800";
};

const BluePin = () => (
  <svg height="28" viewBox="0 0 24 24" style={{ cursor: "pointer", fill: "#3B82F6", stroke: "none" }}>
    <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
  </svg>
);

export default function RiskSection() {
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [risk, setRisk] = useState(null);
  const [error, setError] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Controlled map view state so the map recenters when lat/lon change
  const [viewState, setViewState] = useState({
    latitude: 15.3173,
    longitude: 75.7139,
    zoom: 5,
    bearing: 0,
    pitch: 0,
  });

  // --- Geocode (same as your existing implementation) ---
  const geocodeLocation = async (query) => {
    if (!MAPBOX_TOKEN) throw new Error("Mapbox token not configured.");
    const encoded = encodeURIComponent(query);
    const karnatakaBbox = "74.0,11.0,78.6,18.6";
    const proximity = "77.5946,12.9716";
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=IN&bbox=${karnatakaBbox}&proximity=${proximity}`;

    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Geocode failed: ${res.status} ${res.statusText} ${txt}`);
    }
    const data = await res.json();

    if (!data.features || data.features.length === 0) {
      const fallbackUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=IN&proximity=${proximity}`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) {
        const txt = await fallbackRes.text().catch(() => "");
        throw new Error(`Geocode fallback failed: ${fallbackRes.status} ${fallbackRes.statusText} ${txt}`);
      }
      const fallbackData = await fallbackRes.json();
      if (fallbackData.features && fallbackData.features.length > 0) {
        const [lng, lat] = fallbackData.features[0].center;
        return { lat, lng, source: "fallback" };
      }
      throw new Error("Location not found in Karnataka (or India).");
    }

    const [lng, lat] = data.features[0].center;
    return { lat, lng, source: "bbox" };
  };

  // Helper to update coords and recenter map
  const setCoordsAndCenter = (latitude, longitude) => {
    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    setLat(latNum);
    setLon(lonNum);
    setViewState((vs) => ({
      ...vs,
      latitude: latNum,
      longitude: lonNum,
      zoom: 12,
    }));
  };

  // Set coordinates from search (does NOT fetch risk)
  const handleSearchLocation = async () => {
    setError(null);
    setRisk(null); // Clear previous risk
    if (!locationQuery) return setError("Enter a location name.");
    setLoading(true);
    try {
      const result = await geocodeLocation(locationQuery);
      setCoordsAndCenter(result.lat, result.lng);
    } catch (e) {
      setError(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  // Set coordinates from current location (does NOT fetch risk)
  const handleUseMyLocation = () => {
    setError(null);
    setRisk(null);
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordsAndCenter(pos.coords.latitude, pos.coords.longitude);
      },
      () => setError("Permission denied or unable to fetch location."),
      { enableHighAccuracy: true }
    );
  };

  // --- Core: call backend /risk and normalize result ---
  const callRiskEndpoint = async (latitude, longitude) => {
    const url = `${API_BASE}/risk?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Risk fetch failed: ${res.status} ${res.statusText} ${txt}`);
    }
    const payload = await res.json();

    // Normalize payload to UI-friendly shape expected by the component
    const normalized = {
      risk_level: payload.risk_level ?? payload.risk ?? "Unknown",
      source: payload.source ?? "backend",
      details: {
        threshold_assessment:
          payload.details?.threshold_assessment ??
          payload.threshold_assessment ??
          "Unknown",
        ml_assessment:
          payload.details?.ml_assessment ??
          payload.ml_assessment ??
          "Unknown",
        user_reports_found: payload.details?.user_reports_found ?? payload.user_reports_found ?? 0,
        weather_data_found: payload.details?.weather_data_found ?? payload.weather_data_found ?? false,
        "contributing factors":
          payload.details?.["contributing factors"] ??
          payload.details?.contributing_factors ??
          payload.contributing_factors ??
          [],
        recommendation: payload.details?.recommendation ?? payload.recommendation ?? "No recommendation",
        error: payload.details?.error ?? payload.error ?? null,
      },
    };
    return normalized;
  };

  // Fetch risk for current coordinates
  const handleCheckRisk = async () => {
    setError(null);
    if (lat === null || lon === null) {
      setError("Please use a location or your current location to check risk.");
      return;
    }
    setLoading(true);
    setMlLoading(false);
    setRisk(null);
    try {
      const data = await callRiskEndpoint(lat, lon);

      // If ML is unknown/pending, show partial and optionally poll a few times
      const mlVal = data.details?.ml_assessment;
      const mlIsPending = !mlVal || String(mlVal).toLowerCase() === "unknown";

      if (mlIsPending) {
        // show initial threshold/partial result
        setRisk({
          ...data,
          details: { ...data.details, ml_assessment: "Unknown" },
        });
        setMlLoading(true);

        // Poll loop: will try a few times to get ML result (safe small loop)
        const maxTries = 6; // total tries
        const intervalMs = 2000; // 2s between tries -> up to ~12s
        for (let i = 0; i < maxTries; i++) {
          await new Promise((r) => setTimeout(r, intervalMs));
          try {
            const refreshed = await callRiskEndpoint(lat, lon);
            const refreshedMl = refreshed.details?.ml_assessment;
            if (refreshedMl && String(refreshedMl).toLowerCase() !== "unknown") {
              setRisk(refreshed);
              setMlLoading(false);
              break;
            }
          } catch (err) {
            // ignore transient poll errors; continue polling
          }
          if (i === maxTries - 1) {
            // final iteration, stop loading
            setMlLoading(false);
          }
        }
      } else {
        // ML present immediately
        setRisk(data);
        setMlLoading(false);
      }
    } catch (e) {
      setError(e.message || "Failed to fetch risk. Try again.");
      setMlLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Display for ML assessment
  const mlAssessmentDisplay = (val) => {
    if (!val || String(val).toLowerCase() === "unknown") {
      return (
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600">Pending</div>
          <div
            className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700"
            title="Model assessment is not available for this location yet"
          >
            ML Pending
          </div>
        </div>
      );
    }
    return <div className="text-sm font-semibold">{val}</div>;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Risk Assessment</h2>
            <p className="text-sm text-gray-500">Based on reports, weather & models</p>
          </div>
          <div className="text-sm text-gray-400">Source: hybrid-historical</div>
        </div>

        {/* Inputs */}
        <div className="bg-white rounded-xl p-4 shadow mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Search location (restricted to Karnataka)"
              className="px-3 py-2 rounded-md border w-full md:w-[300px]"
            />
            <div className="flex gap-2">
              <button
                onClick={handleUseMyLocation}
                className="px-4 py-2 rounded-full bg-gray-100 border hover:bg-gray-200 text-sm"
              >
                Use my location
              </button>
              <button
                onClick={handleSearchLocation}
                disabled={loading}
                className="px-4 py-2 rounded-full bg-blue-600 text-white font-semibold disabled:opacity-60"
              >
                {loading ? "Searching..." : "Search"}
              </button>
              <button
                onClick={handleCheckRisk}
                disabled={loading}
                className="px-4 py-2 rounded-full bg-green-600 text-white font-semibold disabled:opacity-60"
              >
                {loading ? "Checking..." : "Check Risk"}
              </button>
            </div>
          </div>
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        </div>

        {/* Map */}
        <div className="mt-4 bg-white rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Map preview</div>
            <div className="text-xs text-gray-400">
              Lat: {lat !== null ? Number(lat).toFixed(6) : "—"} • Lon: {lon !== null ? Number(lon).toFixed(6) : "—"}
            </div>
          </div>
          <div className="h-64 rounded-md overflow-hidden">
            <Map
              viewState={viewState}
              onMove={(evt) => setViewState(evt.viewState)}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              mapboxAccessToken={MAPBOX_TOKEN}
            >
              <NavigationControl position="top-right" />
              <ScaleControl />
              {lat !== null && lon !== null && (
                <Marker latitude={Number(lat)} longitude={Number(lon)} anchor="bottom">
                  <BluePin />
                </Marker>
              )}
            </Map>
          </div>
        </div>

        {/* Risk details */}
        {risk && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Summary */}
            <div className="bg-white rounded-xl p-6 shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${colorForRisk(
                        risk.risk_level
                      )}`}
                    >
                      {risk.risk_level}
                    </span>
                    <div>
                      <div className="text-sm text-gray-500">Assessment</div>
                      <div className="text-lg font-bold">{risk.details.threshold_assessment}</div>
                      <div className="text-xs text-gray-400">Source: {risk.source}</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm text-gray-500 mb-1">Recommendation</div>
                    <div className="text-base text-gray-800 font-medium">{risk.details.recommendation}</div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button className="px-3 py-1 rounded-full border text-sm">Share</button>
                    <button className="px-3 py-1 rounded-full border text-sm">Report</button>
                    <button className="px-3 py-1 rounded-full border text-sm">Save location</button>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-500">Last updated</div>
                  <div className="text-sm text-gray-700 mt-1">{new Date().toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Details (ML + contributing factors) */}
            <div className="bg-white rounded-xl p-4 shadow">
              <h3 className="text-sm font-semibold mb-3">Details</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="text-sm font-medium text-gray-700">User reports</div>
                    <div className="text-xs text-gray-400">Reports submitted by users</div>
                  </div>
                  <div className="text-lg font-bold">{risk.details.user_reports_found ?? 0}</div>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Weather data</div>
                  </div>
                  <div className="text-sm">{risk.details.weather_data_found ? "Available" : "Not found"}</div>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Threshold assessment</div>
                  </div>
                  <div className="text-sm">{risk.details.threshold_assessment || "N/A"}</div>
                </div>

                <div className="py-2 border-b">
                  <div className="text-sm font-medium text-gray-700">ML assessment</div>
                  <div className="mt-1 flex items-center gap-3">
                    {mlLoading ? (
                      <div className="text-sm text-blue-600">ML analysis in progress…</div>
                    ) : (
                      mlAssessmentDisplay(risk.details.ml_assessment)
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mt-2">Contributing factors</div>
                  <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
                    {Array.isArray(risk.details["contributing factors"]) &&
                      risk.details["contributing factors"].map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>

                {risk.details.error && <div className="mt-3 text-sm text-red-600">Error: {risk.details.error}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
