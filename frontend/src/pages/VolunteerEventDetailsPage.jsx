// src/pages/VolunteerEventDetailsPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import defaultImages from "../utils/eventTypeImages";
import { useState as useReactState } from "react";
import VolunteerRegisterModal from "../components/volunteer/VolunteerRegisterModal";
import { QRCodeSVG } from "qrcode.react";
import { getOrganizerTeam } from "../api/event";
import { useCallback } from "react";

export default function VolunteerEventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));
  const imageBaseUrl = "http://localhost:5000/uploads/";

  // Carousel state
  const [carouselIndex, setCarouselIndex] = useReactState(0);
  let images = [];
  let hasImages = false;
  let handlePrev = () => {};
  let handleNext = () => {};

  // Registration state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);

  // Organizer team state
  const [organizerTeam, setOrganizerTeam] = useState([]);
  const [showOrganizerTeamDrawer, setShowOrganizerTeamDrawer] = useState(false);
  // Show Volunteers state
  const [showVolunteers, setShowVolunteers] = useState(false);
  const [volunteers, setVolunteers] = useState([]);
  const [volunteersLoading, setVolunteersLoading] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axiosInstance.get(`/events/${id}`);
        setEvent(res.data);
      } catch (err) {
        setError("Event not found or failed to load.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const team = await getOrganizerTeam(id);
        setOrganizerTeam(team);
      } catch (err) {
        setOrganizerTeam([]);
      }
    };
    if (event && event._id) fetchTeam();
  }, [event, id]);

  // On event load, check with the backend if the user is actually registered for the event. If not, clear registration status and QR code from localStorage. Keep localStorage and UI in sync with backend.
  useEffect(() => {
    if (event && event._id && user && user._id) {
      axiosInstance.get(`/registrations/${event._id}/check`)
        .then(res => {
          if (res.data.registered) {
            setRegistrationSuccess(true);
            // Load QR data from localStorage, or reconstruct if missing
            const regDataStr = localStorage.getItem(`registrationData_${event._id}`);
            if (regDataStr) {
              setRegistrationData(JSON.parse(regDataStr));
            } else {
              // Reconstruct minimal registration data
              const regData = {
                eventTitle: event.title,
                volunteer: {
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                },
                groupMembers: [],
              };
              setRegistrationData(regData);
              localStorage.setItem(`registrationData_${event._id}`, JSON.stringify(regData));
            }
            // Also ensure event ID is in registeredEvents
            const registeredEvents = JSON.parse(localStorage.getItem("registeredEvents") || "[]");
            if (!registeredEvents.includes(event._id)) {
              registeredEvents.push(event._id);
              localStorage.setItem("registeredEvents", JSON.stringify(registeredEvents));
            }
          } else {
            setRegistrationSuccess(false);
            setRegistrationData(null);
            // Remove from localStorage if not registered
            const registeredEvents = JSON.parse(localStorage.getItem("registeredEvents") || "[]");
            const idx = registeredEvents.indexOf(event._id);
            if (idx !== -1) {
              registeredEvents.splice(idx, 1);
              localStorage.setItem("registeredEvents", JSON.stringify(registeredEvents));
            }
            localStorage.removeItem(`registrationData_${event._id}`);
          }
        })
        .catch(() => {
          // Optionally handle error
        });
    }
  }, [event?._id, user?._id]);

  // Fetch volunteers for this event when drawer is opened
  const fetchVolunteers = useCallback(() => {
    if (!event?._id) return;
    setVolunteersLoading(true);
    axiosInstance.get(`/registrations/event/${event._id}/volunteers`)
      .then(res => {
        setVolunteers(res.data);
        setVolunteersLoading(false);
      })
      .catch(() => setVolunteersLoading(false));
  }, [event?._id]);

  // Registration handler
  const handleRegister = async () => {
    setRegistering(true);
    try {
      await axios.post(
        `http://localhost:5000/api/events/${event._id}/register`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          withCredentials: true,
        }
      );
      setRegisterSuccess(true);
      alert("Registered successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const handleRegistrationSubmit = async ({ volunteerId, groupMembers }) => {
    try {
      const payload = {
        eventId: event._id,
        groupMembers,
      };

      const response = await axiosInstance.post("/registrations", payload);

      const regData = {
        eventTitle: event.title,
        volunteer: {
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        groupMembers,
      };
      setRegistrationData(regData);
      setRegistrationSuccess(true);
      setShowRegisterModal(false);

      // Store registered event ID and QR data in localStorage
      const registeredEvents = JSON.parse(localStorage.getItem("registeredEvents") || "[]");
      if (!registeredEvents.includes(event._id)) {
        registeredEvents.push(event._id);
        localStorage.setItem("registeredEvents", JSON.stringify(registeredEvents));
      }
      // Store QR data
      localStorage.setItem(`registrationData_${event._id}`, JSON.stringify(regData));
    } catch (err) {
      console.error("Registration failed:", err);
      alert("Failed to register. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // Only set images and handlers after event is loaded
  images = event.eventImages || [];
  hasImages = images.length > 0;
  handlePrev = () => setCarouselIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  handleNext = () => setCarouselIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));

  // Check if event is in the past
  const isPastEvent = new Date(event.endDateTime) < new Date();
  // Check if event is live (ongoing)
  const now = new Date();
  const isLiveEvent = new Date(event.startDateTime) <= now && now < new Date(event.endDateTime);

  const createdBy = event.createdBy;
  const createdByName = typeof createdBy === "object" ? createdBy.name : "Organizer";
  const createdByPhoto = typeof createdBy === "object" && createdBy.profileImage
    ? `${imageBaseUrl}${createdBy.profileImage}`
    : null;

  const eventImage = defaultImages[event.eventType?.toLowerCase()] || defaultImages["default"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-12 relative">
      <Navbar />
      {event?.createdBy && (
        <button
          className={`fixed z-50 bg-blue-600 text-white px-5 py-2 rounded shadow hover:bg-blue-700 transition top-[calc(2cm+1.5rem)] ${showOrganizerTeamDrawer ? 'right-[340px]' : 'right-8'}`}
          style={{ transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)' }}
          onClick={() => setShowOrganizerTeamDrawer((prev) => !prev)}
        >
          {showOrganizerTeamDrawer ? 'Hide Organizer Team' : 'Show Organizer Team'}
        </button>
      )}
      {/* Organizer Team Drawer */}
      {event?.createdBy && (
        (() => {
          // Prepare the list: creator first, then team (excluding creator if present)
          const creator = event.createdBy;
          const teamWithoutCreator = organizerTeam.filter(user => user._id !== creator._id);
          const fullTeam = [creator, ...teamWithoutCreator];
          return (
            <div
              className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${showOrganizerTeamDrawer ? 'translate-x-0' : 'translate-x-full'}`}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-blue-700">Organizer Team</h2>
                <button
                  className="text-gray-500 hover:text-red-600 text-2xl font-bold"
                  onClick={() => setShowOrganizerTeamDrawer(false)}
                  aria-label="Close organizer team drawer"
                >
                  ×
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-64px)] px-6 py-4 space-y-4">
                {fullTeam.map((user) => {
                  const isCreator = user._id === creator._id;
                  return (
                    <div
                      key={user._id}
                      className={`flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition cursor-pointer hover:bg-blue-50 mb-2 ${isCreator ? 'border-2 border-yellow-500 bg-yellow-50' : ''}`}
                      onClick={() => navigate(`/organizer/${user._id}`)}
                    >
                      <img
                        src={user.profileImage ? `${imageBaseUrl}${user.profileImage}` : '/images/default-profile.jpg'}
                        alt={user.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-blue-400 mr-4"
                      />
                      <span className="font-medium text-blue-800 text-lg">{user.name}</span>
                      {isCreator && (
                        <span className="ml-3 px-2 py-1 bg-yellow-400 text-white text-xs rounded font-bold">Creator</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()
      )}
      {/* Show Volunteers Button */}
      <button
        className={`fixed z-50 bg-green-600 text-white px-5 py-2 rounded shadow hover:bg-green-700 transition top-[calc(2cm+1.5rem)] left-8`}
        style={{ transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)' }}
        onClick={() => {
          setShowVolunteers((prev) => {
            if (!prev) fetchVolunteers();
            return !prev;
          });
        }}
      >
        {showVolunteers ? 'Hide Volunteers' : 'Show Volunteers'}
      </button>
      {/* Volunteers Drawer */}
      {showVolunteers && (
        <div
          className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${showVolunteers ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-green-700">Volunteers</h2>
            <button
              className="text-gray-500 hover:text-red-600 text-2xl font-bold"
              onClick={() => setShowVolunteers(false)}
              aria-label="Close volunteers drawer"
            >
              ×
            </button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-64px)] px-6 py-4 space-y-4">
            {volunteersLoading ? (
              <div>Loading volunteers...</div>
            ) : volunteers.length === 0 ? (
              <div className="text-gray-500">No volunteers registered.</div>
            ) : (
              volunteers.map((vol) => (
                <div
                  key={vol._id}
                  className="flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition cursor-pointer hover:bg-green-50"
                  onClick={() => navigate(`/volunteer/${vol._id}`)}
                >
                  <img
                    src={vol.profileImage ? `http://localhost:5000/uploads/${vol.profileImage}` : '/images/default-profile.jpg'}
                    alt={vol.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-green-400 mr-4"
                  />
                  <span className="font-medium text-green-800 text-lg">{vol.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <div className="pt-24 w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <button
          className="mb-4 text-blue-600 underline"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        {/* Event Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 w-full">
          {/* Event Image Header (static background) */}
          <div className="relative w-full bg-gray-200 flex items-center justify-center" style={{ minHeight: '180px', maxHeight: '220px' }}>
            <img
              src={eventImage}
              alt={event.eventType}
              className="w-full h-full object-cover object-center opacity-40 absolute top-0 left-0 z-0"
            />
            <div className="absolute bottom-2 left-2 bg-white/80 px-3 py-1 rounded text-sm font-semibold text-blue-700 shadow z-20">
              {event.eventType || "Event"}
            </div>
          </div>

          <div className="p-6">
            {/* Title & Organizer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-blue-800 flex-1">{event.title}</h1>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs mr-1">Created by:</span>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-4 border-blue-200">
                  {createdByPhoto ? (
                    <img
                      src={createdByPhoto}
                      alt="Organizer"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="text-xl font-bold text-blue-600">
                      {createdByName ? createdByName.charAt(0).toUpperCase() : "O"}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <p className="text-base text-gray-900 font-semibold">
                    {createdByName}
                  </p>
                  <span className="text-xs text-gray-500">Organizer</span>
                </div>
              </div>
            </div>

            {/* Register Button */}
            {isPastEvent ? (
              <p className="text-red-600 font-semibold mt-6">This event has ended</p>
            ) : isLiveEvent ? (
              <p className="text-blue-700 font-semibold mt-6">Event is live</p>
            ) : registrationSuccess ? (
              <>
                <p className="text-green-700 font-semibold mt-6">✅ Registered Successfully</p>
                {registrationData && (
                  <div className="mt-6 flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-2">Your QR Code</h3>
                    <QRCodeSVG
                      value={JSON.stringify(registrationData)}
                      size={200}
                      className="border border-gray-300 p-2"
                    />
                    <p className="mt-3 text-blue-800 text-sm text-center max-w-xs">
                      Please save this QR code. You will need to scan it at the event for attendance. This is your proof of registration.
                    </p>
                  </div>
                )}
                {/* Withdraw Registration Button */}
                <button
                  onClick={async () => {
                    if (!window.confirm('Are you sure you want to withdraw your registration?')) return;
                    try {
                      await axiosInstance.delete(`/registrations/${event._id}`);
                      setRegistrationSuccess(false);
                      setRegistrationData(null);
                      // Remove from localStorage
                      const registeredEvents = JSON.parse(localStorage.getItem("registeredEvents") || "[]");
                      const idx = registeredEvents.indexOf(event._id);
                      if (idx !== -1) {
                        registeredEvents.splice(idx, 1);
                        localStorage.setItem("registeredEvents", JSON.stringify(registeredEvents));
                      }
                      localStorage.removeItem(`registrationData_${event._id}`);
                      alert('You have withdrawn your registration.');
                    } catch (err) {
                      alert('Failed to withdraw registration. Please try again.');
                    }
                  }}
                  className="mt-6 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Withdraw Registration
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowRegisterModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mt-6"
              >
                Register
              </button>
            )}

            {/* Event Info Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Organization:</span> {event.organization?.name || "N/A"}
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Location:</span> {event.location}
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Timing:</span> <br/>
                  <span className="text-sm text-gray-600">{new Date(event.startDateTime).toLocaleString()} — {new Date(event.endDateTime).toLocaleString()}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Type:</span> {event.eventType || "Not specified"}
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Volunteer Slots:</span> {event.unlimitedVolunteers ? "Unlimited" : event.maxVolunteers}
                </div>
                {event.groupRegistration && (
                  <div className="text-xs text-green-700 font-medium mt-1">Group Registration Enabled</div>
                )}
                {event.recurringEvent && (
                  <div className="text-xs text-indigo-700 font-medium mt-1">Recurs {event.recurringType} on {event.recurringValue}</div>
                )}
              </div>
              <div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Description:</span>
                  <p className="text-gray-700 mt-1">{event.description}</p>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Instructions:</span>
                  <p className="text-gray-700 mt-1">{event.instructions || "None"}</p>
                </div>
                {event.equipmentNeeded?.length > 0 && (
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700">Equipment Needed:</span>
                    <ul className="list-disc list-inside text-gray-700 mt-1">
                      {event.equipmentNeeded.map((eq, i) => (
                        <li key={i}>{eq}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Volunteer Logistics Section */}
            <div className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold text-blue-700 mb-3">
                Volunteer Logistics
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p><span className="font-semibold text-gray-700">Drinking Water:</span> {event.waterProvided ? "Yes" : "No"}</p>
                  <p><span className="font-semibold text-gray-700">Medical Support:</span> {event.medicalSupport ? "Yes" : "No"}</p>
                  <p><span className="font-semibold text-gray-700">Recommended Age Group:</span> {event.ageGroup || "Not specified"}</p>
                </div>
                <div>
                  <p><span className="font-semibold text-gray-700">Special Precautions:</span> {event.precautions || "None"}</p>
                  <p><span className="font-semibold text-gray-700">Public Transport:</span> {event.publicTransport || "Not mentioned"}</p>
                  <p><span className="font-semibold text-gray-700">Contact Person:</span> {event.contactPerson || "Not listed"}</p>
                </div>
              </div>
            </div>

            {/* Event Images Carousel at the bottom */}
            {hasImages && (
              <div className="mt-10 w-full flex flex-col items-center">
                <h2 className="text-xl font-semibold text-blue-700 mb-2">Event Images</h2>
                <div className="relative w-full max-w-4xl mx-auto bg-gray-100 flex items-center justify-center rounded-lg shadow-lg" style={{ minHeight: '420px', maxHeight: '520px' }}>
                  <button
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-blue-700 rounded-full shadow p-2 z-10"
                    aria-label="Previous image"
                  >
                    &#8592;
                  </button>
                  <div className="mx-auto flex items-center justify-center w-full">
                    <img
                      src={`${imageBaseUrl}${images[carouselIndex]}`}
                      alt={`Event ${carouselIndex + 1}`}
                      className="max-h-[420px] aspect-video rounded-lg border-4 border-white shadow-lg object-contain bg-white mx-auto"
                      style={{ maxWidth: '95%', minWidth: '320px', background: 'white' }}
                    />
                  </div>
                  <button
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-blue-700 rounded-full shadow p-2 z-10"
                    aria-label="Next image"
                  >
                    &#8594;
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                    {images.map((_, idx) => (
                      <span
                        key={idx}
                        className={`inline-block w-2 h-2 rounded-full ${idx === carouselIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
      {!isPastEvent && (
        <VolunteerRegisterModal
          open={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          volunteer={user}
          onSubmit={handleRegistrationSubmit}
        />
      )}
    </div>
  );
}
