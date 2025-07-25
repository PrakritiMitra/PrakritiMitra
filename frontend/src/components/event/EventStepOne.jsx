// src/components/event/EventStepOne.jsx

import React from "react";
import {
  TextField,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  FormGroup,
} from "@mui/material";
import LocationPicker from './LocationPicker'; // Make sure this path is correct

export default function EventStepOne({
  formData,
  setFormData,
  setImageFiles,
  setLetterFile,
  selectedOrgId,
  organizationOptions = [],
  onNext,
  existingImages = [],
  existingLetter = null,
  onRemoveExistingImage,
  onRemoveExistingLetter
}) {
  const equipmentOptions = ["Gloves", "Bags", "Masks", "Tools"];
  const eventTypes = [
    "Beach Cleanup",
    "Tree Plantation",
    "Awareness Drive",
    "Animal Rescue",
    "Education"
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      if (name === "equipmentNeeded") {
        setFormData((prev) => ({
          ...prev,
          equipmentNeeded: checked
            ? [...prev.equipmentNeeded, value]
            : prev.equipmentNeeded.filter((item) => item !== value),
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: checked }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };
  
  const handleLocationChange = (newLocation) => {
    // newLocation is { lat, lng } from the map click or search
    setFormData((prev) => ({
      ...prev,
      mapLocation: {
        ...prev.mapLocation, // Keep existing address if any
        lat: newLocation.lat,
        lng: newLocation.lng,
      },
    }));
  };

  const handleImageChange = (e) => {
    setImageFiles([...e.target.files]);
  };

  const handleLetterChange = (e) => {
    setLetterFile(e.target.files[0]);
  };

  const handleProceed = (e) => {
    e.preventDefault();
    onNext();
  };

  // Helper to handle appending new files
  const handleAddImages = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveNewImage = (idx) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Box component="form" onSubmit={handleProceed} sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Step 1: Event Details
      </Typography>

      {!selectedOrgId && (
        <FormControl fullWidth margin="normal">
          <InputLabel>Select Organization</InputLabel>
          <Select
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            required
            label="Select Organization"
          >
            {organizationOptions.map((org) => (
              <MenuItem key={org._id} value={org._id}>
                {org.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <TextField fullWidth margin="normal" name="title" label="Event Name" value={formData.title} onChange={handleChange} required />
      <TextField fullWidth margin="normal" multiline rows={3} name="description" label="Event Description" value={formData.description} onChange={handleChange} />
      
      {/* --- NEW LOCATION SECTION --- */}
      <Box mt={2} mb={2}>
        <Typography variant="subtitle1" gutterBottom sx={{ mb: 1 }}>
          Event Location
        </Typography>
        <LocationPicker
          value={formData.mapLocation} // Pass the mapLocation object
          onChange={handleLocationChange}
        />
        <TextField 
          fullWidth 
          margin="normal" 
          label="Location Address"
          // Manually handle the change for the nested mapLocation.address field
          value={formData.mapLocation?.address || ''} 
          onChange={(e) => setFormData(prev => ({...prev, mapLocation: {...prev.mapLocation, address: e.target.value}}))}
          required 
          helperText="You can also manually type the address here."
        />
         <TextField 
          fullWidth 
          margin="normal" 
          name="location"
          label="Location (Simple Text)" 
          value={formData.location || ''} 
          onChange={handleChange}
          helperText="A simple text description of the location (e.g., 'Near Central Park')."
        />
      </Box>
      {/* --- END NEW LOCATION SECTION --- */}

      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <TextField fullWidth type="datetime-local" name="startDateTime" label="Start Date & Time" InputLabelProps={{ shrink: true }} value={formData.startDateTime} onChange={handleChange} required />
        <TextField fullWidth type="datetime-local" name="endDateTime" label="End Date & Time" InputLabelProps={{ shrink: true }} value={formData.endDateTime} onChange={handleChange} required min={formData.startDateTime || undefined} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
        <TextField
          fullWidth
          type="number"
          name="maxVolunteers"
          label="Max Volunteers"
          value={formData.maxVolunteers}
          onChange={handleChange}
          disabled={formData.unlimitedVolunteers}
        />
        <FormControlLabel
          control={<Checkbox checked={formData.unlimitedVolunteers} onChange={handleChange} name="unlimitedVolunteers" />}
          label="Unlimited"
        />
      </Box>

      <FormControl fullWidth margin="normal">
        <InputLabel>Event Type</InputLabel>
        <Select name="eventType" value={formData.eventType} onChange={handleChange} label="Event Type">
          {eventTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Equipment Needed
        </Typography>
        <FormGroup row>
          {equipmentOptions.map((item) => (
            <FormControlLabel
              key={item}
              control={
                <Checkbox
                  name="equipmentNeeded"
                  value={item}
                  checked={formData.equipmentNeeded.includes(item)}
                  onChange={handleChange}
                />
              }
              label={item}
            />
          ))}
        </FormGroup>
      </Box>

      <TextField fullWidth margin="normal" name="otherEquipment" label="Other Equipment" value={formData.otherEquipment} onChange={handleChange} />
      <TextField fullWidth multiline rows={2} margin="normal" name="instructions" label="Additional Instructions" value={formData.instructions} onChange={handleChange} />

      <Box mt={2}>
        <FormControlLabel control={<Checkbox checked={formData.groupRegistration} onChange={handleChange} name="groupRegistration" />} label="Enable Group Registration" />
      </Box>

      <Box mt={2}>
        <FormControlLabel control={<Checkbox checked={formData.recurringEvent} onChange={handleChange} name="recurringEvent" />} label="Recurring Event?" />
      </Box>

      {formData.recurringEvent && (
        <Box mt={2}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Recurring Type</InputLabel>
            <Select name="recurringType" value={formData.recurringType} onChange={handleChange} label="Recurring Type">
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>

          {formData.recurringType === "weekly" && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Day of the Week</InputLabel>
              <Select name="recurringValue" value={formData.recurringValue} onChange={handleChange} label="Day of the Week">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {formData.recurringType === "monthly" && (
            <TextField
              fullWidth
              margin="normal"
              type="number"
              name="recurringValue"
              label="Day of the Month (e.g. 1 for 1st)"
              value={formData.recurringValue}
              onChange={handleChange}
            />
          )}
        </Box>
      )}

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Event Images (optional)
        </Typography>
        {/* Existing Images */}
        {existingImages.length > 0 && (
          <Box mb={1}>
            <Typography variant="body2">Existing Images:</Typography>
            {existingImages.map((img, index) => (
              <Box key={index} display="flex" alignItems="center" gap={1} mt={1}>
                <img src={`http://localhost:5000/uploads/Events/${img}`} alt="Preview" width="100" style={{ borderRadius: 4 }} />
                <Button size="small" color="error" onClick={() => onRemoveExistingImage(img)}>Remove</Button>
              </Box>
            ))}
          </Box>
        )}
        {/* New Uploads Preview */}
        {Array.isArray(formData.eventImages) && formData.eventImages.length > 0 && (
          <Box mb={1} display="flex" flexWrap="wrap" gap={2}>
            {formData.eventImages.map((file, idx) => (
              <Box key={idx} display="flex" flexDirection="column" alignItems="center" gap={1}>
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Upload Preview ${idx + 1}`}
                  width={100}
                  style={{ borderRadius: 4, marginBottom: 4 }}
                />
                <Button size="small" color="error" onClick={() => handleRemoveNewImage(idx)}>Remove</Button>
              </Box>
            ))}
          </Box>
        )}
        {/* Add Another Image Button */}
        <Button
          variant="outlined"
          component="label"
          sx={{ mt: 1 }}
        >
          Add Another Image
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={e => {
              handleAddImages(e);
              e.target.value = null; // Reset input after handling
            }}
          />
        </Button>
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Govt Approval Letter (Image/PDF)
        </Typography>
        {existingLetter && (
          <Box display="flex" alignItems="center" gap={2}>
            <a href={`http://localhost:5000/uploads/${existingLetter}`} target="_blank" rel="noopener noreferrer">
              {existingLetter}
            </a>
            <Button size="small" color="error" onClick={onRemoveExistingLetter}>Remove</Button>
          </Box>
        )}
        <input type="file" accept="image/*,application/pdf" onChange={handleLetterChange} />
      </Box>

      <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3 }}>
        Proceed to Questionnaire →
      </Button>
    </Box>
  );
}
