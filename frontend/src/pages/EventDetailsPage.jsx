// src/pages/EventDetailsPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import { joinAsOrganizer, getOrganizerTeam, getFullOrganizerTeam } from "../api/event";
import { getVolunteersForEvent } from "../api/registration";
import { io } from "socket.io-client";

import EventChatbox from '../components/chat/EventChatbox';
import StaticMap from '../components/event/StaticMap'; // Import the new component
import { format } from "date-fns";
import useEventSlots from '../hooks/useEventSlots';
import EventQuestionnaireModal from "../components/event/EventQuestionnaireModal";
import { checkReportEligibility, generateEventReport } from "../utils/reportUtils";
import { addEventToCalendar, downloadCalendarFile, addToWebsiteCalendar, removeFromWebsiteCalendar, checkWebsiteCalendarStatus } from "../utils/calendarUtils";
import { FaCalendarPlus, FaCalendarMinus } from "react-icons/fa";
import calendarEventEmitter from "../utils/calendarEventEmitter";

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
      <img 
        src={comment.volunteer?.profileImage ? `http://localhost:5000/uploads/Profiles/${comment.volunteer.profileImage}` : '/images/default-profile.jpg'} 
        alt={comment.volunteer?.name} 
        className="w-10 h-10 rounded-full object-cover border-2 border-green-400" 
      />
      <span className="font-medium text-green-800">{comment.volunteer?.username ? `@${comment.volunteer.username}` : comment.volunteer?.name}</span>
    </div>
  );
};

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [organizerTeam, setOrganizerTeam] = useState([]);
  // For attendance, you may want to use a separate state for full team with hasAttended
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [showOrganizerTeamDrawer, setShowOrganizerTeamDrawer] = useState(false);
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  
  // Report generation states
  const [reportEligibility, setReportEligibility] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Calendar state
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState({
    isRegistered: false, isInCalendar: false, canAddToCalendar: false, canRemoveFromCalendar: false
  });
  const imageBaseUrl = "http://localhost:5000/uploads/Events/";
  const currentUser = JSON.parse(localStorage.getItem("user"));
  
  // Volunteer management states
  const [removingVolunteer, setRemovingVolunteer] = useState(false);
  const [banningVolunteer, setBanningVolunteer] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showBanConfirm, setShowBanConfirm] = useState(false);

  const isCreator = (() => {
    if (!event || !currentUser) return false;

    // Handles both string and object form of createdBy
    const createdById =
      typeof event.createdBy === "string"
        ? event.createdBy
        : event.createdBy?._id;

    return createdById?.toString() === currentUser._id;
  })();

  const isOrgAdmin = (() => {
    if (!event?.organization?.team || !currentUser) return false;

    return event.organization.team.some((member) => {
      const memberUserId =
        typeof member.userId === "string" ? member.userId : member.userId?._id;
      return memberUserId?.toString() === currentUser._id && member.isAdmin;
    });
  })();

  const isOrganizer = currentUser?.role === "organizer";
  const isTeamMember = organizerTeam.some((obj) => (obj.user && obj.user._id ? obj.user._id === currentUser?._id : false));
  const canJoinAsOrganizer = isOrganizer && !isCreator && !isTeamMember;

  const canEdit = isCreator || isOrgAdmin;

  // Volunteers Drawer state and logic (copied from VolunteerEventDetailsPage.jsx)
  const [showVolunteers, setShowVolunteers] = useState(false);
  const [volunteers, setVolunteers] = useState([]);
  const [volunteersLoading, setVolunteersLoading] = useState(false);
  // Track join request status for current user
  const [joinRequestStatus, setJoinRequestStatus] = useState(null); // 'pending', 'rejected', null
  
  // Search state
  const [organizerSearchTerm, setOrganizerSearchTerm] = useState("");
  const [volunteerSearchTerm, setVolunteerSearchTerm] = useState("");

  // Fetch volunteers for this event when drawer is opened
  const fetchVolunteers = useCallback(() => {
    if (!event?._id) return;
    setVolunteersLoading(true);
    getVolunteersForEvent(event._id)
      .then(data => {
        setVolunteers(data);
        setVolunteersLoading(false);
      })
      .catch(() => setVolunteersLoading(false));
  }, [event?._id]);

  // Socket connection for real-time updates (slots, etc.)
  useEffect(() => {
    const socket = io('http://localhost:5000', {
      auth: { token: localStorage.getItem('token') }
    });
    
    socket.on('connect', () => {
      // Join event-specific rooms for real-time updates
      if (event?._id) {
        socket.emit('joinEventSlotsRoom', event._id);
        socket.emit('join', `event_${event._id}`);
      }
    });

    // Listen for volunteer removal/ban events
    socket.on('volunteerRemoved', ({ volunteerId, eventId }) => {
      if (eventId === event?._id) {
        setVolunteers(prev => prev.filter(v => v._id !== volunteerId));
      }
    });

    socket.on('volunteerBanned', ({ volunteerId, eventId }) => {
      if (eventId === event?._id) {
        setVolunteers(prev => prev.filter(v => v._id !== volunteerId));
      }
    });
    
    return () => {
      if (event?._id) {
        socket.emit('leaveEventSlotsRoom', event._id);
        socket.emit('leave', `event_${event._id}`);
      }
      socket.disconnect();
    };
  }, [event?._id]);

  // Always use event.organizerTeam for displaying the team
  const fetchAndSetEvent = async () => {
    try {
      const res = await axiosInstance.get(`/api/events/${id}`);
      setEvent(res.data);
      setOrganizerTeam(res.data.organizerTeam || []);
      // Check join request status for current user
      if (res.data.organizerJoinRequests && currentUser) {
        const reqObj = res.data.organizerJoinRequests.find(r => r.user === currentUser._id || (r.user && r.user._id === currentUser._id));
        if (reqObj) setJoinRequestStatus(reqObj.status);
        else setJoinRequestStatus(null);
      } else {
        setJoinRequestStatus(null);
      }
    } catch (err) {
      setError("Event not found or failed to load.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAndSetEvent();
  }, [id]);

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

  // Check report eligibility when event loads
  useEffect(() => {
    if (event && isCreator) {
      checkEligibility();
    }
  }, [event, isCreator]);

  // Check calendar status
  useEffect(() => {
    const checkCalendarStatus = async () => {
      if (!currentUser?._id || !event?._id) return;
      
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
  }, [event?._id, currentUser?._id]);

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

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      await axiosInstance.delete(`/api/events/${id}`);
      alert("Event deleted successfully.");
      navigate(-1); // or navigate('/your-organizations') if you prefer
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Failed to delete event.");
    }
  };

  const handleJoinAsOrganizer = async () => {
    setJoining(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      await joinAsOrganizer(id);
      setJoinSuccess("You have joined as an organizer!");
      await fetchAndSetEvent();
    } catch (err) {
      setJoinError(err?.response?.data?.message || "Failed to join as organizer.");
    } finally {
      setJoining(false);
    }
  };

  // Handler to leave as organizer
  const handleLeaveAsOrganizer = async () => {
    if (!event || !event._id) return;
    if (!window.confirm('Are you sure you want to leave as an organizer for this event?')) return;
    try {
      await axiosInstance.post(`/api/events/${event._id}/leave-organizer`);
      await fetchAndSetEvent();
      // Clear join request status for this user after leaving
      setJoinRequestStatus(null);
      alert('You have left as an organizer for this event.');
    } catch (err) {
      alert('Failed to leave as organizer.');
    }
  };

  // Handler to send join request as organizer
  const handleRequestJoinAsOrganizer = async () => {
    setJoining(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      await axiosInstance.post(`/api/events/${id}/request-join-organizer`);
      await fetchAndSetEvent(); // Always fetch latest status from backend after reapply
      // Do not set joinSuccess here; rely on joinRequestStatus for UI
    } catch (err) {
      setJoinError(err?.response?.data?.message || "Failed to send join request.");
    } finally {
      setJoining(false);
    }
  };

  // Handler for creator to approve a join request
  const handleApproveJoinRequest = async (userId) => {
    try {
      await axiosInstance.post(`/api/events/${id}/approve-join-request`, { userId });
      await fetchAndSetEvent();
    } catch (err) {
      alert('Failed to approve join request.');
    }
  };

  // Handler for creator to reject a join request
  const handleRejectJoinRequest = async (userId) => {
    try {
      await axiosInstance.post(`/api/events/${id}/reject-join-request`, { userId });
      await fetchAndSetEvent();
    } catch (err) {
      alert('Failed to reject join request.');
    }
  };

  // Handler to withdraw join request
  const handleWithdrawJoinRequest = async () => {
    setJoining(true);
    setJoinError("");
    try {
      await axiosInstance.post(`/api/events/${id}/withdraw-join-request`);
      await fetchAndSetEvent();
    } catch (err) {
      setJoinError(err?.response?.data?.message || "Failed to withdraw join request.");
    } finally {
      setJoining(false);
    }
  };

  // Helper: check if user has a rejected request (even if not pending)
  const hasRejectedRequest = event?.organizerJoinRequests?.some(r => {
    const userId = r.user?._id || r.user;
    return userId === currentUser?._id && (r.status === 'rejected' || r._wasRejected);
  });

  // Use the new hook for live slot info
  const { availableSlots, maxVolunteers, unlimitedVolunteers, loading: slotsLoading } = useEventSlots(id);

  // Volunteer slots filled display
  let slotMessage = '';
  if (slotsLoading) {
    slotMessage = 'Loading slots...';
  } else if (unlimitedVolunteers) {
    slotMessage = 'Unlimited slots';
  } else if (typeof availableSlots === 'number' && typeof maxVolunteers === 'number') {
    const filled = maxVolunteers - availableSlots;
    slotMessage = `${filled}/${maxVolunteers} slots filled`;
  }

  // Check if event is in the past
  const isPastEvent = event && event.endDateTime ? new Date(event.endDateTime) < new Date() : false;
  // Updated handler to support media files
  const handleQuestionnaireSubmit = async (answers, mediaFiles, awards) => {
    try {
      const formData = new FormData();
      formData.append('answers', JSON.stringify(answers));
      // Always send awards, even if it's empty
      formData.append('awards', JSON.stringify(awards || {}));
      if (mediaFiles && mediaFiles.length > 0) {
        mediaFiles.forEach((file, idx) => {
          formData.append('media', file);
        });
      }
      await axiosInstance.post(`/api/events/${event._id}/complete-questionnaire`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Wait 1 second before refetching to ensure certificates are saved
      setTimeout(async () => {
        await fetchAndSetEvent();
        setShowQuestionnaireModal(false);
      }, 1000);
    } catch (err) {
      alert("Failed to submit questionnaire.");
    }
  };

  // Find the current user's organizerTeam object
  const myOrganizerObj = organizerTeam.find(obj => obj.user && obj.user._id === currentUser?._id);
  const myQuestionnaireCompleted = myOrganizerObj?.questionnaire?.completed;
  const isPast = event && new Date() > new Date(event.endDateTime);

  // Find the current user's certificate assignment (if any)
  const myCertificateAssignment = event?.certificates?.find(
    cert => {
      // Check if the certificate is for the current user
      const certUserId = cert.user?._id || cert.user;
      return certUserId === currentUser?._id;
    }
  );
  
  // Check if user is eligible to generate certificate (for organizers, not creators)
  const canGenerateCertificate = isPast && 
    isTeamMember && 
    !isCreator && // Only non-creator organizers can generate certificates
    myQuestionnaireCompleted && 
    myCertificateAssignment && 
    myCertificateAssignment.role === 'organizer' &&
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
      setOrganizerTeam(updatedEvent.data.organizerTeam || []);
      
      // Force a re-render by updating state
      setForceRefresh(prev => prev + 1);
      
      alert('Certificate generated successfully! You can now download it.');
    } catch (err) {
      console.error('Certificate generation error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to generate certificate. Please try again.';
      alert(errorMessage);
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  // Combine volunteers and organizerTeam user objects for award selection
  const allParticipants = [
    ...volunteers,
    ...organizerTeam.map(obj => obj.user)
  ].filter((u, idx, arr) => u && arr.findIndex(x => x._id === u._id) === idx);

  // Use only volunteers for award selection
  const awardParticipants = volunteers;

  // Prepare separate arrays for volunteers and organizers
  const volunteerParticipants = volunteers;
  const organizerParticipants = organizerTeam.map(obj => obj.user).filter(u => u && u._id !== currentUser?._id); // Exclude creator from organizer awards

  // Handler to open questionnaire modal, refetch volunteers if empty
  const handleOpenQuestionnaireModal = () => {
    if (volunteers.length === 0) {
      fetchVolunteers();
    }
    setShowQuestionnaireModal(true);
  };

  // Check report eligibility
  const checkEligibility = async () => {
    if (!event?._id) return;
    
    const result = await checkReportEligibility(event._id);
    if (result.success) {
      setReportEligibility(result.data);
    } else {
      console.error('Failed to check eligibility:', result.error);
    }
  };

  // Handle report generation
  const handleGenerateReport = async () => {
    if (!event?._id) return;
    
    setGeneratingReport(true);
    setReportError("");
    
    const result = await generateEventReport(event._id);
    
    if (result.success) {
      const message = result.data.isUpdate ? 'Report updated successfully!' : 'Report generated successfully!';
      alert(message);
      // Refresh event data to get the updated report
      fetchAndSetEvent();
      // Refresh eligibility to update UI
      checkEligibility();
    } else {
      setReportError(result.error);
      const action = reportEligibility?.reportGenerated ? 'update' : 'generate';
      alert(`Failed to ${action} report: ${result.error}`);
    }
    
    setGeneratingReport(false);
  };

  // Calendar functions
  const handleAddToCalendar = () => {
    const result = addEventToCalendar(event);
    if (result.success) {
      console.log(result.message);
    } else {
      console.error(result.message);
    }
  };

  const handleDownloadCalendar = () => {
    const result = downloadCalendarFile(event);
    if (result.success) {
      console.log(result.message);
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
        console.log(result.message);
      } else { console.error(result.message); }
    } catch (error) { console.error('Error adding to website calendar:', error); }
  };

  const handleRemoveFromWebsiteCalendar = async () => {
    try {
      const result = await removeFromWebsiteCalendar(event._id);
      if (result.success) {
        const statusResult = await checkWebsiteCalendarStatus(event._id);
        if (statusResult.success) setCalendarStatus(statusResult.data);
        console.log(result.message);
      } else { console.error(result.message); }
    } catch (error) { console.error('Error removing from website calendar:', error); }
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

  // Handle volunteer removal
  const handleRemoveVolunteer = async (volunteerId) => {
    if (!event?._id) return;
    
    setRemovingVolunteer(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/remove-volunteer`, {
        volunteerId: volunteerId
      });
      
      // Remove from local state
      setVolunteers(prev => prev.filter(v => v._id !== volunteerId));
      setShowRemoveConfirm(false);
      setSelectedVolunteer(null);
      
      alert('Volunteer removed successfully!');
    } catch (err) {
      console.error('Failed to remove volunteer:', err);
      alert(err.response?.data?.message || 'Failed to remove volunteer');
    } finally {
      setRemovingVolunteer(false);
    }
  };

  // Handle volunteer ban
  const handleBanVolunteer = async (volunteerId) => {
    if (!event?._id) return;
    
    setBanningVolunteer(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/ban-volunteer`, {
        volunteerId: volunteerId
      });
      
      // Remove from local state
      setVolunteers(prev => prev.filter(v => v._id !== volunteerId));
      setShowBanConfirm(false);
      setSelectedVolunteer(null);
      
      alert('Volunteer banned successfully!');
    } catch (err) {
      console.error('Failed to ban volunteer:', err);
      alert(err.response?.data?.message || 'Failed to ban volunteer');
    } finally {
      setBanningVolunteer(false);
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

  return (
    <div className="min-h-screen bg-gray-50 pb-12 relative">
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
              .filter((obj) => {
                if (!obj.user || !obj.user._id) return false;
                const user = obj.user;
                const displayName = user.username || user.name || '';
                return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
              })
              .map((obj) => {
                const user = obj.user;
                const isCreator = user._id === event.createdBy._id;
                const displayName = user.username || user.name || 'User';
                const displayText = user.username ? `@${user.username}` : displayName;
                return (
                  <div
                    key={user._id}
                    className={`flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition cursor-pointer hover:bg-blue-50 mb-2 ${isCreator ? 'border-2 border-yellow-500 bg-yellow-50' : ''}`}
                    onClick={() => navigate(`/organizer/${user._id}`)}
                  >
                    <img
                      src={user.profileImage ? `http://localhost:5000/uploads/Profiles/${user.profileImage}` : '/images/default-profile.jpg'}
                      alt={displayName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-blue-400 mr-4"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-blue-800 text-lg">{displayText}</span>
                      {user.username && user.name && (
                        <span className="text-sm text-gray-600">{user.name}</span>
                      )}
                    </div>
                    {isCreator && (
                      <span className="ml-3 px-2 py-1 bg-yellow-400 text-white text-xs rounded font-bold">Creator</span>
                    )}
                  </div>
                );
              })
            }
            {organizerTeam.filter(obj => {
              if (!obj.user?._id) return false;
              const user = obj.user;
              const displayName = user.username || user.name || '';
              return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
            }).length === 0 && organizerSearchTerm && (
              <div className="text-gray-500 text-center py-4">No organizers found matching "{organizerSearchTerm}"</div>
            )}
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
              <div>Loading volunteers...</div>
            ) : volunteers.length === 0 ? (
              <div className="text-gray-500">No volunteers registered.</div>
            ) : (
              volunteers
                .filter(vol => {
                  const displayName = vol.username || vol.name || '';
                  return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
                })
                .map((vol) => {
                  const displayName = vol.username || vol.name || 'User';
                  const displayText = vol.username ? `@${vol.username}` : displayName;
                  return (
                    <div
                      key={vol._id}
                      className="flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition hover:bg-green-50"
                    >
                      <div 
                        className="flex items-center flex-1 cursor-pointer"
                        onClick={() => navigate(`/volunteer/${vol._id}`)}
                      >
                        <img
                          src={vol.profileImage ? `http://localhost:5000/uploads/Profiles/${vol.profileImage}` : '/images/default-profile.jpg'}
                          alt={displayName}
                          className="w-14 h-14 rounded-full object-cover border-2 border-green-400 mr-4"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-green-800 text-lg">{displayText}</span>
                          {vol.username && vol.name && (
                            <span className="text-sm text-gray-600">{vol.name}</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 ml-2">
                        {/* Remove button - available to all organizers */}
                        {(isCreator || isTeamMember) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVolunteer(vol);
                              setShowRemoveConfirm(true);
                            }}
                            className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600 transition-colors"
                            disabled={removingVolunteer}
                          >
                            Remove
                          </button>
                        )}
                        
                        {/* Ban button - only available to creator */}
                        {isCreator && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVolunteer(vol);
                              setShowBanConfirm(true);
                            }}
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                            disabled={banningVolunteer}
                          >
                            Ban
                          </button>
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
      )}
      <div className="pt-24 max-w-5xl mx-auto px-4">
        <button
          className="mb-4 text-blue-600 underline"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        {/* Show event ended message if completed */}
        {isPastEvent && (
          <div className="text-red-600 font-semibold mb-4">This event has ended</div>
        )}
        {(canEdit || isTeamMember) && (
          <div className="mt-6 flex gap-4">
            {canEdit && (
              <>
                <button
                  onClick={() => navigate(`/events/${id}/edit`)}
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                >
                  ✏️ Edit Event
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  🗑️ Delete Event
                </button>
              </>
            )}
            <button
              className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
              onClick={() => navigate(`/events/${id}/attendance`)}
            >
              📋 Manage Attendance
            </button>
          </div>
        )}
        {/* Only show join as organizer buttons if event is not completed */}
        {!isPastEvent && canJoinAsOrganizer && joinRequestStatus !== 'pending' && hasRejectedRequest && !joining && (
          <div className="mb-4">
            <div className="text-red-700 font-semibold mb-2">Join request rejected</div>
            <button
              onClick={handleRequestJoinAsOrganizer}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              disabled={joining}
            >
              {joining ? "Reapplying..." : "Reapply as Organizer"}
            </button>
          </div>
        )}
        {!isPastEvent && canJoinAsOrganizer && joinRequestStatus !== 'pending' && !hasRejectedRequest && (
          <button
            onClick={handleRequestJoinAsOrganizer}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
            disabled={joining}
          >
            {joining ? "Requesting..." : "Join as Organizer"}
          </button>
        )}
        {/* Only show one status/button at a time */}
        {!isPastEvent && canJoinAsOrganizer && joinRequestStatus === 'pending' && (
          <div className="mb-4 flex items-center gap-4">
            <span className="text-blue-700 font-semibold">Join request sent (awaiting approval)</span>
            <button
              onClick={handleWithdrawJoinRequest}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              disabled={joining}
            >
              {joining ? "Withdrawing..." : "Withdraw Request"}
            </button>
          </div>
        )}
        {!isPastEvent && canJoinAsOrganizer && joinRequestStatus === 'rejected' && joining && (
          <div className="text-blue-700 font-semibold mb-4">Reapplying...</div>
        )}
        {/* Show pending join requests to creator */}
        {isCreator && event && event.organizerJoinRequests && event.organizerJoinRequests.length > 0 && (
          <div className="my-6">
            <h3 className="text-lg font-bold text-blue-700 mb-2">Pending Organizer Join Requests</h3>
            <ul>
              {event.organizerJoinRequests.filter(r => r.status === 'pending').map(r => {
                const user = r.user;
                const userId = user._id || user;
                const name = user.username ? `@${user.username}` : user.name || user.email || userId;
                const profileImage = user.profileImage ? `http://localhost:5000/uploads/Profiles/${user.profileImage}` : '/images/default-profile.jpg';
                return (
                  <li key={userId} className="flex items-center gap-4 mb-2">
                    <img src={profileImage} alt={name} className="w-10 h-10 rounded-full object-cover border" />
                    <span
                      className="font-medium text-blue-700 underline cursor-pointer"
                      onClick={() => navigate(`/organizer/${userId}`)}
                    >
                      {name}
                    </span>
                    <button
                      className="bg-green-600 text-white px-2 py-1 rounded text-sm"
                      onClick={() => handleApproveJoinRequest(userId)}
                    >Approve</button>
                    <button
                      className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                      onClick={() => handleRejectJoinRequest(userId)}
                    >Reject</button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {/* Show Leave as Organizer button only if user is in organizerTeam and not the creator */}
        {isTeamMember && !isCreator && (
          <button
            onClick={handleLeaveAsOrganizer}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mb-4"
          >
            Leave as Organizer
          </button>
        )}
        {joinError && <p className="text-red-600 mb-2">{joinError}</p>}
        {/* Remove joinSuccess message; rely on status UI only */}
        <div className="flex justify-between items-start mb-3">
          <h1 className="text-3xl font-bold text-blue-800">{event.title}</h1>
          
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
                {calendarStatus.isOrganizerEvent && (
                  <div className="px-3 py-2 text-sm text-gray-500 italic">
                    Organizer events are automatically in calendar
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
        <p className="text-gray-700 mb-4">{event.description}</p>

        {/* --- MAP & LOCATION SECTION --- */}
        {event.mapLocation && event.mapLocation.lat && event.mapLocation.lng && (
          <div className="my-6">
            <h2 className="text-xl font-semibold text-blue-700 mb-2">Event Location</h2>
            <StaticMap lat={event.mapLocation.lat} lng={event.mapLocation.lng} />
            {event.mapLocation.address && (
              <p className="text-gray-600 mt-2">{event.mapLocation.address}</p>
            )}
          </div>
        )}
        {/* --- END MAP & LOCATION SECTION --- */}

        <div className="mb-4">
          <strong>Location:</strong> {event.location}
        </div>
        <div className="mb-4">
          <strong>Timing:</strong>{" "}
          {event && event.startDateTime && event.endDateTime ?
            `(${format(new Date(event.startDateTime), 'hh:mm a, d MMMM yyyy')}) — (${format(new Date(event.endDateTime), 'hh:mm a, d MMMM yyyy')})`
            : ''}
        </div>
        <div className="mb-4">
          <strong>Type:</strong> {event.eventType || "Not specified"}
        </div>
        <div className="mb-4">
          <strong>Volunteer Slots:</strong>{' '}
          {slotMessage}
        </div>

        {event.groupRegistration && (
          <p className="text-sm text-green-700 mb-2">
            Group Registration Enabled
          </p>
        )}

        {event.recurringEvent && (
          <p className="text-sm text-indigo-700 mb-2">
            Recurs {event.recurringType} on {event.recurringValue}
          </p>
        )}

        <div className="mb-4">
          <strong>Instructions:</strong>
          <p>{event.instructions || "None"}</p>
        </div>

        {event.equipmentNeeded?.length > 0 && (
          <div className="mb-4">
            <strong>Equipment Needed:</strong>{" "}
            <ul className="list-disc list-inside">
              {event.equipmentNeeded.map((eq, i) => (
                <li key={i}>{eq}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Questionnaire details */}
        <div className="border-t pt-4 mt-4">
          <h2 className="text-xl font-semibold text-blue-700 mb-3">
            Volunteer Logistics
          </h2>
          <p>
            <strong>Drinking Water:</strong>{" "}
            {event.waterProvided ? "Yes" : "No"}
          </p>
          <p>
            <strong>Medical Support:</strong>{" "}
            {event.medicalSupport ? "Yes" : "No"}
          </p>
          <p>
            <strong>Recommended Age Group:</strong>{" "}
            {event.ageGroup || "Not specified"}
          </p>
          <p>
            <strong>Special Precautions:</strong> {event.precautions || "None"}
          </p>
          <p>
            <strong>Public Transport:</strong>{" "}
            {event.publicTransport || "Not mentioned"}
          </p>
          <p>
            <strong>Contact Person:</strong>{" "}
            {event.contactPerson || "Not listed"}
          </p>
        </div>

        {/* Uploaded files */}
        {event.eventImages?.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-blue-700 mb-2">
              Event Images
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {event.eventImages.map((img, idx) => (
                <img
                  key={img + '-' + idx}
                  src={`${imageBaseUrl}${img}`}
                  alt="Event"
                  className="w-full max-w-md rounded shadow my-2"
                />
              ))}
            </div>
          </div>
        )}

        {/* AI Summary Section */}
        <div className="mt-8 mb-8 p-6 bg-yellow-50 border-l-4 border-yellow-400 rounded shadow">
          <h2 className="text-xl font-bold text-yellow-700 mb-2">AI Event Summary</h2>
          {event.summary && event.summary.trim() ? (
            <p className="text-gray-800 whitespace-pre-line">{event.summary}</p>
          ) : (
            <p className="italic text-gray-500">Generating AI summary...</p>
          )}
        </div>

        {/* AI Report Generation Section - Only for creator of past events */}
        {isCreator && isPast && (
          <div className="mt-8 mb-8 p-6 bg-blue-50 border-l-4 border-blue-400 rounded shadow">
            <h2 className="text-xl font-bold text-blue-700 mb-4">AI Event Report</h2>
            
            {reportEligibility && (
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white p-4 rounded shadow">
                    <h3 className="font-semibold text-gray-700 mb-2">Organizer Questionnaires</h3>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${
                        reportEligibility.organizerCompletionRate >= 50 ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span>{reportEligibility.completedOrganizerQuestionnaires}/{reportEligibility.totalOrganizers} completed ({reportEligibility.organizerCompletionRate}%)</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded shadow">
                    <h3 className="font-semibold text-gray-700 mb-2">Volunteer Questionnaires</h3>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${
                        reportEligibility.volunteerCompletionRate >= 50 ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span>{reportEligibility.completedVolunteerQuestionnaires}/{reportEligibility.totalVolunteers} completed ({reportEligibility.volunteerCompletionRate}%)</span>
                    </div>
                  </div>
                </div>
                
                {reportEligibility.reportGenerated ? (
                  <div>
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                      ✅ Report has been generated successfully!
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          // View report functionality for creator
                          if (event?.report?.content) {
                            const reportWindow = window.open('', '_blank');
                            const htmlContent = `
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <title>Event Report: ${event.title}</title>
                                <style>
                                  body {
                                    font-family: 'Times New Roman', serif;
                                    line-height: 1.8;
                                    color: #2c3e50;
                                    max-width: 900px;
                                    margin: 0 auto;
                                    padding: 40px;
                                    background: #ffffff;
                                  }
                                  .report-header {
                                    text-align: center;
                                    border-bottom: 3px solid #2c5530;
                                    padding-bottom: 20px;
                                    margin-bottom: 40px;
                                  }
                                  .report-title {
                                    font-size: 32px;
                                    font-weight: bold;
                                    color: #2c5530;
                                    margin-bottom: 10px;
                                    text-transform: uppercase;
                                    letter-spacing: 1px;
                                  }
                                  .report-subtitle {
                                    font-size: 18px;
                                    color: #7f8c8d;
                                    font-style: italic;
                                  }
                                  h1 {
                                    font-size: 28px;
                                    color: #2c5530;
                                    border-bottom: 2px solid #4CAF50;
                                    padding-bottom: 10px;
                                    margin-top: 40px;
                                    margin-bottom: 20px;
                                    font-weight: bold;
                                    text-transform: uppercase;
                                    letter-spacing: 0.5px;
                                  }
                                  h2 {
                                    font-size: 22px;
                                    color: #34495e;
                                    border-left: 5px solid #4CAF50;
                                    padding-left: 20px;
                                    margin-top: 35px;
                                    margin-bottom: 15px;
                                    font-weight: bold;
                                    background: #f8f9fa;
                                    padding-top: 10px;
                                    padding-bottom: 10px;
                                  }
                                  h3 {
                                    font-size: 18px;
                                    color: #1976d2;
                                    margin-top: 25px;
                                    margin-bottom: 12px;
                                    font-weight: bold;
                                    border-bottom: 1px solid #e0e0e0;
                                    padding-bottom: 5px;
                                  }
                                  p {
                                    margin-bottom: 15px;
                                    text-align: justify;
                                    text-indent: 20px;
                                  }
                                  ul, ol {
                                    margin-bottom: 15px;
                                    padding-left: 30px;
                                  }
                                  li {
                                    margin-bottom: 8px;
                                    line-height: 1.6;
                                  }
                                  .section {
                                    margin-bottom: 30px;
                                    padding: 20px;
                                    border-radius: 8px;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                  }
                                  .executive-summary {
                                    background: #e8f5e8;
                                    border-left: 5px solid #4CAF50;
                                  }
                                  .impact-section {
                                    background: #e3f2fd;
                                    border-left: 5px solid #2196F3;
                                  }
                                  .recommendations {
                                    background: #fff3e0;
                                    border-left: 5px solid #FF9800;
                                  }
                                  .conclusion {
                                    background: #f3e5f5;
                                    border-left: 5px solid #9C27B0;
                                  }
                                  strong {
                                    color: #2c5530;
                                    font-weight: bold;
                                  }
                                  em {
                                    color: #7f8c8d;
                                    font-style: italic;
                                  }
                                  .page-break {
                                    page-break-before: always;
                                  }
                                  @media print {
                                    body { font-size: 12pt; }
                                    h1 { font-size: 18pt; }
                                    h2 { font-size: 16pt; }
                                    h3 { font-size: 14pt; }
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="report-header">
                                  <div class="report-title">Event Impact Report</div>
                                  <div class="report-subtitle">${event.title}</div>
                                </div>
                                <div class="report-content">
                                  ${event.report.content
                                    .replace(/\n/g, '<br>')
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                    .replace(/# (.*?)(<br>|$)/g, '<h1>$1</h1>')
                                    .replace(/## (.*?)(<br>|$)/g, '<h2>$1</h2>')
                                    .replace(/### (.*?)(<br>|$)/g, '<h3>$1</h3>')
                                    .replace(/(Executive Summary[\s\S]*?)(?=##|$)/gi, '<div class="section executive-summary">$1</div>')
                                    .replace(/(Impact Assessment[\s\S]*?)(?=##|$)/gi, '<div class="section impact-section">$1</div>')
                                    .replace(/(Recommendations[\s\S]*?)(?=##|$)/gi, '<div class="section recommendations">$1</div>')
                                    .replace(/(Conclusion[\s\S]*?)(?=##|$)/gi, '<div class="section conclusion">$1</div>')}
                                </div>
                              </body>
                              </html>
                            `;
                            reportWindow.document.write(htmlContent);
                            reportWindow.document.close();
                          }
                        }}
                        className="px-6 py-3 bg-green-600 text-white rounded font-semibold hover:bg-green-700 transition-colors"
                      >
                        📄 View Report
                      </button>
                      <button
                        onClick={handleGenerateReport}
                        disabled={generatingReport}
                        className={`px-6 py-3 rounded font-semibold transition-colors ${
                          generatingReport
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                        }`}
                      >
                        {generatingReport ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating Report...
                          </div>
                        ) : (
                          '🔄 Update Report'
                        )}
                      </button>
                    </div>
                  </div>
                ) : reportEligibility.isEligible ? (
                  <div>
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                      ✅ Event is eligible for report generation (50%+ questionnaires completed)
                    </div>
                    <button
                      onClick={handleGenerateReport}
                      disabled={generatingReport}
                      className={`px-6 py-3 rounded font-semibold transition-colors ${
                        generatingReport
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {generatingReport ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating Report...
                        </div>
                      ) : (
                        '📊 Generate AI Report'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    ⚠️ Need 50% questionnaire completion from both organizers and volunteers to generate report
                  </div>
                )}
                
                {reportError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
                    ❌ {reportError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {event.govtApprovalLetter && (
          <a
            href={`${imageBaseUrl}${event.govtApprovalLetter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            View Govt Approval Letter
          </a>
        )}
      </div>
      
      {/* Comments Section */}
      {isPast && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Volunteer Feedback & Comments</h3>
            <button
              onClick={() => {
                setShowComments(!showComments);
                if (!showComments && comments.length === 0) {
                  fetchComments();
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              {showComments ? 'Hide Comments' : 'Show Comments'}
            </button>
          </div>
          
          {showComments && (
            <div className="bg-gray-50 rounded-lg p-6">
              {commentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                            <span className="text-sm text-gray-500">
                              {new Date(comment.submittedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
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
      
      {event && (
        <EventChatbox eventId={event._id} currentUser={currentUser} />
      )}
      {isOrganizer && isPast && myOrganizerObj && !myQuestionnaireCompleted && (
        <button
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 mb-4"
          onClick={handleOpenQuestionnaireModal}
        >
          Complete Questionnaire
        </button>
      )}
      {/* Certificate Section for Organizers */}
      {isPast && isTeamMember && !isCreator && (
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
                  {!myQuestionnaireCompleted && (
                    <span className="text-sm text-red-600">Please complete your questionnaire to generate your certificate.</span>
                  )}
                </div>
              )}
              <span className="text-gray-700">Award: <b>{myCertificateAssignment?.award}</b></span>
            </div>
          ) : (
            <div className="text-gray-600">
              {!myQuestionnaireCompleted ? (
                <span>Complete your questionnaire to be eligible for a certificate.</span>
              ) : (
                <span>Certificate not available yet. The event creator needs to assign awards.</span>
              )}
            </div>
          )}
        </div>
      )}
      {/* Loader overlay for certificate generation */}
      {isGeneratingCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span className="text-lg font-semibold text-blue-700">Generating certificate...</span>
          </div>
        </div>
      )}
      <EventQuestionnaireModal
        open={showQuestionnaireModal}
        onClose={() => setShowQuestionnaireModal(false)}
        eventType={event?.eventType}
        onSubmit={handleQuestionnaireSubmit}
        isCreator={organizerTeam.length > 0 && organizerTeam[0].user._id === currentUser?._id}
        volunteerParticipants={volunteerParticipants}
        organizerParticipants={organizerParticipants}
      />

      {/* Remove Volunteer Confirmation Modal */}
      {showRemoveConfirm && selectedVolunteer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Remove Volunteer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{selectedVolunteer.username || selectedVolunteer.name}</strong> from this event? They will be able to register again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveConfirm(false);
                  setSelectedVolunteer(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={removingVolunteer}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveVolunteer(selectedVolunteer._id)}
                className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
                disabled={removingVolunteer}
              >
                {removingVolunteer ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Volunteer Confirmation Modal */}
      {showBanConfirm && selectedVolunteer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ban Volunteer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to ban <strong>{selectedVolunteer.username || selectedVolunteer.name}</strong> from this event? They will not be able to register again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBanConfirm(false);
                  setSelectedVolunteer(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={banningVolunteer}
              >
                Cancel
              </button>
              <button
                onClick={() => handleBanVolunteer(selectedVolunteer._id)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                disabled={banningVolunteer}
              >
                {banningVolunteer ? 'Banning...' : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
