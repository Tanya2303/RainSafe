import React, { useState, useEffect, useRef } from 'react';
import Map, {
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  GeolocateControl
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css'; // keep if your bundler handles CSS imports

// Put your Mapbox token here
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const Pin = ({ size = 28 }) => {
  const ICON = `M20.2,15.7L20.2,15.7c1.1-1.6,1.8-3.6,1.8-5.7c0-5.6-4.5-10-10-10S2,4.5,2,10c0,2,0.6,3.9,1.6,5.4c0,0.1,0.1,0.2,0.2,0.3
  c0,0,0.1,0.1,0.1,0.2c0.2,0.3,0.4,0.6,0.7,0.9c2.6,3.1,7.4,7.6,7.4,7.6s4.8-4.5,7.4-7.5c0.2-0.3,0.5-0.6,0.7-0.9
  C20.1,15.8,20.2,15.8,20.2,15.7z`;
  const pinStyle = { cursor: 'pointer', fill: '#d00', stroke: 'none' };
  return (
    <svg height={size} viewBox="0 0 24 24" style={pinStyle}>
      <path d={ICON} />
    </svg>
  );
};

export default function UserLocationMap() {
  // Controlled viewState so we can recenter programmatically
  const [viewState, setViewState] = useState({
    latitude: 20, // default center (world-ish)
    longitude: 0,
    zoom: 2
  });

  const [userLocation, setUserLocation] = useState(null); // { latitude, longitude }
  const [popupOpen, setPopupOpen] = useState(false);
  const mapRef = useRef(null);

  // Called when user presses the Get Location button
  function handleGetLocationClick() {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setPopupOpen(true);

        // center the map on user's location with a closer zoom
        setViewState(prev => ({
          ...prev,
          latitude,
          longitude,
          zoom: 13
        }));
      },
      err => {
        console.error('Error getting location:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Optional: automatically request location once when component mounts (uncomment if desired)
  // useEffect(() => { handleGetLocationClick(); }, []);

  return (
    <div style={{ height: '80vh', width: '100%', position: 'relative' }}>
      {/* Top-left controls and button */}
      <div style={{ position: 'absolute', left: 12, top: 12, zIndex: 2 }}>
        <button
          onClick={handleGetLocationClick}
          style={{
            padding: '8px 12px',
            background: '#fff',
            borderRadius: 6,
            border: '1px solid #ddd',
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)'
          }}
        >
          Get My Location
        </button>
      </div>

      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v9"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {/* Map controls */}
        <GeolocateControl position="top-left" showAccuracyCircle trackUserLocation />
        <FullscreenControl position="top-left" />
        <NavigationControl position="top-left" />
        <ScaleControl />

        {/* If we have user location, render a marker and popup */}
        {userLocation && (
          <>
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation(); // prevent map click closing popup
                setPopupOpen(true);
              }}
            >
              <Pin size={36} />
            </Marker>

            {popupOpen && (
              <Popup
                anchor="top"
                longitude={userLocation.longitude}
                latitude={userLocation.latitude}
                onClose={() => setPopupOpen(false)}
                closeOnClick={false}
              >
                <div style={{ minWidth: 150 }}>
                  <strong>Your location</strong>
                  <div>
                    Lat: {userLocation.latitude.toFixed(6)}, Lon:{' '}
                    {userLocation.longitude.toFixed(6)}
                  </div>
                </div>
              </Popup>
            )}
          </>
        )}
      </Map>
    </div>
  );
}
