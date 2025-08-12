import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';

const TimeSlotBuilder = ({ 
  timeSlotsEnabled, 
  setTimeSlotsEnabled, 
  timeSlots, 
  setTimeSlots,
  remainingVolunteers = 0,
  unlimitedVolunteers = false,
  allocationError = "",
  editingCategory = null,
  setEditingCategory = null,
  readOnly = false
}) => {
  const defaultSlotNames = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const timeIntervals = Array.from({ length: 96 }, (_, i) => {
    const hours = Math.floor(i / 4);
    const minutes = (i % 4) * 15;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  });

  const addTimeSlot = () => {
    const newSlot = {
      id: uuidv4(),
      name: '',
      startTime: '09:00',
      endTime: '12:00',
      categories: []
    };
    setTimeSlots([...timeSlots, newSlot]);
  };

  const removeTimeSlot = (slotId) => {
    // In readOnly mode, only allow removing newly added slots (those without existing data)
    if (readOnly) {
      const slot = timeSlots.find(s => s.id === slotId);
      if (slot && slot.existing) {
        return; // Don't allow removing existing slots
      }
    }
    setTimeSlots(timeSlots.filter(slot => slot.id !== slotId));
  };

  const updateTimeSlot = (slotId, field, value) => {
    // In readOnly mode, don't allow updating existing slots
    if (readOnly) {
      const slot = timeSlots.find(s => s.id === slotId);
      if (slot && slot.existing) {
        return; // Don't allow updating existing slots
      }
    }
    setTimeSlots(timeSlots.map(slot => 
      slot.id === slotId ? { ...slot, [field]: value } : slot
    ));
  };

  const addCategory = (slotId) => {
    const newCategory = {
      id: uuidv4(),
      name: '',
      maxVolunteers: null,
      isNew: true // Mark as newly added
    };
    setTimeSlots(timeSlots.map(slot => 
      slot.id === slotId 
        ? { ...slot, categories: [...slot.categories, newCategory] }
        : slot
    ));
  };

  const removeCategory = (slotId, categoryId) => {
    // In readOnly mode, only allow removing newly added categories
    if (readOnly) {
      const slot = timeSlots.find(s => s.id === slotId);
      const category = slot?.categories.find(c => c.id === categoryId);
      if (category && category.existing) {
        return; // Don't allow removing existing categories
      }
    }
    setTimeSlots(timeSlots.map(slot => 
      slot.id === slotId 
        ? { ...slot, categories: slot.categories.filter(cat => cat.id !== categoryId) }
        : slot
    ));
  };

  const updateCategory = (slotId, categoryId, field, value) => {
    // In readOnly mode, don't allow updating existing categories
    if (readOnly) {
      const slot = timeSlots.find(s => s.id === slotId);
      const category = slot?.categories.find(c => c.id === categoryId);
      if (category && category.existing) {
        return; // Don't allow updating existing categories
      }
    }

    // Special validation for maxVolunteers field
    if (field === 'maxVolunteers') {
      const numValue = value === '' ? null : parseInt(value);
    }
    
    setTimeSlots(timeSlots.map(slot => 
      slot.id === slotId 
        ? {
            ...slot,
            categories: slot.categories.map(cat => 
              cat.id === categoryId ? { ...cat, [field]: value } : cat
            )
          }
        : slot
    ));
  };

  const clearEditingState = () => {
    if (setEditingCategory) {
      setEditingCategory(null);
    }
  };

  const validateTimeSlots = () => {
    if (!timeSlotsEnabled) return { isValid: true };

    if (timeSlots.length === 0) {
      return { isValid: false, error: 'At least one time slot is required' };
    }

    // Check for overlapping time slots
    for (let i = 0; i < timeSlots.length; i++) {
      for (let j = i + 1; j < timeSlots.length; j++) {
        const slot1 = timeSlots[i];
        const slot2 = timeSlots[j];
        
        // Convert times to minutes for proper comparison
        const start1Min = parseInt(slot1.startTime.split(':')[0]) * 60 + parseInt(slot1.startTime.split(':')[1]);
        const end1Min = parseInt(slot1.endTime.split(':')[0]) * 60 + parseInt(slot1.endTime.split(':')[1]);
        const start2Min = parseInt(slot2.startTime.split(':')[0]) * 60 + parseInt(slot2.startTime.split(':')[1]);
        const end2Min = parseInt(slot2.endTime.split(':')[0]) * 60 + parseInt(slot2.endTime.split(':')[1]);
        
        if (start1Min < end2Min && start2Min < end1Min) {
          return { 
            isValid: false, 
            error: `Time slots "${slot1.name}" and "${slot2.name}" overlap` 
          };
        }
      }
    }

    // Validate individual time slots
    for (const slot of timeSlots) {
      if (!slot.name || slot.name.trim() === '') {
        return { isValid: false, error: 'All time slots must have a name' };
      }
      
      // Convert times to minutes for proper comparison
      const startMin = parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1]);
      const endMin = parseInt(slot.endTime.split(':')[0]) * 60 + parseInt(slot.endTime.split(':')[1]);
      
      if (startMin >= endMin) {
        return { isValid: false, error: `End time must be after start time for slot "${slot.name}"` };
      }
      
      if (slot.categories.length === 0) {
        return { isValid: false, error: `Time slot "${slot.name}" must have at least one category` };
      }
      
      // Check for duplicate category names within the slot
      const categoryNames = slot.categories.map(cat => cat.name.toLowerCase());
      const uniqueCategoryNames = [...new Set(categoryNames)];
      if (categoryNames.length !== uniqueCategoryNames.length) {
        return { isValid: false, error: `Duplicate category names found in slot "${slot.name}"` };
      }
      
      for (const category of slot.categories) {
        if (!category.name || category.name.trim() === '') {
          return { isValid: false, error: 'All categories must have a name' };
        }
        
        if (category.maxVolunteers !== null && category.maxVolunteers <= 0) {
          return { isValid: false, error: `Max volunteers must be positive for category "${category.name}"` };
        }
      }
    }

    return { isValid: true };
  };

  const validation = validateTimeSlots();

  return (
    <Box sx={{ mt: 3 }}>
      <FormControlLabel
        control={
          <Switch
            checked={timeSlotsEnabled}
            onChange={(e) => setTimeSlotsEnabled(e.target.checked)}
          />
        }
        label="Add Time Slots & Work Categories"
      />

      {timeSlotsEnabled && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Time Slots & Categories
          </Typography>
          
          {/* Volunteer Allocation Status */}
          {!unlimitedVolunteers && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Volunteer Allocation
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip 
                  label={`Remaining: ${remainingVolunteers} volunteers`}
                  color={remainingVolunteers < 0 ? 'error' : remainingVolunteers < 10 ? 'warning' : 'success'}
                  variant="outlined"
                />
                {allocationError && (
                  <Typography variant="body2" color="error">
                    {allocationError}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
          
          {validation.error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {validation.error}
            </Typography>
          )}

          {timeSlots.map((slot, slotIndex) => (
            <Card key={slot.id} sx={{ 
              mb: 2, 
              border: slot.existing ? '1px solid #e0e0e0' : '1px solid #1976d2',
              bgcolor: slot.existing ? 'grey.50' : 'white'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                    {slot.existing ? 'Existing ' : 'New '}Time Slot {slotIndex + 1}
                  </Typography>
                  {slot.existing && (
                    <Chip 
                      label="Read Only" 
                      color="default" 
                      size="small" 
                      variant="outlined"
                    />
                  )}
                  {!slot.existing && (
                    <IconButton 
                      onClick={() => removeTimeSlot(slot.id)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Slot Name"
                      value={slot.name}
                      onChange={(e) => updateTimeSlot(slot.id, 'name', e.target.value)}
                      placeholder="e.g., Morning"
                      disabled={slot.existing && readOnly}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Start Time</InputLabel>
                      <Select
                        value={slot.startTime}
                        onChange={(e) => updateTimeSlot(slot.id, 'startTime', e.target.value)}
                        label="Start Time"
                        disabled={slot.existing && readOnly}
                      >
                        {timeIntervals.map((time) => (
                          <MenuItem key={time} value={time}>
                            {time}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>End Time</InputLabel>
                      <Select
                        value={slot.endTime}
                        onChange={(e) => updateTimeSlot(slot.id, 'endTime', e.target.value)}
                        label="End Time"
                        disabled={slot.existing && readOnly}
                      >
                        {timeIntervals.map((time) => (
                          <MenuItem key={time} value={time}>
                            {time}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => addCategory(slot.id)}
                      fullWidth
                    >
                      Add Category
                    </Button>
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" gutterBottom>
                  Categories ({slot.categories.length})
                </Typography>

                {slot.categories.map((category, catIndex) => (
                  <Box key={category.id} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1,
                    p: 1,
                    bgcolor: category.existing ? 'grey.100' : 'white',
                    borderRadius: 1,
                    border: category.existing ? '1px solid #e0e0e0' : 'none'
                  }}>
                    <TextField
                      label="Category Name"
                      value={category.name}
                      onChange={(e) => updateCategory(slot.id, category.id, 'name', e.target.value)}
                      sx={{ flexGrow: 1, mr: 1 }}
                      placeholder="e.g., Cleanup"
                      disabled={category.existing && readOnly}
                    />
                    <TextField
                      label="Max Volunteers"
                      type="number"
                      value={category.maxVolunteers || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseInt(e.target.value);
                        updateCategory(slot.id, category.id, 'maxVolunteers', value);
                      }}
                      onFocus={() => {
                        if (setEditingCategory) {
                          setEditingCategory({ slotId: slot.id, categoryId: category.id });
                        }
                      }}
                      onBlur={() => {
                        clearEditingState();
                      }}
                      sx={{ width: 150, mr: 1 }}
                      placeholder="Unlimited"
                      inputProps={{ 
                        min: 1,
                        max: unlimitedVolunteers ? undefined : remainingVolunteers
                      }}
                      helperText={
                        !unlimitedVolunteers && remainingVolunteers < Infinity
                          ? `Max available: ${remainingVolunteers}`
                          : "Unlimited"
                      }
                      error={
                        !unlimitedVolunteers && 
                        category.maxVolunteers && 
                        category.maxVolunteers > remainingVolunteers &&
                        !(editingCategory && 
                          editingCategory.slotId === slot.id && 
                          editingCategory.categoryId === category.id)
                      }
                      disabled={category.existing && readOnly}
                    />
                    {!category.existing && (
                      <IconButton 
                        onClick={() => removeCategory(slot.id, category.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                    {category.existing && readOnly && (
                      <Chip 
                        label="Read Only" 
                        color="default" 
                        size="small" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                ))}

                {slot.categories.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No categories added yet. Click "Add Category" to get started.
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addTimeSlot}
            sx={{ mt: 2 }}
          >
            Add Time Slot
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TimeSlotBuilder; 