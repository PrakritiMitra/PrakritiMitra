// src/components/event/EventCreationWrapper.jsx

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useLocation } from "react-router-dom";
import { showAlert, showConfirm } from "../../utils/notifications";
import EventStepOne from "./EventStepOne";
import EventStepTwo from "./EventStepTwo";
import EventPreview from "./EventPreview";
import axiosInstance from "../../api/axiosInstance";
import { FullScreenLoader } from '../common/LoaderComponents';

const EventCreationWrapper = forwardRef(function EventCreationWrapper({
  selectedOrgId,
  organizationOptions = [],
  onClose,
  isEdit = false,
  eventId = null,
  initialFormData = null,
  initialQuestionnaireData = null,
  readOnly = false
  }, ref) {
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // Enhanced upload state management
  const [uploadStatus, setUploadStatus] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadErrors, setUploadErrors] = useState({});

  // Cleanup upload states when component unmounts
  useEffect(() => {
    return () => {
      resetUploadStates();
    };
  }, []);

  // Navigation guard to prevent accidental data loss
  const hasUnsavedChanges = () => {
    try {
      const defaultFormData = {
        title: "",
        description: "",
        location: "",
        mapLocation: { address: "", lat: null, lng: null },
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
      };

      // Safety check for formData
      if (!formData) return false;

      // Check if any form field has been modified
      const hasFormChanges = Object.keys(defaultFormData).some(key => {
        const current = formData[key];
        const initial = defaultFormData[key];
        
        if (Array.isArray(current)) {
          return current && current.length > 0;
        }
        if (typeof current === 'object' && current !== null) {
          return Object.values(current).some(val => val !== null && val !== "");
        }
        return current !== initial && current !== "" && current !== null;
      });

      // Check if questionnaire has been modified
      const hasQuestionnaireChanges = questionnaireData && (
        (questionnaireData.timeSlots?.length > 0) || 
        (questionnaireData.workCategories?.length > 0) ||
        (questionnaireData.questionSets?.length > 0) ||
        questionnaireData.waterProvided ||
        questionnaireData.medicalSupport ||
        (questionnaireData.ageGroup && questionnaireData.ageGroup.trim() !== "") ||
        (questionnaireData.precautions && questionnaireData.precautions.trim() !== "") ||
        (questionnaireData.publicTransport && questionnaireData.publicTransport.trim() !== "") ||
        (questionnaireData.contactPerson && questionnaireData.contactPerson.trim() !== "")
      );

      // Check if any uploads are in progress
      const hasActiveUploads = Object.keys(uploadStatus || {}).length > 0 || 
                              Object.keys(uploadProgress || {}).length > 0;

      // Only consider it unsaved if there are actual changes, not just step progression
      return hasFormChanges || hasQuestionnaireChanges || hasActiveUploads;
    } catch (error) {
      console.warn('Error in hasUnsavedChanges:', error);
      return false; // Safe fallback
    }
  };

  // Handle browser back/forward/refresh
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = ''; // For Chrome
        return ''; // For other browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData, questionnaireData, uploadStatus, uploadProgress, currentStep]);





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

  // Upload state management utilities
  const resetUploadStates = () => {
    setUploadProgress({});
    setUploadStatus({});
    setIsUploading(false);
    setUploadQueue([]);
    setUploadErrors({});
  };

  // Clean up Cloudinary files before discarding event
  const cleanupCloudinaryFiles = async () => {
    try {
      let deletedCount = 0;
      let errorCount = 0;
      
      // Delete uploaded images
      if (formData.eventImages && Array.isArray(formData.eventImages)) {
        for (const image of formData.eventImages) {
          if (image.cloudinaryId && image.cloudinaryId.trim()) {
            try {
              await axiosInstance.post('/api/events/delete-cloudinary-file', {
                publicId: image.cloudinaryId,
                fileName: image.name
              });
              deletedCount++;
            } catch (error) {
              console.warn(`⚠️ Failed to delete image ${image.name} from Cloudinary:`, error);
              errorCount++;
            }
          }
        }
      }
      
      // Delete uploaded letter
      if (formData.govtApprovalLetter?.cloudinaryId && formData.govtApprovalLetter.cloudinaryId.trim()) {
        try {
          await axiosInstance.post('/api/events/delete-cloudinary-file', {
            publicId: formData.govtApprovalLetter.cloudinaryId,
            fileName: formData.govtApprovalLetter.name
          });
          deletedCount++;
        } catch (error) {
          console.warn(`⚠️ Failed to delete letter ${formData.govtApprovalLetter.name} from Cloudinary:`, error);
          errorCount++;
        }
      }
      
      // Return cleanup summary
      return { deletedCount, errorCount };
    } catch (error) {
      console.error('Error during Cloudinary cleanup:', error);
      return { deletedCount: 0, errorCount: 1 };
    }
  };

  // Check if there are any Cloudinary files that would be cleaned up
  const hasCloudinaryFiles = () => {
    const hasImages = formData.eventImages?.some(img => img.cloudinaryId) || false;
    const hasLetter = formData.govtApprovalLetter?.cloudinaryId || false;
    return hasImages || hasLetter;
  };

  // Reset form data to initial state
  const resetFormData = () => {
    setFormData({
      title: "",
      description: "",
      location: "",
      mapLocation: { address: "", lat: null, lng: null },
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
    });
    
    setQuestionnaireData({
      waterProvided: false,
      medicalSupport: false,
      ageGroup: "",
      precautions: "",
      publicTransport: "",
      contactPerson: "",
    });
    
    setCurrentStep(1);
    setExistingImages([]);
    setExistingLetter(null);
  };

  const isAnyFileUploading = () => {
    return Object.values(uploadStatus).some(status => status === 'uploading');
  };

  const hasUploadErrors = () => {
    return Object.keys(uploadErrors).length > 0;
  };

  const canProceedToNextStep = () => {
    // Check if any files are currently uploading
    if (isAnyFileUploading()) {
      return false;
    }
    
    // Check if there are any upload errors that need attention
    if (hasUploadErrors()) {
      return false;
    }
    
    return true;
  };

  const canSubmitEvent = () => {
    // Check if any files are currently uploading
    if (isAnyFileUploading()) {
      return false;
    }
    
    // Check if there are any upload errors that need attention
    if (hasUploadErrors()) {
      return false;
    }
    
    return true;
  };

  const handleStepNavigation = async (newStep, direction) => {
    // Add confirmation for going back to step 1 if user has made progress
    if (direction === 'back' && newStep === 1 && currentStep > 1) {
      if (hasUnsavedChanges()) {
        showConfirm.warning(
          'Going back to step 1 might lose some of your progress in the questionnaire. Are you sure you want to continue?',
          () => {
            // User confirmed - proceed with navigation
            setCurrentStep(newStep);
          },
          () => {
            // User cancelled - stay on current step
            // Do nothing, just return
          },
          {
            title: 'Go Back to Step 1?',
            confirmText: 'Go Back',
            cancelText: 'Stay Here'
          }
        );
        return; // Exit early, let the confirmation handle navigation
      }
    }

    // Check if files are uploading before allowing navigation
    if (direction === 'next' && !canProceedToNextStep()) {
      if (isAnyFileUploading()) {
        showAlert.warning("⏳ Please wait for file uploads to complete before proceeding");
        return;
      }
      if (hasUploadErrors()) {
        showAlert.error("❌ Please resolve file upload errors before proceeding");
        return;
      }
    }

    // If we get here, proceed with navigation
    setCurrentStep(newStep);

    // Validate current step before allowing navigation
    if (direction === 'next') {
      if (currentStep === 1) {
        if (!formData.title?.trim()) {
          showAlert("❌ Please enter an event title", "error");
          return;
        }
        if (!formData.description?.trim()) {
          showAlert("❌ Please enter an event description", "error");
          return;
        }
        if (!formData.startDateTime) {
          showAlert("❌ Please select a start date and time", "error");
          return;
        }
        if (!formData.endDateTime) {
          showAlert("❌ Please select an end date and time", "error");
          return;
        }
        if (new Date(formData.startDateTime) >= new Date(formData.endDateTime)) {
          showAlert("❌ End time must be after start time", "error");
          return;
        }
        if (!formData.location?.trim()) {
          showAlert("❌ Please enter an event location", "error");
          return;
        }
      }
      
      if (currentStep === 2) {
        // Basic questionnaire validation
        if (!formData.ageGroup && (formData.waterProvided || formData.medicalSupport)) {
          showAlert("⚠️ Age group is recommended when providing water or medical support", "warning");
        }
      }
    }
  };

  // Protected close function for external use
  const handleProtectedClose = async () => {
    if (hasUnsavedChanges()) {
      const hasFiles = hasCloudinaryFiles();
      const message = hasFiles 
        ? 'You have unsaved changes and uploaded files. Are you sure you want to discard this event? All progress will be lost and uploaded files will be permanently deleted from Cloudinary.'
        : 'You have unsaved changes in your event creation. Are you sure you want to leave? All progress will be lost.';
      
      showConfirm.warning(
        message,
        async () => {
          // onConfirm callback - cleanup Cloudinary files and close
          try {
            // Show loading message
            const hasFiles = hasCloudinaryFiles();
            if (hasFiles) {
              showAlert.info("🧹 Cleaning up uploaded files from Cloudinary...");
            } else {
              showAlert.info("🧹 Discarding event...");
            }
            
            // Clean up Cloudinary files
            const cleanupResult = await cleanupCloudinaryFiles();
            
            // Reset local states
            resetUploadStates();
            
            // Reset form data to initial state
            resetFormData();
            
            // Show success message with cleanup details
            if (cleanupResult.deletedCount > 0) {
              showAlert.success(`✅ Event discarded successfully! ${cleanupResult.deletedCount} file(s) cleaned up from Cloudinary.`);
            } else {
              showAlert.success("✅ Event discarded successfully!");
            }
            
            // Close modal
            if (onClose) {
              onClose();
            }
          } catch (error) {
            console.error('Error during event discard cleanup:', error);
            showAlert.error("❌ Error during cleanup, but event was discarded");
            
            // Still close even if cleanup failed
            if (onClose) {
              onClose();
            }
          }
        },
        () => {
          // onCancel callback - do nothing, stay on page
        },
        {
          title: 'Discard Event Creation?',
          confirmText: 'Confirm',
          cancelText: 'Cancel'
        }
      );
    } else {
      if (onClose) {
        onClose();
      }
    }
  };

  // Expose protected close function to parent components
  useImperativeHandle(ref, () => ({
    close: handleProtectedClose,
    hasUnsavedChanges: hasUnsavedChanges,
    discardEvent: handleProtectedClose, // Expose discard functionality
    hasCloudinaryFiles: hasCloudinaryFiles // Expose file check functionality
  }));



  const handleSubmit = async () => {
    // Check if any files are currently uploading
    if (!canSubmitEvent()) {
      if (isAnyFileUploading()) {
        showAlert.warning("⏳ Please wait for file uploads to complete before submitting");
        return;
      }
      if (hasUploadErrors()) {
        showAlert.error("❌ Please resolve file upload errors before submitting");
        return;
      }
      return;
    }

    const hasFiles = (formData.eventImages && formData.eventImages.length > 0) || 
                    (formData.govtApprovalLetter && formData.govtApprovalLetter instanceof File);
    
    if (hasFiles) {
      // Show submission start notification
      const submitToastId = showAlert.loading(
        isEdit ? "🔄 Updating event..." : "🔄 Creating event..."
      );

      setIsSubmitting(true);

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
            showAlert("❌ Volunteer allocation error: You have allocated " + totalAllocated + " volunteers but the event maximum is " + eventMax + ". Please adjust your category limits.", "error");
            return;
          }
        }

        // Validate required fields
        if (!formData.title?.trim()) {
          showAlert("❌ Event title is required", "error");
          return;
        }

        const data = new FormData();

        for (const key in formData) {
          if (key === "equipmentNeeded") {
            formData.equipmentNeeded.forEach((item) =>
              data.append("equipmentNeeded", item)
            );
          } else if (key === "eventImages") {
            // Handle uploaded images - they now contain Cloudinary URLs and IDs
            (Array.isArray(formData.eventImages) ? formData.eventImages : []).forEach((file) => {
              if (file.uploaded && file.cloudinaryUrl) {
                // File was uploaded to Cloudinary, send the Cloudinary data
                data.append("eventImages", JSON.stringify({
                  url: file.cloudinaryUrl,
                  publicId: file.cloudinaryId,
                  filename: file.name,
                  format: file.type,
                  size: file.size
                }));
              } else if (file instanceof File) {
                // Fallback: if somehow we still have a File object, append it directly
                data.append("eventImages", file);
              }
            });
          } else if (key === 'mapLocation') {
            if (formData.mapLocation) {
              data.append('mapLocation[address]', formData.mapLocation.address || '');
              data.append('mapLocation[lat]', formData.mapLocation.lat || '');
              data.append('mapLocation[lng]', formData.mapLocation.lng || '');
            }
          } else if (key === "govtApprovalLetter") {
            if (formData.govtApprovalLetter) {
              if (formData.govtApprovalLetter.uploaded && formData.govtApprovalLetter.cloudinaryUrl) {
                // File was uploaded to Cloudinary, send the Cloudinary data
                data.append("govtApprovalLetter", JSON.stringify({
                  url: formData.govtApprovalLetter.cloudinaryUrl,
                  publicId: formData.govtApprovalLetter.cloudinaryId,
                  filename: formData.govtApprovalLetter.name,
                  format: formData.govtApprovalLetter.type,
                  size: formData.govtApprovalLetter.size
                }));
              } else if (formData.govtApprovalLetter instanceof File) {
                // Fallback: if somehow we still have a File object, append it directly
                data.append("govtApprovalLetter", formData.govtApprovalLetter);
              }
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
          showAlert.success("✅ Event updated successfully!");
        } else {
          response = await axiosInstance.post(url, data);
          
          // Show success notification
          showAlert.success("🎉 Event created successfully!");
        }
        
        // Call onClose callback if provided
        if (onClose) {
          try {
            onClose();
          } catch (error) {

          }
        }
        
        // Close the modal after successful submission
        if (onClose) {
          onClose();
        }
      } catch (err) {
        console.error("[EventCreationWrapper] Submit failed", err?.response || err);
        
        let errorMessage = "Failed to submit event.";
        
        if (err?.response) {

          
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
        
        showAlert(`❌ ${errorMessage}`, "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <>
      {/* Full Screen Loader for Form Submission */}
      <FullScreenLoader
        isVisible={isSubmitting}
        message={isEdit ? "Updating event..." : "Creating event..."}
        showProgress={false}
      />
      

      
      {currentStep === 1 && (
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
          // Upload state management props
          uploadProgress={uploadProgress}
          uploadStatus={uploadStatus}
          isUploading={isUploading}
          uploadErrors={uploadErrors}
          onUploadProgress={setUploadProgress}
          onUploadStatus={setUploadStatus}
          onUploadError={(fileName, error) => {
            if (!fileName) {
              // If no fileName provided, reset all errors
              setUploadErrors({});
            } else if (error === null || error === undefined) {
              // Clear specific error
              setUploadErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fileName];
                return newErrors;
              });
            } else {
              // Set specific error
              setUploadErrors(prev => ({ ...prev, [fileName]: error }));
            }
          }}
        />
      )}
      {currentStep === 2 && (
        <EventStepTwo
          questionnaireData={questionnaireData}
          setQuestionnaireData={setQuestionnaireData}
          onBack={() => handleStepNavigation(1, 'back')}
          onNext={() => handleStepNavigation(3, 'next')}
        />
      )}
      {currentStep === 3 && (
        <EventPreview
          formData={formData}
          questionnaireData={questionnaireData}
          onBack={() => handleStepNavigation(2, 'back')}
          onSubmit={handleSubmit}
          existingLetter={existingLetter}
          existingImages={existingImages}
        />
      )}
    </>
  );
});

export default EventCreationWrapper;
