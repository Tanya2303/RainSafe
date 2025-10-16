import * as React from 'react';
import { useState, useEffect } from 'react';
import MapGL, { Source, Layer } from 'react-map-gl/mapbox';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const PAGE_BG_COLOR = '#FFFAED'; // Defined the requested background color

// Define the heatmap layer style
const heatmapLayer = {
  id: 'risk-heatmap',
  type: 'heatmap',
  paint: {
    // Weight points based on a property, e.g., 'risk_level' converted to a numeric value
    // For simplicity, we'll just use a uniform weight for all points in this layer definition.
    // To apply different weights based on risk_level, you'd need a numerical 'weight' property in the GeoJSON.
    'heatmap-weight': 1,
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(33,102,172,0)', // Low density (e.g., Low risk)
      0.2, 'rgb(103,169,207)',
      0.4, 'rgb(209,229,240)',
      0.6, 'rgb(253,219,199)',
      0.8, 'rgb(239,138,98)',
      1, 'rgb(178,24,43)' // High density (e.g., High risk)
    ],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
    'heatmap-opacity': 0.8
  }
};

const MapPage = () => {
  const [mapData, setMapData] = useState(null);
  const [error, setError] = useState(null);

  // Function to convert the flat array of points to GeoJSON FeatureCollection
  const pointsToGeoJSON = (points) => {
    if (!points || points.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    return {
      type: 'FeatureCollection',
      features: points.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.longitude, point.latitude] // GeoJSON is [longitude, latitude]
        },
        properties: {
          id: point.id,
          risk_level: point.risk_level,
          source: point.source,
          details: point.details,
          // You might add a numerical weight here based on risk_level if needed for the heatmap
          // For example: weight: point.risk_level === 'High' ? 3 : point.risk_level === 'Medium' ? 2 : 1,
        }
      }))
    };
  };

  useEffect(() => {
    let mounted = true;
    const DATA_URL = 'http://localhost:8000/dashboard-data'; // New data URL

    fetch(DATA_URL)
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`HTTP error! status: ${resp.status}`);
        }
        return resp.json();
      })
      .then((data) => {
        if (!mounted) return;
        // Convert the 'map_points' array into GeoJSON format
        const geojson = pointsToGeoJSON(data.map_points);
        setMapData(geojson);
      })
      .catch((err) => {
        console.error('Could not load data:', err);
        setError(err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Define the initial view state
  const initialViewState = {
    // Use the specified coordinates: latitude: -90, longitude: -180
    latitude: 12.9716, 
    longitude: 77.5946, 
    zoom: 12
  };

  if (error) {
    return <div className="p-4 text-red-600">Error loading map data: {error.message}</div>;
  }

  return (
    <div 
      className="w-full h-full min-h-screen p-4" 
      style={{ backgroundColor: PAGE_BG_COLOR }} // Apply the background color here
    >
      <MapGL
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%', borderRadius: '0.75rem', overflow: 'hidden' }} // Added rounded corners to the map itself
        mapStyle="mapbox://styles/mapbox/dark-v9"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {/* Render the heatmap layer using the fetched and converted GeoJSON data */}
        {mapData && (
          <Source id="risk-points" type="geojson" data={mapData}>
            <Layer {...heatmapLayer} />
          </Source>
        )}
      </MapGL>
    </div>
  );
};

export default MapPage;
