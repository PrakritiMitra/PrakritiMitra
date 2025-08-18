// src/components/event/EventStepOne.jsx

import React, { useState, useEffect, useCallback } from "react";
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
  Alert,
  Chip,
} from "@mui/material";
import LocationPicker from './LocationPicker'; // Make sure this path is correct
import TimeSlotBuilder from './TimeSlotBuilder';
import { toast } from "react-toastify"; // Added for toast notifications

export default function EventStepOne({
  formData,
  setFormData,
  setLetterFile,
  selectedOrgId,
  organizationOptions = [],
  onNext,
  existingImages = [],
  existingLetter = null,
  onRemoveExistingImage,
  onRemoveExistingLetter,
  readOnly = false
}) {
  const [remainingVolunteers, setRemainingVolunteers] = useState(0);
  const [allocationError, setAllocationError] = useState("");
  const [editingCategory, setEditingCategory] = useState(null); // Track which category is being edited
  const [newLetterFile, setNewLetterFile] = useState(null); // Track newly uploaded letter

  // Calculate remaining volunteers, optionally excluding a specific category
  const calculateRemainingVolunteers = useCallback((excludeCategory = null) => {
    if (formData.unlimitedVolunteers) {
      return Infinity;
    }

    const eventMax = parseInt(formData.maxVolunteers) || 0;
    if (eventMax <= 0) {
      return 0;
    }

    // Calculate total allocated volunteers across all time slots and categories
    let totalAllocated = 0;
    if (formData.timeSlots && formData.timeSlots.length > 0) {
      formData.timeSlots.forEach(slot => {
        slot.categories.forEach(category => {
          // Skip the category being edited if specified
          if (excludeCategory && 
              excludeCategory.slotId === slot.id && 
              excludeCategory.categoryId === category.id) {
            return;
          }
          
          if (category.maxVolunteers && category.maxVolunteers > 0) {
            totalAllocated += category.maxVolunteers;
          }
        });
      });
    }

    return eventMax - totalAllocated;
  }, [formData.maxVolunteers, formData.unlimitedVolunteers, formData.timeSlots]);

  useEffect(() => {
    const remaining = calculateRemainingVolunteers(editingCategory);
    setRemainingVolunteers(remaining);

    // Set error if over-allocated
    if (remaining < 0) {
      setAllocationError(`Over-allocated by ${Math.abs(remaining)} volunteers`);
    } else {
      setAllocationError("");
    }
  }, [formData.maxVolunteers, formData.unlimitedVolunteers, formData.timeSlots, editingCategory]);

  const handleMaxVolunteersChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
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
    // Handle null/undefined values to prevent crashes
    if (!newLocation) {
      setFormData((prev) => ({
        ...prev,
        mapLocation: null,
      }));
      return;
    }

    // newLocation is { lat, lng, address } from the map click or search
    setFormData((prev) => ({
      ...prev,
      mapLocation: {
        lat: newLocation.lat,
        lng: newLocation.lng,
        address: newLocation.address, // Update address from LocationPicker
      },
      // Also reflect the chosen address in the simple text field so users see it immediately
      location: newLocation.address || prev.location || '',
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      eventImages: [...(prev.eventImages || []), ...files]
    }));
    
    // Show success toast for uploaded images
    if (files.length > 0) {
      const fileNames = files.map(f => f.name).join(', ');
      toast.success(`🖼️ ${files.length} image(s) uploaded: ${fileNames}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleLetterChange = (e) => {
    const file = e.target.files[0];
    console.log("[EventStepOne] Letter file selected:", file?.name, file?.type, file?.size);
    if (file) {
      setNewLetterFile(file);
      setLetterFile(file);
      console.log("[EventStepOne] Letter file set in state and parent");
      
      // Show success toast for uploaded letter
      toast.success(`📄 Government approval letter uploaded: ${file.name}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleProceed = (e) => {
    e.preventDefault();
    
    // Check if time slots are enabled and validate volunteer allocation
    if (formData.timeSlotsEnabled && formData.timeSlots && formData.timeSlots.length > 0 && !formData.unlimitedVolunteers) {
      if (remainingVolunteers < 0) {
        // Show error and prevent proceeding
        toast.error(`❌ Cannot proceed: You have over-allocated ${Math.abs(remainingVolunteers)} volunteers. Please adjust your category limits before continuing.`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }
    }
    
    // Clear editing state before proceeding to ensure accurate validation
    setEditingCategory(null);
    onNext();
  };

  // Helper to handle appending new files
  const handleAddImages = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      eventImages: [...(prev.eventImages || []), ...files]
    }));
    
    // Show success toast for additional images
    if (files.length > 0) {
      const fileNames = files.map(f => f.name).join(', ');
      toast.success(`🖼️ ${files.length} additional image(s) added: ${fileNames}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleRemoveNewImage = (idx) => {
    const removedImage = formData.eventImages[idx];
    setFormData(prev => ({
      ...prev,
      eventImages: prev.eventImages.filter((_, i) => i !== idx)
    }));
    
    // Show info toast for removed image
    if (removedImage) {
      toast.info(`🗑️ Image removed: ${removedImage.name}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleRemoveNewLetter = () => {
    console.log("[EventStepOne] Removing new letter:", newLetterFile?.name);
    
    if (newLetterFile) {
      // Show warning toast for removed letter
      toast.warning(`🗑️ Government approval letter removed: ${newLetterFile.name}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
    
    setNewLetterFile(null);
    setLetterFile(null);
    
    // Clear the file input more reliably
    const fileInputs = document.querySelectorAll('input[type="file"][accept="image/*,application/pdf"]');
    fileInputs.forEach(input => {
      if (input.files && input.files.length > 0) {
        input.value = '';
        console.log("[EventStepOne] Cleared file input");
      }
    });
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
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Search for a location or click on the map to set the exact coordinates. The address will be automatically filled.
        </Typography>
        <LocationPicker
          value={formData.mapLocation} // Pass the mapLocation object
          onChange={handleLocationChange}
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
          onChange={handleMaxVolunteersChange}
          disabled={formData.unlimitedVolunteers}
          inputProps={{ min: 1 }}
        />
        <FormControlLabel
          control={<Checkbox checked={formData.unlimitedVolunteers} onChange={handleChange} name="unlimitedVolunteers" />}
          label="Unlimited"
        />
      </Box>

      {/* Volunteer Allocation Status */}
      {formData.timeSlotsEnabled && formData.timeSlots && formData.timeSlots.length > 0 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Volunteer Allocation Status
          </Typography>
          
          {formData.unlimitedVolunteers ? (
            <Chip 
              label="Unlimited volunteers - no allocation limits" 
              color="success" 
              variant="outlined"
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                label={`Remaining: ${remainingVolunteers} volunteers`}
                color={remainingVolunteers < 0 ? 'error' : remainingVolunteers < 10 ? 'warning' : 'success'}
                variant="outlined"
              />
              {allocationError && (
                <Alert severity="error" sx={{ flexGrow: 1 }}>
                  {allocationError}
                </Alert>
              )}
            </Box>
          )}
        </Box>
      )}

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
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Recurring Event Settings
          </Typography>
          
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
              inputProps={{ min: 1, max: 31 }}
            />
          )}

          <TextField
            fullWidth
            margin="normal"
            type="date"
            name="recurringEndDate"
            label="Series End Date (Optional)"
            value={formData.recurringEndDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: new Date().toISOString().split('T')[0] }}
          />

          <TextField
            fullWidth
            margin="normal"
            type="number"
            name="recurringMaxInstances"
            label="Maximum Instances (Optional)"
            value={formData.recurringMaxInstances}
            onChange={handleChange}
            inputProps={{ min: 1, max: 100 }}
            helperText="Leave empty for unlimited instances"
          />

          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="body2" color="textSecondary">
              <strong>How it works:</strong> When this event completes, a new instance will be automatically created 
              with the same details but on the next scheduled date. Each instance will have independent volunteer 
              registrations, but the organizer team will remain the same.
            </Typography>
          </Box>
        </Box>
      )}

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Event Images (optional)
        </Typography>
        
        {/* Image Upload Status */}
        {Array.isArray(formData.eventImages) && formData.eventImages.length > 0 && (
          <Box mb={2} p={2} bgcolor="success.light" borderRadius={1}>
            <Typography variant="body2" color="success.contrastText">
              ✓ {formData.eventImages.length} image{formData.eventImages.length !== 1 ? 's' : ''} uploaded
            </Typography>
          </Box>
        )}
        
        {/* Initial Image Upload Button */}
        {(!formData.eventImages || formData.eventImages.length === 0) && (
          <Button
            variant="outlined"
            component="label"
            sx={{ mb: 2 }}
            startIcon={<span>📷</span>}
          >
            Upload Event Images
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleImageChange}
            />
          </Button>
        )}
        
        {/* Existing Images */}
        {existingImages.length > 0 && (
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Existing Images:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {existingImages.map((img, index) => (
                <Box key={index} display="flex" flexDirection="column" alignItems="center" gap={1}>
                  <img 
                    src={`http://localhost:5000/uploads/Events/${img}`} 
                    alt="Preview" 
                    width="100" 
                    height="100"
                    style={{ borderRadius: 8, objectFit: 'cover', border: '2px solid #e0e0e0' }} 
                  />
                  <Button 
                    size="small" 
                    color="error" 
                    variant="outlined"
                    onClick={() => onRemoveExistingImage(img)}
                  >
                    Remove
                  </Button>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        
        {/* New Uploads Preview */}
        {Array.isArray(formData.eventImages) && formData.eventImages.length > 0 && (
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              New Images:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {formData.eventImages.map((file, idx) => (
                <Box key={idx} display="flex" flexDirection="column" alignItems="center" gap={1}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Upload Preview ${idx + 1}`}
                    width="100"
                    height="100"
                    style={{ borderRadius: 8, objectFit: 'cover', border: '2px solid #4caf50' }}
                  />
                  <Typography variant="caption" color="textSecondary" textAlign="center">
                    {file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}
                  </Typography>
                  <Button 
                    size="small" 
                    color="error" 
                    variant="outlined"
                    onClick={() => handleRemoveNewImage(idx)}
                  >
                    Remove
                  </Button>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        
        {/* Add Another Image Button - Only show if there are already images */}
        {Array.isArray(formData.eventImages) && formData.eventImages.length > 0 && (
          <Button
            variant="outlined"
            component="label"
            sx={{ mt: 1 }}
            startIcon={<span>➕</span>}
          >
            Add More Images
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
        )}
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Govt Approval Letter (Image/PDF)
        </Typography>
        
        {/* Existing Letter Display */}
        {existingLetter && (
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <a href={`http://localhost:5000/uploads/${existingLetter}`} target="_blank" rel="noopener noreferrer">
              {existingLetter}
            </a>
            <Button size="small" color="error" onClick={onRemoveExistingLetter}>Remove</Button>
          </Box>
        )}
        
        {/* New Letter Upload Status */}
        {newLetterFile && (
          <Box mb={2} p={2} bgcolor="success.light" borderRadius={1}>
            <Typography variant="body2" color="success.contrastText" gutterBottom>
              ✓ New letter uploaded: {newLetterFile.name}
            </Typography>
            <Button 
              size="small" 
              color="error" 
              variant="outlined"
              onClick={handleRemoveNewLetter}
              sx={{ mt: 1 }}
            >
              Remove New Letter
            </Button>
          </Box>
        )}
        
        {/* File Upload Input */}
        <input 
          type="file" 
          name="govtApprovalLetter"
          accept="image/*,application/pdf" 
          onChange={handleLetterChange}
          style={{ marginTop: '8px' }}
        />
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          Upload a new government approval letter. You can remove it before proceeding if needed.
        </Typography>
      </Box>

      <TimeSlotBuilder
        timeSlotsEnabled={formData.timeSlotsEnabled || false}
        setTimeSlotsEnabled={(enabled) => setFormData(prev => ({ ...prev, timeSlotsEnabled: enabled }))}
        timeSlots={formData.timeSlots || []}
        setTimeSlots={(slots) => setFormData(prev => ({ ...prev, timeSlots: slots }))}
        remainingVolunteers={remainingVolunteers}
        unlimitedVolunteers={formData.unlimitedVolunteers}
        allocationError={allocationError}
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        readOnly={readOnly}
      />

      <Button 
        type="submit" 
        variant="contained" 
        color="primary" 
        fullWidth 
        sx={{ mt: 3 }}
        disabled={formData.timeSlotsEnabled && !formData.unlimitedVolunteers && remainingVolunteers < 0}
      >
        Proceed to Questionnaire →
      </Button>
      
      {/* Helper text for disabled button */}
      {formData.timeSlotsEnabled && !formData.unlimitedVolunteers && remainingVolunteers < 0 && (
        <Typography variant="body2" color="error" sx={{ mt: 1, textAlign: 'center' }}>
          ⚠️ Cannot proceed: You have over-allocated {Math.abs(remainingVolunteers)} volunteers. 
          Please adjust your category limits above before continuing.
        </Typography>
      )}
    </Box>
  );
}
