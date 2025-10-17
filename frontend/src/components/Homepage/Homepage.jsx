// src/pages/Homepage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  MapPin,
  List,
  Wind,
  Thermometer,
  CloudRain,
} from 'lucide-react';
import Map, { Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const DEFAULT_CITY = 'Bengaluru,IN';

// --- Colors / small helpers ---
const COLORS = {
  // 1. Change whole background color to #FDFDFD
  bg: '#FFFAED',
  card: '#fdfdfd',
  textDark: '#06304f',
  cardtext: '#06304f',
  textMuted: '#286198',
  accentBlue: '#e2edeb',
  riskAmber: '#E2EDEB',
  criticalRed: '#1f6783',
  weatherBlue: '#E2EDEB',
  // Define new Welcome Banner background color
  welcomeBg: '#0A5C61',
};

const getMarkerColor = (risk) => {
  switch ((risk || '').toLowerCase()) {
    case 'high':
      return '#EF4444';
    case 'medium':
      return '#F59E0B';
    case 'low':
      return '#10B981';
    default:
      return '#6B7280';
  }
};


// 2. APPLY BACKGROUND TO HEADER (MODIFIED)
const Header = ({ toggleMenu }) => (
  <header 
    className="p-4.5 flex items-center justify-end border-b border-gray-200 lg:sticky lg:top-0 z-30"
    style={{ 
      backgroundColor: COLORS.bg, 
    }}
  >
    <div className="flex items-center space-x-2 p-1 rounded-full transition-colors cursor-pointer">
      <div className="flex items-center justify-center w-8 h-8 rounded-full text-black font-semibold text-sm bg-[#E2EDEB]">
        AJ
      </div>
      {/* Text color uses cardtext for visibility on light background */}
      <span className="hidden sm:block text-sm font-medium" style={{ color: COLORS.cardtext }}>Alyssa Jones</span>
    </div>
  </header>
);

// 3. INCREASE WELCOME BANNER OPACITY (MODIFIED BACKGROUND AND TEXT COLORS)
const WelcomeBanner = () => (
  <div 
    className="p-6 relative overflow-hidden rounded-xl shadow-sm h-full" 
    // 2. Set Welcome Banner background color to #0A5C61
    style={{ backgroundColor: COLORS.welcomeBg }}
  >
    {/* Adjusted overlay color for contrast */}
    <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-15" style={{ backgroundColor: 'white' }} aria-hidden="true" />
    <div className="relative z-10">
      {/* Changed text color to white for contrast */}
      <h1 className="text-5xl font-semibold" style={{ color: 'white' }}>Welcome, Alyssa</h1>
      <p className="text-l mt-1" style={{ color: 'white' }}>Stay informed and prepared with RainSafe.</p>
    </div>
    {/* Adjusted background color for the 'Last updated' badge */}
    <div className="absolute top-2 right-4 text-s px-2 py-1 rounded-md font-medium" style={{ backgroundColor: COLORS.bg, color: COLORS.cardtext }}>Last updated: 5m ago</div>
  </div>
);

const RiskStatCard = ({ value, label, icon: Icon }) => (
  <div className="p-4 rounded-xl shadow-sm border h-full" style={{ borderColor: COLORS.riskAmber, backgroundColor: '#C7E2E9' }}>
    <div className="flex items-start justify-between">
      <h2 className="text-3xl font-bold" style={{ color: COLORS.cardtext }}>{value}</h2>
      {Icon && <Icon className="text-xl mt-1" style={{ color: COLORS.cardtext }} />}
    </div>
    <p className="text-lg font-semibold mt-2" style={{ color: COLORS.cardtext }}>{label}</p>
    <p className="text-xs text-[#06304f]">Probability</p>
  </div>
);

const ChancesOfRainCard = () => (
  <div className="p-4 rounded-xl shadow-lg flex items-center justify-center h-full" style={{ backgroundColor: '#C7E2E9', border: `1px solid ${COLORS.riskAmber}40` }}>
    <p className="text-xl font-bold" style={{ color: COLORS.cardtext }}>chances of rain</p>
  </div>
);

// Report list item now expects a map_point-like object
const ReportListItem = ({ report }) => (
  <div className="flex gap-4 p-4 rounded-xl bg-[#ffffff] border-gray-100 shadow-sm">
    <div className="w-12 h-12 flex items-center justify-center rounded-lg text-[#d4dde3] font-bold text-lg shrink-0" style={{ backgroundColor: COLORS.cardtext }}>
      {report.id ? (report.id.slice(0, 2).toUpperCase()) : 'R?'}
    </div>
    <div className="flex-1">
      <p className="text-base font-semibold leading-snug" style={{ color: COLORS.cardtext }}>{report.details ?? 'No details'}</p>
      <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
        <span className="block line-clamp-1">{report.source ?? '—'}</span>
        <span className="block text-xs font-medium">{report.risk_level ?? 'Unknown'} • {typeof report.latitude === 'number' ? report.latitude.toFixed(4) : '—'},{' '}{typeof report.longitude === 'number' ? report.longitude.toFixed(4) : '—'}</span>
      </p>
    </div>
    <div className="self-end shrink-0">
      <button className="text-xs font-medium hover:text-gray-900 transition-colors" style={{ color: COLORS.textMuted }}>View</button>
    </div>
  </div>
);

// --- RecentFloodReportsList and ActiveAlertsList now consume mapPoints from props ---
const RecentFloodReportsList = ({ mapPoints }) => {
  const firstTwo = (Array.isArray(mapPoints) ? mapPoints.slice(0, 3) : []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: COLORS.cardtext }}>Recent Flood Reports</h2>
      <div className="space-y-4">
        {firstTwo.length === 0 ? (
          <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm text-sm text-gray-500">No recent reports.</div>
        ) : firstTwo.map(point => (
          <ReportListItem key={point.id} report={point} />
        ))}
      </div>
    </div>
  );
};

const ActiveAlertsList = ({ mapPoints }) => {
  // Filter to "High" risk_level items
  const highAlerts = (Array.isArray(mapPoints) ? mapPoints.filter(p => (p.risk_level || '').toLowerCase() === 'high') : []);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold" style={{ color: COLORS.cardtext }}>Active Alerts</h3>
      <div className="space-y-3 p-4 rounded-xl bg-[#ffffff] border border-gray-100 shadow-sm max-h-96 overflow-y-auto">
        {highAlerts.length === 0 && <div className="text-sm text-gray-500 italic">No high-risk alerts.</div>}
        {highAlerts.map(alert => (
          <div key={alert.id} className="flex items-start gap-3">
            {/* Kept criticalRed as COLORS.cardtext for now, which is #06304f */}
            <div className="w-2 h-2 mt-2 rounded-full shrink-0" style={{ backgroundColor: COLORS.cardtext }}></div>
            <div className="flex-1">
              <p className="text-sm font-medium leading-tight" style={{ color: COLORS.cardtext }}>{alert.details ?? 'High risk reported'}</p>
              <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{alert.source ?? '—'}</p>
              <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{typeof alert.latitude === 'number' ? alert.latitude.toFixed(4) : '—'}, {typeof alert.longitude === 'number' ? alert.longitude.toFixed(4) : '—'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- WeatherCard (cleanup: added AbortController logic) ---
const WeatherCard = () => {
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchWeather = async () => {
      if (!OPENWEATHER_API_KEY) {
        setWeatherError("OpenWeather API Key is missing or not configured.");
        setLoadingWeather(false);
        return;
      }
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${DEFAULT_CITY}&appid=${OPENWEATHER_API_KEY}&units=metric`;
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        setWeather(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Weather fetch error:", err);
          setWeatherError(err.message || "Could not load weather.");
        }
      } finally {
        if (!controller.signal.aborted) setLoadingWeather(false);
      }
    };
    
    fetchWeather();

    return () => controller.abort();
  }, []);

  if (loadingWeather) {
    return (
      <div className="p-4 rounded-xl shadow-lg h-full min-h-48 lg:min-h-56 flex items-center justify-center" style={{ backgroundColor: COLORS.weatherBlue }}>
        <p className="text-3xl font-bold text-gray-900">todays weather</p>
      </div>
    );
  }

  if (weatherError) {
    return (
      <div className="p-4 rounded-xl shadow-lg h-full min-h-48 lg:min-h-56 flex items-center justify-center" style={{ backgroundColor: COLORS.weatherBlue }}>
        <div className="text-center">
          <AlertTriangle className="w-6 h-6 text-red-600 mx-auto" />
          <p className="mt-2 text-xs text-red-600">{weatherError}</p>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="p-4 rounded-xl shadow-lg h-full min-h-48 lg:min-h-56 flex items-center justify-center" style={{ backgroundColor: COLORS.weatherBlue }}>
        <p className="text-sm text-gray-700">No weather data available.</p>
      </div>
    );
  }

  const temp = Math.round(weather.main.temp);
  const description = weather.weather[0].description;
  const iconCode = weather.weather[0].icon;
  const city = weather.name;

  return (
    <div className="p-4 rounded-xl shadow-lg h-full min-h-48 lg:min-h-56 flex items-center justify-center" style={{ backgroundColor: '#C0E2DE'}}>
      <div className="flex flex-col items-center justify-center h-full text-[#06304f]">
        <div className="text-center mb-2">
          <p className="text-xl font-bold uppercase">{city}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <img src={`https://openweathermap.org/img/wn/${iconCode}@2x.png`} alt={description} className="w-16 h-16" />
            <p className="text-5xl font-extrabold">{temp}°C</p>
          </div>
        </div>
        <p className="text-lg font-semibold capitalize mt-2">{description}</p>
        <div className="flex space-x-4 text-sm mt-3 text-[#06304f]">
          <div className="flex items-center">
            <Thermometer className="w-4 h-4 mr-1" />
            <span>Feels: {Math.round(weather.main.feels_like)}°C</span>
          </div>
          <div className="flex items-center">
            <Wind className="w-4 h-4 mr-1" />
            <span>{Math.round(weather.wind.speed)} m/s</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Pin SVG used for markers (unchanged) ---
const Pin = ({ color = '#6B7280' }) => (
  <svg height="28" viewBox="0 0 24 24" style={{ cursor: 'pointer', fill: color, stroke: 'none' }}>
    <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
  </svg>
);

// --- HomeMap component (unchanged) ---
const HomeMap = ({ mapPoints }) => {
  const [popupInfo, setPopupInfo] = useState(null);

  // Determine initial view
  const initialViewState = useMemo(() => {
    const validPoints = (Array.isArray(mapPoints) ? mapPoints.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude >= -90 && p.latitude <= 90) : []);
    if (validPoints.length > 0) {
      return {
        latitude: validPoints[0].latitude,
        longitude: validPoints[0].longitude,
        zoom: 15,
        bearing: 0,
        pitch: 0,
      };
    }
    // Default to Bengaluru area
    return {
      latitude: 12.9716,
      longitude: 77.5946,
      zoom: 10,
      bearing: 0,
      pitch: 0,
    };
  }, [mapPoints]);

  const pins = useMemo(() => (Array.isArray(mapPoints) ? mapPoints.map((point, idx) => {
    if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number' || point.latitude < -90 || point.latitude > 90) return null;
    return (
      <Marker
        key={point.id ?? idx}
        longitude={point.longitude}
        latitude={point.latitude}
        anchor="bottom"
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setPopupInfo(point);
        }}
      >
        <Pin color={getMarkerColor(point.risk_level)} />
      </Marker>
    );
  }).filter(Boolean) : []), [mapPoints]);

  return (
    <div className="p-4 rounded-xl shadow-lg h-full bg-white border-gray-100">
      <div className="p-4 bg-[#ffffff] border-b border-gray-200 rounded-t-xl mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-[#06304f]" /> Flood Risk Map
        </h3>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
            <span>High Risk</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span>Low Risk</span>
          </div>
        </div>
      </div>

      <div className="w-full h-[420px] rounded-b-xl overflow-hidden">
        <Map
          initialViewState={initialViewState}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          minZoom={6}
          maxZoom={18}
        >
          <NavigationControl position="top-right" />
          <ScaleControl />

          {pins}

          {popupInfo && (
            <Popup
              anchor="top"
              longitude={Number(popupInfo.longitude)}
              latitude={Number(popupInfo.latitude)}
              onClose={() => setPopupInfo(null)}
              closeButton={true}
              closeOnClick={false}
            >
              <div className="p-2 max-w-xs">
                <div className={`font-bold text-sm mb-2 ${
                  (popupInfo.risk_level || '').toLowerCase() === 'high' ? 'text-red-600' :
                  (popupInfo.risk_level || '').toLowerCase() === 'medium' ? 'text-yellow-600' :
                  (popupInfo.risk_level || '').toLowerCase() === 'low' ? 'text-green-600' :
                  'text-gray-600'
                }`}>
                  {popupInfo.risk_level || 'Unknown'} Risk
                </div>
                <div className="text-xs text-gray-700 mb-1">
                  <strong>Details:</strong> {popupInfo.details || 'No details'}
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  <strong>Source:</strong> {popupInfo.source || 'Unknown'}
                </div>
                <div className="text-xs text-gray-500">
                  {typeof popupInfo.latitude === 'number' ? popupInfo.latitude.toFixed(4) : '—'}, {typeof popupInfo.longitude === 'number' ? popupInfo.longitude.toFixed(4) : '—'}
                </div>
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
};

// --- HomeContent: fetch dashboard-data and share mapPoints to children ---
const HomeContent = () => {
  const [mapPoints, setMapPoints] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [pointsError, setPointsError] = useState(null);

  const fetchDashboardData = useCallback(async (signal) => {
    // Only show loading on initial mount
    if (mapPoints.length === 0) setLoadingPoints(true);
    setPointsError(null);

    try {
      const res = await fetch('http://localhost:8000/dashboard-data', { signal });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Dashboard fetch failed: HTTP ${res.status} ${res.statusText} ${text ? `- ${text}` : ''}`);
      }
      const payload = await res.json();
      setMapPoints(Array.isArray(payload.map_points) ? payload.map_points : []);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to fetch dashboard-data:', err);
        setPointsError(err.message || 'Failed to fetch dashboard-data');
      }
    } finally {
      if (!signal.aborted) setLoadingPoints(false);
    }
  }, [mapPoints.length]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(controller.signal);

    const id = setInterval(() => {
      fetchDashboardData(controller.signal);
    }, 30000);

    return () => {
      clearInterval(id);
      controller.abort();
    };
  }, [fetchDashboardData]);

  // Updated to use a simple background color style
  const mainBackgroundStyle = {
    backgroundColor: COLORS.bg,
    minHeight: '100vh', 
  };

  return (
    <div className="p-4 md:p-6 pb-24 space-y-6" style={mainBackgroundStyle}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7"><WelcomeBanner /></div>
        <div className="lg:col-span-5"><WeatherCard /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-1">
              {loadingPoints ? (
                <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm text-sm text-gray-500">Loading recent reports…</div>
              ) : pointsError ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 shadow-sm">{pointsError}</div>
              ) : (
                <RecentFloodReportsList mapPoints={mapPoints} />
              )}
            </div>

            <div className="md:col-span-1">
              {loadingPoints ? (
                <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm text-sm text-gray-500">Loading alerts…</div>
              ) : pointsError ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 shadow-sm">{pointsError}</div>
              ) : (
                <ActiveAlertsList mapPoints={mapPoints} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-1">
              <RiskStatCard value="35%" label="MEDIUM Risk" icon={AlertTriangle} />
            </div>
            <div className="md:col-span-1"><ChancesOfRainCard /></div>
          </div>
        </div>

        <div className="lg:col-span-5">
          {/* Pass mapPoints to HomeMap */}
          <HomeMap mapPoints={mapPoints} />
        </div>
      </div>
    </div>
  );
};

const Homepage = ({ toggleMenu }) => (
  <>
    <Header toggleMenu={toggleMenu} />
    <main>
      <HomeContent />
    </main>
  </>
);

export default Homepage;