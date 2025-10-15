import { useState, useEffect } from 'react';

const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      setIsLoading(false);
      return;
    }

    const success = (position) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setIsLoading(false);
    };

    const handleError = (err) => {
      console.warn(`Geolocation Error(${err.code}): ${err.message}`);
      setError('Unable to retrieve your location or permission denied.');
      setIsLoading(false);
    };

    // Request the current position
    const watcherId = navigator.geolocation.getCurrentPosition(success, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
    
    // Optional cleanup function
    return () => {
      // You can add logic here if you used watchPosition, but getCurrentPosition doesn't need cleanup.
    };
  }, []);

  return { location, error, isLoading };
};

export default useGeolocation;