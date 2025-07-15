// src/components/volunteer/VolunteerEventCard.jsx

import React from "react";
import { format } from "date-fns";
import defaultImages from "../../utils/eventTypeImages";
import { useNavigate } from "react-router-dom";

const VolunteerEventCard = ({ event }) => {
  const navigate = useNavigate();

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
  } = event;

  const filled = volunteers.length;
  const total = unlimitedVolunteers ? "∞" : maxVolunteers;

  const formattedDate = `${format(new Date(startDateTime), "d MMMM, yyyy")} — ${format(
    new Date(endDateTime),
    "h:mm a"
  )}`;

  const eventImage = defaultImages[eventType?.toLowerCase()] || defaultImages["default"];
  const cityState = location?.split(",").slice(-2).join(", ").trim();

  const handleRegister = (e) => {
    e.stopPropagation(); // prevent card navigation
    console.log("Register clicked for event:", _id);
    // Registration logic to be added later
  };

  return (
    <div
      className="bg-white border rounded-lg shadow hover:shadow-md transition overflow-hidden cursor-pointer"
      onClick={() => navigate(`/volunteer/events/${_id}`)}
    >
      <img src={eventImage} alt={eventType} className="w-full h-40 object-cover" />
      <div className="p-4">
        <h3 className="text-lg font-bold text-blue-800 mb-1">{title}</h3>
        <p className="text-sm text-gray-800 mb-1">{eventType}</p>
        <p className="text-sm text-gray-800 mb-1">
          <strong>Organization:</strong> {organization?.name || "Unknown Org"}
        </p>
        <p className="text-sm text-gray-800 line-clamp-2">
          <strong>Description:</strong> {description}
        </p>
        <p className="text-sm text-gray-800 mt-2">
          <strong>Date:</strong> {formattedDate}
        </p>
        <p className="text-sm text-gray-800">
          <strong>Slots:</strong> {filled} / {total}
        </p>
        <p className="text-sm text-gray-800">
          <strong>Location:</strong> {cityState || location}
        </p>

        <button
          onClick={handleRegister}
          className="mt-4 bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
        >
          Register
        </button>
      </div>
    </div>
  );
};

export default VolunteerEventCard;
