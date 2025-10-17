// components/RiskSection/RiskSection.jsx
import React, { useState, useRef } from "react";
import Map, { Marker, NavigationControl, ScaleControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
// Illustration kept only if you want; not used in assessment card
import RiskIllustration from '../../assets/img.png';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const API_BASE = import.meta.env.VITE_API_BASE || ""; // e.g. http://localhost:8000

const colorForRisk = (r) => {
  const level = normalizeRiskLevel(r);
  if (level === "High") return { bg: "bg-red-500", text: "text-white" };
  if (level === "Medium") return { bg: "bg-amber-500", text: "text-black" };
  if (level === "Low") return { bg: "bg-green-500", text: "text-white" };
  return { bg: "bg-gray-200", text: "text-gray-800" };
};

// Normalize top-level risk_level values to expected set (High/Medium/Low/Unknown)
const normalizeRiskLevel = (val) => {
  if (val === null || val === undefined) return "Unknown";
  const key = String(val).trim().toLowerCase();
  if (key === "high") return "High";
  if (key === "medium") return "Medium";
  if (key === "low") return "Low";
  return "Unknown";
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
  const [loading, setLoading] = useState(false); // loading overall for search/check
  const [risk, setRisk] = useState(null); // full normalized risk object
  const [error, setError] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

  // For recommendation "Read more"
  const [recExpanded, setRecExpanded] = useState(false);

  // Controlled map view state so the map recenters when lat/lon change
  const [viewState, setViewState] = useState({
    latitude: 15.3173,
    longitude: 75.7139,
    zoom: 5,
    bearing: 0,
    pitch: 0,
  });

  // ref to the Map component so we can call map methods (flyTo) without making it fully controlled
  const mapRef = useRef(null);

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
  const setCoordsAndCenter = (latitude, longitude, { zoom = 12, animate = true } = {}) => {
    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    setLat(latNum);
    setLon(lonNum);
    // update viewState locally so the UI lat/lon text updates
    setViewState((vs) => ({
      ...vs,
      latitude: latNum,
      longitude: lonNum,
      zoom,
    }));

    // If mapRef is ready, fly to the new center (Mapbox expects [lng, lat])
    try {
      const mapInstance = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
      if (mapInstance && typeof mapInstance.flyTo === "function") {
        mapInstance.flyTo({
          center: [lonNum, latNum],
          zoom,
          essential: true,
          ...(animate ? { speed: 1.2, curve: 1.4 } : {}),
        });
      }
    } catch (err) {
      // ignore if map ref not ready or method not available
    }
  };

  // Set coordinates from search (does NOT fetch risk)
  const handleSearchLocation = async () => {
    setError(null);
    setRisk(null); // Clear previous risk (and remove left card)
    setRecExpanded(false);
    if (!locationQuery) return setError("Enter a location name.");
    setLoading(true);
    try {
      const result = await geocodeLocation(locationQuery);
      // center and zoom when searching
      setCoordsAndCenter(result.lat, result.lng, { zoom: 12, animate: true });
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
    setRecExpanded(false);
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // center and zoom to the user's location
        setCoordsAndCenter(pos.coords.latitude, pos.coords.longitude, { zoom: 12, animate: true });
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
    const normalizedRiskLevel = normalizeRiskLevel(payload.risk_level ?? payload.risk ?? null);

    const normalized = {
      // ONLY use top-level risk_level for the badge and display
      risk_level: normalizedRiskLevel,
      source: payload.source ?? "backend",
      details: {
        user_reports_found: payload.details?.user_reports_found ?? payload.user_reports_found ?? 0,
        recommendation: payload.details?.recommendation ?? payload.recommendation ?? null,
        // keep ml/threshold in details if you want to show elsewhere later, but don't use them for the badge
        threshold_assessment: payload.details?.threshold_assessment ?? payload.threshold_assessment ?? null,
        ml_assessment: payload.details?.ml_assessment ?? payload.ml_assessment ?? null,
        weather_data_found: payload.details?.weather_data_found ?? payload.weather_data_found ?? false,
        contributing_factors: payload.details?.contributing_factors ?? payload.contributing_factors ?? [],
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
    setRisk(null); // remove any existing risk/details card immediately (per requirement)
    setRecExpanded(false);
    try {
      const data = await callRiskEndpoint(lat, lon);

      // We treat ML as supplemental but the badge must always be the top-level normalized risk_level
      setRisk(data);

      // Optionally handle ml polling if your backend provides asynchronous ML updates. We'll keep previous polling logic but it won't change which value is shown in the badge.
      const mlVal = data.details?.ml_assessment;
      const mlIsPending = !mlVal || String(mlVal).toLowerCase() === "unknown";

      if (mlIsPending) {
        setMlLoading(true);
        const maxTries = 6;
        const intervalMs = 2000;
        for (let i = 0; i < maxTries; i++) {
          await new Promise((r) => setTimeout(r, intervalMs));
          try {
            const refreshed = await callRiskEndpoint(lat, lon);
            const refreshedMl = refreshed.details?.ml_assessment;
            if (refreshedMl && String(refreshedMl).toLowerCase() !== "unknown") {
              // update details but do NOT override top-level risk_level
              setRisk((prev) => ({ ...refreshed, risk_level: prev?.risk_level ?? refreshed.risk_level }));
              setMlLoading(false);
              break;
            }
          } catch (err) {
            // ignore transient poll errors
          }
          if (i === maxTries - 1) setMlLoading(false);
        }
      }
    } catch (e) {
      setError(e.message || "Failed to fetch risk. Try again.");
      setMlLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Recommendation text with truncation + Read more
  const RecommendationBlock = ({ text }) => {
    const safeText = text ?? "No recommendation available.";
    const limit = 140;
    const isLong = safeText.length > limit;
    const preview = isLong ? safeText.slice(0, limit).trim() + "…" : safeText;

    return (
      <div>
        <div className="text-sm text-gray-500 mb-1">Recommendation</div>
        <div className="text-base text-gray-800 font-medium">
          {isLong && !recExpanded ? preview : safeText}
        </div>
        {isLong && (
          <button
            onClick={() => setRecExpanded((s) => !s)}
            className="mt-2 text-xs text-blue-600 hover:underline"
            aria-expanded={recExpanded}
          >
            {recExpanded ? "Read less" : "Read more"}
          </button>
        )}
      </div>
    );
  };

  // Small compact spinner/skeleton used inside assessment card while waiting
  const CompactSpinner = () => (
    <div className="flex items-center gap-3">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth="3" stroke="currentColor" className="opacity-25"></circle>
        <path d="M22 12a10 10 0 00-10-10" strokeWidth="3" strokeLinecap="round" stroke="currentColor"></path>
      </svg>
      <div className="flex-1 space-y-2">
        <div className="w-36 h-3 bg-gray-200 rounded animate-pulse" />
        <div className="w-24 h-3 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );

  // Display risk level badge using only top-level risk_level
  const renderRiskBadge = (rLevel) => {
    const normalized = normalizeRiskLevel(rLevel);
    const colors = colorForRisk(normalized);
    return (
      <span
        className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${colors.bg} ${colors.text}`}
        aria-label={`Risk level ${normalized}`}
      >
        {normalized}
      </span>
    );
  };

  const mapColClass = loading || risk ? 'lg:col-span-3' : 'lg:col-span-5';

  // NOTE: To avoid a re-render loop, we pass `initialViewState` to the Map (uncontrolled initial position)
  // and only update local viewState on user moves. This prevents the Map from being continuously re-rendered
  // when Map itself emits move events.

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: "#FFFAED" }}>
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

        {/* MAIN GRID: when risk exists we show two columns (assessment + map), otherwise map full width */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
          {/* LEFT: Assessment card — only visible after Check Risk is clicked (risk state will be non-null).
              While request in progress we show a compact skeleton/spinner inside the same card (but we create the card only when checking or when risk exists)
          */}
          {(loading || risk) && (
            <div
              className="lg:col-span-2 transition-all duration-300 ease-out transform"
              style={{ willChange: "transform, opacity" }}
            >
              <div className="bg-white rounded-xl p-6 shadow-lg h-96 overflow-auto">
                {/* Top row: Risk badge and label (or spinner if loading) */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <CompactSpinner />
                        </div>
                      ) : (
                        <>
                          {renderRiskBadge(risk?.risk_level)}
                          <div>
                            <div className="text-sm text-gray-500">Assessment</div>
                            <div className="text-lg font-bold">
                              {/* ALWAYS show only the top-level risk_level here */}
                              {risk?.risk_level ?? "Unknown"}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500">Last updated</div>
                    <div className="text-sm text-gray-700 mt-1">{new Date().toLocaleString()}</div>
                  </div>
                </div>

                {/* Body: Reports found + Recommendation (only these three items as requested) */}
                <div className="mt-6 space-y-4">
                  {/* Reports found */}
                  <div>
                    <div className="text-sm font-medium text-gray-700">Reports found</div>
                    <div className="text-lg font-bold">
                      {loading ? "—" : (risk?.details?.user_reports_found ?? 0)}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div>
                    {loading ? (
                      <div className="space-y-2">
                        <div className="w-full h-3 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-3/4 h-3 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ) : (
                      <RecommendationBlock text={risk?.details?.recommendation ?? null} />
                    )}
                  </div>

                  {/* Small actions (optional) */}
                  <div className="flex gap-2">
                    <button className="px-3 py-1 rounded-full border text-sm">Share</button>
                    <button className="px-3 py-1 rounded-full border text-sm">Report</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RIGHT: Map (spans 3 when risk card present, else spans all 5) */}
          <div className={`${mapColClass} bg-white rounded-xl p-4 shadow`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Map preview</div>
              <div className="text-xs text-gray-400">
                Lat: {lat !== null ? Number(lat).toFixed(6) : "—"} • Lon: {lon !== null ? Number(lon).toFixed(6) : "—"}
              </div>
            </div>
            <div className="h-96 rounded-md overflow-hidden">
              <Map
                ref={mapRef}
                // use initialViewState to avoid a re-render loop when the Map emits move events
                initialViewState={viewState}
                // update local viewState only when user moves the map; we guard small changes to avoid setting the same state repeatedly
                onMove={(evt) => {
                  const v = evt.viewState || evt.viewport || {};
                  setViewState((prev) => {
                    const latChanged = Math.abs((prev.latitude || 0) - (v.latitude || 0)) > 1e-6;
                    const lonChanged = Math.abs((prev.longitude || 0) - (v.longitude || 0)) > 1e-6;
                    const zoomChanged = Math.abs((prev.zoom || 0) - (v.zoom || 0)) > 1e-6;
                    if (!latChanged && !lonChanged && !zoomChanged) return prev;
                    return { ...prev, latitude: v.latitude, longitude: v.longitude, zoom: v.zoom };
                  });
                }}
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
        </div>
      </div>
    </div>
  );
}
