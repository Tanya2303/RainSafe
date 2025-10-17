import React, { useEffect, useState, useMemo } from "react";
import { Bell } from "lucide-react";

/**
 * AlertsPage.jsx
 *
 * Fetches /dashboard-data (expected JSON with `map_points` array)
 * and displays them as alert cards with severity filters + search.
 *
 * Example server payload shape expected:
 * {
 *   "map_points": [
 *     {
 *       "id": "68ef575ed164dc6be43e9ac3",
 *       "latitude": 13.0986699928878,
 *       "longitude": 77.6326599069787,
 *       "risk_level": "High",
 *       "source": "user-report",
 *       "details": "water level rising "
 *     },
 *     ...
 *   ]
 * }
 */

const severityColors = {
  severe: "bg-red-500",
  moderate: "bg-blue-500",
  low: "bg-green-500",
};

const mapRiskToSeverity = (risk_level) => {
  if (!risk_level) return "moderate";
  const r = risk_level.toString().toLowerCase();
  if (r === "high" || r === "critical") return "severe";
  if (r === "medium" || r === "moderate") return "moderate";
  if (r === "low") return "low";
  return "moderate";
};

const mapPointToAlert = (pt) => {
  const severity = mapRiskToSeverity(pt.risk_level);
  const lat = pt.latitude != null ? Number(pt.latitude).toFixed(6) : null;
  const lng = pt.longitude != null ? Number(pt.longitude).toFixed(6) : null;

  return {
    id: pt.id || `${lat}_${lng}`,
    type: pt.details ? pt.details.trim() : (pt.source ? `Report — ${pt.source}` : "Report"),
    location: lat && lng ? `${lat}, ${lng}` : (pt.source || ""),
    time: pt.created_at || "Just now",
    severity,
    raw: pt, // keep raw object for extra use (like opening map / showing more details)
  };
};

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("severe"); // severe | moderate | low | all
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // fetch data from backend
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("http://localhost:8000/dashboard-data", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
        const data = await res.json();

        // ensure data.map_points exists
        const points = Array.isArray(data.map_points) ? data.map_points : [];
        const mapped = points.map(mapPointToAlert).reverse(); // reverse to show newest first if applicable
        if (mounted) {
          setAlerts(mapped);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to fetch data");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    // optional: poll every 30s (uncomment if desired)
    // const iv = setInterval(fetchData, 30000);
    // return () => { mounted = false; clearInterval(iv); };

    return () => {
      mounted = false;
    };
  }, []); // run once on mount

  // filtering + searching
  const filteredAlerts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return alerts.filter((a) => {
      const matchesSeverity = filter === "all" || a.severity === filter;
      if (q === "") {
        return matchesSeverity;
      }

      // search against multiple fields: type/details, location, id, source, lat/lng
      const raw = a.raw || {};
      const candidates = [
        a.type,
        a.location,
        a.id,
        raw.source,
        raw.details,
        raw.latitude && String(raw.latitude),
        raw.longitude && String(raw.longitude),
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());

      const matchesSearch = candidates.some((c) => c.includes(q));
      // if a search query exists, ignore severity filter and search across all
      return matchesSearch;
    });
  }, [alerts, filter, searchQuery]);

  const handleOpenInMaps = (raw) => {
    if (!raw || raw.latitude == null || raw.longitude == null) return;
    const lat = raw.latitude;
    const lng = raw.longitude;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#FFFAED] p-6">
      {/* Header */}
      <div className="bg-[#1F6783] rounded-xl p-8 flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 text-white">
          <Bell className="w-8 h-8 text-white" />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold ">
              {alerts.length} Active Warnings Nearby!
            </h2>
            <p className="text-white text-sm">
              Data from your dashboard feed. Tap a card for details or open in maps.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              // manual refresh
              setLoading(true);
              setError(null);
              fetch("http://localhost:8000/dashboard-data")
                .then((r) => {
                  if (!r.ok) throw new Error(`Server: ${r.status}`);
                  return r.json();
                })
                .then((d) => {
                  const pts = Array.isArray(d.map_points) ? d.map_points : [];
                  setAlerts(pts.map(mapPointToAlert).reverse());
                })
                .catch((e) => setError(e.message || "Failed to refresh"))
                .finally(() => setLoading(false));
            }}
            className="px-3 py-1 rounded-full bg-[#FFFAED] shadow text-sm"
            title="Refresh"
          >
            Refresh
          </button>
          <button className="text-white hover:text-gray-500" title="Alert settings">
            {/* simple settings icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.104 0 2-.896 2-2s-.896-2-2-2-2 .896-2 2 .896 2 2 2zm0 2c-3.314 0-6 2.686-6 6v2h12v-2c0-3.314-2.686-6-6-6z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex gap-3">
          <button
            className={`px-4 py-2 rounded-full font-semibold ${filter === "severe" ? "bg-red-500 text-white" : "bg-[#C0E2DE]"}`}
            onClick={() => setFilter("severe")}
          >
            Severe
          </button>
          <button
            className={`px-4 py-2 rounded-full font-semibold ${filter === "moderate" ? "bg-blue-500 text-white" : "bg-[#C0E2DE]"}`}
            onClick={() => setFilter("moderate")}
          >
            Moderate
          </button>
          <button
            className={`px-4 py-2 rounded-full font-semibold ${filter === "low" ? "bg-green-500 text-white" : "bg-[#C0E2DE]"}`}
            onClick={() => setFilter("low")}
          >
            Low
          </button>
          <button
            className={`px-4 py-2 rounded-full font-semibold ${filter === "all" ? "bg-gray-800 text-white" : "bg-[#C0E2DE]"}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
        </div>

        <div className="flex-1 md:ml-4">
          <input
            type="text"
            placeholder="Filter by id, location (lat,long), source, or keywords (e.g. 'water level' or 'Silk Board')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-96 px-4 py-2 rounded-full border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="mb-4">
          <div className="text-sm text-gray-600">Loading alerts...</div>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <div className="flex items-center justify-between">
              <div>Error: {String(error)}</div>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  // trigger re-fetch via effect by toggling alerts (quick workaround)
                  fetch("http://localhost:8000/dashboard-data")
                    .then((r) => {
                      if (!r.ok) throw new Error(`Server: ${r.status}`);
                      return r.json();
                    })
                    .then((d) => {
                      const pts = Array.isArray(d.map_points) ? d.map_points : [];
                      setAlerts(pts.map(mapPointToAlert).reverse());
                    })
                    .catch((e) => setError(e.message || "Failed to refresh"))
                    .finally(() => setLoading(false));
                }}
                className="text-sm underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAlerts.length === 0 && !loading && (
          <div className="col-span-full text-gray-500">No alerts match your filters / search.</div>
        )}

        {filteredAlerts.map((alert) => (
          <div key={alert.id} className="bg-white rounded-xl shadow p-4 flex items-start gap-4">
            <div className={`w-2 h-full rounded-full ${severityColors[alert.severity]}`} />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-800">{alert.type}</h3>
                  {alert.location && <p className="text-gray-500 text-sm">{alert.location}</p>}
                  <p className="text-gray-400 text-xs">{alert.time}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs px-3 py-1 text-white rounded-full bg-[#1F6783]">{alert.severity.toUpperCase()}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenInMaps(alert.raw)}
                      className="text-sm px-2 py-1 rounded bg-gray-50 border hover:shadow"
                      title="Open location in Google Maps"
                    >
                      Open map
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsPage;
