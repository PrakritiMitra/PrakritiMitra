// src/pages/VolunteerEventDetailsPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import defaultImages from "../utils/eventTypeImages";
import { useState as useReactState } from "react";
import VolunteerRegisterModal from "../components/volunteer/VolunteerRegisterModal";
import { QRCodeSVG } from "qrcode.react";
import { getFullOrganizerTeam } from "../api/event";
import { useCallback } from "react";
import { io } from "socket.io-client";
import EventChatbox from '../components/chat/EventChatbox';
import StaticMap from '../components/event/StaticMap'; // Import the new component
import { format } from "date-fns";
import useEventSlots from '../hooks/useEventSlots';

export default function VolunteerEventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState(null); // <-- Add this
  const [showQR, setShowQR] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));
  const imageBaseUrl = "http://localhost:5000/uploads/Events/";

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
  const [showExitQr, setShowExitQr] = useState(false);
  const [exitQrPath, setExitQrPath] = useState(null);

  // Use the new hook for live slot info
  const { availableSlots, maxVolunteers, unlimitedVolunteers, loading: slotsLoading } = useEventSlots(id);

  // User-friendly slot message with color
  let slotMessage = '';
  let slotColor = '';
  if (slotsLoading) {
    slotMessage = 'Loading slots...';
    slotColor = '';
  } else if (unlimitedVolunteers) {
    slotMessage = 'Unlimited slots';
    slotColor = '';
  } else if (typeof availableSlots === 'number') {
    if (availableSlots <= 0) {
      slotMessage = 'No slots left';
      slotColor = 'text-red-600';
    } else if (availableSlots === 1 || availableSlots === 2) {
      slotMessage = `Only ${availableSlots} slot${availableSlots === 1 ? '' : 's'} remaining`;
      slotColor = 'text-red-600';
    } else if (availableSlots >= 3 && availableSlots <= 5) {
      slotMessage = `Only ${availableSlots} slots remaining`;
      slotColor = 'text-orange-500';
    } else {
      slotMessage = `${availableSlots} slots left`;
      slotColor = 'text-green-700';
    }
  }

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axiosInstance.get(`/api/events/${id}`);
        setEvent(res.data);
        // If organizerTeam is present and populated, set it for organizer drawer
        if (res.data.organizerTeam && Array.isArray(res.data.organizerTeam)) {
          setOrganizerTeam(res.data.organizerTeam);
        }
      } catch (err) {
        setError("Event not found or failed to load.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  // Poll for summary if missing
  useEffect(() => {
    if (!event || event.summary) return;
    const interval = setInterval(async () => {
      try {
        const res = await axiosInstance.get(`/api/events/${id}`);
        if (res.data.summary && res.data.summary.trim()) {
          setEvent(res.data);
          clearInterval(interval);
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [event, id]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const team = await getFullOrganizerTeam(id);
        setOrganizerTeam(team);
      } catch (err) {
        setOrganizerTeam([]);
      }
    };
    if (event && event._id) fetchTeam();
  }, [event, id]);

  // On event load, check with the backend if the user is actually registered for the event and get registration details.
  useEffect(() => {
    if (event && event._id && user && user._id) {
      axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`)
        .then(res => {
          setIsRegistered(true);
          setRegistrationDetails(res.data);
        })
        .catch(() => {
          setIsRegistered(false);
          setRegistrationDetails(null);
        });
    }
  }, [event?._id, user?._id]);

  // Poll for registration details if registered but inTime is not set
  useEffect(() => {
    if (!isRegistered || registrationDetails?.inTime) return;
    const interval = setInterval(async () => {
      try {
        const res = await axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`);
        if (res.data.inTime) {
          setRegistrationDetails(res.data);
          clearInterval(interval);
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [isRegistered, registrationDetails?.inTime, event?._id]);

  // Fetch volunteers for this event when drawer is opened
  const fetchVolunteers = useCallback(() => {
    if (!event?._id) return;
    setVolunteersLoading(true);
    axiosInstance.get(`/api/registrations/event/${event._id}/volunteers`)
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
      await axiosInstance.post(
        `/api/events/${event._id}/register`,
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
      // Fetch registration details from backend
      const regDetailsRes = await axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`);
      setIsRegistered(true);
      setRegistrationDetails(regDetailsRes.data);
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
      await axiosInstance.post("/api/registrations", payload);
      setRegistrationSuccess(true);
      setShowRegisterModal(false);
      // Fetch registration details from backend
      const regDetailsRes = await axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`);
      setIsRegistered(true);
      setRegistrationDetails(regDetailsRes.data);
    } catch (err) {
      console.error("Registration failed:", err);
      alert("Failed to register. Please try again.");
    }
  };

  useEffect(() => {
    const socket = io('http://localhost:5000');
    socket.on('connect', () => {
      console.log('Socket.IO connected (volunteer):', socket.id);
    });
    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected (volunteer)');
    });
    return () => socket.disconnect();
  }, []);

  // Attendance completion check
  const hasCompletedEvent = !!(registrationDetails?.inTime && registrationDetails?.outTime);

  // Entry scan handler
  const handleEntryScan = async () => {
    if (!registrationDetails?._id) return;
    try {
      const res = await axiosInstance.post(`/api/registrations/${registrationDetails._id}/entry-scan`);
      setRegistrationDetails((prev) => ({
        ...prev,
        inTime: res.data.inTime,
        exitQrToken: res.data.exitQrToken,
        exitQrPath: res.data.exitQrPath,
      }));
      alert('Entry marked! Please save your exit QR code.');
    } catch (err) {
      alert('Failed to mark entry.');
    }
  };

  // Exit scan handler (simulate scan in-app)
  const handleExitScan = async () => {
    if (!registrationDetails?.exitQrToken) return;
    try {
      const res = await axiosInstance.post(`/api/registrations/exit/${registrationDetails.exitQrToken}`);
      setRegistrationDetails((prev) => ({
        ...prev,
        outTime: res.data.outTime,
      }));
      alert('Exit marked! Thank you for attending.');
    } catch (err) {
      alert('Failed to mark exit.');
    }
  };

  // Generate exit QR handler
  const handleGenerateExitQr = async () => {
    if (!registrationDetails?._id) return;
    try {
      const res = await axiosInstance.get(`/api/registrations/${registrationDetails._id}/exit-qr`);
      setExitQrPath(res.data.exitQrPath);
      setShowExitQr(true);
    } catch (err) {
      alert('Failed to generate exit QR.');
    }
  };

  // Withdraw registration handler
  const handleWithdrawRegistration = async () => {
    if (!event?._id) return;
    if (!window.confirm('Are you sure you want to withdraw your registration for this event?')) return;
    try {
      await axiosInstance.delete(`/api/registrations/${event._id}`);
      setIsRegistered(false);
      setRegistrationDetails(null);
      alert('Registration withdrawn successfully.');
    } catch (err) {
      alert('Failed to withdraw registration.');
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



  const eventImage = defaultImages[event.eventType?.toLowerCase()] || defaultImages["default"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-12 relative">
      <Navbar />
      {organizerTeam.length > 0 && (
        <button
          className={`fixed z-50 bg-blue-600 text-white px-5 py-2 rounded shadow hover:bg-blue-700 transition top-[calc(2cm+1.5rem)] ${showOrganizerTeamDrawer ? 'right-[340px]' : 'right-8'}`}
          style={{ transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)' }}
          onClick={() => setShowOrganizerTeamDrawer((prev) => !prev)}
        >
          {showOrganizerTeamDrawer ? 'Hide Organizer Team' : 'Show Organizer Team'}
        </button>
      )}
      {/* Organizer Team Drawer */}
      {organizerTeam.length > 0 && (
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
            {organizerTeam.map((obj) => {
              if (!obj.user || !obj.user._id) return null;
              const user = obj.user;
              return (
                <div
                  key={user._id}
                  className="flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition cursor-pointer hover:bg-blue-50 mb-2"
                  onClick={() => navigate(`/organizer/${user._id}`)}
                >
                  <img
                    src={user.profileImage ? `http://localhost:5000/uploads/Profiles/${user.profileImage}` : '/images/default-profile.jpg'}
                    alt={user.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-400 mr-4"
                  />
                  <span className="font-medium text-blue-800 text-lg">{user.name}</span>
                </div>
              );
            })}
          </div>
        </div>
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
                    src={vol.profileImage ? `http://localhost:5000/uploads/Profiles/${vol.profileImage}` : '/images/default-profile.jpg'}
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
      {/* LIVE badge */}
      {isLiveEvent && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow z-20 animate-pulse">
          LIVE
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
            {/* Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-blue-800 flex-1">{event.title}</h1>
            </div>

            {/* Register/Attendance/Exit UI */}
            {/* Show entry QR until inTime is set */}
            {!hasCompletedEvent && !registrationDetails?.inTime && registrationDetails?.qrCodePath && (
              <div className="mt-6 flex flex-col items-center">
                <h3 className="text-lg font-semibold mb-2">Your Entry QR Code</h3>
                <img
                  src={`http://localhost:5000${registrationDetails.qrCodePath}`}
                  alt="Entry QR Code"
                  className="border border-gray-300 p-2 w-64 h-64"
                />
                <p className="mt-3 text-blue-800 text-sm text-center max-w-xs">
                  Show this QR code to the organizer at the event entrance.
                </p>
              </div>
            )}
            {/* After inTime, show Generate Exit QR button */}
            {!hasCompletedEvent && registrationDetails?.inTime && !registrationDetails?.outTime && !showExitQr && (
              <div className="mt-6 flex flex-col items-center">
                <button
                  onClick={handleGenerateExitQr}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Generate Exit QR
                </button>
              </div>
            )}
            {/* Show exit QR after generation */}
            {!hasCompletedEvent && registrationDetails?.inTime && !registrationDetails?.outTime && showExitQr && exitQrPath && (
              <div className="mt-6 flex flex-col items-center">
                <h3 className="text-lg font-semibold mb-2">Your Exit QR Code</h3>
                <img
                  src={`http://localhost:5000${exitQrPath}`}
                  alt="Exit QR Code"
                  className="border border-gray-300 p-2 w-64 h-64"
                />
                <p className="mt-3 text-blue-800 text-sm text-center max-w-xs">
                  Show this QR code to the organizer at the exit to mark your out-time.
                </p>
              </div>
            )}
            {/* Registration button logic: hide/disable if no slots left, or if event is live or completed */}
            {isPastEvent ? (
              <p className="text-red-600 font-semibold mt-6">This event has ended</p>
            ) : isLiveEvent ? null : (!hasCompletedEvent && !isRegistered && (availableSlots > 0 || unlimitedVolunteers) && (
              <button
                onClick={() => setShowRegisterModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mt-6"
              >
                Register
              </button>
            ))}
            {hasCompletedEvent && (
              <p className="text-green-700 font-semibold mt-6">Thank you for attending! Your attendance is complete.</p>
            )}
            {!hasCompletedEvent && isRegistered && !registrationDetails?.inTime && (
              <button
                onClick={handleWithdrawRegistration}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mt-4"
              >
                Withdraw Registration
              </button>
            )}

            {/* Event Info Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Organization:</span> {event.organization?.name || "N/A"}
                </div>
                {/* --- MAP & LOCATION SECTION --- */}
                {event.mapLocation && event.mapLocation.lat && event.mapLocation.lng && (
                  <div className="my-4">
                    <h3 className="font-semibold text-gray-700 mb-2">Event Location Map</h3>
                    <StaticMap lat={event.mapLocation.lat} lng={event.mapLocation.lng} />
                    {event.mapLocation.address && (
                      <p className="text-gray-600 mt-2 text-sm">{event.mapLocation.address}</p>
                    )}
                  </div>
                )}
                {/* --- END MAP & LOCATION SECTION --- */}
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Location:</span> {event.location}
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Timing: &nbsp;</span>
                  <span className="font-medium text-gray-700">{`(${format(new Date(event.startDateTime), 'hh:mm a, d MMMM yyyy')}) — (${format(new Date(event.endDateTime), 'hh:mm a, d MMMM yyyy')})`}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Type:</span> {event.eventType || "Not specified"}
                </div>
                <div className={`mb-2`}>
                  <span className="font-semibold text-gray-700">Volunteer Slots:</span> <span className={slotColor}>{slotMessage}</span>
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

            {/* AI Summary Section */}
            <div className="mt-8 mb-8 p-6 bg-yellow-50 border-l-4 border-yellow-400 rounded shadow">
              <h2 className="text-xl font-bold text-yellow-700 mb-2">AI Event Summary</h2>
              {event.summary && event.summary.trim() ? (
                <p className="text-gray-800 whitespace-pre-line">{event.summary}</p>
              ) : (
                <p className="italic text-gray-500">Generating AI summary...</p>
              )}
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
      {event && (
        <EventChatbox eventId={event._id} currentUser={user} />
      )}
      {!isPastEvent && (
        <VolunteerRegisterModal
          open={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          volunteer={user}
          onSubmit={handleRegistrationSubmit}
        />
      )}
      {showQR && registrationDetails && registrationDetails.qrCodePath && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-lg p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Scan for Attendance</h3>
            <img
              src={`http://localhost:5000${registrationDetails.qrCodePath}`}
              alt="Your QR Code"
              className="w-64 h-64 mx-auto"
            />
            <p className="mt-4 text-gray-600">Present this to an organizer to mark your attendance.</p>
          </div>
        </div>
      )}
    </div>
  );
}
