// src/pages/VolunteerEventDetailsPage.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

import { format } from "date-fns";

import axiosInstance from "../api/axiosInstance";
import { getFullOrganizerTeam } from "../api/event";
import { getEventReport, downloadReportAsPDF } from '../utils/reportUtils';
import defaultImages from "../utils/eventTypeImages";
import { addEventToCalendar, downloadCalendarFile, addToWebsiteCalendar, removeFromWebsiteCalendar, checkWebsiteCalendarStatus } from "../utils/calendarUtils";
import { FaCalendarPlus, FaCalendarMinus } from "react-icons/fa";
import calendarEventEmitter from "../utils/calendarEventEmitter";

import useEventSlots from '../hooks/useEventSlots';
import Navbar from "../components/layout/Navbar";
import VolunteerRegisterModal from "../components/volunteer/VolunteerRegisterModal";
import VolunteerQuestionnaireModal from '../components/volunteer/VolunteerQuestionnaireModal';
import EventChatbox from '../components/chat/EventChatbox';
import StaticMap from '../components/event/StaticMap';
import Avatar from "../components/common/Avatar";
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";

// Function to format report content for better display
const formatReportContent = (content) => {
  if (!content) return '';
  
  let formattedContent = content
    // Remove the appendix section
    .replace(/\*\*Appendix:\*\*[\s\S]*?(?=\n\n|$)/gi, '')
    .replace(/\*\*Appendix:\*\*[\s\S]*?Note:.*$/gis, '')
    
    // Convert markdown headers to proper HTML
    .replace(/^# (.*?)$/gm, '<h1 class="text-3xl font-bold text-green-800 mb-6 mt-8 pb-3 border-b-2 border-green-300 text-center">$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2 class="text-2xl font-semibold text-blue-700 mb-4 mt-6 pb-2 border-b border-blue-200">$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3 class="text-xl font-semibold text-gray-700 mb-3 mt-5">$1</h3>')
    
    // Convert bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>')
    
    // Convert italic text
    .replace(/\*(.*?)\*/g, '<em class="italic text-gray-600">$1</em>');
  
  // Handle bullet points and lists more carefully
  const lines = formattedContent.split('\n');
  const processedLines = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line starts a list
    if (line.trim().match(/^[\*\-] (.+)$/)) {
      if (!inList) {
        processedLines.push('<ul class="list-disc pl-6 mb-4 space-y-1">');
        inList = true;
      }
      const listItem = line.trim().replace(/^[\*\-] (.+)$/, '<li class="mb-2 text-gray-700">$1</li>');
      processedLines.push(listItem);
    } else {
      // If we were in a list and this line doesn't start with bullet, close the list
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(line);
    }
  }
  
  // Close any remaining open list
  if (inList) {
    processedLines.push('</ul>');
  }
  
  formattedContent = processedLines.join('\n');
  
  // Convert line breaks to proper paragraphs
  formattedContent = formattedContent
    .replace(/\n\n/g, '</p><p class="mb-4 text-gray-700 leading-relaxed">')
    .replace(/\n/g, '<br />');
  
  // Wrap in paragraph tags if not already wrapped
  if (!formattedContent.startsWith('<')) {
    formattedContent = '<p class="mb-4 text-gray-700 leading-relaxed">' + formattedContent + '</p>';
  }
  
  // Clean up any double paragraph tags
  formattedContent = formattedContent
    .replace(/<\/p><p class="mb-4 text-gray-700 leading-relaxed"><\/p>/g, '</p>')
    .replace(/<p class="mb-4 text-gray-700 leading-relaxed"><\/p>/g, '');
  
  return formattedContent;
};

// CommentAvatarAndName component
const CommentAvatarAndName = ({ comment }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (comment.volunteer?._id) {
      navigate(`/volunteer/${comment.volunteer._id}`);
    }
  };

  return (
    <div 
      className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
      onClick={handleClick}
    >
      {getProfileImageUrl(comment.volunteer) ? (
        <img 
          src={getProfileImageUrl(comment.volunteer)} 
          alt={comment.volunteer?.name} 
          className="w-10 h-10 rounded-full object-cover border-2 border-green-400" 
        />
      ) : (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-green-400 ${getRoleColors('volunteer')}`}>
          <span className="text-sm font-bold">{getAvatarInitial(comment.volunteer)}</span>
        </div>
      )}
      <span className="font-medium text-green-800">{comment.volunteer?.username ? `@${comment.volunteer.username}` : comment.volunteer?.name}</span>
    </div>
  );
};

export default function VolunteerEventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Registration state
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  // UI Interaction state
  const [showExitQr, setShowExitQr] = useState(false);
  const [exitQrPath, setExitQrPath] = useState(null);
  const user = JSON.parse(localStorage.getItem("user"));
  const imageBaseUrl = "http://localhost:5000/uploads/Events/";

  // Carousel state
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Organizer & Volunteer List state
  const [organizerTeam, setOrganizerTeam] = useState([]);
  const [showOrganizerTeamDrawer, setShowOrganizerTeamDrawer] = useState(false);
  const [showVolunteers, setShowVolunteers] = useState(false);
  const [volunteers, setVolunteers] = useState([]);
  const [volunteersLoading, setVolunteersLoading] = useState(false);
  
  // Search state
  const [organizerSearchTerm, setOrganizerSearchTerm] = useState("");
  const [volunteerSearchTerm, setVolunteerSearchTerm] = useState("");

  // Questionnaire state
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [questionnaireSubmitting, setQuestionnaireSubmitting] = useState(false);

  // Certificate state
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // Report state
  const [eventReport, setEventReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Calendar state
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState({
    isRegistered: false, isInCalendar: false, canAddToCalendar: false, canRemoveFromCalendar: false
  });

  // Custom hook for live slot information
  const { availableSlots, unlimitedVolunteers, loading: slotsLoading } = useEventSlots(id);

  // Check if user is removed or banned from this event
  const isRemoved = event?.removedVolunteers?.includes(user?._id);
  const isBanned = event?.bannedVolunteers?.includes(user?._id);

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
    } else if (availableSlots <= 2) {
      slotMessage = `Only ${availableSlots} slot${availableSlots === 1 ? '' : 's'} remaining`;
      slotColor = 'text-red-600';
    } else if (availableSlots <= 5) {
      slotMessage = `Only ${availableSlots} slots remaining`;
      slotColor = 'text-orange-500';
    } else {
      slotMessage = `${availableSlots} slots left`;
      slotColor = 'text-green-700';
    }
  }

  // --- DATA FETCHING & SIDE EFFECTS ---

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axiosInstance.get(`/api/events/${id}`);
        setEvent(res.data);
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
  }, [id, forceRefresh]); // Added forceRefresh to re-fetch event data when needed

  // Close calendar options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the calendar button and dropdown
      const calendarButton = event.target.closest('[data-calendar-button]');
      const calendarDropdown = event.target.closest('[data-calendar-dropdown]');
      
      if (showCalendarOptions && !calendarButton && !calendarDropdown) {
        setShowCalendarOptions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showCalendarOptions]);

  // Check calendar status
  useEffect(() => {
    const checkCalendarStatus = async () => {
      if (!user?._id || !event?._id) return;
      
      try {
        const result = await checkWebsiteCalendarStatus(event._id);
        if (result.success) {
          setCalendarStatus(result.data);
        }
      } catch (error) {
        console.error('Error checking calendar status:', error);
      }
    };
    
    checkCalendarStatus();
  }, [event?._id, user?._id]);

  // Poll for AI summary if it's missing
  useEffect(() => {
    if (!event || event.summary) return;
    const interval = setInterval(async () => {
      try {
        const res = await axiosInstance.get(`/api/events/${id}`);
        if (res.data.summary && res.data.summary.trim()) {
          setEvent(prev => ({ ...prev, summary: res.data.summary }));
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Polling for summary failed:", err);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [event, id]);

  // Fetch full organizer team details
  useEffect(() => {
    const fetchTeam = async () => {
      if (!event?._id) return;
      try {
        const team = await getFullOrganizerTeam(id);
        setOrganizerTeam(team);
      } catch (err) {
        setOrganizerTeam([]);
      }
    };
    fetchTeam();
  }, [event?._id, id]);

  // Check user's registration status on load
  useEffect(() => {
    if (event?._id && user?._id) {
      axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`)
        .then(res => {
          if (res.data.registered) {
            setIsRegistered(true);
            setRegistrationDetails(res.data.registration);
            if (new Date() > new Date(event.endDateTime) && res.data.questionnaireCompleted) {
              setQuestionnaireCompleted(true);
            }
          } else {
            setIsRegistered(false);
            setRegistrationDetails(null);
            setQuestionnaireCompleted(false);
          }
        })
        .catch((err) => {
          // Handle 404 and other errors gracefully
          if (err.response?.status === 404) {
            setIsRegistered(false);
            setRegistrationDetails(null);
            setQuestionnaireCompleted(false);
          } else {
            console.error('Error checking registration status:', err);
            setIsRegistered(false);
            setRegistrationDetails(null);
            setQuestionnaireCompleted(false);
          }
        });
    }
  }, [event?._id, user?._id, event?.endDateTime]);

  // Poll for attendance `inTime` if user is registered but hasn't been scanned in
  useEffect(() => {
    if (!isRegistered || registrationDetails?.inTime || !event?._id) return;
    const interval = setInterval(async () => {
      try {
        const res = await axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`);
        if (res.data.registration?.inTime) {
          setRegistrationDetails(res.data.registration);
          clearInterval(interval);
        }
      } catch (err) {
         console.error("Polling for inTime failed:", err);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isRegistered, registrationDetails?.inTime, event?._id]);

  // Fetch list of registered volunteers when the drawer is opened
  const fetchVolunteers = useCallback(() => {
    if (!event?._id) return;
    setVolunteersLoading(true);
    axiosInstance.get(`/api/registrations/event/${event._id}/volunteers`)
      .then(res => {
        setVolunteers(res.data);
      })
      .catch(err => console.error("Failed to fetch volunteers:", err))
      .finally(() => setVolunteersLoading(false));
  }, [event?._id]);

  // Check for available event report for past events
  const isPastEvent = event && event.endDateTime ? new Date(event.endDateTime) < new Date() : false;
  useEffect(() => {
    if (isPastEvent && isRegistered) {
      fetchEventReport();
    }
  }, [isPastEvent, isRegistered]); // Simplified dependencies

  // Socket connection for real-time updates (slots, etc.)
  useEffect(() => {
    const socket = io('http://localhost:5000', {
      auth: { token: localStorage.getItem('token') }
    });
    
    socket.on('connect', () => {
      // Join event-specific rooms for real-time updates
      if (event?._id) {
        socket.emit('joinEventSlotsRoom', event._id);
      }
    });
    
    return () => {
      if (event?._id) {
        socket.emit('leaveEventSlotsRoom', event._id);
      }
      socket.disconnect();
    };
  }, [event?._id]);

  // --- EVENT HANDLERS ---

  const handleRegistrationSubmit = async ({ groupMembers, selectedTimeSlot }) => {
    try {
      const payload = { eventId: event._id, groupMembers, selectedTimeSlot };
      await axiosInstance.post("/api/registrations", payload);
      setShowRegisterModal(false);
      
      // Re-fetch registration details to update UI
      const regDetailsRes = await axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`);
      if (regDetailsRes.data.registered) {
        setIsRegistered(true);
        setRegistrationDetails(regDetailsRes.data.registration);
      }
      alert("Registered successfully!");
    } catch (err) {
      console.error("Registration failed:", err);
      const errorMessage = err.response?.data?.message || "Failed to register. Please try again.";
      alert(errorMessage);
    }
  };

  const handleWithdrawRegistration = async () => {
    if (!event?._id) return;
    if (!window.confirm('Are you sure you want to withdraw your registration for this event?')) return;
    
    try {
      // Use event ID for withdrawal as per backend route
      await axiosInstance.delete(`/api/registrations/${event._id}`);
      setIsRegistered(false);
      setRegistrationDetails(null);
      alert('Registration withdrawn successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to withdraw registration.');
    }
  };

  const handleGenerateExitQr = async () => {
    if (!registrationDetails?._id) return;
    try {
      const res = await axiosInstance.get(`/api/registrations/${registrationDetails._id}/exit-qr`);
      setExitQrPath(res.data.exitQrPath);
      setShowExitQr(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate exit QR.');
    }
  };
  
  const handleQuestionnaireSubmit = async (answers) => {
    if (questionnaireCompleted) {
      alert('You have already submitted your questionnaire.');
      return;
    }
    
    setQuestionnaireSubmitting(true);
    try {
      await axiosInstance.post(`/api/registrations/event/${event._id}/questionnaire`, { answers });
      
      setQuestionnaireCompleted(true);
      setShowQuestionnaireModal(false);
      
      if (registrationDetails) {
        setRegistrationDetails(prev => ({ ...prev, questionnaireCompleted: true }));
      }
      
      alert('Questionnaire submitted successfully! Thank you for your feedback.');
    } catch (err) {
      console.error('Questionnaire submission error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to submit questionnaire. Please try again.';
      alert(errorMessage);
      
      if (err.response?.status === 400 && err.response?.data?.message?.includes('already submitted')) {
        setQuestionnaireCompleted(true);
        setShowQuestionnaireModal(false);
      }
    } finally {
      setQuestionnaireSubmitting(false);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!canGenerateCertificate) {
      alert('You are not eligible to generate a certificate at this time.');
      return;
    }
    
    setIsGeneratingCertificate(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/generate-certificate`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Allow backend time to process
      setForceRefresh(prev => prev + 1); // Trigger re-fetch of event data
      alert('Certificate generated successfully! You can now download it.');
    } catch (err) {
      console.error('Certificate generation error:', err);
      alert(err.response?.data?.message || 'Failed to generate certificate. Please try again.');
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

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

  const handleViewReport = () => setShowReportModal(true);

  const handleDownloadReport = () => {
    if (eventReport?.report?.content) {
      const filename = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`;
      // Use the same formatted content for PDF download
      const formattedContent = formatReportContent(eventReport.report.content);
      downloadReportAsPDF(formattedContent, filename);
    }
  };

  // Fetch comments for the event
  const fetchComments = useCallback(async () => {
    if (!event?._id) return;
    
    setCommentsLoading(true);
    try {
      const response = await axiosInstance.get(`/api/registrations/event/${event._id}/comments`);
      if (response.data.success) {
        setComments(response.data.comments);
      } else {
        console.error('Failed to fetch comments:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  }, [event?._id]);

  // --- DERIVED STATE & RENDER LOGIC ---

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading event details...</p></div>;
  }
  if (error || !event) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">{error}</p></div>;
  }

  const images = event.eventImages || [];
  const hasImages = images.length > 0;
  const handlePrev = () => setCarouselIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  const handleNext = () => setCarouselIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));

  // Calendar functions
  const handleAddToCalendar = () => {
    const result = addEventToCalendar(event);
    if (result.success) {
    } else {
      console.error(result.message);
    }
  };

  const handleDownloadCalendar = () => {
    const result = downloadCalendarFile(event);
    if (result.success) {
    } else {
      console.error(result.message);
    }
  };

  const handleAddToWebsiteCalendar = async () => {
    try {
      const result = await addToWebsiteCalendar(event._id);
      if (result.success) {
        const statusResult = await checkWebsiteCalendarStatus(event._id);
        if (statusResult.success) setCalendarStatus(statusResult.data);
      } else { console.error(result.message); }
    } catch (error) { console.error('Error adding to website calendar:', error); }
  };

  const handleRemoveFromWebsiteCalendar = async () => {
    try {
      const result = await removeFromWebsiteCalendar(event._id);
      if (result.success) {
        const statusResult = await checkWebsiteCalendarStatus(event._id);
        if (statusResult.success) setCalendarStatus(statusResult.data);
      } else { console.error(result.message); }
    } catch (error) { console.error('Error removing from website calendar:', error); }
  };

  const now = new Date();
  const isLiveEvent = new Date(event.startDateTime) <= now && now < new Date(event.endDateTime);
  const hasCompletedEvent = !!(registrationDetails?.inTime && registrationDetails?.outTime);

  const myCertificateAssignment = event?.certificates?.find(
    cert => (cert.user?._id || cert.user) === user?._id
  );
  
  const canGenerateCertificate = isPastEvent && isRegistered && questionnaireCompleted && myCertificateAssignment && myCertificateAssignment.role === 'volunteer' && !myCertificateAssignment.filePath;
  const certificateGenerated = myCertificateAssignment && myCertificateAssignment.filePath;

  const eventImage = defaultImages[event.eventType?.toLowerCase()] || defaultImages["default"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-12 relative">
      <Navbar />

      {/* Organizer Team Drawer & Button */}
      {organizerTeam.length > 0 && (
        <>
          <button
            className={`fixed z-50 bg-blue-600 text-white px-5 py-2 rounded shadow hover:bg-blue-700 transition top-[calc(2cm+1.5rem)] ${showOrganizerTeamDrawer ? 'right-[340px]' : 'right-8'}`}
            style={{ transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)' }}
            onClick={() => setShowOrganizerTeamDrawer(prev => !prev)}
          >
            {showOrganizerTeamDrawer ? 'Hide Organizer Team' : 'Show Organizer Team'}
          </button>
          <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${showOrganizerTeamDrawer ? 'translate-x-0' : 'translate-x-full'}`}>

            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-blue-700">Organizer Team</h2>
              <button className="text-gray-500 hover:text-red-600 text-2xl font-bold" onClick={() => setShowOrganizerTeamDrawer(false)} aria-label="Close">×</button>
            </div>
            <div className="px-6 py-3 border-b">
              <input
                type="text"
                placeholder="Search organizers..."
                value={organizerSearchTerm}
                onChange={(e) => setOrganizerSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="overflow-y-auto h-[calc(100%-128px)] px-6 py-4 space-y-4">
              {organizerTeam
                .filter(obj => {
                  if (!obj.user?._id) return false;
                  const orgUser = obj.user;
                  const displayName = orgUser.username || orgUser.name || '';
                  return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
                })
                .map(obj => {
                  const orgUser = obj.user;
                  const isCreator = orgUser._id === event.createdBy._id;
                  const displayName = orgUser.username || orgUser.name || 'User';
                  const displayText = orgUser.username ? `@${orgUser.username}` : displayName;
                  return (
                    <div key={orgUser._id} className={`flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition cursor-pointer hover:bg-blue-50 mb-2 ${isCreator ? 'border-2 border-yellow-500 bg-yellow-50' : ''}`} onClick={() => navigate(`/organizer/${orgUser._id}`)}>
                      <Avatar user={orgUser} size="lg" role="organizer" className="mr-4" />
                      <div className="flex flex-col">
                        <span className="font-medium text-blue-800 text-lg">{displayText}</span>
                        {orgUser.username && orgUser.name && (
                          <span className="text-sm text-gray-600">{orgUser.name}</span>
                        )}
                      </div>
                      {isCreator && (
                        <span className="ml-3 px-2 py-1 bg-yellow-400 text-white text-xs rounded font-bold">Creator</span>
                      )}
                    </div>
                  );
                })}
              {organizerTeam.filter(obj => {
                if (!obj.user?._id) return false;
                const orgUser = obj.user;
                const displayName = orgUser.username || orgUser.name || '';
                return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
              }).length === 0 && organizerSearchTerm && (
                <div className="text-gray-500 text-center py-4">No organizers found matching "{organizerSearchTerm}"</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Volunteers Drawer & Button */}
      <button
        className="fixed z-50 bg-green-600 text-white px-5 py-2 rounded shadow hover:bg-green-700 transition top-[calc(2cm+1.5rem)] left-8"
        onClick={() => {
          if (!showVolunteers) fetchVolunteers();
          setShowVolunteers(prev => !prev);
        }}
      >
        {showVolunteers ? 'Hide Volunteers' : 'Show Volunteers'}
      </button>
      <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${showVolunteers ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-green-700">Volunteers</h2>
          <button className="text-gray-500 hover:text-red-600 text-2xl font-bold" onClick={() => setShowVolunteers(false)} aria-label="Close">×</button>
        </div>
        <div className="px-6 py-3 border-b">
          <input
            type="text"
            placeholder="Search volunteers..."
            value={volunteerSearchTerm}
            onChange={(e) => setVolunteerSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div className="overflow-y-auto h-[calc(100%-128px)] px-6 py-4 space-y-4">
          {volunteersLoading ? (
            <div>Loading...</div>
          ) : volunteers.length === 0 ? (
            <div className="text-gray-500">No volunteers registered.</div>
          ) : (
            volunteers
              .filter(vol => {
                const displayName = vol.username || vol.name || '';
                return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
              })
              .map(vol => {
                const displayName = vol.username || vol.name || 'User';
                const displayText = vol.username ? `@${vol.username}` : displayName;
                return (
                  <div key={vol._id} className="flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition cursor-pointer hover:bg-green-50" onClick={() => navigate(`/volunteer/${vol._id}`)}>
                    <Avatar user={vol} size="lg" role="volunteer" className="mr-4" />
                    <div className="flex flex-col">
                      <span className="font-medium text-green-800 text-lg">{displayText}</span>
                      {vol.username && vol.name && (
                        <span className="text-sm text-gray-600">{vol.name}</span>
                      )}
                    </div>
                  </div>
                );
              })
          )}
          {volunteers.filter(vol => {
            const displayName = vol.username || vol.name || '';
            return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
          }).length === 0 && volunteerSearchTerm && volunteers.length > 0 && (
            <div className="text-gray-500 text-center py-4">No volunteers found matching "{volunteerSearchTerm}"</div>
          )}
        </div>
      </div>
      
      {/* LIVE badge */}
      {isLiveEvent && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow z-20 animate-pulse">LIVE</div>
      )}

      <div className="pt-24 w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        {/* Certificate Section */}
        {isPastEvent && isRegistered && (
          <div className="mb-4 p-4 bg-blue-100 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">Your Certificate</h3>
            {myCertificateAssignment ? (
              <div className="flex items-center gap-4">
                {certificateGenerated ? (
                  <a href={`http://localhost:5000${myCertificateAssignment.filePath.replace(/\\/g, '/')}`} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" download>Download Certificate</a>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button onClick={handleGenerateCertificate} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed" disabled={!canGenerateCertificate || isGeneratingCertificate}>
                      {isGeneratingCertificate ? "Generating..." : "Generate Certificate"}
                    </button>
                    {!questionnaireCompleted && <span className="text-sm text-red-600">Please complete the questionnaire to enable generation.</span>}
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
        
        <button className="mb-4 text-blue-600 underline" onClick={() => navigate(-1)}>← Back</button>

        {/* Event Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 w-full">
          <div className="relative w-full bg-gray-200 flex items-center justify-center" style={{ minHeight: '180px', maxHeight: '220px' }}>
            <img src={eventImage} alt={event.eventType} className="w-full h-full object-cover object-center opacity-40 absolute top-0 left-0 z-0" />
            <div className="absolute bottom-2 left-2 bg-white/80 px-3 py-1 rounded text-sm font-semibold text-blue-700 shadow z-20">{event.eventType || "Event"}</div>
          </div>

          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-blue-800">
                  {event.title}
                  {event.isRecurringInstance && (
                    <span className="ml-3 text-lg bg-blue-100 text-blue-700 px-3 py-1 rounded">
                      Instance #{event.recurringInstanceNumber}
                    </span>
                  )}
                </h1>
                {event.recurringEvent && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                      Recurring Event
                    </span>
                    <span className="text-sm text-gray-600">
                      {event.recurringType} - {event.recurringValue}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Add to Calendar Button */}
              <div className="relative">
                <button
                  data-calendar-button
                  onClick={() => setShowCalendarOptions(!showCalendarOptions)}
                  className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                  title="Add to Calendar"
                >
                  <FaCalendarPlus className="w-5 h-5" />
                </button>
                
                {/* Calendar Options Dropdown */}
                {showCalendarOptions && (
                  <div data-calendar-dropdown className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[220px] z-50">
                    {/* Website Calendar Options */}
                    {calendarStatus.canAddToCalendar && (
                      <button
                        onClick={() => {
                          handleAddToWebsiteCalendar();
                          setShowCalendarOptions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                      >
                        <FaCalendarPlus className="w-4 h-4" />
                        Add to Website Calendar
                      </button>
                    )}
                    {calendarStatus.canRemoveFromCalendar && (
                      <button
                        onClick={() => {
                          handleRemoveFromWebsiteCalendar();
                          setShowCalendarOptions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                      >
                        <FaCalendarMinus className="w-4 h-4" />
                        Remove from Website Calendar
                      </button>
                    )}
                    {calendarStatus.isRegistered && (
                      <div className="px-3 py-2 text-sm text-gray-500 italic">
                        Registered events are automatically in calendar
                      </div>
                    )}
                    
                    {/* External Calendar Options */}
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => {
                        handleAddToCalendar();
                        setShowCalendarOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      <FaCalendarPlus className="w-4 h-4" />
                      Add to Google Calendar
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadCalendar();
                        setShowCalendarOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      <FaCalendarPlus className="w-4 h-4" />
                      Download .ics File
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* --- ACTION/STATUS SECTION --- */}
            <div className="my-6 p-4 bg-gray-50 rounded-lg border text-center">
              {/* Banned Status */}
              {isBanned && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  🚫 You are banned from this event by the event creator. You cannot register.
                </div>
              )}

              {/* Removed Status */}
              {isRemoved && !isBanned && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                  ⚠️ You were removed from this event by an organizer. You can register again.
                </div>
              )}

              {/* Entry QR Code */}
              {!hasCompletedEvent && !registrationDetails?.inTime && registrationDetails?.qrCodePath && (
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-semibold mb-2">Your Entry QR Code</h3>
                  <img src={`http://localhost:5000${registrationDetails.qrCodePath}`} alt="Entry QR Code" className="border border-gray-300 p-2 w-64 h-64" />
                  <p className="mt-3 text-blue-800 text-sm max-w-xs">Show this to the organizer at the event entrance.</p>
                </div>
              )}

              {/* Exit QR Generation & Display */}
              {!hasCompletedEvent && registrationDetails?.inTime && !registrationDetails?.outTime && (
                !showExitQr ? (
                  <button onClick={handleGenerateExitQr} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Generate Exit QR</button>
                ) : exitQrPath && (
                  <div className="flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-2">Your Exit QR Code</h3>
                    <img src={`http://localhost:5000${exitQrPath}`} alt="Exit QR Code" className="border border-gray-300 p-2 w-64 h-64" />
                    <p className="mt-3 text-blue-800 text-sm max-w-xs">Show this to the organizer at the exit to mark your out-time.</p>
                  </div>
                )
              )}

              {/* Registration Button - Only show if not banned */}
              {!isPastEvent && !isLiveEvent && !isRegistered && !isBanned && (availableSlots > 0 || unlimitedVolunteers) && (
                <button onClick={() => setShowRegisterModal(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Register</button>
              )}
              
              {/* Status Messages */}
              {isPastEvent ? <p className="text-red-600 font-semibold">This event has ended.</p> : null}
              {hasCompletedEvent && <p className="text-green-700 font-semibold">Thank you for attending! Your attendance is complete.</p>}
              
              {/* Questionnaire Button */}
              {isPastEvent && isRegistered && !questionnaireCompleted && (
                <button onClick={() => setShowQuestionnaireModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" disabled={questionnaireSubmitting}>
                  {questionnaireSubmitting ? 'Submitting...' : 'Complete Questionnaire'}
                </button>
              )}
              {questionnaireCompleted && <p className="text-green-700 font-semibold mt-4">✅ Questionnaire completed!</p>}
              
              {/* Withdraw Button */}
              {!hasCompletedEvent && isRegistered && !registrationDetails?.inTime && (
                <button onClick={handleWithdrawRegistration} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mt-4">Withdraw Registration</button>
              )}
            </div>

            {/* Event Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p><span className="font-semibold text-gray-700">Organization:</span> {event.organization?.name || "N/A"}</p>
                <p><span className="font-semibold text-gray-700">Location:</span> {event.location}</p>
                <p><span className="font-semibold text-gray-700">Timing:</span> {`(${format(new Date(event.startDateTime), 'hh:mm a, d MMM yyyy')}) — (${format(new Date(event.endDateTime), 'hh:mm a, d MMM yyyy')})`}</p>
                <p><span className="font-semibold text-gray-700">Type:</span> {event.eventType || "Not specified"}</p>
                <p><span className="font-semibold text-gray-700">Volunteer Slots:</span> <span className={slotColor}>{slotMessage}</span></p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Description:</h3>
                <p className="text-gray-700 mt-1">{event.description}</p>
              </div>
            </div>

            {/* Map Location */}
            {event.mapLocation?.lat && event.mapLocation?.lng && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Event Location Map</h3>
                <StaticMap 
                  key={`${event.mapLocation.lat}-${event.mapLocation.lng}-${event.mapLocation.address}`}
                  lat={event.mapLocation.lat} 
                  lng={event.mapLocation.lng} 
                />
                {event.mapLocation.address && <p className="text-gray-600 mt-2 text-sm">{event.mapLocation.address}</p>}
              </div>
            )}
            
            {/* Logistics Section */}
            <div className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold text-blue-700 mb-3">Volunteer Logistics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
                <p><span className="font-semibold">Water Provided:</span> {event.waterProvided ? "Yes" : "No"}</p>
                <p><span className="font-semibold">Medical Support:</span> {event.medicalSupport ? "Yes" : "No"}</p>
                <p><span className="font-semibold">Precautions:</span> {event.precautions || "None"}</p>
                <p><span className="font-semibold">Instructions:</span> {event.instructions || "None"}</p>
              </div>
            </div>

            {/* AI Summary */}
            <div className="mt-8 p-6 bg-yellow-50 border-l-4 border-yellow-400 rounded shadow">
              <h2 className="text-xl font-bold text-yellow-700 mb-2">AI Event Summary</h2>
              {event.summary?.trim() ? (
                <p className="text-gray-800 whitespace-pre-line">{event.summary}</p>
              ) : (
                <p className="italic text-gray-500">Generating AI summary...</p>
              )}
            </div>

            {/* AI Report */}
            {isPastEvent && isRegistered && (
              <div className="mt-8 p-8 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-green-800 mb-6 text-center">AI Event Report</h2>
                {reportLoading ? (
                  <div className="flex items-center justify-center text-gray-600 py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-3"></div>
                    Checking for available report...
                  </div>
                ) : eventReport ? (
                  <div className="flex justify-center gap-4">
                    <button onClick={handleViewReport} className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md hover:shadow-lg">
                      📄 View Report
                    </button>
                    <button onClick={handleDownloadReport} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg">
                      📥 Download PDF
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-gray-600 py-8">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-lg">No report available yet.</p>
                    <p className="text-sm text-gray-500 mt-1">Reports are generated after event completion and questionnaire submission.</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Comments Section */}
            {isPastEvent && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">Volunteer Feedback & Comments</h3>
                  <button
                    onClick={() => {
                      setShowComments(!showComments);
                      if (!showComments && comments.length === 0) {
                        fetchComments();
                      }
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                  >
                    {showComments ? 'Hide Comments' : 'Show Comments'}
                  </button>
                </div>
                
                {showComments && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    {commentsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        <span className="ml-3 text-gray-600">Loading comments...</span>
                      </div>
                    ) : comments.length > 0 ? (
                      <div className="space-y-4">
                        {comments.map((comment, index) => (
                          <div key={comment._id || index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                            <div className="flex items-start space-x-3">
                              <CommentAvatarAndName comment={comment} />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <span
                                    className="text-sm text-gray-500"
                                  >
                                    {format(new Date(comment.submittedAt), 'dd/MM/yyyy HH:mm')}
                                  </span>
                                </div>
                                <p className="text-gray-700 leading-relaxed">{comment.comment}</p>
                              </div>
                            </div>
                          </div>
                        ))}

                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-500 mb-2">💬</div>
                        <p className="text-gray-600">No volunteer feedback available yet.</p>
                        <p className="text-sm text-gray-500 mt-1">Comments will appear here once volunteers complete their questionnaires.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Image Carousel */}
            {hasImages && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold text-blue-700 mb-2 text-center">Event Images</h2>
                <div className="relative w-full max-w-4xl mx-auto bg-gray-100 flex items-center justify-center rounded-lg shadow-lg" style={{ minHeight: '420px', maxHeight: '520px' }}>
                  <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-blue-700 rounded-full shadow p-2 z-10">&#8592;</button>
                  <img src={`${imageBaseUrl}${images[carouselIndex]}`} alt={`Event ${carouselIndex + 1}`} className="max-h-[420px] aspect-video rounded-lg border-4 border-white shadow-lg object-contain bg-white" style={{ maxWidth: '95%' }} />
                  <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-blue-700 rounded-full shadow p-2 z-10">&#8594;</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* --- MODALS & OVERLAYS --- */}
      
      {event && <EventChatbox eventId={event._id} currentUser={user} />}

              <VolunteerRegisterModal open={showRegisterModal} onClose={() => setShowRegisterModal(false)} volunteer={user} onSubmit={handleRegistrationSubmit} event={event} />
      
      <VolunteerQuestionnaireModal open={showQuestionnaireModal} onClose={() => setShowQuestionnaireModal(false)} eventType={event?.eventType} onSubmit={handleQuestionnaireSubmit} />
      
      {/* Loader for certificate generation */}
      {isGeneratingCertificate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg font-semibold text-blue-700">Generating certificate...</span>
          </div>
        </div>
      )}

      {/* FIX: Report Modal is now correctly placed outside other conditional blocks */}
      {showReportModal && eventReport && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b bg-gradient-to-r from-green-50 to-blue-50 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Event Report: {event.title}</h2>
              <div className="flex gap-3">
                <button onClick={handleDownloadReport} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                  📥 Download PDF
                </button>
                <button onClick={() => setShowReportModal(false)} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-md">
                  ✕ Close
                </button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto bg-gray-50">
              <div 
                className="prose prose-lg max-w-none bg-white p-8 rounded-lg shadow-sm"
                style={{
                  fontFamily: 'Georgia, serif',
                  lineHeight: '1.8',
                  color: '#2c3e50',
                  fontSize: '16px'
                }}
                dangerouslySetInnerHTML={{ 
                  __html: `
                    <style>
                      .report-content h1 { text-align: center; margin-top: 2rem; margin-bottom: 1.5rem; }
                      .report-content h2 { margin-top: 1.5rem; margin-bottom: 1rem; }
                      .report-content h3 { margin-top: 1.25rem; margin-bottom: 0.75rem; }
                      .report-content p { margin-bottom: 1rem; text-align: justify; }
                      .report-content ul { margin-bottom: 1rem; }
                      .report-content li { margin-bottom: 0.5rem; }
                      .report-content strong { color: #1a365d; }
                      .report-content em { color: #4a5568; }
                    </style>
                    <div class="report-content">
                      ${formatReportContent(eventReport.report.content)}
                    </div>
                  `
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}