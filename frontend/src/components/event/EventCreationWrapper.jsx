// src/components/event/EventCreationWrapper.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import EventStepOne from "./EventStepOne";
import EventStepTwo from "./EventStepTwo";
import EventPreview from "./EventPreview";
import axiosInstance from "../../api/axiosInstance";

export default function EventCreationWrapper({
  selectedOrgId,
  organizationOptions = [],
  onClose,
  isEdit = false,
  eventId = null,
  initialFormData = null,
  initialQuestionnaireData = null,
  readOnly = false
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(
    initialFormData || {
      title: "",
      description: "",
      location: "", // Keep original location for backward compatibility or simple text entry
      mapLocation: {
        address: "",
        lat: null,
        lng: null,
      },
      startDateTime: "",
      endDateTime: "",
      maxVolunteers: "",
      unlimitedVolunteers: false,
      equipmentNeeded: [],
      otherEquipment: "",
      eventType: "",
      instructions: "",
      groupRegistration: false,
      recurringEvent: false,
      recurringType: "",
      recurringValue: "",
      recurringEndDate: "",
      recurringMaxInstances: "",
      organization: selectedOrgId || "",
      eventImages: [],
      govtApprovalLetter: null,
      timeSlotsEnabled: false,
      timeSlots: [],
    }
  );

  const [questionnaireData, setQuestionnaireData] = useState(
    initialQuestionnaireData || {
      waterProvided: false,
      medicalSupport: false,
      ageGroup: "",
      precautions: "",
      publicTransport: "",
      contactPerson: "",
    }
  );

  const [existingImages, setExistingImages] = useState(
    initialFormData?.existingImages || []
  );
  const [existingLetter, setExistingLetter] = useState(
    initialFormData?.existingLetter || null
  );

  const handleFormUpdate = (updater) => {
    if (typeof updater === "function") {
      setFormData(updater);
    } else {
      setFormData((prev) => ({ ...prev, ...updater }));
    }
  };

  const handleLetterUpdate = (file) => {
    setFormData((prev) => ({ ...prev, govtApprovalLetter: file }));
  };

  const handleRemoveExistingImage = (filename) => {
    setExistingImages((prev) => prev.filter((img) => img !== filename));
  };

  const handleRemoveExistingLetter = () => {
    setExistingLetter(null);
  };

  const handleStepNavigation = (newStep, direction) => {
    // Validate current step before allowing navigation
    if (direction === 'next') {
      if (step === 1) {
        if (!formData.title?.trim()) {
          toast.error("❌ Please enter an event title", {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          return;
        }
        if (!formData.description?.trim()) {
          toast.error("❌ Please enter an event description", {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          return;
        }
        if (!formData.startDateTime) {
          toast.error("❌ Please select a start date and time", {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          return;
        }
        if (!formData.endDateTime) {
          toast.error("❌ Please select an end date and time", {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          return;
        }
        if (new Date(formData.startDateTime) >= new Date(formData.endDateTime)) {
          toast.error("❌ End time must be after start time", {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          return;
        }
        if (!formData.location?.trim()) {
          toast.error("❌ Please enter an event location", {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          return;
        }
      }
      
      if (step === 2) {
        // Basic questionnaire validation
        if (!formData.ageGroup && (formData.waterProvided || formData.medicalSupport)) {
          toast.warning("⚠️ Age group is recommended when providing water or medical support", {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
      }
    }

    setStep(newStep);
  };

  const handleSubmit = async () => {
    // Show submission start notification
    const submitToastId = toast.loading(
      isEdit ? "🔄 Updating event..." : "🔄 Creating event...",
      {
        position: "top-right",
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
      }
    );

    try {
      // Validate volunteer allocation if time slots are enabled
      if (formData.timeSlotsEnabled && formData.timeSlots && formData.timeSlots.length > 0 && !formData.unlimitedVolunteers) {
        const eventMax = parseInt(formData.maxVolunteers) || 0;
        let totalAllocated = 0;
        
        formData.timeSlots.forEach(slot => {
          slot.categories.forEach(category => {
            if (category.maxVolunteers && category.maxVolunteers > 0) {
              totalAllocated += category.maxVolunteers;
            }
          });
        });
        
        if (totalAllocated > eventMax) {
          toast.dismiss(submitToastId);
          toast.error(`❌ Volunteer allocation error: You have allocated ${totalAllocated} volunteers but the event maximum is ${eventMax}. Please adjust your category limits.`, {
            position: "top-right",
            autoClose: 6000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          return;
        }
      }

      // Validate required fields
      if (!formData.title?.trim()) {
        toast.dismiss(submitToastId);
        toast.error("❌ Event title is required", {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }

      const data = new FormData();

      for (const key in formData) {
        if (key === "equipmentNeeded") {
          formData.equipmentNeeded.forEach((item) =>
            data.append("equipmentNeeded", item)
          );
        } else if (key === "eventImages") {
          (Array.isArray(formData.eventImages) ? formData.eventImages : []).forEach((file) =>
            data.append("eventImages", file)
          );
        } else if (key === 'mapLocation') {
          if (formData.mapLocation) {
            data.append('mapLocation[address]', formData.mapLocation.address || '');
            data.append('mapLocation[lat]', formData.mapLocation.lat || '');
            data.append('mapLocation[lng]', formData.mapLocation.lng || '');
          }
        } else if (key === "govtApprovalLetter") {
          if (formData.govtApprovalLetter) {
            data.append("govtApprovalLetter", formData.govtApprovalLetter);
          }
        } else if (key === "timeSlots") {
          // Handle timeSlots as JSON string since it's a complex object
          if (formData.timeSlots && formData.timeSlots.length > 0) {
            data.append("timeSlots", JSON.stringify(formData.timeSlots));
          }
        } else {
          data.append(key, formData[key]);
        }
      }

      for (const key in questionnaireData) {
        data.append(key, questionnaireData[key]);
      }

      // Append deleted files
      existingImages.forEach((filename) =>
        data.append("existingImages", filename)
      );
      if (existingLetter) {
        data.append("existingLetter", existingLetter);
      }

      // Handle removed files for editing (if provided)
      if (formData.removedImages && Array.isArray(formData.removedImages)) {
        formData.removedImages.forEach((img) => data.append("removedImages", img));
      }
      if (formData.removedLetter === true) {
        data.append("removedLetter", "true");
      }

      const isUpdating = Boolean(isEdit && eventId);
      const url = isUpdating ? `/api/events/${eventId}` : "/api/events/create";
      const method = isUpdating ? 'PUT' : 'POST';

      let response;
      if (isUpdating) {
        response = await axiosInstance.put(url, data);
        
        // Show success notification
        toast.dismiss(submitToastId);
      } else {
        response = await axiosInstance.post(url, data);
        
        // Show success notification
        toast.dismiss(submitToastId);
        toast.success("🎉 Event created successfully!", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }

             // Dismiss loading toast first
       toast.dismiss(submitToastId);
       
       // Call onClose callback if provided
       if (onClose) {
         try {
           onClose();
         } catch (error) {
           console.error("[EventCreationWrapper] Error in onClose callback:", error);
         }
       }
       
       // Navigate to the event details page
       try {
         let eventIdToNavigate;
         
         if (isEdit && eventId) {
           // For editing, use the existing event ID
           eventIdToNavigate = eventId;
         } else if (response?.data?._id) {
           // For creating, get the event ID from the response
           eventIdToNavigate = response.data._id;
         }
         
         if (eventIdToNavigate) {
           // Navigate to the event details page
           navigate(`/events/${eventIdToNavigate}`);
         } else {
           // Fallback: navigate to home page if we can't get the event ID
           console.warn("[EventCreationWrapper] Could not determine event ID for navigation");
           navigate('/');
         }
       } catch (error) {
         console.error("[EventCreationWrapper] Navigation error:", error);
         // Fallback navigation
         navigate('/');
       }
         } catch (err) {
       console.error("[EventCreationWrapper] Submit failed", err?.response || err);
       
       // Always dismiss loading toast, even on error
       try {
         toast.dismiss(submitToastId);
       } catch (dismissError) {
         console.error("[EventCreationWrapper] Error dismissing toast:", dismissError);
       }
      
      let errorMessage = "Failed to submit event.";
      
      if (err?.response) {
        console.error("[EventCreationWrapper] Error status:", err.response.status);
        console.error("[EventCreationWrapper] Error data:", err.response.data);
        
        if (err.response.status === 400) {
          errorMessage = err.response.data?.message || "Validation error. Please check your input.";
        } else if (err.response.status === 401) {
          errorMessage = "Authentication required. Please log in again.";
        } else if (err.response.status === 403) {
          errorMessage = "Permission denied. You don't have access to perform this action.";
        } else if (err.response.status === 404) {
          errorMessage = "Event not found or has been removed.";
        } else if (err.response.status === 409) {
          errorMessage = "Conflict detected. The event may have been modified by another user.";
        } else if (err.response.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        }
      } else if (err?.message) {
        if (err.message.includes('Network Error')) {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (err.message.includes('timeout')) {
          errorMessage = "Request timeout. Please try again.";
        }
      }
      
      toast.error(`❌ ${errorMessage}`, {
        position: "top-right",
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  return (
    <>
      {step === 1 && (
        <EventStepOne
          formData={formData}
          setFormData={handleFormUpdate}
          setLetterFile={handleLetterUpdate}
          selectedOrgId={selectedOrgId}
          organizationOptions={organizationOptions}
          onNext={() => handleStepNavigation(2, 'next')}
          existingImages={existingImages}
          existingLetter={existingLetter}
          onRemoveExistingImage={handleRemoveExistingImage}
          onRemoveExistingLetter={handleRemoveExistingLetter}
          isEditMode={isEdit}
          readOnly={readOnly}
        />
      )}
      {step === 2 && (
        <EventStepTwo
          questionnaireData={questionnaireData}
          setQuestionnaireData={setQuestionnaireData}
          onBack={() => handleStepNavigation(1, 'back')}
          onNext={() => handleStepNavigation(3, 'next')}
        />
      )}
      {step === 3 && (
        <EventPreview
          formData={formData}
          questionnaireData={questionnaireData}
          onBack={() => handleStepNavigation(2, 'back')}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
