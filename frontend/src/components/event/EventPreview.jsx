// src/components/event/EventPreview.jsx

import React from "react";
import {
  Box,
  Typography,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";

export default function EventPreview({ formData, questionnaireData, onBack, onSubmit, existingLetter }) {
  const displayListItem = (label, value) => (
    <ListItem>
      <ListItemText
        primary={label}
        secondary={value || <em>Not provided</em>}
        primaryTypographyProps={{ fontWeight: "bold" }}
      />
    </ListItem>
  );

  // Helper for letter preview
  const renderLetter = () => {
    if (formData.govtApprovalLetter) {
      // New upload
      return formData.govtApprovalLetter.name;
    } else if (existingLetter) {
      // Existing file
      if (existingLetter.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return (
          <img
            src={`http://localhost:5000/uploads/Events/${existingLetter}`}
            alt="Govt Approval Letter"
            style={{ width: 120, borderRadius: 6, marginTop: 4 }}
          />
        );
      } else if (existingLetter.match(/\.pdf$/i)) {
        return (
          <a
            href={`http://localhost:5000/uploads/Events/${existingLetter}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1976d2', textDecoration: 'underline' }}
          >
            View PDF
          </a>
        );
      } else {
        return existingLetter;
      }
    } else {
      return "Not uploaded";
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Event Preview
      </Typography>

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" gutterBottom>
        Event Details
      </Typography>
      <List dense>
        {displayListItem("Title", formData.title)}
        {displayListItem("Description", formData.description)}
        {displayListItem("Location", formData.location)}
        {displayListItem("Start Date & Time", formData.startDateTime)}
        {displayListItem("End Date & Time", formData.endDateTime)}
        {displayListItem(
          "Max Volunteers",
          formData.unlimitedVolunteers ? "Unlimited" : formData.maxVolunteers
        )}
        {displayListItem("Event Type", formData.eventType)}
        {displayListItem("Group Registration", formData.groupRegistration ? "Enabled" : "Disabled")}
        {displayListItem("Recurring Event", formData.recurringEvent ? `Yes (${formData.recurringType} - ${formData.recurringValue})` : "No")}
        {formData.recurringEvent && (
          <>
            {displayListItem("Series End Date", formData.recurringEndDate || "No end date")}
            {displayListItem("Max Instances", formData.recurringMaxInstances || "Unlimited")}
          </>
        )}
        {displayListItem("Other Equipment", formData.otherEquipment)}
        {displayListItem("Instructions", formData.instructions)}
        
        {/* Time Slots Section */}
        {formData.timeSlotsEnabled && formData.timeSlots && formData.timeSlots.length > 0 && (
          <>
            {displayListItem("Time Slots Enabled", "Yes")}
            <ListItem>
              <ListItemText
                primary="Time Slots & Categories"
                secondary={
                  <div>
                    {formData.timeSlots.map((slot, index) => (
                      <Box key={slot.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {slot.name} ({slot.startTime} - {slot.endTime})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {slot.categories.map((category) => (
                            <Chip
                              key={category.id}
                              label={`${category.name}${category.maxVolunteers ? ` (Max: ${category.maxVolunteers})` : ' (Unlimited)'}`}
                              color="primary"
                              variant="outlined"
                              size="small"
                            />
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </div>
                }
              />
            </ListItem>
          </>
        )}
        
        <ListItem>
          <ListItemText
            primary="Equipment Needed"
            secondary={
              formData.equipmentNeeded.length > 0
                ? (
                    <div>
                      {formData.equipmentNeeded.map((eq) => (
                        <Chip key={eq} label={eq} sx={{ mr: 1 }} />
                      ))}
                    </div>
                  )
                : "None"
            }
            primaryTypographyProps={{ fontWeight: "bold" }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Images"
            secondary={
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                {/* Show new uploads (File objects) */}
                {Array.isArray(formData.eventImages) && formData.eventImages.map((img, idx) =>
                  typeof img === 'object' && img instanceof File ? (
                    <img
                      key={idx}
                      src={URL.createObjectURL(img)}
                      alt={`Event Image ${idx + 1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
                    />
                  ) : null
                )}
                {/* Show existing images (filenames as string) */}
                {formData.existingImages?.map((img, idx) =>
                  typeof img === 'string' ? (
                    <img
                      key={`existing-${idx}`}
                      src={`http://localhost:5000/uploads/Events/${img}`}
                      alt={`Event Image ${idx + 1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
                    />
                  ) : null
                )}
                {/* Fallback if no images */}
                {(!formData.eventImages || formData.eventImages.length === 0) && (!formData.existingImages || formData.existingImages.length === 0) && (
                  <span style={{ color: '#888' }}>None</span>
                )}
              </Box>
            }
            primaryTypographyProps={{ fontWeight: "bold" }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Govt Approval Letter"
            secondary={renderLetter()}
            primaryTypographyProps={{ fontWeight: "bold" }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" gutterBottom>
        Volunteer Experience Details
      </Typography>
      <List dense>
        {displayListItem("Water Provided", questionnaireData.waterProvided ? "Yes" : "No")}
        {displayListItem("Medical Support", questionnaireData.medicalSupport ? "Yes" : "No")}
        {displayListItem("Recommended Age Group", questionnaireData.ageGroup)}
        {displayListItem("Special Precautions", questionnaireData.precautions)}
        {displayListItem("Nearest Public Transport", questionnaireData.publicTransport)}
        {displayListItem("Contact Person", questionnaireData.contactPerson)}
      </List>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
        <Button variant="outlined" color="primary" onClick={onBack}>
          Back
        </Button>
        <Button variant="contained" color="success" onClick={onSubmit}>
          Submit Event
        </Button>
      </Box>
    </Box>
  );
}
