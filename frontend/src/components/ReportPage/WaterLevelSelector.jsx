import React, { useState } from 'react';

const COLORS = {
  textDark: '#333333',
  textMuted: '#888888',
  accentBlue: '#6A96FF',
};

// Define water levels with corresponding keys and labels
const LEVELS = [
  { key: 'ankle', label: 'Ankle-deep', height: '3.5rem' },
  { key: 'knee', label: 'Knee-deep', height: '4.5rem' },
  { key: 'waist', label: 'Waist-deep', height: '5.5rem' },
  { key: 'chest', label: 'Chest-deep', height: '6.5rem' },
];

const WaterLevelSelector = () => {
  // Use 'chest' as the initial selected level to match the new image
  const [selectedLevel, setSelectedLevel] = useState('chest');

  // Utility function to determine bar width/height
  const getBarStyles = (key) => {
    const isSelected = key === selectedLevel;
    const level = LEVELS.find(l => l.key === key);

    return {
      // Use opacity to create the subtle visual effect (all bars look gray/white)
      backgroundColor: isSelected ? COLORS.accentBlue : '#E0E0E0', 
      
      // All bars should have the same width/shape
      width: '20%', 
      borderRadius: '2rem',
      
      // Height changes to suggest depth
      height: level.height, 
      
      // Opacity is slightly reduced for non-selected bars
      opacity: isSelected ? 1 : 0.8,
      transition: 'all 300ms ease',
    };
  };

  return (
    <div className="p-6 rounded-2xl shadow-xl bg-white space-y-4">
      <h2 className="text-lg font-bold" style={{ color: COLORS.textDark }}>Water Level</h2>
      
      {/* Visual Bar Selector */}
      <div className="flex items-end justify-between space-x-2 h-32 py-2">
        {LEVELS.map((level) => (
          <div
            key={level.key}
            onClick={() => setSelectedLevel(level.key)}
            className="cursor-pointer flex items-center justify-center p-1 shadow-sm"
            style={getBarStyles(level.key)}
          >
            {/* The bar element */}
          </div>
        ))}
      </div>
      
      {/* Label Buttons */}
      <div className="flex justify-between space-x-2">
        {LEVELS.map((level) => (
          <button
            key={level.key}
            onClick={() => setSelectedLevel(level.key)}
            className={`flex-1 py-2 rounded-xl font-medium transition-colors duration-200 text-sm 
              ${level.key === selectedLevel 
                ? 'text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-50'
              }`
            }
            style={{ 
              // Set all button backgrounds to be uniform and use text color when unselected
              backgroundColor: level.key === selectedLevel ? COLORS.accentBlue : 'transparent',
              color: level.key === selectedLevel ? 'white' : COLORS.textDark, // Use textDark for unselected label color
              border: level.key === selectedLevel ? 'none' : '1px solid transparent', // Keep a consistent box size
              minWidth: '20%',
              fontSize: '0.85rem'
            }}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WaterLevelSelector;