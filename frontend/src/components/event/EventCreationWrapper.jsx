// src/components/event/EventCreationWrapper.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import EventStepOne from "./EventStepOne";
import EventStepTwo from "./EventStepTwo";
import EventPreview from "./EventPreview";
import axios from "axios";

export default function EventCreationWrapper({
  selectedOrgId,
  organizationOptions = [],
  onClose,
  isEdit = false,
  eventId = null,
  initialFormData = null,
  initialQuestionnaireData = null,
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
      organization: selectedOrgId || "",
      eventImages: [],
      govtApprovalLetter: null,
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

  const handleImageUpdate = (images) => {
    setFormData((prev) => ({ ...prev, eventImages: images }));
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

  const handleSubmit = async () => {
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

    try {
      const token = localStorage.getItem("token");

      let response;
      if (isEdit && eventId) {
        response = await axios.put(`/api/events/${eventId}`, data, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        });
        alert("Event updated successfully!");
      } else {
        response = await axios.post("/api/events/create", data, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        });
        alert("Event created successfully!");
      }

      if (onClose) onClose();
      
      // Navigate to appropriate dashboard based on user role
      const user = JSON.parse(localStorage.getItem('user'));
      if (user?.role === 'organizer') {
        // If event was created successfully, navigate to organizer dashboard
        navigate('/organizer/dashboard');
      } else if (user?.role === 'volunteer') {
        navigate('/volunteer/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit event.");
    }
  };

  return (
    <>
      {step === 1 && (
        <EventStepOne
          formData={formData}
          setFormData={handleFormUpdate}
          setImageFiles={handleImageUpdate}
          setLetterFile={handleLetterUpdate}
          selectedOrgId={formData.organization}
          organizationOptions={organizationOptions}
          onNext={() => setStep(2)}
          existingImages={existingImages}
          existingLetter={existingLetter}
          onRemoveImage={handleRemoveExistingImage}
          onRemoveLetter={handleRemoveExistingLetter}
          isEditMode={isEdit}
        />
      )}
      {step === 2 && (
        <EventStepTwo
          questionnaireData={questionnaireData}
          setQuestionnaireData={setQuestionnaireData}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <EventPreview
          formData={formData}
          questionnaireData={questionnaireData}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
