import React, { useState } from 'react';
import {
  Bell,
  User,
  MapPin,
  AlertTriangle,
  Eye,
  Activity,
  ChevronDown,
  Menu,
  X,
  Plus,
  Grid,
  Map,
  Layers,
  Heart,
  MessageSquare,
  Compass,
  Zap,
  Star,
  Globe,
  Settings,
} from 'lucide-react';

// --- Configuration & Constants (Moved colors back for content styling) ---

const COLORS = {
  bg: '#F5F7FA', // Light Background
  sidebar: '#FFFFFF',
  textDark: '#333333',
  textMuted: '#888888',
  accentBlue: '#6A96FF',
  accentDarkBlue: '#3B68B8', 
  mediumRisk: '#FF8C00', // Orange
  activeAlerts: '#5B4B8A', // Dark Purple/Indigo
  recentViews: '#32A852', // Green
  criticalReports: '#EF5350', // Red
};

// --- 2. Header Component ---

const Header = ({ toggleMenu }) => {
  // Re-added the header with the correct date and user profile
  return (
    <header className="p-4 md:p-6 flex items-center justify-between bg-white border-b border-gray-200 lg:sticky lg:top-0 z-30">
      <div className="flex items-center space-x-4">
        <button className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg" onClick={toggleMenu}>
          <Menu size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: COLORS.textDark }}>Homepage</h1>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>Monday, 20 November 2023</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Notification Icon */}
        <button className="p-2 text-gray-700 hover:bg-gray-100 rounded-full relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
          <div className="flex items-center justify-center w-8 h-8 rounded-full text-white font-semibold text-sm" style={{ backgroundColor: COLORS.accentDarkBlue }}>
            AJ
          </div>
          <span className="hidden sm:block text-sm font-medium" style={{ color: COLORS.textDark }}>
            Alyssa Jones
          </span>
          <ChevronDown size={16} className="text-gray-500 mr-1 hidden sm:block" />
        </div>
      </div>
    </header>
  );
};

// --- StatCard Component ---

const StatCard = ({ title, value, unit, color, icon: Icon, background }) => (
  <div 
    className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between transition-colors rounded-xl shadow-sm`} 
    style={{ backgroundColor: background }}
  >
    <div className="flex-1">
      <h2 className="text-3xl font-extrabold" style={{ color: color }}>{value}</h2>
      <p className="text-sm font-medium mt-1" style={{ color: COLORS.textDark }}>{title}</p>
      {unit && <p className="text-xs font-medium" style={{ color: COLORS.textMuted }}>{unit}</p>}
    </div>
    {/* Icon with surrounding shape to match the image */}
    <div className="p-2 rounded-full mt-2 sm:mt-0" style={{ backgroundColor: color + '20' }}>
        {Icon && <Icon className="text-2xl" style={{ color: color }} />}
    </div>
  </div>
);

// --- WelcomeBanner Component ---

const WelcomeBanner = () => (
  <div className="p-6 md:p-8 mb-6 relative overflow-hidden rounded-2xl shadow-md" style={{ backgroundColor: COLORS.accentBlue + '10' }}>
    {/* Decorative shape - a large, transparent rounded area on the right */}
    <div className="absolute top-0 right-0 w-48 h-full rounded-l-full opacity-10" style={{ backgroundColor: COLORS.accentBlue }} aria-hidden="true" />
    
    <div className="relative z-10 max-w-lg">
      <h1 className="text-3xl font-bold" style={{ color: COLORS.textDark }}>Welcome, Alyssa</h1>
      <p className="text-base mt-1" style={{ color: COLORS.textDark }}>Stay informed and prepared with RainSafe.</p>
    </div>
    
    {/* Illustration (using SVG to match style and avoid external images) */}
    <div className="absolute bottom-0 right-4 w-40 h-full hidden sm:block">
      <svg className="w-full h-full object-contain" viewBox="0 0 300 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Laptop and person */}
        <rect x="180" y="70" width="100" height="70" rx="8" fill="#5B4B8A"/> {/* Body (Purple) */}
        <rect x="150" y="50" width="160" height="80" rx="4" fill="#8C88A8"/> {/* Keyboard area */}
        <rect x="150" y="0" width="160" height="60" rx="4" fill="#6A96FF"/> {/* Screen */}
        <path d="M225 100C225 90 235 80 245 80C255 80 265 90 265 100" stroke="white" strokeWidth="2" fill="#FFC107"/> {/* Head/Hair */}
        <path d="M230 140C230 130 240 120 250 120C260 120 270 130 270 140" fill="#EF5350"/> {/* Mug */}
        <path d="M260 140C260 130 250 120 240 120C230 120 220 130 220 140" fill="#32A852"/> {/* Sitting on something */}
        
        {/* Simple RainDrop on screen */}
        <circle cx="230" cy="30" r="8" fill="white" opacity="0.8"/>
        <path d="M222 30 L238 30" stroke="#5B4B8A" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
    <div className="absolute bottom-2 right-6 text-xs" style={{ color: COLORS.textMuted }}>Last updated: 5m ago</div>
  </div>
);

// --- 9. RecentReportItem Component ---

const RecentReportItem = ({ report }) => (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
        <div className="flex gap-3 items-start">
            <img 
                src={report.img} 
                alt="Report image" 
                className="w-16 h-16 object-cover rounded-lg shrink-0" 
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/60x60/D0D0D0/333?text=IMG' }}
            />
            <div className="flex-1">
                <p className="text-base font-medium leading-tight" style={{ color: COLORS.textDark }}>{report.title}</p>
                <div className="text-xs mt-1 space-y-0.5" style={{ color: COLORS.textMuted }}>
                    <p className="line-clamp-1">{report.description}</p>
                    <p><strong>{report.level}</strong> reported • {report.time}</p>
                </div>
            </div>
        </div>
        
        <div className="flex justify-end pt-2 border-t border-gray-100">
            <button 
                className="text-sm font-medium hover:text-gray-900 flex items-center gap-1 shrink-0 transition-colors" 
                style={{ color: COLORS.textMuted }}
            >
                <report.icon size={16} className="text-gray-500" />
                {report.action}
            </button>
        </div>
    </div>
);

// --- 6, 7, 8, 10 & Other Home Section Components ---

const MiniMapCard = ({ latitude, longitude, reports }) => (
  <div className="p-5 rounded-xl shadow-sm bg-white border border-gray-100">
      <h3 className="text-lg font-bold mb-3" style={{ color: COLORS.textDark }}>Nearby Reports Mini Map</h3>
      <div className="rounded-xl overflow-hidden h-40 border border-gray-200 flex items-center justify-center bg-gray-200">
        {/* Simple representation of the map from the image */}
        <Map size={48} className="text-gray-500" />
        <span className="text-sm text-gray-600 ml-2">Map View Placeholder</span>
      </div>
      {/* Placeholder for small text items next to the map in the image */}
      <div className="mt-4 space-y-2 text-sm">
        <p style={{ color: COLORS.textDark }}><strong>Necaslostere Him Malo:</strong> <span style={{ color: COLORS.criticalReports }}>Severe water level reported</span>.</p>
        <p style={{ color: COLORS.textDark }}><strong>It ernide:</strong> Critical report is closed.</p>
        <p style={{ color: COLORS.textMuted }}>flents: Reports ago.</p>
      </div>
  </div>
);

const AlertsListCard = ({ alerts }) => (
  <div className="p-5 rounded-xl shadow-sm bg-white border border-gray-100">
    <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.textDark }}>Active Alerts</h3>
    <div className="space-y-4">
      {alerts.map(alert => (
        <div key={alert.id} className="flex items-start gap-3">
          <div className="w-2 h-2 mt-2 rounded-full shrink-0" style={{ backgroundColor: COLORS.criticalReports }}></div>
          <div className="flex-1">
            <p className="text-sm font-medium leading-tight" style={{ color: COLORS.textDark }}>{alert.location}</p>
            <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{alert.status}</p>
            <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{alert.timeAgo}</p>
          </div>
        </div>
      ))}
      <div className="text-right text-xs pt-2">
        <a href="#" className="hover:underline" style={{ color: COLORS.accentBlue }}>View all (12)</a>
      </div>
    </div>
  </div>
);

const TrendAnalyticsCard = () => (
  <div className="p-5 rounded-xl shadow-sm bg-white border border-gray-100">
    <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.textDark }}>Trend & Analytics</h3>
    <div className="h-24 w-full bg-gray-50 flex items-center justify-center rounded-lg border border-dashed border-gray-300">
      <Activity size={32} className="text-gray-400" />
    </div>
    <p className="text-sm mt-4 text-center" style={{ color: COLORS.textMuted }}>
      3 critical reports in last 10 hours
    </p>
  </div>
);

const RecentFloodReportsList = () => {
  const reports = [
    { 
      id: 1, 
      title: 'Water rising fast, cars are stuck', 
      time: '10 mins ago', 
      level: '16mm', 
      action: 'Upvote', 
      icon: Heart, 
      description: 'Sust eventher level reported at ilon allarwed',
      img: 'https://placehold.co/60x60/8C88A8/fff?text=R1' 
    },
    { 
      id: 2, 
      title: 'Water rising fast, cars are stuck', 
      time: '10 mins ago', 
      level: '16mm', 
      action: 'Comment', 
      icon: MessageSquare, 
      description: 'Sust eventher level reported at ilon allarwed',
      img: 'https://placehold.co/60x60/6A96FF/fff?text=R2' 
    },
    { 
      id: 3, 
      title: 'Plotcthical cmportics', 
      time: '10 mins ago', 
      level: '16mm', 
      action: 'Comment', 
      icon: MessageSquare, 
      description: 'Sust eventher level reported at ilon allarwed',
      img: 'https://placehold.co/60x60/32A852/fff?text=R3' 
    },
  ];

  return (
    <div className="p-5 rounded-xl shadow-lg bg-white h-full">
      <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.textDark }}>Recent Flood Reports</h2>
      <div className="space-y-4">
        {reports.map(report => (
          <RecentReportItem key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
};


const QuickActionStrip = () => (
    <div className="p-5 rounded-xl shadow-lg bg-white mt-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.textDark }}>Quick Report Action Strip</h2>
        <div className="flex flex-col sm:flex-row gap-4">
            <button
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[.98]"
                style={{ backgroundColor: COLORS.accentBlue, boxShadow: `0 4px 14px 0 ${COLORS.accentBlue}40` }}
            >
                Report Flood
            </button>
            <button
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 hover:bg-yellow-50 active:scale-[.98] border border-yellow-300"
                style={{ backgroundColor: COLORS.mediumRisk, color: COLORS.textDark, boxShadow: `0 4px 14px 0 ${COLORS.mediumRisk}40` }}
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
)

// --- Home Content Layout Component ---

const HomeContent = () => {
  // Mock Data
  const currentLat = 12.9352;
  const currentLon = 77.6245;
  const nearbyReports = [
    { id: 'rep1', latitude: 12.934, longitude: 77.625, risk: 'HIGH' },
    { id: 'rep2', latitude: 12.936, longitude: 77.623, risk: 'MEDIUM' },
  ];
  const activeAlerts = [
    { id: 'alert1', location: 'Silk Board Underpass', status: 'High water level reported', timeAgo: '15 mins ago' },
    { id: 'alert2', location: 'Traffic slowdown', status: 'Due to water', timeAgo: '35 mins ago' },
  ];

  return (
    <div className="p-4 md:p-6 pb-24 space-y-6">
      
      {/* 1. Welcome Banner */}
      <WelcomeBanner />

      {/* 2. Overview Cards */}
      <div>
        <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.textDark }}>Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="MEDIUM Risk" 
            value="35%" 
            unit="Probability" 
            color={COLORS.mediumRisk} 
            background={COLORS.mediumRisk + '10'} 
            icon={AlertTriangle}
          />
          <StatCard 
            title="Active Alerts" 
            value="12" 
            color={COLORS.activeAlerts} 
            background={COLORS.activeAlerts + '10'} 
            icon={Bell}
          />
          <StatCard 
            title="Recent Views" 
            value="78" 
            color={COLORS.recentViews} 
            background={COLORS.recentViews + '10'} 
            icon={Eye}
          />
          <StatCard 
            title="Critical Reports Today" 
            value="4" 
            color={COLORS.criticalReports} 
            background={COLORS.criticalReports + '10'} 
            icon={Zap}
          />
        </div>
      </div>

      {/* 3. Main Content (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Center Column Group (Col 1 & 2) */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold" style={{ color: COLORS.textDark }}>Nearby Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Top Left: Map/Neighbor Info */}
            <MiniMapCard latitude={currentLat} longitude={currentLon} reports={nearbyReports} />

            {/* Bottom Left: Alerts + Trend */}
            <div className="space-y-4">
              <AlertsListCard alerts={activeAlerts} />
              <TrendAnalyticsCard />
            </div>
          </div>
        </div>

        {/* Right Column (Col 3) */}
        <div className="lg:col-span-1">
          <RecentFloodReportsList />
        </div>
      </div>
      
      {/* 4. Quick Report Action Strip */}
      <QuickActionStrip />
    </div>
  );
};


// --- Main Homepage Component (Renamed to Homepage) ---

const Homepage = ({ toggleMenu }) => {
  return (
    <>
      {/* Header */}
      <Header toggleMenu={toggleMenu} />

      {/* Content */}
      <HomeContent />
    </>
  );
};

export default Homepage;