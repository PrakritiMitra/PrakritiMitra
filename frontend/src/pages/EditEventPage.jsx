// src/pages/EditEventPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import EventCreationWrapper from "../components/event/EventCreationWrapper";
import ReadOnlyTimeSlotViewer from "../components/event/ReadOnlyTimeSlotViewer";

export default function EditEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [questionnaireData, setQuestionnaireData] = useState({});
  const [existingLetter, setExistingLetter] = useState(null);
  const [removedImages, setRemovedImages] = useState([]);
  const [removedLetter, setRemovedLetter] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axiosInstance.get(`/api/events/${id}`);
        const e = res.data;

        // Mark existing time slots and categories as existing
        const existingTimeSlots = e.timeSlots ? e.timeSlots.map(slot => ({
          ...slot,
          existing: true,
          categories: slot.categories ? slot.categories.map(category => ({
            ...category,
            existing: true
          })) : []
        })) : [];

        setFormData({
          title: e.title,
          description: e.description,
          location: e.location,
          mapLocation: e.mapLocation || { address: '', lat: null, lng: null },
          startDateTime: new Date(e.startDateTime).toISOString().slice(0, 16),
          endDateTime: new Date(e.endDateTime).toISOString().slice(0, 16),
          maxVolunteers: e.maxVolunteers === -1 ? "" : e.maxVolunteers,
          unlimitedVolunteers: e.unlimitedVolunteers,
          equipmentNeeded: e.equipmentNeeded || [],
          otherEquipment: "",
          eventType: e.eventType || "",
          instructions: e.instructions || "",
          groupRegistration: e.groupRegistration,
          recurringEvent: e.recurringEvent,
          recurringType: e.recurringType || "",
          recurringValue: e.recurringValue || "",
          organization: e.organization?._id || "",
          eventImages: [],
          existingImages: e.eventImages || [],
          govtApprovalLetter: null,
          // Add time slots data with existing markers
          timeSlotsEnabled: e.timeSlotsEnabled || false,
          timeSlots: existingTimeSlots,
        });

        setExistingLetter(e.govtApprovalLetter || null);

        setQuestionnaireData({
          waterProvided: e.waterProvided,
          medicalSupport: e.medicalSupport,
          ageGroup: e.ageGroup || "",
          precautions: e.precautions || "",
          publicTransport: e.publicTransport || "",
          contactPerson: e.contactPerson || "",
        });

        setLoading(false);
      } catch (err) {
        console.error("❌ Failed to load event:", err);
        navigate("/");
      }
    };

    fetchEvent();
  }, [id, navigate]);

  const handleFormUpdate = (updater) => {
    if (typeof updater === "function") {
      setFormData(updater);
    } else {
      setFormData((prev) => ({ ...prev, ...updater }));
    }
  };

  // 🔴 Remove specific image
  const handleRemoveExistingImage = (filename) => {
    setFormData((prev) => ({
      ...prev,
      existingImages: prev.existingImages.filter((img) => img !== filename),
    }));
    setRemovedImages((prev) => [...prev, filename]);
  };

  // 🔴 Remove letter file
  const handleRemoveExistingLetter = () => {
    setExistingLetter(null);
    setRemovedLetter(true);
  };

  const handleSubmit = async () => {
    const data = new FormData();

    console.log("🔧 EditEventPage - FormData before sending:", formData);
    console.log("🔧 EditEventPage - mapLocation:", formData.mapLocation);

    for (const key in formData) {
      if (key === "equipmentNeeded") {
        formData.equipmentNeeded.forEach((item) =>
          data.append("equipmentNeeded", item)
        );
      } else if (key === "eventImages") {
        formData.eventImages.forEach((file) =>
          data.append("eventImages", file)
        );
      } else if (key === "govtApprovalLetter") {
        if (formData.govtApprovalLetter) {
          data.append("govtApprovalLetter", formData.govtApprovalLetter);
        }
      } else if (key === "mapLocation") {
        // Handle mapLocation object properly
        if (formData.mapLocation) {
          data.append("mapLocation[address]", formData.mapLocation.address || "");
          data.append("mapLocation[lat]", formData.mapLocation.lat || "");
          data.append("mapLocation[lng]", formData.mapLocation.lng || "");
          console.log("🔧 EditEventPage - Sending mapLocation:", {
            address: formData.mapLocation.address,
            lat: formData.mapLocation.lat,
            lng: formData.mapLocation.lng
          });
        }
      } else {
        data.append(key, formData[key]);
      }
    }

    // Questionnaire
    for (const key in questionnaireData) {
      data.append(key, questionnaireData[key]);
    }

    // Append removed files
    removedImages.forEach((img) => data.append("removedImages", img));
    if (removedLetter) {
      data.append("removedLetter", "true");
    }

    try {
      const response = await axiosInstance.put(`/api/events/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("✅ EditEventPage - Event updated successfully:", response.data);
      alert("Event updated successfully");
      navigate(`/events/${id}`, { replace: true });
    } catch (err) {
      console.error("❌ Failed to update event:", err);
      alert("Failed to update event");
    }
  };

  if (loading || !formData || !questionnaireData) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p>Loading event...</p>
      </div>
    );
  }

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {/* Show existing time slots in read-only mode */}
          {formData.timeSlotsEnabled && formData.timeSlots && formData.timeSlots.length > 0 && (
            <ReadOnlyTimeSlotViewer timeSlots={formData.timeSlots} />
          )}
          
          <EventCreationWrapper
            selectedOrgId={formData.organization}
            organizationOptions={[]}
            onClose={() => navigate("/")}
            isEdit={true}
            eventId={id}
            initialFormData={formData}
            initialQuestionnaireData={questionnaireData}
            readOnly={true}
          />
        </div>
      )}
    </div>
  );
}
