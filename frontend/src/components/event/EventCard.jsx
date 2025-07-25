import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import defaultImages from "../../utils/eventTypeImages";
import { format } from "date-fns";
import { joinAsOrganizer, getOrganizerTeam } from "../../api/event";
import axiosInstance from "../../api/axiosInstance";

export default function EventCard({ event }) {
  const {
    _id,
    title,
    description,
    eventType,
    organization,
    startDateTime,
    endDateTime,
    maxVolunteers,
    unlimitedVolunteers,
    volunteers = [],
    location,
    createdBy,
  } = event;

  const filled = volunteers.length;
  const total = unlimitedVolunteers ? "∞" : maxVolunteers;

  const formattedDate = `${format(new Date(startDateTime), "d MMMM, yyyy")} — ${format(
    new Date(endDateTime),
    "h:mm a"
  )}`;

  const eventImage = defaultImages[eventType?.toLowerCase()] || defaultImages["default"];
  let cityState = location?.split(",").slice(-2).join(", ").trim();

  const [organizerTeam, setOrganizerTeam] = useState([]);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null); // 'pending', 'rejected', null

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const isCreator = createdBy === currentUser?._id || createdBy?._id === currentUser?._id;
  const isOrganizer = currentUser?.role === "organizer";
  const canJoinAsOrganizer = isOrganizer && !isCreator && !isTeamMember;

  // Helper: check if user has a rejected request (even if not pending)
  const hasRejectedRequest = event?.organizerJoinRequests?.some(r => {
    const userId = r.user?._id || r.user;
    return userId === currentUser?._id && (r.status === 'rejected' || r._wasRejected);
  });

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const team = await getOrganizerTeam(_id);
        setOrganizerTeam(team);
        setIsTeamMember(team.some((user) => user._id === currentUser?._id));
        // Fetch event details to check join request status
        const res = await axiosInstance.get(`/api/events/${_id}`);
        if (res.data.organizerJoinRequests && currentUser) {
          const reqObj = res.data.organizerJoinRequests.find(r => r.user === currentUser._id || (r.user && r.user._id === currentUser._id));
          if (reqObj) setJoinRequestStatus(reqObj.status);
          else setJoinRequestStatus(null);
        } else {
          setJoinRequestStatus(null);
        }
      } catch (err) {
        setOrganizerTeam([]);
        setIsTeamMember(false);
        setJoinRequestStatus(null);
      }
    };
    fetchTeam();
  }, [_id, currentUser?._id]);

  // Handler to send join request as organizer
  const handleRequestJoinAsOrganizer = async (e) => {
    e.preventDefault();
    setJoining(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      await axiosInstance.post(`/api/events/${_id}/request-join-organizer`);
      // Always fetch latest status from backend after reapply
      const res = await axiosInstance.get(`/api/events/${_id}`);
      if (res.data.organizerJoinRequests && currentUser) {
        const reqObj = res.data.organizerJoinRequests.find(r => r.user === currentUser._id || (r.user && r.user._id === currentUser._id));
        if (reqObj) setJoinRequestStatus(reqObj.status);
        else setJoinRequestStatus(null);
      } else {
        setJoinRequestStatus(null);
      }
      setJoinSuccess('Join request sent!');
    } catch (err) {
      setJoinError(err?.response?.data?.message || "Failed to send join request.");
    } finally {
      setJoining(false);
    }
  };

  // Determine if event is live
  const now = new Date();
  const isLive = new Date(startDateTime) <= now && now < new Date(endDateTime);
  const isPast = now > new Date(endDateTime);

  return (
    <div className="relative">
      <Link to={`/events/${_id}`}>
        <div className="bg-white border rounded-lg shadow hover:shadow-md transition overflow-hidden relative">
          {isLive && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow z-10 animate-pulse">
              LIVE
            </div>
          )}
          {/* Questionnaire badge for organizers on past events */}
          {isPast && isOrganizer && (
            event.questionnaire?.completed ? (
              <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow z-10">
                Completed
              </div>
            ) : (
              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow z-10">
                Questionnaire Pending
              </div>
            )
          )}
          <img
            src={eventImage}
            alt={eventType}
            className="w-full h-40 object-cover"
          />
          <div className="p-4">
            <h3 className="text-lg font-bold text-blue-800 mb-1">{title}</h3>
            <p className="text-sm text-gray-800 mb-1">{eventType}</p>
            <p className="text-sm text-gray-800 mb-1"><strong>Organization:</strong> {organization?.name || "Unknown Org"}</p>
            <p className="text-sm text-gray-800 line-clamp-2"><strong>Description: </strong>{description}</p>
            <p className="text-sm text-gray-800 mt-2"><strong>Date:</strong> {formattedDate}</p>
            <p className="text-sm text-gray-800"><strong>Slots:</strong> {filled} / {total}</p>
            <p className="text-sm text-gray-800"><strong>Location:</strong> {cityState || location}</p>
          </div>
        </div>
      </Link>

      {canJoinAsOrganizer && joinRequestStatus !== 'pending' && (
        <button
          onClick={handleRequestJoinAsOrganizer}
          className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 z-10"
          disabled={joining}
        >
          {joining ? "Requesting..." : "Join as Organizer"}
        </button>
      )}
      {canJoinAsOrganizer && joinRequestStatus === 'pending' && (
        <div className="absolute top-2 left-2 bg-blue-100 text-blue-700 px-3 py-1 rounded z-10 text-xs font-semibold">Join request sent</div>
      )}
      {canJoinAsOrganizer && joinRequestStatus !== 'pending' && hasRejectedRequest && !joining && (
        <button
          onClick={handleRequestJoinAsOrganizer}
          className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 z-10"
          disabled={joining}
        >
          {joining ? "Reapplying..." : "Reapply as Organizer"}
        </button>
      )}
      {canJoinAsOrganizer && joinRequestStatus !== 'pending' && !hasRejectedRequest && (
        <button
          onClick={handleRequestJoinAsOrganizer}
          className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 z-10"
          disabled={joining}
        >
          {joining ? "Requesting..." : "Join as Organizer"}
        </button>
      )}
      {canJoinAsOrganizer && joinRequestStatus === 'rejected' && joining && (
        <div className="absolute top-2 left-2 bg-blue-100 text-blue-700 px-3 py-1 rounded z-10 text-xs font-semibold">Reapplying...</div>
      )}
      {joinError && <p className="text-xs text-red-600 mt-1 ml-2">{joinError}</p>}
      {joinSuccess && <p className="text-xs text-green-600 mt-1 ml-2">{joinSuccess}</p>}
    </div>
  );
}
