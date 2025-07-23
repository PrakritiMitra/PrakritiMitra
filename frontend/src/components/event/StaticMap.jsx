// src/components/event/StaticMap.jsx
import React from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '8px',
};
const LIBRARIES = ['places']; // Define libraries as a constant

function StaticMap({ lat, lng }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  if (!isLoaded) return <div>Loading map...</div>;
  if (!lat || !lng) return null; // Don't render if no coordinates

  const center = { lat, lng };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={15}
      options={{
        // Disable all controls for a static look
        disableDefaultUI: true,
        draggable: false,
        scrollwheel: false,
        zoomControl: false,
      }}
    >
      <Marker position={center} />
    </GoogleMap>
  );
}

export default React.memo(StaticMap); 