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
  const imageBaseUrl = "http://localhost:5000/uploads/Events/";
  const currentUser = JSON.parse(localStorage.getItem("user"));
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

  useEffect(() => {
    const socket = io('http://localhost:5000');
    socket.on('connect', () => {
      console.log('Socket.IO connected (organizer):', socket.id);
    });
    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected (organizer)');
    });
    return () => socket.disconnect();
  }, []);

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
  const handleQuestionnaireSubmit = async (answers, mediaFiles) => {
    try {
      const formData = new FormData();
      formData.append('answers', JSON.stringify(answers));
      if (mediaFiles && mediaFiles.length > 0) {
        mediaFiles.forEach((file, idx) => {
          formData.append('media', file);
        });
      }
      await axiosInstance.post(`/api/events/${event._id}/complete-questionnaire`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchAndSetEvent();
      setShowQuestionnaireModal(false);
    } catch (err) {
      alert("Failed to submit questionnaire.");
    }
  };

  // Find the current user's organizerTeam object
  const myOrganizerObj = organizerTeam.find(obj => obj.user && obj.user._id === currentUser?._id);
  const myQuestionnaireCompleted = myOrganizerObj?.questionnaire?.completed;
  const isPast = event && new Date() > new Date(event.endDateTime);

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
          <div className="overflow-y-auto h-[calc(100%-64px)] px-6 py-4 space-y-4">
            {organizerTeam.map((obj) => {
              if (!obj.user || !obj.user._id) return null;
              const user = obj.user;
              const isCreator = user._id === event.createdBy._id;
              return (
                <div
                  key={user._id}
                  className={`flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition cursor-pointer hover:bg-blue-50 mb-2 ${isCreator ? 'border-2 border-yellow-500 bg-yellow-50' : ''}`}
                  onClick={() => navigate(`/organizer/${user._id}`)}
                >
                  <img
                    src={user.profileImage ? `http://localhost:5000/uploads/Profiles/${user.profileImage}` : '/images/default-profile.jpg'}
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
                const name = user.name || user.email || userId;
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
        <h1 className="text-3xl font-bold text-blue-800 mb-3">{event.title}</h1>
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
      {event && (
        <EventChatbox eventId={event._id} currentUser={currentUser} />
      )}
      {isOrganizer && isPast && myOrganizerObj && !myQuestionnaireCompleted && (
        <button
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 mb-4"
          onClick={() => setShowQuestionnaireModal(true)}
        >
          Complete Questionnaire
        </button>
      )}
      <EventQuestionnaireModal
        open={showQuestionnaireModal}
        onClose={() => setShowQuestionnaireModal(false)}
        eventType={event?.eventType}
        onSubmit={handleQuestionnaireSubmit}
        isCreator={organizerTeam.length > 0 && organizerTeam[0].user._id === currentUser?._id}
      />
    </div>
  );
}
