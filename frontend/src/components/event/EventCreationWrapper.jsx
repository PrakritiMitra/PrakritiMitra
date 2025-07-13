// src/components/event/EventCreationWrapper.jsx

import React, { useState } from "react";
import EventStepOne from "./EventStepOne";
import EventStepTwo from "./EventStepTwo";
import EventPreview from "./EventPreview";
import axios from "axios";

export default function EventCreationWrapper({ selectedOrgId, organizationOptions = [], onClose }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
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
  });

  const [questionnaireData, setQuestionnaireData] = useState({
    waterProvided: false,
    medicalSupport: false,
    ageGroup: "",
    precautions: "",
    publicTransport: "",
    contactPerson: "",
  });

  const handleFormUpdate = (updater) => {
    if (typeof updater === 'function') {
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

  const handleSubmit = async () => {
    const data = new FormData();

    for (const key in formData) {
      if (key === "equipmentNeeded") {
        formData.equipmentNeeded.forEach((item) => data.append("equipmentNeeded", item));
      } else if (key === "eventImages") {
        formData.eventImages.forEach((file) => data.append("eventImages", file));
      } else if (key === "govtApprovalLetter") {
        if (formData.govtApprovalLetter) {
          data.append("govtApprovalLetter", formData.govtApprovalLetter);
        }
      } else {
        data.append(key, formData[key]);
      }
    }

    // Append questionnaire data
    for (const key in questionnaireData) {
      data.append(key, questionnaireData[key]);
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/events/create", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });
      alert("Event created successfully!");
      if (onClose) onClose(); // e.g. to close modal
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to create event.");
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
          selectedOrgId={selectedOrgId}
          organizationOptions={organizationOptions}
          onNext={() => setStep(2)}
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
