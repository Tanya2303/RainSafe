import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapPin, AlertTriangle, List, BarChart2 } from 'lucide-react';
import Map, { Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// Assuming FixedHeader is in a separate file (e.g., './FixedHeader')
// If you cannot create a new file, you must define the FixedHeader component 
// within this file and change the imports accordingly.
// For demonstration, I will integrate the fixed header content directly 
// into the existing DashboardPage to keep it a single file change.

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
// Define the target heading color
const HEADING_COLOR = '#06304f'; 

// Define the new background color
const PAGE_BG_COLOR = '#FFFAED'; // The requested background color

// --- Header Component Definition (Integrated for simplicity) ---
const HeaderContent = () => (
    // Reinstated top and bottom padding here
    <header className="p-4 md:p-8 pb-0">
        <h1 className="text-[3rem] font-extrabold flex items-center " style={{ color: HEADING_COLOR }}>
            <MapPin className="w-8 h-8 mr-2 text-[#06304f]" /> Flood Monitoring Dashboard
        </h1>
        {/* Helper text color changed */}
        <p className="mt-1" style={{ color: HEADING_COLOR }}>Overview of real-time user-reported flood data. Data refreshes every 30 seconds.</p>
    </header>
);
// -----------------------------------------------------------------

// Helper function to determine badge color
const getRiskColor = (risk = '') => {
  switch ((risk || '').toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'medium':
    case 'moderate': // Added moderate as it often falls here
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Component to display a single dashboard card with a count
const StatCard = ({ title, count, icon: Icon, color }) => (
  <div className={`p-6 bg-[#FFFFFF] rounded-xl shadow-lg border-l-4 ${color} transform transition duration-300 hover:scale-[1.02]`}>
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium uppercase tracking-wider" style={{ color: HEADING_COLOR }}>{title}</p>
      <Icon className={`w-6 h-6 ${color.replace('border-', 'text-')}`} />
    </div>
    <p className="text-3xl font-bold mt-1 text-gray-900">{count}</p>
  </div>
);

// Pin component for markers
const Pin = ({ color }) => (
  <svg height="24" viewBox="0 0 24 24" style={{ cursor: 'pointer', fill: color, stroke: 'none' }}>
    <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
  </svg>
);

// Main Dashboard Component
const DashboardPage = () => {
  const [data, setData] = useState({ 
    map_points: [], 
    stats: { total_reports: 0, high_risk_count: 0, medium_risk_count: 0 } 
  });
  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('Map');

  const fetchData = useCallback(async (controller) => {
    if (data.map_points.length === 0) setLoading(true); 
    setError(null);

    try {
      const [dashboardRes, alertsRes] = await Promise.all([
        fetch('http://localhost:8000/dashboard-data', { signal: controller.signal }),
        fetch('http://localhost:8000/alerts/recent', { signal: controller.signal })
      ]);

      if (!dashboardRes.ok) {
        const text = await dashboardRes.text().catch(() => '');
        throw new Error(`Dashboard fetch failed: HTTP ${dashboardRes.status} ${dashboardRes.statusText} ${text ? `- ${text}` : ''}`);
      }
      if (!alertsRes.ok) {
        const text = await alertsRes.text().catch(() => '');
        throw new Error(`Alerts fetch failed: HTTP ${alertsRes.status} ${alertsRes.statusText} ${text ? `- ${text}` : ''}`);
      }

      const dashboardPayload = await dashboardRes.json();
      const alertsPayload = await alertsRes.json();

      setData({
        map_points: Array.isArray(dashboardPayload.map_points) ? dashboardPayload.map_points : [],
        stats: dashboardPayload.stats ?? { total_reports: 0, high_risk_count: 0, medium_risk_count: 0 },
      });
      setAlerts(Array.isArray(alertsPayload) ? alertsPayload : []);

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to fetch data:', err);
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [data.map_points.length]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller);

    const intervalId = setInterval(() => {
      fetchData(controller);
    }, 30000);

    return () => {
      clearInterval(intervalId);
      controller.abort();
    };
  }, [fetchData]);

  const { map_points, stats } = data;
  const totalReports = stats.total_reports;
  const highRiskCount = stats.high_risk_count;
  const mediumRiskCount = stats.medium_risk_count;


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

  const pins = useMemo(
    () =>
      map_points.map((point, index) => {
        if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number' || point.latitude < -90 || point.latitude > 90) return null;
        
        return (
          <Marker
            key={point.id || index}
            longitude={point.longitude}
            latitude={point.latitude}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setPopupInfo(point);
            }}
          >
            <Pin color={getMarkerColor(point.risk_level)} />
          </Marker>
        );
      }).filter(Boolean),
    [map_points]
  );

  const ReportsTable = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg mt-6 overflow-x-auto">
      <h3 className="text-xl font-semibold mb-4 flex items-center" style={{ color: HEADING_COLOR }}>
        <List className="w-5 h-5 mr-2 text-blue-500" /> Latest User Reports
      </h3>

      {map_points.length === 0 ? (
        <p className="text-sm text-gray-500">No reports available.</p>
      ) : (
        <>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latitude/Longitude</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {map_points.slice(0, 10).map((point, index) => (
                <tr key={point.id ?? index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getRiskColor(point.risk_level)}`}>
                      {point.risk_level ?? 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {typeof point.latitude === 'number' ? point.latitude.toFixed(4) : '—'}, {typeof point.longitude === 'number' ? point.longitude.toFixed(4) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-800 max-w-xs truncate">{point.details ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{point.source ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-center text-gray-500 mt-4">Showing {map_points.length > 10 ? '10' : map_points.length} of {map_points.length} total reports.</p>
        </>
      )}
    </div>
  );

  const MapSection = () => {
    const initialViewState = useMemo(() => {
      const validPoints = map_points.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude >= -90 && p.latitude <= 90);
      
      if (validPoints.length > 0) {
        return {
          latitude: validPoints[0].latitude,
          longitude: validPoints[0].longitude,
          zoom: 11,
          bearing: 0,
          pitch: 0
        };
      }
      return {
        latitude: 15.3173,
        longitude: 75.7139,
        zoom: 7,
        bearing: 0,
        pitch: 0
      };
    }, [map_points]);
    

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center" style={{ color: HEADING_COLOR }}>
            <MapPin className="w-5 h-5 mr-2 text-blue-500" /> Flood Risk Map
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
        <div className="w-full h-[500px]">
          <Map
            initialViewState={initialViewState}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={MAPBOX_TOKEN}
            minZoom={10}
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
                <div className="p-2">
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
                    {popupInfo.latitude.toFixed(4)}, {popupInfo.longitude.toFixed(4)}
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </div>
      </div>
    );
  };

  const AlertPage = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg h-[500px]">
      <h3 className="text-xl font-semibold mb-4 flex items-center" style={{ color: HEADING_COLOR }}>
        <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" /> Active Alerts Summary
      </h3>
      <div className="space-y-4 overflow-y-auto max-h-[380px] pr-2">
        {alerts.map((alert, index) => (
          <div key={alert._id ?? index} className="flex items-start p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                Critical Alert: <span className="font-semibold">{alert.message ?? '—'}</span>
              </p>
              <p className="text-xs text-red-600 mt-1">Location: {alert.location_name ?? 'N/A'}</p>
              <p className="text-xs text-red-600">Source: {alert.source ?? '—'}</p>
              {alert.sent_at && <p className="text-xs text-red-600">Sent: {new Date(alert.sent_at).toLocaleString()}</p>}
            </div>
          </div>
        ))}
        {alerts.length === 0 && <p className="text-gray-500 italic">No alerts currently active.</p>}
      </div>
      <p className="text-sm text-gray-600 mt-6">This section displays official flood alerts sent by the system.</p>
    </div>
  );

  return (
    // ✅ 1. Outer container: sets the background for the entire content area
    <div 
      className="min-h-screen" 
      style={{ backgroundColor: PAGE_BG_COLOR }}
    >
      
      {/* ✅ 2. Header Content: The header's padding classes (p-4 md:p-8) are now applied 
        directly to the HeaderContent wrapper, allowing the PAGE_BG_COLOR to show 
        in the background of the header area.
      */}
      <HeaderContent />

      {/* ✅ 3. Inner content wrapper: applies horizontal padding and bottom padding */}
      <div className="px-4 md:px-8 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-gray-600">
              <svg className="animate-spin w-8 h-8 mx-auto mb-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p>Loading dashboard data…</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            <strong className="font-medium">Error:</strong> {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Total Reports" 
            count={totalReports} 
            icon={List} 
            color="border-blue-500"
          />
          <StatCard 
            title="High Risk Areas" 
            count={highRiskCount} 
            icon={AlertTriangle} 
            color="border-red-500"
          />
          <StatCard 
            title="Medium Risk Areas" 
            count={mediumRiskCount} 
            icon={BarChart2} 
            color="border-yellow-500"
          />
        </div>
        
        <div className="flex border-b border-gray-200 mb-6">
          {['Map', 'Reports', 'Alerts'].map((tab) => (
            <button
              key={tab}
              className={`py-2 px-4 text-sm font-medium transition duration-150 ease-in-out ${
                activeTab === tab 
                  ? 'border-b-2 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab)}
              style={{ 
                color: activeTab === tab ? HEADING_COLOR : undefined,
                borderColor: activeTab === tab ? '#3B82F6' : undefined,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            {activeTab === 'Map' && <MapSection />}
            {activeTab === 'Reports' && <ReportsTable />}
            {activeTab === 'Alerts' && <AlertPage />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
