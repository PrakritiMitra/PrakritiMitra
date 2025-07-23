import React, { useState, useCallback } from "react";
import { GoogleMap, Marker, useJsApiLoader, Autocomplete } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "300px" };
const LIBRARIES = ['places']; // Define libraries as a constant

export default function LocationPicker({ value, onChange }) {
  // Use a default center if the initial value is invalid
  const initialCenter = 
    value && typeof value.lat === 'number' && typeof value.lng === 'number'
      ? { lat: value.lat, lng: value.lng }
      : { lat: 28.6139, lng: 77.2090 }; // Default: Delhi

  const [center, setCenter] = useState(initialCenter);
  // Only set an initial marker if the value is valid
  const [marker, setMarker] = useState(
    value && typeof value.lat === 'number' && typeof value.lng === 'number' ? value : null
  );
  const [autocomplete, setAutocomplete] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const onMapClick = useCallback(
    (e) => {
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarker(pos);
      onChange && onChange(pos);
    },
    [onChange]
  );

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const pos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setCenter(pos);
        setMarker(pos);
        onChange && onChange(pos);
      }
    }
  };

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <div>
      <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
        <input
          type="text"
          placeholder="Search location"
          className="w-full border rounded px-3 py-2 mb-2"
        />
      </Autocomplete>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        onClick={onMapClick}
      >
        {marker && <Marker position={marker} />}
      </GoogleMap>
      {marker && typeof marker.lat === 'number' && typeof marker.lng === 'number' && (
        <div className="mt-2 text-sm text-gray-700">
          <b>Selected Location:</b> {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
        </div>
      )}
    </div>
  );
}