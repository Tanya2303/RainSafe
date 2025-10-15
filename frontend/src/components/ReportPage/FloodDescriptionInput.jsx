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

export default function FloodDescriptionInput() {
  const [selectedLevel, setSelectedLevel] = useState('chest');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState(null); // 'success' | 'error' | null

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

  // Map key => label helper
  const levelLabelFromKey = (key) => {
    const level = LEVELS.find(l => l.key === key);
    return level ? level.label : '';
  };

  // Submit handler: gets geolocation and posts to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);
    setStatusType(null);

    // Basic UI validation if needed
    if (!navigator.geolocation) {
      setStatusType('error');
      setStatusMessage('Geolocation is not supported by this browser.');
      return;
    }

    setSubmitting(true);

    // Wrap geolocation in a promise for async/await
    const getPosition = () =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 15000 }
        );
      });

    try {
      const position = await getPosition();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      // Build payload matching the provided schema
      const payload = {
        latitude,
        longitude,
        description: description || '',
        water_level: levelLabelFromKey(selectedLevel)
      };

      const resp = await fetch('http://localhost:8000/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (resp.status === 201) {
        const data = await resp.json();
        setStatusType('success');
        setStatusMessage(data?.message || 'Report submitted successfully.');
        // Optionally clear form
        setDescription('');
        setSelectedLevel('chest');
      } else if (resp.status === 422) {
        // Validation error — show backend message if present
        const err = await resp.json().catch(() => null);
        setStatusType('error');
        setStatusMessage(err?.message || 'Validation error. Please check your input.');
      } else {
        // Other errors
        const err = await resp.json().catch(() => null);
        setStatusType('error');
        setStatusMessage(err?.message || `Submission failed (${resp.status}).`);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setStatusType('error');
      setStatusMessage('Unable to retrieve location or submit report. Check permissions and server status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col space-y-2" onSubmit={handleSubmit}>
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
              type="button"
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

      <div className="p-6 rounded-2xl shadow-xl bg-white space-y-4">
        <h2 className="text-lg font-bold" style={{ color: COLORS.textDark }}>
          Description <span style={{ color: COLORS.textMuted }}>(Optional)</span>
        </h2>

        {/* Description Input */}
        <input
          type="text"
          placeholder="e.g., Water rising fast..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none focus:border-blue-500"
          style={{ borderColor: '#E0E0E0', color: COLORS.textDark }}
          disabled={submitting}
        />

        {/* Status message */}
        {statusMessage && (
          <div
            className={`px-4 py-2 rounded-md text-sm ${statusType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
          >
            {statusMessage}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[.98] disabled:opacity-60"
          style={{ backgroundColor: COLORS.accentBlue, boxShadow: `0 4px 14px 0 ${COLORS.accentBlue}40` }}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Flood Report'}
        </button>
      </div>
    </form>
  );
}
