import React from 'react';
import {
  Map,
  Thermometer,
  Cloud,
} from 'lucide-react';

// Replicated colors for self-sufficiency
const COLORS = {
  textDark: '#333333',
  textMuted: '#888888',
};

const NearbyReportsMiniMap = () => (
  <div className="p-4 rounded-2xl shadow-xl bg-white h-full min-h-[200px] flex flex-col justify-between">
    <h2 className="text-lg font-bold mb-3" style={{ color: COLORS.textDark }}>Nearby Reports</h2>
    
    {/* Map Placeholder */}
    <div className="rounded-xl overflow-hidden flex-1 border border-gray-200 bg-gray-200 flex items-center justify-center relative">
        {/* Map image representation */}
        <Map size={32} className="text-gray-500 opacity-50" />
        <div className="absolute top-2 right-2 flex space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
        </div>
        <div className="absolute bottom-2 left-2 text-xs p-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}>
            Legend: <span className="text-red-500">Report Severe</span>
        </div>
    </div>

    {/* Weather Footer */}
    <div className="flex items-center justify-between mt-3">
        <div className="flex items-center space-x-2">
            <Thermometer size={30} className="text-gray-600" />
            <div>
                <span className="text-2xl font-bold" style={{ color: COLORS.textDark }}>25°C</span>
                <p className="text-sm" style={{ color: COLORS.textMuted }}>Monty Sunny</p>
            </div>
        </div>
        <div className="text-right">
            <Cloud size={24} className="text-blue-400" />
            <p className="text-sm" style={{ color: COLORS.textMuted }}>Monday</p>
        </div>
    </div>
  </div>
);

export default NearbyReportsMiniMap;