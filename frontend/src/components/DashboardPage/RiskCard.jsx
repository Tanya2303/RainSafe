import React from 'react';
import {
  CloudRain,
  Droplet,
  Shield,
  MapPin,
} from 'lucide-react';

// Replicated colors for self-sufficiency
const COLORS = {
  textDark: '#333333',
  textMuted: '#888888',
  accentBlue: '#6A96FF',
  accentRed: '#EF5350',
  accentGreen: '#32A852',
  accentPurple: '#5B4B8A',
  highRiskBackground: '#EAF7F9',
};

const RiskCard = () => (
  <div 
    className="p-6 rounded-2xl shadow-xl flex flex-col justify-between h-full min-h-[200px]"
    style={{ backgroundColor: COLORS.highRiskBackground }}
  >
    {/* Header */}
    <div className="flex items-center space-x-2">
      <MapPin size={20} className="text-blue-600" />
      <span className="text-sm font-medium" style={{ color: COLORS.textMuted }}>
        Dhaka, Bangladesh
      </span>
    </div>

    {/* Risk Level */}
    <div className="mt-2">
      <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: COLORS.accentRed }}>
        HIGH FLOOD RISK
      </h1>
      <p className="text-sm mt-1" style={{ color: COLORS.textDark }}>
        Kommasingha, Bengalur
      </p>
    </div>

    {/* Metrics */}
    <div className="flex justify-between items-center mt-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
      {/* Precipitation */}
      <div className="flex items-center space-x-2">
        <CloudRain size={24} style={{ color: COLORS.accentBlue }} />
        <div className="text-lg font-bold" style={{ color: COLORS.textDark }}>
          16 <span className="text-sm font-medium" style={{ color: COLORS.textMuted }}>Precipitation</span>
        </div>
      </div>
      
      {/* Humidity */}
      <div className="flex items-center space-x-2">
        <Droplet size={24} style={{ color: COLORS.accentPurple }} />
        <div className="text-lg font-bold" style={{ color: COLORS.textDark }}>
          3Km <span className="text-sm font-medium" style={{ color: COLORS.textMuted }}>Humidity</span>
        </div>
      </div>

      {/* Confidence */}
      <div className="flex items-center space-x-2">
        <Shield size={24} style={{ color: COLORS.accentGreen }} />
        <div className="text-lg font-bold" style={{ color: COLORS.textDark }}>
          87% <span className="text-sm font-medium" style={{ color: COLORS.textMuted }}>Confidence</span>
        </div>
      </div>
    </div>
  </div>
);

export default RiskCard;