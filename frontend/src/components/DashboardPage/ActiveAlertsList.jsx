import React from 'react';
import {
  AlertTriangle
} from 'lucide-react';

// Replicated colors for self-sufficiency
const COLORS = {
  textDark: '#333333',
  textMuted: '#888888',
  accentRed: '#EF5350',
};

// Sub-Component for Alert Item
const AlertItem = ({ title, coordinate, location }) => (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-b-0">
        <div className="flex items-center space-x-3">
            <AlertTriangle size={20} className="shrink-0" style={{ color: COLORS.accentRed }} />
            <div>
                <p className="text-sm font-medium" style={{ color: COLORS.textDark }}>{title}</p>
                <p className="text-xs" style={{ color: COLORS.textMuted}}>{coordinate}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-sm font-medium" style={{ color: COLORS.textDark }}>{location}</p>
        </div>
    </div>
);

const ActiveAlertsList = ({ alerts }) => (
  <div className="p-5 rounded-2xl shadow-xl bg-white">
    <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.textDark }}>Active Alerts</h2>
    <div className="space-y-4">
      {alerts.map((alert, index) => (
        <AlertItem key={index} {...alert} />
      ))}
    </div>
  </div>
);

export default ActiveAlertsList;