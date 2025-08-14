// src/pages/EventDetailsPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-12 relative">
      <Navbar />
      
      {/* Professional Action Bar - Fixed at top */}
      <div className="fixed top-16 lg:top-20 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            {/* Left side - Back button and title */}
            <div className="flex items-center space-x-4">
              <button
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 flex items-center group"
                onClick={() => navigate(-1)}
              >
                <span className="transform group-hover:-translate-x-1 transition-transform duration-200">←</span>
                <span className="ml-1">Back</span>
              </button>
              <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate max-w-xs sm:max-w-md lg:max-w-lg">
                {event?.title}
              </h1>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center space-x-2">
              {/* Calendar button */}
              <div className="relative">
                <button
                  data-calendar-button
                  onClick={() => setShowCalendarOptions(!showCalendarOptions)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 rounded-lg shadow-sm hover:shadow-md hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                  title="Add to Calendar"
                >
                  <FaCalendarPlus className="w-4 h-4" />
                </button>
                
                {/* Calendar Options Dropdown */}
                {showCalendarOptions && (
                  <div data-calendar-dropdown className="absolute top-full right-0 mt-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px] z-50">
                    {/* Website Calendar Options */}
                    {calendarStatus.canAddToCalendar && (
                      <button
                        onClick={() => {
                          handleAddToWebsiteCalendar();
                          setShowCalendarOptions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg flex items-center gap-2 transition-all duration-200"
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
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-all duration-200"
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
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 rounded-lg flex items-center gap-2 transition-all duration-200"
                    >
                      <FaCalendarPlus className="w-4 h-4" />
                      Add to Google Calendar
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadCalendar();
                        setShowCalendarOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 rounded-lg flex items-center gap-2 transition-all duration-200"
                    >
                      <FaCalendarPlus className="w-4 h-4" />
                      Download .ics File
                    </button>
                  </div>
                )}
              </div>

              {/* Team Management Buttons */}
              {organizerTeam.length > 0 && (
                <button
                  className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg shadow-sm hover:shadow-md hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-medium ${showOrganizerTeamDrawer ? 'ring-2 ring-blue-300' : ''}`}
                  onClick={() => {
                    setShowOrganizerTeamDrawer((prev) => {
                      if (!prev) fetchBannedUsers();
                      return !prev;
                    });
                  }}
                >
                  <span className="hidden sm:inline">{showOrganizerTeamDrawer ? 'Hide Team' : 'Team'}</span>
                  <span className="sm:hidden">👥</span>
                </button>
              )}

              <button
                className={`bg-gradient-to-r from-green-600 to-emerald-700 text-white px-3 py-2 rounded-lg shadow-sm hover:shadow-md hover:from-green-700 hover:to-emerald-800 transition-all duration-200 text-sm font-medium ${showVolunteers ? 'ring-2 ring-green-300' : ''}`}
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
                <span className="hidden sm:inline">{showVolunteers ? 'Hide Volunteers' : 'Volunteers'}</span>
                <span className="sm:hidden">👤</span>
              </button>

              {/* Primary Action Button */}
              {(canEdit || isTeamMember) && (
                <button
                  className="bg-gradient-to-r from-green-600 to-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md hover:from-green-700 hover:to-emerald-800 transition-all duration-200 text-sm font-medium"
                  onClick={() => navigate(`/events/${id}/attendance`)}
                >
                  📋 Attendance
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Organizer Team Drawer - Improved positioning */}
      {organizerTeam.length > 0 && (
        <div
          className={`fixed top-32 lg:top-36 right-0 h-[calc(100vh-8rem)] w-72 lg:w-80 bg-white/95 backdrop-blur-sm shadow-2xl z-30 transform transition-transform duration-300 ease-in-out ${showOrganizerTeamDrawer ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-lg font-semibold text-blue-700">Organizer Team</h2>
            <button
              className="text-gray-500 hover:text-red-600 text-2xl font-bold transition-colors duration-200"
              onClick={() => setShowOrganizerTeamDrawer(false)}
              aria-label="Close organizer team drawer"
            >
              ×
            </button>
          </div>
          <div className="px-4 lg:px-6 py-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search organizers..."
              value={organizerSearchTerm}
              onChange={(e) => setOrganizerSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="overflow-y-auto h-[calc(100%-128px)] px-4 lg:px-6 py-4 space-y-4">
            {/* Active Organizers Section */}
            <div>
              <h3 className="text-md font-semibold text-blue-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Active Organizers
              </h3>
              {organizerTeam
                .filter((obj) => {
                  if (!obj.user || !obj.user._id) return false;
                  const user = obj.user;
                  const displayName = user.username || user.name || '';
                  return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
                })
                .map((obj) => {
                  const user = obj.user;
                  const isThisUserCreator = user._id === event.createdBy._id;
                  const displayName = user.username || user.name || 'User';
                  const displayText = user.username ? `@${user.username}` : displayName;
                  return (
                    <div
                      key={user._id}
                      className={`group relative bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 mb-3 transform hover:scale-[1.02] ${isThisUserCreator ? 'border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-md' : ''}`}
                      onClick={() => navigate(`/organizer/${user._id}`)}
                    >
                      <div className="flex items-center">
                        {getProfileImageUrl(user) ? (
                          <img
                            src={getProfileImageUrl(user)}
                            alt={displayName}
                            className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 border-blue-400 mr-3 lg:mr-4 shadow-sm"
                          />
                        ) : (
                          <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center border-2 border-blue-400 mr-3 lg:mr-4 shadow-sm ${getRoleColors('organizer')}`}>
                            <span className="text-base lg:text-lg font-bold">{getAvatarInitial(user)}</span>
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium text-blue-800 text-base lg:text-lg truncate">{displayText}</span>
                          {user.username && user.name && (
                            <span className="text-sm text-gray-600 truncate">{user.name}</span>
                          )}
                        </div>
                        {isThisUserCreator && (
                          <span className="ml-2 px-2 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs rounded-full font-bold shadow-sm">Creator</span>
                        )}
                      </div>
                      
                      {/* Action buttons - shown on hover (only for non-creator organizers, and only visible to event creator) */}
                      {!isThisUserCreator && isCreator && (
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
                      const displayName = org.username || org.name || 'User';
                      const displayText = org.username ? `@${org.username}` : displayName;
                      return (
                        <div
                          key={org._id}
                          className="bg-red-50 rounded-lg shadow p-3 border border-red-200"
                        >
                          <div 
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => navigate(`/organizer/${org._id}`)}
                          >
                            <div className="flex items-center flex-1">
                              <img
                                src={org.profileImage ? `http://localhost:5000/uploads/Profiles/${org.profileImage}` : '/images/default-profile.jpg'}
                                alt={displayName}
                                className="w-14 h-14 rounded-full object-cover border-2 border-red-400 mr-4"
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-red-800 text-lg">{displayText}</span>
                                {org.username && org.name && (
                                  <span className="text-sm text-gray-600">{org.name}</span>
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

      {/* Volunteers Drawer - Improved positioning */}
      {showVolunteers && (
        <div
          className={`fixed top-32 lg:top-36 left-0 h-[calc(100vh-8rem)] w-72 lg:w-80 bg-white/95 backdrop-blur-sm shadow-2xl z-30 transform transition-transform duration-300 ease-in-out ${showVolunteers ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <h2 className="text-lg font-semibold text-green-700">Volunteers</h2>
            <button
              className="text-gray-500 hover:text-red-600 text-2xl font-bold transition-colors duration-200"
              onClick={() => setShowVolunteers(false)}
              aria-label="Close volunteers drawer"
            >
              ×
            </button>
          </div>
          <div className="px-4 lg:px-6 py-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search volunteers..."
              value={volunteerSearchTerm}
              onChange={(e) => setVolunteerSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="overflow-y-auto h-[calc(100%-128px)] px-4 lg:px-6 py-4 space-y-4">
            {/* Active Volunteers Section */}
            <div>
              <h3 className="text-md font-semibold text-green-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Active Volunteers
              </h3>
              {volunteersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                  <span className="ml-2 text-gray-600">Loading volunteers...</span>
                </div>
              ) : volunteers.length === 0 ? (
                <div className="text-gray-500 text-center py-4">No volunteers registered.</div>
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
                        className="group relative bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transform hover:scale-[1.02]"
                      >
                        <div 
                          className="flex items-center flex-1 cursor-pointer"
                          onClick={() => navigate(`/volunteer/${vol._id}`)}
                        >
                          <img
                            src={vol.profileImage ? `http://localhost:5000/uploads/Profiles/${vol.profileImage}` : '/images/default-profile.jpg'}
                            alt={displayName}
                            className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 border-green-400 mr-3 lg:mr-4 shadow-sm"
                          />
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-medium text-green-800 text-base lg:text-lg truncate">{displayText}</span>
                            {vol.username && vol.name && (
                              <span className="text-sm text-gray-600 truncate">{vol.name}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Action buttons - shown on hover */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg">
                          <div className="flex gap-2 justify-center">
                            {/* Remove button - available to all organizers */}
                            {(isCreator || isTeamMember) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVolunteer(vol);
                                  setShowRemoveConfirm(true);
                                }}
                                className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-3 py-1 rounded-lg text-xs hover:from-yellow-600 hover:to-amber-600 transition-all duration-200 transform hover:scale-105 shadow-sm"
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
                                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-lg text-xs hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-sm"
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
                    const displayName = vol.username || vol.name || '';
                    return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
                  })
                  .map((vol) => {
                    const displayName = vol.username || vol.name || 'User';
                    const displayText = vol.username ? `@${vol.username}` : displayName;
                    return (
                      <div
                        key={vol._id}
                        className="bg-red-50 rounded-lg shadow p-3 border border-red-200"
                      >
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => navigate(`/volunteer/${vol._id}`)}
                        >
                          <div className="flex items-center flex-1">
                            <img
                              src={vol.profileImage ? `http://localhost:5000/uploads/Profiles/${vol.profileImage}` : '/images/default-profile.jpg'}
                              alt={displayName}
                              className="w-14 h-14 rounded-full object-cover border-2 border-red-400 mr-4"
                            />
                            <div className="flex flex-col">
                              <span className="font-medium text-red-800 text-lg">{displayText}</span>
                              {vol.username && vol.name && (
                                <span className="text-sm text-gray-600">{vol.name}</span>
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

      {/* Main Content Area - Adjusted padding for fixed action bar */}
      <div className="pt-32 lg:pt-36 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Status Messages and Alerts */}
        <div className="space-y-4 mb-8">
          {/* Show event ended message if completed */}
          {isPastEvent && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="text-red-600 font-semibold">This event has ended</span>
              </div>
            </div>
          )}

          {/* Join request status messages */}
          {!isPastEvent && canJoinAsOrganizer && joinRequestStatus !== 'pending' && hasRejectedRequest && !joining && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg">
              <div className="text-red-700 font-semibold mb-3">Join request rejected</div>
              <button
                onClick={handleRequestJoinAsOrganizer}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-md"
                disabled={joining}
              >
                {joining ? "Reapplying..." : "Reapply as Organizer"}
              </button>
            </div>
          )}

          {!isPastEvent && canJoinAsOrganizer && joinRequestStatus !== 'pending' && !hasRejectedRequest && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <button
                onClick={handleRequestJoinAsOrganizer}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-md"
                disabled={joining}
              >
                {joining ? "Requesting..." : "Join as Organizer"}
              </button>
            </div>
          )}

          {!isPastEvent && canJoinAsOrganizer && joinRequestStatus === 'pending' && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-blue-700 font-semibold">Join request sent (awaiting approval)</span>
              <button
                onClick={handleWithdrawJoinRequest}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-md"
                disabled={joining}
              >
                {joining ? "Withdrawing..." : "Withdraw Request"}
              </button>
            </div>
          )}

          {joinError && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">{joinError}</p>
            </div>
          )}
        </div>

        {/* Event Management Actions - Organized in cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Event Management Card */}
          {(canEdit || isTeamMember) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                Event Management
              </h3>
              <div className="space-y-3">
                {canEdit && (
                  <>
                    <button
                      onClick={() => navigate(`/events/${id}/edit`)}
                      className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-4 py-2 rounded-lg hover:from-yellow-600 hover:to-amber-600 transition-all duration-200 transform hover:scale-105 shadow-md text-left"
                    >
                      ✏️ Edit Event
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-md text-left"
                    >
                      🗑️ Delete Event
                    </button>
                  </>
                )}
                <button
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-200 transform hover:scale-105 shadow-md text-left"
                  onClick={() => navigate(`/events/${id}/attendance`)}
                >
                  📋 Manage Attendance
                </button>
                {isTeamMember && !isCreator && (
                  <button
                    onClick={handleLeaveAsOrganizer}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-md text-left"
                  >
                    Leave as Organizer
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Recurring Event Management Card */}
          {event.recurringEvent && isPastEvent && (isCreator || isTeamMember) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                Complete Event
              </h3>
              <p className="text-blue-700 mb-4">
                This event has ended. Complete it to create the next instance in the series.
              </p>
              <button
                onClick={handleCompleteEvent}
                disabled={completingEvent}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 shadow-md"
              >
                {completingEvent ? "Completing..." : "Complete Event & Create Next Instance"}
              </button>
              {completionError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{completionError}</p>
                </div>
              )}
              {completionSuccess && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-600">{completionSuccess}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pending Join Requests - Only for creator */}
        {isCreator && event && event.organizerJoinRequests && event.organizerJoinRequests.length > 0 && (
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
              Pending Organizer Join Requests
            </h3>
            <div className="space-y-3">
              {event.organizerJoinRequests.filter(r => r.status === 'pending' && r.user).map(r => {
                const user = r.user;
                if (!user) return null; // Skip if user is null
                
                const userId = user._id || user;
                const name = user.username ? `@${user.username}` : user.name || user.email || userId;
                const profileImage = user.profileImage ? `http://localhost:5000/uploads/Profiles/${user.profileImage}` : '/images/default-profile.jpg';
                return (
                  <div key={userId} className="flex items-center gap-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                    <img src={profileImage} alt={name} className="w-12 h-12 rounded-full object-cover border-2 border-blue-200" />
                    <span
                      className="font-medium text-blue-700 underline cursor-pointer hover:text-blue-900 transition-colors"
                      onClick={() => navigate(`/organizer/${userId}`)}
                    >
                      {name}
                    </span>
                    <div className="ml-auto flex gap-2">
                      <button
                        className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-lg text-sm hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-sm"
                        onClick={() => handleApproveJoinRequest(userId)}
                      >Approve</button>
                      <button
                        className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-lg text-sm hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-sm"
                        onClick={() => handleRejectJoinRequest(userId)}
                      >Reject</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Event Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent mb-4">
            {event.title}
            {event.isRecurringInstance && (
              <span className="ml-3 text-base sm:text-lg bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-3 py-1 rounded-full shadow-sm">
                Instance #{event.recurringInstanceNumber}
              </span>
            )}
          </h1>
          {event.recurringEvent && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-1 rounded-full shadow-sm">
                Recurring Event
              </span>
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {event.recurringType} - {event.recurringValue}
              </span>
            </div>
          )}
        </div>

        {/* Event Description */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <p className="text-gray-700 text-lg leading-relaxed mb-6">{event.description}</p>

          {/* --- MAP & LOCATION SECTION --- */}
          {event.mapLocation && event.mapLocation.lat && event.mapLocation.lng && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-blue-700 mb-4 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Event Location
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <StaticMap 
                  key={`${event.mapLocation.lat}-${event.mapLocation.lng}-${event.mapLocation.address}`}
                  lat={event.mapLocation.lat} 
                  lng={event.mapLocation.lng} 
                />
                {event.mapLocation.address && (
                  <p className="text-gray-600 mt-3 font-medium">{event.mapLocation.address}</p>
                )}
              </div>
            </div>
          )}
          {/* --- END MAP & LOCATION SECTION --- */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="font-semibold text-gray-800 min-w-[80px]">Location:</span>
                <span className="text-gray-700 ml-2">{event.location}</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-800 min-w-[80px]">Type:</span>
                <span className="text-gray-700 ml-2">{event.eventType || "Not specified"}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="font-semibold text-gray-800 min-w-[80px]">Timing:</span>
                <span className="text-gray-700 ml-2">
                  {event && event.startDateTime && event.endDateTime ?
                    `${format(new Date(event.startDateTime), 'hh:mm a, d MMMM yyyy')} — ${format(new Date(event.endDateTime), 'hh:mm a, d MMMM yyyy')}`
                    : 'Not specified'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-800 min-w-[80px]">Slots:</span>
                <span className="text-gray-700 ml-2">{slotMessage}</span>
              </div>
            </div>
          </div>
        </div>

        {event.groupRegistration && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-medium flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Group Registration Enabled
            </p>
          </div>
        )}

        {event.recurringEvent && (
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
            <p className="text-indigo-700 font-medium flex items-center">
              <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
              Recurs {event.recurringType} on {event.recurringValue}
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="w-2 h-2 bg-gray-500 rounded-full mr-3"></span>
            Instructions
          </h2>
          <p className="text-gray-700 leading-relaxed">{event.instructions || "None"}</p>
        </div>

        {event.equipmentNeeded?.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-2 h-2 bg-gray-500 rounded-full mr-3"></span>
              Equipment Needed
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              {event.equipmentNeeded.map((eq, i) => (
                <li key={i} className="leading-relaxed">{eq}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Questionnaire details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-700 mb-4 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            Volunteer Logistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="font-semibold text-gray-800 min-w-[140px]">Drinking Water:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${event.waterProvided ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {event.waterProvided ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold text-gray-800 min-w-[140px]">Medical Support:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${event.medicalSupport ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {event.medicalSupport ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-800 min-w-[140px]">Age Group:</span>
                <span className="text-gray-700 ml-2">{event.ageGroup || "Not specified"}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="font-semibold text-gray-800 min-w-[140px]">Precautions:</span>
                <span className="text-gray-700 ml-2">{event.precautions || "None"}</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-800 min-w-[140px]">Public Transport:</span>
                <span className="text-gray-700 ml-2">{event.publicTransport || "Not mentioned"}</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-800 min-w-[140px]">Contact Person:</span>
                <span className="text-gray-700 ml-2">{event.contactPerson || "Not listed"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Uploaded files */}
        {event.eventImages?.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-700 mb-4 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Event Images
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {event.eventImages.map((img, idx) => (
                <div key={img + '-' + idx} className="group relative overflow-hidden rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                  <img
                    src={`${imageBaseUrl}${img}`}
                    alt="Event"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary Section */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-yellow-700 mb-4 flex items-center">
            <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></span>
            AI Event Summary
          </h2>
          {event.summary && event.summary.trim() ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4">
              <p className="text-gray-800 whitespace-pre-line leading-relaxed">{event.summary}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              <span className="ml-3 text-gray-600">Generating AI summary...</span>
            </div>
          )}
        </div>

        {/* AI Report Generation Section - Only for creator of past events */}
        {isCreator && isPast && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
              AI Event Report
            </h2>
            
            {reportEligibility && (
              <div className="mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Organizer Questionnaires
                    </h3>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-3 ${
                        reportEligibility.organizerCompletionRate >= 50 ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm text-gray-600">{reportEligibility.completedOrganizerQuestionnaires}/{reportEligibility.totalOrganizers} completed ({reportEligibility.organizerCompletionRate}%)</span>
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Volunteer Questionnaires
                    </h3>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-3 ${
                        reportEligibility.volunteerCompletionRate >= 50 ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm text-gray-600">{reportEligibility.completedVolunteerQuestionnaires}/{reportEligibility.totalVolunteers} completed ({reportEligibility.volunteerCompletionRate}%)</span>
                    </div>
                  </div>
                </div>
                
                {reportEligibility.reportGenerated ? (
                  <div>
                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center">
                      <span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span>
                      ✅ Report has been generated successfully!
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
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
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-800 transition-all duration-200 transform hover:scale-105 shadow-md"
                      >
                        📄 View Report
                      </button>
                      <button
                        onClick={handleGenerateReport}
                        disabled={generatingReport}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md ${
                          generatingReport
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                            : 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700'
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
                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center">
                      <span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span>
                      ✅ Event is eligible for report generation (50%+ questionnaires completed)
                    </div>
                    <button
                      onClick={handleGenerateReport}
                      disabled={generatingReport}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md ${
                        generatingReport
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
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
                  <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg flex items-center">
                    <span className="w-4 h-4 bg-yellow-500 rounded-full mr-3"></span>
                    ⚠️ Need 50% questionnaire completion from both organizers and volunteers to generate report
                  </div>
                )}
                
                {reportError && (
                  <div className="bg-gradient-to-r from-red-100 to-pink-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mt-6 flex items-center">
                    <span className="w-4 h-4 bg-red-500 rounded-full mr-3"></span>
                    ❌ {reportError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {event.govtApprovalLetter && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-700 mb-4 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Government Approval
            </h2>
            <a
              href={`${imageBaseUrl}${event.govtApprovalLetter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-md"
            >
              📄 View Govt Approval Letter
            </a>
          </div>
        )}
      </div>
      
      {/* Comments Section */}
      {isPast && (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
              Volunteer Feedback & Comments
            </h3>
            <button
              onClick={() => {
                setShowComments(!showComments);
                if (!showComments && comments.length === 0) {
                  fetchComments();
                }
              }}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-md"
            >
              {showComments ? 'Hide Comments' : 'Show Comments'}
            </button>
          </div>
          
          {showComments && (
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 border border-gray-200">
              {commentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading comments...</span>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment, index) => (
                    <div key={comment._id || index} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 transform hover:scale-[1.01]">
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
