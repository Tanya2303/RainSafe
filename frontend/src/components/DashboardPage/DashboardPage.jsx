import React from 'react';
import {
  Activity,
  AlertTriangle,
  Zap,
  Eye,
  Shield,
} from 'lucide-react';

// --- Import Reusable Components (Updated paths) ---
import RiskCard from './RiskCard';
import NearbyReportsMiniMap from './NearbyReportsMiniMap';
import StatCardHorizontal from './StatCardHorizontal';
import ActiveAlertsList from './ActiveAlertsList';
import RecentReportItem from './RecentReportItem';

// --- Local Constants & Data ---

const COLORS = {
  bg: '#F5F7FA',
  textDark: '#333333',
  accentBlue: '#6A96FF',
  accentRed: '#EF5350',
  accentGreen: '#32A852',
  accentPurple: '#5B4B8A',
  textMuted: '#888888',
};

// Mock Data
const activeAlerts = [
    { title: 'Silk Boad Underpass', coordinate: '25°29’12’9325', location: 'Nogron B 3215' },
    { title: 'Dairy Circle Traffic', coordinate: '25°29’12’9325', location: 'Nogron B 3215' },
];
const recentReports = [
    { id: 1, title: 'Silk Boad Underpass By', description: 'Sett ecnoset reporhertsn', coordinate: '13°55’97 / 8°80’PC', img: 'https://placehold.co/60x60/6A96FF/fff?text=R1' },
    { id: 2, title: 'Dairy Circle Traffic', description: 'Sett ecnoset reporhertsn', coordinate: '13°55’97 / 8°80’PC', img: 'https://placehold.co/60x60/32A852/fff?text=R2' },
    { id: 3, title: 'Vidih A Trireml Eosmen Yatde', description: 'Sett ecnoset reporhertsn', coordinate: '18°55’97 / 8°53’PC', img: 'https://placehold.co/60x60/EF5350/fff?text=R3' },
];


// --- Dashboard Layout Component ---

const DashboardPage = () => {
  return (
    <div className="p-4 md:p-6 pb-24 space-y-6" style={{ backgroundColor: COLORS.bg }}>
      
      {/* 1. Top Section (Risk Banner & Nearby Reports Map) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <RiskCard />
        </div>
        <div className="lg:col-span-1">
            <NearbyReportsMiniMap />
        </div>
      </div>

      {/* 2. Middle Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCardHorizontal 
          value="15" 
          label="Active Alerts" 
          color={COLORS.accentPurple} 
          icon={AlertTriangle}
        />
        <StatCardHorizontal 
          value="4" 
          label="Critical Reports Today" 
          color={COLORS.accentRed} 
          icon={Zap}
        />
        <StatCardHorizontal 
          value="92" 
          label="Recent Views" 
          color={COLORS.accentBlue} 
          icon={Eye}
        />
        <StatCardHorizontal 
          value="92" 
          label="Recent Views" 
          color={COLORS.accentGreen} 
          icon={Eye}
        />
        <StatCardHorizontal 
          value="92" 
          label="Recent Views" 
          color={COLORS.accentBlue} 
          icon={Eye}
        />
        <StatCardHorizontal 
          value="88%" 
          label="Model Confidence" 
          color={COLORS.accentRed} 
          icon={Shield}
        />
      </div>

      {/* 3. Bottom Section (Active Alerts, Trend & Reports) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Active Alerts & Trend) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Active Alerts List Component */}
          <ActiveAlertsList alerts={activeAlerts} />
          
          {/* Trend & Analytics Card (Remains in DashboardPage for simpler layout file) */}
          <div className="p-5 rounded-2xl shadow-xl bg-white">
            <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.textDark }}>Trend & Analytics</h2>
            <p className="text-sm font-medium" style={{ color: COLORS.textMuted }}>Reports in Last 24h</p>
            <p className="text-3xl font-extrabold" style={{ color: COLORS.textDark }}>83%</p>
            <div className="h-24 w-full bg-gray-50 flex items-center justify-center rounded-lg border border-dashed border-gray-300 mt-3">
              <Activity size={32} className="text-gray-400" />
            </div>
            <p className="text-sm mt-4 text-center" style={{ color: COLORS.textMuted }}>
              5 critical reports in 10 hours
            </p>
          </div>
        </div>

        {/* Right Column (Recent Flood Reports) */}
        <div className="lg:col-span-2">
            <div className="p-5 rounded-2xl shadow-xl bg-white h-full">
                <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.textDark }}>Recent Flood Reports</h2>
                <div className="space-y-4">
                    {recentReports.map(report => (
                        <RecentReportItem key={report.id} report={report} />
                    ))}
                </div>
            </div>
        </div>
      </div>
      
      {/* 4. Quick Report Action Strip */}
      <div className="p-5 rounded-2xl shadow-lg bg-white mt-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.textDark }}>Quick Report Action Strip</h2>
        <div className="flex flex-col sm:flex-row gap-4">
            <button
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[.98]"
                style={{ backgroundColor: COLORS.accentBlue, boxShadow: `0 4px 14px 0 ${COLORS.accentBlue}40` }}
            >
                Report Pletb
            </button>
            <button
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 hover:bg-yellow-50 active:scale-[.98] border border-yellow-300"
                style={{ backgroundColor: '#FFC107', color: COLORS.textDark, boxShadow: `0 4px 14px 0 #FFC10740` }}
            >
                Share Location
            </button>
            <button
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-100 active:scale-[.98] border border-gray-300"
                style={{ backgroundColor: 'white', color: COLORS.textDark }}
            >
                Request Help
            </button>
        </div>
    </div>
    </div>
  );
};

export default DashboardPage;