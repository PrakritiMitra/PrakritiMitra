import React, { useRef, useCallback } from "react";
import { GoogleMap, Marker, useLoadScript, Autocomplete } from "@react-google-maps/api";

const libraries = ["places"];
const mapContainerStyle = { width: "100%", height: "300px" };
const defaultCenter = { lat: 19.076, lng: 72.8777 }; // Mumbai

export default function LocationPicker({ value, onChange }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });
  const autocompleteRef = useRef(null);

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current.getPlace();
    if (place && place.geometry) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      onChange({
        lat,
        lng,
        address: place.formatted_address,
      });
    }
  }, [onChange]);

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <div>
      <Autocomplete
        onLoad={ref => (autocompleteRef.current = ref)}
        onPlaceChanged={handlePlaceChanged}
      >
        <input
          type="text"
          placeholder="Search location"
          defaultValue={value?.address || ""}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />
      </Autocomplete>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={value?.lat && value?.lng ? { lat: value.lat, lng: value.lng } : defaultCenter}
        zoom={value?.lat && value?.lng ? 15 : 10}
        onClick={e => {
          onChange({
            ...value,
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
          });
        }}
      >
        {value?.lat && value?.lng && <Marker position={{ lat: value.lat, lng: value.lng }} />}
      </GoogleMap>
    </div>
  );
}