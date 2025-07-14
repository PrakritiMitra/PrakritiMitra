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

export default function EventPreview({ formData, questionnaireData, onBack, onSubmit }) {
  const displayListItem = (label, value) => (
    <ListItem>
      <ListItemText
        primary={label}
        secondary={value || <em>Not provided</em>}
        primaryTypographyProps={{ fontWeight: "bold" }}
      />
    </ListItem>
  );

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
        {displayListItem("Other Equipment", formData.otherEquipment)}
        {displayListItem("Instructions", formData.instructions)}
        <ListItem>
          <ListItemText
            primary="Equipment Needed"
            secondary={
              formData.equipmentNeeded.length > 0
                ? (
                    <span>
                      {formData.equipmentNeeded.map((eq) => (
                        <Chip key={eq} label={eq} sx={{ mr: 1 }} />
                      ))}
                    </span>
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
              formData.eventImages?.length > 0
                ? `${formData.eventImages.length} selected`
                : "None"
            }
            primaryTypographyProps={{ fontWeight: "bold" }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Govt Approval Letter"
            secondary={formData.govtApprovalLetter?.name || "Not uploaded"}
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
