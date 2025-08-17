// src/pages/EventDetailsPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  canNavigateToUser, 
  getSafeUserId,
  getSafeUserName 
} from "../utils/safeUserUtils";
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
import { completeEvent } from "../api/recurringEvents";

// CommentAvatarAndName component
const CommentAvatarAndName = ({ comment }) => {
  const navigate = useNavigate();
  const safeVolunteer = getSafeUserData(comment.volunteer);
  const canNavigate = canNavigateToUser(comment.volunteer);
  
  const handleClick = () => {
    if (canNavigate) {
      navigate(`/volunteer/${getSafeUserId(comment.volunteer)}`);
    }
  };

  return (
    <div 
      className={`flex items-center space-x-3 p-2 rounded transition-colors ${
        canNavigate ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default opacity-75'
      }`}
      onClick={handleClick}
    >
      {getProfileImageUrl(safeVolunteer) ? (
        <img 
          src={getProfileImageUrl(safeVolunteer)} 
          alt={getSafeUserName(safeVolunteer)} 
          className="w-10 h-10 rounded-full object-cover border-2 border-green-400" 
        />
      ) : (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-green-400 ${getRoleColors(safeVolunteer.role)}`}>
          <span className="text-sm font-bold">{getAvatarInitial(safeVolunteer)}</span>
        </div>
      )}
      <span className={`font-medium ${safeVolunteer.isDeleted ? 'text-gray-600' : 'text-green-800'}`}>
        {getDisplayName(safeVolunteer)}
      </span>
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
  
  // Recurring event states
  const [completingEvent, setCompletingEvent] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const [completionSuccess, setCompletionSuccess] = useState("");

  // Organizer management states
  const [removingOrganizer, setRemovingOrganizer] = useState(false);
  const [banningOrganizer, setBanningOrganizer] = useState(false);
  const [unbanningOrganizer, setUnbanningOrganizer] = useState(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState(null);
  const [showRemoveOrganizerConfirm, setShowRemoveOrganizerConfirm] = useState(false);
  const [showBanOrganizerConfirm, setShowBanOrganizerConfirm] = useState(false);
  const [showUnbanOrganizerConfirm, setShowUnbanOrganizerConfirm] = useState(false);

  // Volunteer unban states
  const [unbanningVolunteer, setUnbanningVolunteer] = useState(false);
  const [showUnbanVolunteerConfirm, setShowUnbanVolunteerConfirm] = useState(false);

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
  const [bannedVolunteers, setBannedVolunteers] = useState([]);
  const [bannedVolunteersLoading, setBannedVolunteersLoading] = useState(false);
  const [bannedOrganizers, setBannedOrganizers] = useState([]);
  const [bannedOrganizersLoading, setBannedOrganizersLoading] = useState(false);
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

  // Fetch banned users for this event
  const fetchBannedUsers = useCallback(async () => {
    if (!event?._id) return;
    
    setBannedVolunteersLoading(true);
    setBannedOrganizersLoading(true);
    try {
      const bannedUserIds = event.bannedVolunteers || [];
      
      if (bannedUserIds.length > 0) {
        // Fetch each banned user individually
        const bannedUsersPromises = bannedUserIds.map(async (userId) => {
          try {
            const response = await axiosInstance.get(`/api/users/${userId}`);
            return response.data;
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            return null;
          }
        });
        
        const bannedUsers = (await Promise.all(bannedUsersPromises)).filter(user => user !== null);
        
        // Separate banned volunteers and organizers based on their role
        const bannedVols = bannedUsers.filter(user => user.role === 'volunteer');
        const bannedOrgs = bannedUsers.filter(user => user.role === 'organizer');
        
        setBannedVolunteers(bannedVols);
        setBannedOrganizers(bannedOrgs);
      } else {
        setBannedVolunteers([]);
        setBannedOrganizers([]);
      }
    } catch (error) {
      console.error('Error fetching banned users:', error);
      setBannedVolunteers([]);
      setBannedOrganizers([]);
    } finally {
      setBannedVolunteersLoading(false);
      setBannedOrganizersLoading(false);
    }
  }, [event?._id, event?.bannedVolunteers]);

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

    // Listen for organizer removal/ban events
    socket.on('organizerRemoved', ({ organizerId, eventId }) => {
      if (eventId === event?._id) {
        setOrganizerTeam(prev => prev.filter(obj => obj.user._id !== organizerId));
      }
    });

    socket.on('organizerBanned', ({ organizerId, eventId }) => {
      if (eventId === event?._id) {
        setOrganizerTeam(prev => prev.filter(obj => obj.user._id !== organizerId));
      }
    });

    // Listen for unban events
    socket.on('volunteerUnbanned', ({ volunteerId, eventId }) => {
      if (eventId === event?._id) {
        // Remove from banned volunteers and refresh banned users
        setBannedVolunteers(prev => prev.filter(v => v._id !== volunteerId));
        fetchBannedUsers();
      }
    });

    socket.on('organizerUnbanned', ({ organizerId, eventId }) => {
      if (eventId === event?._id) {
        // Remove from banned organizers and refresh banned users
        setBannedOrganizers(prev => prev.filter(o => o._id !== organizerId));
        fetchBannedUsers();
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
  // Handle event completion for recurring events
  const handleCompleteEvent = async () => {
    if (!event?._id) return;
    
    if (!window.confirm("Are you sure you want to complete this event? This will create the next instance if it's a recurring event.")) {
      return;
    }

    try {
      setCompletingEvent(true);
      setCompletionError("");
      setCompletionSuccess("");

      const response = await completeEvent(event._id);
      
      if (response.success) {
        setCompletionSuccess(response.message);
        // Refresh event data
        await fetchAndSetEvent();
        
        // If next instance was created, show info
        if (response.nextInstance) {
          setTimeout(() => {
            alert(`Event completed successfully! Next instance created: ${response.nextInstance.title}`);
          }, 1000);
        }
      } else {
        setCompletionError(response.message || "Failed to complete event");
      }
    } catch (error) {
      console.error("Error completing event:", error);
      setCompletionError("Failed to complete event");
    } finally {
      setCompletingEvent(false);
    }
  };

  // Handle organizer removal
  const handleRemoveOrganizer = async (organizerId) => {
    if (!event?._id) return;
    
    setRemovingOrganizer(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/remove-organizer`, {
        organizerId: organizerId
      });
      
      // Remove from local state
      setOrganizerTeam(prev => prev.filter(obj => obj.user._id !== organizerId));
      setShowRemoveOrganizerConfirm(false);
      setSelectedOrganizer(null);
      
      alert('Organizer removed successfully!');
    } catch (err) {
      console.error('Failed to remove organizer:', err);
      alert(err.response?.data?.message || 'Failed to remove organizer');
    } finally {
      setRemovingOrganizer(false);
    }
  };

  // Handle organizer ban
  const handleBanOrganizer = async (organizerId) => {
    if (!event?._id) return;
    
    setBanningOrganizer(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/ban-organizer`, {
        organizerId: organizerId
      });
      
      // Remove from local state
      setOrganizerTeam(prev => prev.filter(obj => obj.user._id !== organizerId));
      setShowBanOrganizerConfirm(false);
      setSelectedOrganizer(null);
      
      alert('Organizer banned successfully!');
    } catch (err) {
      console.error('Failed to ban organizer:', err);
      alert(err.response?.data?.message || 'Failed to ban organizer');
    } finally {
      setBanningOrganizer(false);
    }
  };

  // Handle volunteer unban
  const handleUnbanVolunteer = async (volunteerId) => {
    if (!event?._id) return;
    
    setUnbanningVolunteer(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/unban-volunteer`, {
        volunteerId: volunteerId
      });
      
      // Remove from local state
      setBannedVolunteers(prev => prev.filter(v => v._id !== volunteerId));
      setShowUnbanVolunteerConfirm(false);
      setSelectedVolunteer(null);
      
      alert('Volunteer unbanned successfully!');
    } catch (err) {
      console.error('Failed to unban volunteer:', err);
      alert(err.response?.data?.message || 'Failed to unban volunteer');
    } finally {
      setUnbanningVolunteer(false);
    }
  };

  // Handle organizer unban
  const handleUnbanOrganizer = async (organizerId) => {
    if (!event?._id) return;
    
    setUnbanningOrganizer(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/unban-organizer`, {
        organizerId: organizerId
      });
      
      // Remove from local state
      setBannedOrganizers(prev => prev.filter(o => o._id !== organizerId));
      setShowUnbanOrganizerConfirm(false);
      setSelectedOrganizer(null);
      
      alert('Organizer unbanned successfully!');
    } catch (err) {
      console.error('Failed to unban organizer:', err);
      alert(err.response?.data?.message || 'Failed to unban organizer');
    } finally {
      setUnbanningOrganizer(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Navbar />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Event Not Found</h1>
            <p className="text-slate-600">{error || "The event you're looking for doesn't exist or has been removed."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 relative">
      <Navbar />
      {organizerTeam.length > 0 && (
        <button
          className={`fixed z-50 bg-blue-600 text-white px-5 py-2 rounded shadow hover:bg-blue-700 transition top-[calc(2cm+1.5rem)] ${showOrganizerTeamDrawer ? 'right-[340px]' : 'right-8'}`}
          style={{ transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)' }}
          onClick={() => {
            setShowOrganizerTeamDrawer((prev) => {
              if (!prev) fetchBannedUsers();
              return !prev;
            });
          }}
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
            {/* Active Organizers Section */}
            <div>
              <h3 className="text-md font-semibold text-blue-700 mb-3">Active Organizers</h3>
              {organizerTeam
                .filter((obj) => {
                  if (!obj.user || !obj.user._id) return false;
                  const user = obj.user;
                  const displayName = user.username || user.name || '';
                  return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
                })
                .map((obj) => {
                  const user = obj.user;
                  const safeUser = getSafeUserData(user);
                  const isThisUserCreator = user._id === event.createdBy._id;
                  const displayName = getDisplayName(safeUser);
                  const displayText = getUsernameDisplay(safeUser);
                  const canNavigate = canNavigateToUser(user);
                  
                  return (
                    <div
                      key={user._id}
                      className={`group relative bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 mb-3 transform hover:scale-[1.02] ${isThisUserCreator ? 'border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-md' : ''}`}
                      onClick={() => canNavigate && navigate(`/organizer/${getSafeUserId(user)}`)}
                    >
                      <div className="flex items-center">
                        {getProfileImageUrl(safeUser) ? (
                          <img
                            src={getProfileImageUrl(safeUser)}
                            alt={getSafeUserName(safeUser)}
                            className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 border-blue-400 mr-3 lg:mr-4 shadow-sm"
                          />
                        ) : (
                          <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center border-2 border-blue-400 mr-3 lg:mr-4 shadow-sm ${getRoleColors(safeUser.role)}`}>
                            <span className="text-base lg:text-lg font-bold">{getAvatarInitial(safeUser)}</span>
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className={`font-medium text-blue-800 text-base lg:text-lg truncate ${
                            safeUser.isDeleted ? 'text-gray-600' : ''
                          }`}>{displayText}</span>
                          {safeUser.username && safeUser.name && !safeUser.isDeleted && (
                            <span className="text-sm text-gray-600 truncate">{safeUser.name}</span>
                          )}
                          {safeUser.isDeleted && safeUser.name && (
                            <span className="text-sm text-gray-500 truncate">{safeUser.name}</span>
                          )}
                        </div>
                        {isThisUserCreator && (
                          <span className="ml-2 px-2 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs rounded-full font-bold shadow-sm">Creator</span>
                        )}
                      </div>
                      
                      {/* Action buttons - shown on hover (only for non-creator organizers, and only visible to event creator) */}
                      {!isThisUserCreator && isCreator && !safeUser.isDeleted && (
                        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg">
                          <div className="flex gap-2 justify-center">
                            {/* Remove button - only available to creator */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrganizer(user);
                                setShowRemoveOrganizerConfirm(true);
                              }}
                              className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-3 py-1 rounded-lg text-xs hover:from-yellow-600 hover:to-amber-600 transition-all duration-200 transform hover:scale-105 shadow-sm"
                              disabled={removingOrganizer}
                            >
                              Remove
                            </button>
                            
                            {/* Ban button - only available to creator */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrganizer(user);
                                setShowBanOrganizerConfirm(true);
                              }}
                              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-lg text-xs hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-sm"
                              disabled={banningOrganizer}
                            >
                              Ban
                            </button>
                          </div>
                        </div>
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

            {/* Banned Organizers Section - Only visible to creator */}
            {isCreator && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-red-700 mb-3">Banned Organizers</h3>
                {bannedOrganizersLoading ? (
                  <div>Loading banned organizers...</div>
                ) : bannedOrganizers.length === 0 ? (
                  <div className="text-gray-500">No banned organizers.</div>
                ) : (
                  bannedOrganizers
                    .filter(org => {
                      const displayName = org.username || org.name || '';
                      return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
                    })
                    .map((org) => {
                      const safeOrg = getSafeUserData(org);
                      const displayName = getDisplayName(safeOrg);
                      const displayText = getUsernameDisplay(safeOrg);
                      const canNavigate = canNavigateToUser(org);
                      
                      return (
                        <div
                          key={org._id}
                          className="bg-red-50 rounded-lg shadow p-3 border border-red-200"
                        >
                          <div 
                            className={`flex items-center justify-between ${
                              canNavigate ? 'cursor-pointer' : 'cursor-default opacity-75'
                            }`}
                            onClick={() => canNavigate && navigate(`/organizer/${getSafeUserId(org)}`)}
                          >
                            <div className="flex items-center flex-1">
                              {getProfileImageUrl(safeOrg) ? (
                                <img
                                  src={getProfileImageUrl(safeOrg)}
                                  alt={getSafeUserName(safeOrg)}
                                  className="w-14 h-14 rounded-full object-cover border-2 border-red-400 mr-4"
                                />
                              ) : (
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-red-400 mr-4 ${getRoleColors(safeOrg.role)}`}>
                                  <span className="text-lg font-bold">{getAvatarInitial(safeOrg)}</span>
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className={`font-medium text-lg ${
                                  safeOrg.isDeleted ? 'text-gray-600' : 'text-red-800'
                                }`}>{displayText}</span>
                                {safeOrg.username && safeOrg.name && !safeOrg.isDeleted && (
                                  <span className="text-sm text-gray-600">{safeOrg.name}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded font-bold">Banned</span>
                              {/* Unban button - only available to creator */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrganizer(org);
                                  setShowUnbanOrganizerConfirm(true);
                                }}
                                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                                disabled={unbanningOrganizer}
                              >
                                Unban
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
                {bannedOrganizers.filter(org => {
                  const displayName = org.username || org.name || '';
                  return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
                }).length === 0 && organizerSearchTerm && bannedOrganizers.length > 0 && (
                  <div className="text-gray-500 text-center py-4">No banned organizers found matching "{organizerSearchTerm}"</div>
                )}
              </div>
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
            if (!prev) {
              fetchVolunteers();
              fetchBannedUsers();
            }
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
            {/* Active Volunteers Section */}
            <div>
              <h3 className="text-md font-semibold text-green-700 mb-3">Active Volunteers</h3>
              {volunteersLoading ? (
                <div>Loading volunteers...</div>
              ) : volunteers.length === 0 ? (
                <div className="text-gray-500">No volunteers registered.</div>
              ) : (
                volunteers
                  .filter(vol => {
                    const safeVol = getSafeUserData(vol);
                    const displayName = safeVol.username || safeVol.name || '';
                    return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
                  })
                  .map((vol) => {
                    const safeVol = getSafeUserData(vol);
                    const displayName = getDisplayName(safeVol);
                    const displayText = getUsernameDisplay(safeVol);
                    const canNavigate = canNavigateToUser(vol);
                    
                    return (
                      <div
                        key={vol._id || safeVol._id}
                        className={`group relative bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition hover:bg-green-50 ${
                          safeVol.isDeleted ? 'opacity-75 bg-gray-100' : ''
                        }`}
                      >
                        <div 
                          className={`flex items-center flex-1 ${canNavigate ? 'cursor-pointer' : 'cursor-default'}`}
                          onClick={() => canNavigate && navigate(`/volunteer/${getSafeUserId(vol)}`)}
                        >
                          {getProfileImageUrl(safeVol) ? (
                            <img
                              src={getProfileImageUrl(safeVol)}
                              alt={getSafeUserName(safeVol)}
                              className="w-14 h-14 rounded-full object-cover border-2 border-green-400 mr-4"
                            />
                          ) : (
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-green-400 mr-4 ${getRoleColors(safeVol.role)}`}>
                              <span className="text-sm font-bold">{getAvatarInitial(safeVol)}</span>
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className={`font-medium text-lg ${
                              safeVol.isDeleted ? 'text-gray-600' : 'text-green-800'
                            }`}>
                              {displayText}
                              {safeVol.isDeleted && (
                                <span className="ml-2 px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-bold">Deleted User</span>
                              )}
                            </span>
                            {safeVol.username && safeVol.name && !safeVol.isDeleted && (
                              <span className="text-sm text-gray-600">{safeVol.name}</span>
                            )}
                            {safeVol.isDeleted && safeVol.name && (
                              <span className="text-sm text-gray-500">{safeVol.name}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Action buttons - shown on hover */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
                          <div className="flex gap-2 justify-center">
                            {/* Remove button - available to all organizers */}
                            {(isCreator || isTeamMember) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVolunteer(vol);
                                  setShowRemoveConfirm(true);
                                }}
                                className="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600 transition-colors"
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
                                className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                                disabled={banningVolunteer}
                              >
                                Ban
                              </button>
                            )}
                          </div>
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

            {/* Banned Volunteers Section */}
            <div className="mt-6">
              <h3 className="text-md font-semibold text-red-700 mb-3">Banned Volunteers</h3>
              {bannedVolunteersLoading ? (
                <div>Loading banned volunteers...</div>
              ) : bannedVolunteers.length === 0 ? (
                <div className="text-gray-500">No banned volunteers.</div>
              ) : (
                bannedVolunteers
                  .filter(vol => {
                    const safeVol = getSafeUserData(vol);
                    const displayName = safeVol.username || safeVol.name || '';
                    return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
                  })
                  .map((vol) => {
                    const safeVol = getSafeUserData(vol);
                    const displayName = getDisplayName(safeVol);
                    const displayText = getUsernameDisplay(safeVol);
                    const canNavigate = canNavigateToUser(vol);
                    
                    return (
                      <div
                        key={vol._id || safeVol._id}
                        className={`bg-red-50 rounded-lg shadow p-3 border border-red-200 ${
                          safeVol.isDeleted ? 'opacity-75 bg-gray-100' : ''
                        }`}
                      >
                        <div 
                          className={`flex items-center justify-between ${canNavigate ? 'cursor-pointer' : 'cursor-default'}`}
                          onClick={() => canNavigate && navigate(`/volunteer/${getSafeUserId(vol)}`)}
                        >
                          <div className="flex items-center flex-1">
                            {getProfileImageUrl(safeVol) ? (
                              <img
                                src={getProfileImageUrl(safeVol)}
                                alt={getSafeUserName(safeVol)}
                                className="w-14 h-14 rounded-full object-cover border-2 border-red-400 mr-4"
                              />
                            ) : (
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-red-400 mr-4 ${getRoleColors(safeVol.role)}`}>
                                <span className="text-sm font-bold">{getAvatarInitial(safeVol)}</span>
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className={`font-medium text-lg ${
                                safeVol.isDeleted ? 'text-gray-600' : 'text-red-800'
                              }`}>
                                {displayText}
                                {safeVol.isDeleted && (
                                  <span className="ml-2 px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-bold">Deleted User</span>
                                )}
                              </span>
                              {safeVol.username && safeVol.name && !safeVol.isDeleted && (
                                <span className="text-sm text-gray-600">{safeVol.name}</span>
                              )}
                              {safeVol.isDeleted && safeVol.name && (
                                <span className="text-sm text-gray-500">{safeVol.name}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded font-bold">Banned</span>
                            {/* Unban button - available to all organizers */}
                            {(isCreator || isTeamMember) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVolunteer(vol);
                                  setShowUnbanVolunteerConfirm(true);
                                }}
                                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                                disabled={unbanningVolunteer}
                              >
                                Unban
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
              {bannedVolunteers.filter(vol => {
                const displayName = vol.username || vol.name || '';
                return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
              }).length === 0 && volunteerSearchTerm && bannedVolunteers.length > 0 && (
                <div className="text-gray-500 text-center py-4">No banned volunteers found matching "{volunteerSearchTerm}"</div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <button
            className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            onClick={() => navigate(-1)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {/* Event Status Banner */}
        {isPastEvent && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-red-800 font-semibold">Event Ended</h3>
                <p className="text-red-700 text-sm">This event has been completed</p>
              </div>
            </div>
          </div>
        )}
        {/* Action Buttons */}
        {(canEdit || isTeamMember) && (
          <div className="mb-8 flex flex-wrap gap-3">
            {canEdit && (
              <>
                <button
                  onClick={() => navigate(`/events/${id}/edit`)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Event
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Event
                </button>
              </>
            )}
            <button
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              onClick={() => navigate(`/events/${id}/attendance`)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Manage Attendance
            </button>
          </div>
        )}
        {/* Join Organizer Section */}
        {!isPastEvent && canJoinAsOrganizer && (
          <div className="mb-8">
            {joinRequestStatus !== 'pending' && hasRejectedRequest && !joining && (
              <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-red-800 font-semibold">Join Request Rejected</h3>
                    <p className="text-red-700 text-sm">Your previous request was not approved</p>
                  </div>
                </div>
                <button
                  onClick={handleRequestJoinAsOrganizer}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  disabled={joining}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {joining ? "Reapplying..." : "Reapply as Organizer"}
                </button>
              </div>
            )}
            
            {joinRequestStatus !== 'pending' && !hasRejectedRequest && (
              <button
                onClick={handleRequestJoinAsOrganizer}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                disabled={joining}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {joining ? "Requesting..." : "Join as Organizer"}
              </button>
            )}
            
            {joinRequestStatus === 'pending' && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-blue-800 font-semibold">Join Request Pending</h3>
                      <p className="text-blue-700 text-sm">Awaiting approval from event creator</p>
                    </div>
                  </div>
                  <button
                    onClick={handleWithdrawJoinRequest}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                    disabled={joining}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {joining ? "Withdrawing..." : "Withdraw"}
                  </button>
                </div>
              </div>
            )}
            
            {joinRequestStatus === 'rejected' && joining && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-blue-800 font-semibold">Reapplying...</h3>
                    <p className="text-blue-700 text-sm">Please wait while we process your request</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Show pending join requests to creator */}
        {isCreator && event && event.organizerJoinRequests && event.organizerJoinRequests.length > 0 && (
          <div className="my-6">
            <h3 className="text-lg font-bold text-blue-700 mb-2">Pending Organizer Join Requests</h3>
            <ul>
              {event.organizerJoinRequests.filter(r => r.status === 'pending' && r.user).map(r => {
                const user = r.user;
                if (!user) return null; // Skip if user is null
                
                const safeUser = getSafeUserData(user);
                const userId = getSafeUserId(user) || user._id || user;
                const name = getDisplayName(safeUser);
                const canNavigate = canNavigateToUser(user);
                
                return (
                  <li key={userId} className="flex items-center gap-4 mb-2">
                    {getProfileImageUrl(safeUser) ? (
                      <img 
                        src={getProfileImageUrl(safeUser)} 
                        alt={getSafeUserName(safeUser)} 
                        className="w-10 h-10 rounded-full object-cover border" 
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${getRoleColors(safeUser.role)}`}>
                        <span className="text-sm font-bold">{getAvatarInitial(safeUser)}</span>
                      </div>
                    )}
                    <span
                      className={`font-medium underline ${
                        canNavigate ? 'text-blue-700 cursor-pointer' : 'text-gray-500 cursor-default'
                      }`}
                      onClick={() => canNavigate && navigate(`/organizer/${userId}`)}
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
        
        {/* Recurring Event Completion */}
        {event.recurringEvent && isPastEvent && (isCreator || isTeamMember) && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Complete Event</h3>
            <p className="text-blue-700 mb-3">
              This event has ended. Complete it to create the next instance in the series.
            </p>
            <button
              onClick={handleCompleteEvent}
              disabled={completingEvent}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {completingEvent ? "Completing..." : "Complete Event & Create Next Instance"}
            </button>
            {completionError && <p className="text-red-600 mt-2">{completionError}</p>}
            {completionSuccess && <p className="text-green-600 mt-2">{completionSuccess}</p>}
          </div>
        )}
        
        {/* Remove joinSuccess message; rely on status UI only */}
        {/* Main Event Header */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent">
                  {event.title}
                </h1>
                {event.isRecurringInstance && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-full">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Instance #{event.recurringInstanceNumber}
                  </span>
                )}
              </div>
              
              {event.recurringEvent && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-full">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Recurring Event
                  </span>
                  <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    {event.recurringType} - {event.recurringValue}
                  </span>
                </div>
              )}
              
              <p className="text-lg text-slate-700 leading-relaxed">{event.description}</p>
            </div>
            
            {/* Calendar Button */}
            <div className="relative">
              <button
                data-calendar-button
                onClick={() => setShowCalendarOptions(!showCalendarOptions)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                title="Add to Calendar"
              >
                <FaCalendarPlus className="w-5 h-5" />
                Calendar
              </button>
              
              {/* Calendar Options Dropdown */}
              {showCalendarOptions && (
                <div data-calendar-dropdown className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-3 min-w-[250px] z-50">
                  <div className="text-sm font-semibold text-slate-700 mb-2 px-2">Calendar Options</div>
                  
                  {/* Website Calendar Options */}
                  {calendarStatus.canAddToCalendar && (
                    <button
                      onClick={() => {
                        handleAddToWebsiteCalendar();
                        setShowCalendarOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
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
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <FaCalendarMinus className="w-4 h-4" />
                      Remove from Website Calendar
                    </button>
                  )}
                  {calendarStatus.isRegistered && (
                    <div className="px-3 py-2 text-sm text-slate-500 italic bg-slate-50 rounded-lg">
                      Registered events are automatically in calendar
                    </div>
                  )}
                  {calendarStatus.isOrganizerEvent && (
                    <div className="px-3 py-2 text-sm text-slate-500 italic bg-slate-50 rounded-lg">
                      Organizer events are automatically in calendar
                    </div>
                  )}
                  
                  {/* External Calendar Options */}
                  <div className="border-t border-slate-200 my-2"></div>
                  <button
                    onClick={() => {
                      handleAddToCalendar();
                      setShowCalendarOptions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <FaCalendarPlus className="w-4 h-4" />
                    Add to Google Calendar
                  </button>
                  <button
                    onClick={() => {
                      handleDownloadCalendar();
                      setShowCalendarOptions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <FaCalendarPlus className="w-4 h-4" />
                    Download .ics File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Location & Timing Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location & Timing
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Location</h3>
                  <p className="text-slate-700">{event.location}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Timing</h3>
                  <p className="text-slate-700">
                    {event && event.startDateTime && event.endDateTime ?
                      `${format(new Date(event.startDateTime), 'hh:mm a, d MMMM yyyy')} — ${format(new Date(event.endDateTime), 'hh:mm a, d MMMM yyyy')}`
                      : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Event Details Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Event Details
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Event Type</h3>
                  <p className="text-slate-700">{event.eventType || "Not specified"}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Volunteer Slots</h3>
                  <p className="text-slate-700">{slotMessage}</p>
                </div>
              </div>

              {event.groupRegistration && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Group Registration</h3>
                    <p className="text-green-700 font-medium">Enabled</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map Section */}
        {event.mapLocation && event.mapLocation.lat && event.mapLocation.lng && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Event Location
            </h2>
            <StaticMap 
              key={`${event.mapLocation.lat}-${event.mapLocation.lng}-${event.mapLocation.address}`}
              lat={event.mapLocation.lat} 
              lng={event.mapLocation.lng} 
            />
            {event.mapLocation.address && (
              <p className="text-slate-600 mt-3 text-sm">{event.mapLocation.address}</p>
            )}
          </div>
        )}

        {/* Instructions & Equipment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Instructions Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Instructions
            </h2>
            <p className="text-slate-700 leading-relaxed">{event.instructions || "No specific instructions provided."}</p>
          </div>

          {/* Equipment Card */}
          {event.equipmentNeeded?.length > 0 && (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Equipment Needed
              </h2>
              <ul className="space-y-2">
                {event.equipmentNeeded.map((eq, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-700">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    {eq}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Volunteer Logistics */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            Volunteer Logistics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${event.waterProvided ? 'bg-green-100' : 'bg-red-100'}`}>
                  <svg className={`w-5 h-5 ${event.waterProvided ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Drinking Water</h3>
                  <p className={`font-medium ${event.waterProvided ? 'text-green-700' : 'text-red-700'}`}>
                    {event.waterProvided ? "Available" : "Not Available"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${event.medicalSupport ? 'bg-green-100' : 'bg-red-100'}`}>
                  <svg className={`w-5 h-5 ${event.medicalSupport ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Medical Support</h3>
                  <p className={`font-medium ${event.medicalSupport ? 'text-green-700' : 'text-red-700'}`}>
                    {event.medicalSupport ? "Available" : "Not Available"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Age Group</h3>
                  <p className="text-slate-700">{event.ageGroup || "Not specified"}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Special Precautions</h3>
                  <p className="text-slate-700">{event.precautions || "None specified"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6h8m-8 6h8" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Public Transport</h3>
                  <p className="text-slate-700">{event.publicTransport || "Not mentioned"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Contact Person</h3>
                  <p className="text-slate-700">{event.contactPerson || "Not listed"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Images */}
        {event.eventImages?.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Event Images
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {event.eventImages.map((img, idx) => (
                <div key={img + '-' + idx} className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <img
                    src={`${imageBaseUrl}${img}`}
                    alt={`Event ${idx + 1}`}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary Section */}
        <div className="bg-gradient-to-r from-yellow-50 via-orange-50 to-amber-50 rounded-2xl shadow-lg border border-yellow-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-yellow-800">AI Event Summary</h2>
              <p className="text-yellow-700 text-sm">Powered by artificial intelligence</p>
            </div>
          </div>
          
          {event.summary && event.summary.trim() ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-yellow-200">
              <p className="text-slate-800 whitespace-pre-line leading-relaxed text-lg">{event.summary}</p>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
                <p className="text-slate-600 italic">Generating AI summary...</p>
              </div>
            </div>
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

      {/* Remove Organizer Confirmation Modal */}
      {showRemoveOrganizerConfirm && selectedOrganizer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Remove Organizer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{selectedOrganizer.username || selectedOrganizer.name}</strong> from this event? They will be able to join again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveOrganizerConfirm(false);
                  setSelectedOrganizer(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={removingOrganizer}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveOrganizer(selectedOrganizer._id)}
                className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
                disabled={removingOrganizer}
              >
                {removingOrganizer ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Organizer Confirmation Modal */}
      {showBanOrganizerConfirm && selectedOrganizer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ban Organizer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to ban <strong>{selectedOrganizer.username || selectedOrganizer.name}</strong> from this event? They will not be able to join again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBanOrganizerConfirm(false);
                  setSelectedOrganizer(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={banningOrganizer}
              >
                Cancel
              </button>
              <button
                onClick={() => handleBanOrganizer(selectedOrganizer._id)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                disabled={banningOrganizer}
              >
                {banningOrganizer ? 'Banning...' : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unban Volunteer Confirmation Modal */}
      {showUnbanVolunteerConfirm && selectedVolunteer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Unban Volunteer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to unban <strong>{selectedVolunteer.username || selectedVolunteer.name}</strong> from this event? They will be able to register again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUnbanVolunteerConfirm(false);
                  setSelectedVolunteer(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={unbanningVolunteer}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnbanVolunteer(selectedVolunteer._id)}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                disabled={unbanningVolunteer}
              >
                {unbanningVolunteer ? 'Unbanning...' : 'Unban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unban Organizer Confirmation Modal */}
      {showUnbanOrganizerConfirm && selectedOrganizer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Unban Organizer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to unban <strong>{selectedOrganizer.username || selectedOrganizer.name}</strong> from this event? They will be able to join again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUnbanOrganizerConfirm(false);
                  setSelectedOrganizer(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={unbanningOrganizer}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnbanOrganizer(selectedOrganizer._id)}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                disabled={unbanningOrganizer}
              >
                {unbanningOrganizer ? 'Unbanning...' : 'Unban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
