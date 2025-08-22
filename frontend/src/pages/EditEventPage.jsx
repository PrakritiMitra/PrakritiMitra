// src/pages/EditEventPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showAlert } from "../utils/notifications";
import axiosInstance from "../api/axiosInstance";
import EventCreationWrapper from "../components/event/EventCreationWrapper";
import ReadOnlyTimeSlotViewer from "../components/event/ReadOnlyTimeSlotViewer";
import Navbar from "../components/layout/Navbar";

export default function EditEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
        
        showAlert.error("❌ Failed to load event. Redirecting to home page.");
        
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
  const handleRemoveExistingImage = (image) => {
    // Handle Cloudinary structure
    if (typeof image === 'object' && image.publicId) {
      setFormData((prev) => ({
        ...prev,
        existingImages: prev.existingImages.filter((img) => img.publicId !== image.publicId),
      }));
      setRemovedImages((prev) => [...prev, image.publicId]);
      
              showAlert.success(`🖼️ Image "${image.filename || 'Event Image'}" marked for removal`);
    }
  };

  // 🔴 Remove letter file
  const handleRemoveExistingLetter = () => {
    // Handle Cloudinary structure
    if (existingLetter && typeof existingLetter === 'object' && existingLetter.publicId) {
      setRemovedImages((prev) => [...prev, existingLetter.publicId]);
    }
    
    setExistingLetter(null);
    setRemovedLetter(true);
    
          showAlert.warning("📄 Government approval letter marked for removal");
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
      
      {/* Main Content Area - Adjusted padding for fixed action bar */}
      <div className="pt-32 lg:pt-36 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Event Information Header */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">
                  Edit Event Details
                </h2>
                <p className="text-gray-600 mb-4">
                  Update your event information, settings, and requirements using the form below
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
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-blue-800 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
              Event Configuration
            </h3>
            <p className="text-blue-700 text-sm mt-1">
              Modify your event details, requirements, and settings below. Use the "Submit Event" button at the end of the form to save your changes.
            </p>
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Important:</span>
                <span className="text-sm">Only use the "Submit Event" button at the end of the form to save changes. Other save buttons may cause errors.</span>
              </div>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="flex items-center justify-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">1</div>
                <span className="text-sm text-gray-600">Basic Details</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center text-xs font-medium">2</div>
                <span className="text-sm text-gray-500">Questionnaire</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center text-xs font-medium">3</div>
                <span className="text-sm text-gray-500">Preview & Submit</span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
                         <EventCreationWrapper
               selectedOrgId={formData.organization}
               organizationOptions={[]}
                               onClose={() => {
                  // This will be called after successful submission
                                     showAlert.success("✅ Event editing completed successfully!");
                }}
               isEdit={true}
               eventId={id}
               initialFormData={{
                 ...formData,
                 removedImages: removedImages,
                 removedLetter: removedLetter
               }}
               initialQuestionnaireData={questionnaireData}
               readOnly={false}
             />
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 max-w-3xl mx-auto shadow-sm">
            <div className="flex items-center justify-center gap-3 text-blue-700 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-semibold text-lg">How to Save Changes</span>
            </div>
            <div className="space-y-3 text-blue-600">
              <p className="text-base">
                Navigate through the form steps using the navigation buttons at the bottom of each step.
              </p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Step 1: Basic Details</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Step 2: Questionnaire</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Step 3: Preview & Submit</span>
                </div>
              </div>
              <p className="text-base font-medium">
                When you reach the final preview step, click the <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">Submit Event</span> button to save all your changes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
