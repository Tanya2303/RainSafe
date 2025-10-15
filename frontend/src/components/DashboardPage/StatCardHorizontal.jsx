import React from 'react';

const COLORS = {
  textDark: '#333333',
  textMuted: '#888888',
  cardBackground: '#FFFFFF',
};

const StatCardHorizontal = ({ value, label, color, icon: Icon }) => (
  <div 
    className={`p-4 flex items-center space-x-3 rounded-xl shadow-sm`} 
    style={{ backgroundColor: COLORS.cardBackground, borderBottom: `4px solid ${color}` }}
  >
    <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: color + '20' }}>
        {Icon && <Icon className="text-2xl" style={{ color: color }} />}
    </div>
    <div>
        <h2 className="text-2xl font-extrabold" style={{ color: COLORS.textDark }}>{value}</h2>
        <p className="text-xs font-medium mt-0.5" style={{ color: COLORS.textMuted }}>{label}</p>
    </div>
  </div>
);

export default StatCardHorizontal;