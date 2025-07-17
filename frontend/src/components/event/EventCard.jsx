import React from "react";
import { Link } from "react-router-dom";
import defaultImages from "../../utils/eventTypeImages";
import { format } from "date-fns";

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
  } = event;

  // Determine filled/total slots
  const filled = volunteers.length;
  const total = unlimitedVolunteers ? "∞" : maxVolunteers;

  // Format date
  const formattedDate = `${format(new Date(startDateTime), "d MMMM, yyyy")} — ${format(
    new Date(endDateTime),
    "h:mm a"
  )}`;

  // Determine fallback image based on eventType
  const eventImage = defaultImages[eventType?.toLowerCase()] || defaultImages["default"];

  // Extract City, State (basic split)
  let cityState = location?.split(",").slice(-2).join(", ").trim();

  // Determine if event is live
  const now = new Date();
  const isLive = new Date(startDateTime) <= now && now < new Date(endDateTime);

  return (
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
  );
}
