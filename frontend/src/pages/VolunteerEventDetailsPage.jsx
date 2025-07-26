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
import VolunteerQuestionnaireModal from '../components/volunteer/VolunteerQuestionnaireModal';
import { getEventReport, downloadReportAsPDF } from '../utils/reportUtils';

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
  
  // Questionnaire state
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [questionnaireSubmitting, setQuestionnaireSubmitting] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  
  // Report state
  const [eventReport, setEventReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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

  // Check if event is in the past (needs to be declared before useEffect)
  const isPastEvent = event ? new Date(event.endDateTime) < new Date() : false;

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axiosInstance.get(`/api/events/${id}`);
        setEvent(res.data);
        // Debug: Log the full event and certificates
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

  // Check for available report when event loads (for past events)
  useEffect(() => {
    if (event && isPastEvent && isRegistered) {
      fetchEventReport();
    }
  }, [event, isPastEvent, isRegistered]);

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
          setRegistrationDetails(res.data.registration);
          // Check questionnaire status for past events
          const isPast = new Date() > new Date(event.endDateTime);
          if (isPast && res.data.questionnaireCompleted) {
            setQuestionnaireCompleted(true);
          }
        })
        .catch(() => {
          setIsRegistered(false);
          setRegistrationDetails(null);
          setQuestionnaireCompleted(false);
        });
    }
  }, [event?._id, user?._id, event?.endDateTime]);

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

  // Check if event is in the past
  const isPastEvent = event && event.endDateTime ? new Date(event.endDateTime) < new Date() : false;

  // Find the current user's certificate assignment (if any)
  const myCertificateAssignment = event?.certificates?.find(
    cert => {
      // Check if the certificate is for the current user
      const certUserId = cert.user?._id || cert.user;
      return certUserId === user?._id;
    }
  );
  
  // Check if user is eligible to generate certificate
  const canGenerateCertificate = isPastEvent && 
    isRegistered && 
    questionnaireCompleted && 
    myCertificateAssignment && 
    myCertificateAssignment.role === 'volunteer' &&
    !myCertificateAssignment.filePath; // No filePath means certificate not generated yet
  
  // Check if certificate is already generated
  const certificateGenerated = myCertificateAssignment && myCertificateAssignment.filePath;
  
  // Certificate generation handler
  const handleGenerateCertificate = async () => {
    if (!canGenerateCertificate) {
      alert('You are not eligible to generate a certificate at this time.');
      return;
    }
    
    setIsGeneratingCertificate(true);
    try {
      // Show loading state
      const response = await axiosInstance.post(`/api/events/${event._id}/generate-certificate`);
      
      // Wait longer for the backend to save the data and generate the file
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh the event to get the updated certificate data
      const updatedEvent = await axiosInstance.get(`/api/events/${id}`);
      setEvent(updatedEvent.data);
      
      // Force a re-render by updating state
      setForceRefresh(prev => prev + 1);
      
      // Also refresh registration details to ensure questionnaire status is up to date
      if (user && user._id) {
        try {
          const regRes = await axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`);
          setRegistrationDetails(regRes.data.registration);
        } catch (err) {
          console.log('Could not refresh registration details:', err);
        }
      }
      
      alert('Certificate generated successfully! You can now download it.');
    } catch (err) {
      console.error('Certificate generation error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to generate certificate. Please try again.';
      alert(errorMessage);
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  // Questionnaire submission handler
  const handleQuestionnaireSubmit = async (answers) => {
    if (questionnaireCompleted) {
      alert('You have already submitted your questionnaire.');
      return;
    }
    
    setQuestionnaireSubmitting(true);
    try {
      const response = await axiosInstance.post(`/api/registrations/event/${event._id}/questionnaire`, {
        answers
      });
      
      // Update state immediately to reflect completion
      setQuestionnaireCompleted(true);
      setShowQuestionnaireModal(false);
      
      // Update registration details to reflect the new questionnaire data
      if (registrationDetails) {
        setRegistrationDetails({
          ...registrationDetails,
          questionnaire: response.data.questionnaire
        });
      }
      
      alert('Questionnaire submitted successfully! Thank you for your feedback.');
    } catch (err) {
      console.error('Questionnaire submission error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to submit questionnaire. Please try again.';
      alert(errorMessage);
      
      // If already submitted error, update state
      if (err.response?.status === 400 && err.response?.data?.message?.includes('already submitted')) {
        setQuestionnaireCompleted(true);
        setShowQuestionnaireModal(false);
      }
    } finally {
      setQuestionnaireSubmitting(false);
    }
  };

  // Fetch event report
  const fetchEventReport = async () => {
    if (!event?._id) return;
    
    setReportLoading(true);
    const result = await getEventReport(event._id);
    
    if (result.success) {
      setEventReport(result.data);
    } else {
      console.error('Failed to fetch report:', result.error);
    }
    
    setReportLoading(false);
  };

  // Handle report viewing
  const handleViewReport = () => {
    setShowReportModal(true);
  };

  // Handle report download
  const handleDownloadReport = () => {
    if (eventReport?.report?.content) {
      const filename = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`;
      downloadReportAsPDF(eventReport.report.content, filename);
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
        {/* Certificate Section */}
        {isPastEvent && isRegistered && (
          <div className="mb-4">
            {myCertificateAssignment ? (
              <div className="flex items-center gap-4">
                {certificateGenerated ? (
                  <a
                    href={`http://localhost:5000${myCertificateAssignment.filePath.replace(/\\/g, '/')}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    download
                  >
                    Download Certificate
                  </a>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleGenerateCertificate}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={!canGenerateCertificate || isGeneratingCertificate}
                    >
                      {isGeneratingCertificate ? "Generating..." : "Generate Certificate"}
                    </button>
                    {!questionnaireCompleted && (
                      <span className="text-sm text-red-600">Please complete your questionnaire to generate your certificate.</span>
                    )}
                  </div>
                )}
                <span className="text-gray-700">Award: <b>{myCertificateAssignment?.award}</b></span>
              </div>
            ) : (
              <div className="text-gray-600">
                {!questionnaireCompleted ? (
                  <span>Complete your questionnaire to be eligible for a certificate.</span>
                ) : (
                  <span>Certificate not available yet. The event organizer needs to assign awards.</span>
                )}
              </div>
            )}

          </div>
        )}
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
            {/* Questionnaire button for past events */}
            {isPastEvent && isRegistered && !questionnaireCompleted && (
              <button
                onClick={() => setShowQuestionnaireModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-6"
                disabled={questionnaireSubmitting}
              >
                {questionnaireSubmitting ? 'Submitting...' : 'Complete Questionnaire'}
              </button>
            )}
            {isPastEvent && isRegistered && questionnaireCompleted && (
              <p className="text-green-700 font-semibold mt-6">✅ Questionnaire completed! Thank you for your feedback.</p>
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

            {/* AI Event Report Section - Only for registered volunteers of past events */}
            {isPastEvent && isRegistered && (
              <div className="mt-8 mb-8 p-6 bg-green-50 border-l-4 border-green-400 rounded shadow">
                <h2 className="text-xl font-bold text-green-700 mb-4">AI Event Report</h2>
                
                {reportLoading ? (
                  <div className="flex items-center text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                    Checking for available report...
                  </div>
                ) : eventReport ? (
                  <div>
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                      ✅ Event report is available! Generated on {new Date(eventReport.report.generatedAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={handleViewReport}
                        className="px-6 py-3 bg-green-600 text-white rounded font-semibold hover:bg-green-700 transition-colors"
                      >
                        📄 View Report
                      </button>
                      <button
                        onClick={handleDownloadReport}
                        className="px-6 py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition-colors"
                      >
                        📥 Download PDF
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 border border-gray-300 text-gray-600 px-4 py-3 rounded">
                    📋 No report available yet. Reports are generated after sufficient feedback is collected.
                  </div>
                )}
              </div>
            )}

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
      {/* Volunteer Questionnaire Modal */}
      <VolunteerQuestionnaireModal
        open={showQuestionnaireModal}
        onClose={() => setShowQuestionnaireModal(false)}
        eventType={event?.eventType}
        onSubmit={handleQuestionnaireSubmit}
      />
      {/* Loader overlay for certificate generation */}
      {isGeneratingCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span className="text-lg font-semibold text-blue-700">Generating certificate...</span>
      
      {/* Report Viewing Modal */}
      {showReportModal && eventReport && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Event Report: {event.title}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadReport}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    📥 Download PDF
                  </button>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Generated on {new Date(eventReport.report.generatedAt).toLocaleDateString()} • 
                Event Date: {new Date(eventReport.eventDate).toLocaleDateString()}
              </p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="report-header text-center border-b-2 border-green-700 pb-4 mb-6">
                <h1 className="text-3xl font-bold text-green-700 uppercase tracking-wide mb-2">Event Impact Report</h1>
                <p className="text-lg text-gray-600 italic">{event.title}</p>
              </div>
              <div 
                className="prose prose-lg max-w-none report-content"
                style={{
                  fontFamily: 'Times New Roman, serif',
                  lineHeight: '1.8',
                  color: '#2c3e50'
                }}
                dangerouslySetInnerHTML={{
                  __html: eventReport.report.content
                    .replace(/\n/g, '<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #2c5530; font-weight: bold;">$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em style="color: #7f8c8d; font-style: italic;">$1</em>')
                    .replace(/^# (.*$)/gm, '<h1 style="font-size: 24px; color: #2c5530; border-bottom: 2px solid #4CAF50; padding-bottom: 8px; margin-top: 30px; margin-bottom: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">$1</h1>')
                    .replace(/^## (.*$)/gm, '<h2 style="font-size: 20px; color: #34495e; border-left: 4px solid #4CAF50; padding-left: 15px; margin-top: 25px; margin-bottom: 12px; font-weight: bold; background: #f8f9fa; padding-top: 8px; padding-bottom: 8px;">$1</h2>')
                    .replace(/^### (.*$)/gm, '<h3 style="font-size: 16px; color: #1976d2; margin-top: 20px; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px;">$1</h3>')
                    .replace(/(Executive Summary[\s\S]*?)(?=<h2|$)/gi, '<div style="background: #e8f5e8; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; border-radius: 4px;">$1</div>')
                    .replace(/(Impact Assessment[\s\S]*?)(?=<h2|$)/gi, '<div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; border-radius: 4px;">$1</div>')
                    .replace(/(Recommendations[\s\S]*?)(?=<h2|$)/gi, '<div style="background: #fff3e0; padding: 15px; border-left: 4px solid #FF9800; margin: 15px 0; border-radius: 4px;">$1</div>')
                    .replace(/(Conclusion[\s\S]*?)(?=<h2|$)/gi, '<div style="background: #f3e5f5; padding: 15px; border-left: 4px solid #9C27B0; margin: 15px 0; border-radius: 4px;">$1</div>')
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
