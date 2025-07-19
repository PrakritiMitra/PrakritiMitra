import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import defaultImages from "../../utils/eventTypeImages";
import { format } from "date-fns";
import { joinAsOrganizer, getOrganizerTeam } from "../../api/event";

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

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const isCreator = createdBy === currentUser?._id || createdBy?._id === currentUser?._id;
  const isOrganizer = currentUser?.role === "organizer";
  const canJoinAsOrganizer = isOrganizer && !isCreator && !isTeamMember;

  const isLive = new Date(startDateTime) <= new Date() && new Date() < new Date(endDateTime);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const team = await getOrganizerTeam(_id);
        setOrganizerTeam(team);
        setIsTeamMember(team.some((user) => user._id === currentUser?._id));
      } catch (err) {
        setOrganizerTeam([]);
        setIsTeamMember(false);
      }
    };
    fetchTeam();
  }, [_id, currentUser?._id]);

  const handleJoinAsOrganizer = async (e) => {
    e.preventDefault();
    setJoining(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      await joinAsOrganizer(_id);
      setJoinSuccess("You have joined as an organizer!");
      const team = await getOrganizerTeam(_id);
      setOrganizerTeam(team);
      setIsTeamMember(true);
    } catch (err) {
      setJoinError(err?.response?.data?.message || "Failed to join as organizer.");
    } finally {
      setJoining(false);
    }
  };

  // Determine if event is live
  const now = new Date();
  const isLive = new Date(startDateTime) <= now && now < new Date(endDateTime);

  return (
    <div className="relative">
      <Link to={`/events/${_id}`}>
        <div className="bg-white border rounded-lg shadow hover:shadow-md transition overflow-hidden relative">
          {isLive && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow z-10 animate-pulse">
              LIVE
            </div>
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

      {canJoinAsOrganizer && (
        <button
          onClick={handleJoinAsOrganizer}
          className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 z-10"
          disabled={joining}
        >
          {joining ? "Joining..." : "Join as Organizer"}
        </button>
      )}
      {joinError && <p className="text-xs text-red-600 mt-1 ml-2">{joinError}</p>}
      {joinSuccess && <p className="text-xs text-green-600 mt-1 ml-2">{joinSuccess}</p>}
    </div>
  );
}
