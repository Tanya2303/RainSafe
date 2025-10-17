import React, { useState, useEffect } from 'react';
// Import sub-components
import LocationConfirm from './LocationConfirm';
import WaterLevelSelector from './WaterLevelSelector';
import FloodDescriptionInput from './FloodDescriptionInput';

const COLORS = {
  bg: '#FFFAED',
};

const ReportPage = () => {
  const [locationData, setLocationData] = useState({
    latitude: null,
    longitude: null,
    locationName: 'Koramangala, Bengaluru', // Initial placeholder/fallback name
    isFetching: true,
  });

  useEffect(() => {
    // Check if Geolocation is supported
    if (!navigator.geolocation) {
      setLocationData(prev => ({ 
        ...prev, 
        locationName: 'Geolocation Not Supported',
        isFetching: false 
      }));
      return;
    }

    const success = (position) => {
      const { latitude, longitude } = position.coords;
      
      // Use the live coordinates as the location name display
      const name = `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;
      
      setLocationData({
        latitude,
        longitude,
        locationName: name,
        isFetching: false,
      });
    };

    const error = (err) => {
      console.warn(`Geolocation Error(${err.code}): ${err.message}`);
      
      // Update the state to indicate error, but keep the default fallback location name
      setLocationData(prev => ({ 
        ...prev, 
        locationName: 'Location Access Denied/Error',
        isFetching: false 
      }));
    };

    // Request the current position
    // enableHighAccuracy is set to true for better mobile/GPS accuracy
    navigator.geolocation.getCurrentPosition(success, error, { 
      enableHighAccuracy: true, 
      timeout: 10000, 
      maximumAge: 0 
    });
  }, []); // Run only once on mount

  return (
    <div className="p-4 md:p-6 pb-24" style={{ backgroundColor: COLORS.bg }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-[700px]">
        {/* Left Column: Location Map */}
        <div className="lg:col-span-1">
          <LocationConfirm 
            locationName={locationData.locationName}
            isFetching={locationData.isFetching}
          />
        </div>

        {/* Right Column: Form Inputs */}
        <div className="lg:col-span-1 space-y-6">
          {/* <WaterLevelSelector /> */}
          <FloodDescriptionInput />
        </div>
      </div>
    </div>
  );
};

export default ReportPage;