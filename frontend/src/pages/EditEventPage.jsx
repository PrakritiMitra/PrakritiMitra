// src/pages/EditEventPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import EventCreationWrapper from "../components/event/EventCreationWrapper";
import ReadOnlyTimeSlotViewer from "../components/event/ReadOnlyTimeSlotViewer";
import Navbar from "../components/layout/Navbar";

export default function EditEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [questionnaireData, setQuestionnaireData] = useState({});
  const [existingLetter, setExistingLetter] = useState(null);
  const [removedImages, setRemovedImages] = useState([]);
  const [removedLetter, setRemovedLetter] = useState(false);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axiosInstance.get(`/api/events/${id}`);
        const e = res.data;
        setEvent(e);

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
    try {
      setSaving(true);
      
      const data = new FormData();
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

      const response = await axiosInstance.put(`/api/events/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      alert("Event updated successfully");
      navigate(`/events/${id}`, { replace: true });
    } catch (err) {
      console.error("❌ Failed to update event:", err);
      alert("Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="pt-20 lg:pt-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading event details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="pt-20 lg:pt-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
              <p className="text-gray-600 mb-6">The event you're trying to edit doesn't exist or you don't have permission to edit it.</p>
              <button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-md"
              >
                Go Back Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      {/* Professional Action Bar - Fixed at top */}
      <div className="fixed top-16 lg:top-20 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            {/* Left side - Back button and title */}
            <div className="flex items-center space-x-4">
              <button
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 flex items-center group"
                onClick={() => navigate(`/events/${id}`)}
              >
                <span className="transform group-hover:-translate-x-1 transition-transform duration-200">←</span>
                <span className="ml-1">Back to Event</span>
              </button>
              <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate max-w-xs sm:max-w-md lg:max-w-lg">
                Edit: {event.title}
              </h1>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(`/events/${id}`)}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md hover:from-gray-600 hover:to-gray-700 transition-all duration-200 text-sm font-medium"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={saving}
                className={`px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm font-medium ${
                  saving
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800 transform hover:scale-105'
                }`}
              >
                {saving ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Adjusted padding for fixed action bar */}
      <div className="pt-32 lg:pt-36 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Event Information Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">
                  Edit Event Details
                </h2>
                <p className="text-gray-600 mb-4">
                  Update your event information, settings, and requirements
                </p>
                
                {/* Event Status Indicators */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-3 py-1 rounded-full shadow-sm">
                    Event ID: {event._id}
                  </span>
                  {event.recurringEvent && (
                    <span className="text-sm bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-1 rounded-full shadow-sm">
                      Recurring Event
                    </span>
                  )}
                  {event.groupRegistration && (
                    <span className="text-sm bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-3 py-1 rounded-full shadow-sm">
                      Group Registration Enabled
                    </span>
                  )}
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="hidden lg:flex flex-col items-end space-y-2 text-sm text-gray-600">
                <div className="text-right">
                  <div className="font-semibold text-gray-800">Created</div>
                  <div>{new Date(event.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-800">Last Updated</div>
                  <div>{new Date(event.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Time Slots Information - If Enabled */}
        {formData.timeSlotsEnabled && formData.timeSlots && formData.timeSlots.length > 0 && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></span>
                Time Slots Configuration
              </h3>
              <p className="text-yellow-700 mb-4">
                This event has time slots configured. Time slot management is handled separately from general event editing.
              </p>
              <ReadOnlyTimeSlotViewer timeSlots={formData.timeSlots} />
            </div>
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-blue-800 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
              Event Configuration
            </h3>
            <p className="text-blue-700 text-sm mt-1">
              Modify your event details, requirements, and settings below
            </p>
          </div>
          
          <div className="p-6">
            <EventCreationWrapper
              selectedOrgId={formData.organization}
              organizationOptions={[]}
              onClose={() => navigate(`/events/${id}`)}
              isEdit={true}
              eventId={id}
              initialFormData={formData}
              initialQuestionnaireData={questionnaireData}
              readOnly={false}
            />
          </div>
        </div>

        {/* Action Buttons - Bottom */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
          <button
            onClick={() => navigate(`/events/${id}`)}
            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 transform hover:scale-105 shadow-md font-medium"
          >
            Cancel Changes
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={`px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md font-medium ${
              saving
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800'
            }`}
          >
            {saving ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Saving Changes...
              </div>
            ) : (
              'Save Event Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
