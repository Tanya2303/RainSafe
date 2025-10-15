import React from 'react';

const COLORS = {
  textDark: '#333333',
  textMuted: '#888888',
  accentBlue: '#6A96FF',
};

const RecentReportItem = ({ report }) => (
    <div className="flex gap-4 items-start pb-4 border-b border-gray-100 last:border-b-0">
        <img 
            src={report.img} 
            alt="Report image" 
            className="w-16 h-16 object-cover rounded-lg shrink-0" 
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/60x60/D0D0D0/333?text=RPT' }}
        />
        <div className="flex-1">
            <p className="text-sm font-medium leading-tight" style={{ color: COLORS.textDark }}>{report.title}</p>
            <div className="text-xs mt-1 space-y-0.5" style={{ color: COLORS.textMuted }}>
                <p className="line-clamp-1">{report.description}</p>
                <p>10:00 Read Needs • 20/9/03 | 02:32:05</p>
            </div>
        </div>
        <div className="text-right shrink-0">
            <p className="text-xs font-medium" style={{ color: COLORS.textMuted }}>{report.coordinate}</p>
            <button 
                className="mt-1 text-xs px-3 py-1 rounded-full font-medium transition-colors hover:bg-gray-100" 
                style={{ color: COLORS.accentBlue, borderColor: COLORS.accentBlue }}
            >
                Upvote
            </button>
        </div>
    </div>
);

export default RecentReportItem;