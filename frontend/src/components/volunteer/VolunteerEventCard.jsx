// src/components/volunteer/VolunteerEventCard.jsx

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import defaultImages from "../../utils/eventTypeImages";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";

const VolunteerEventCard = ({ event }) => {
  const navigate = useNavigate();
  const [isRegistered, setIsRegistered] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (event && event._id && user) {
      axiosInstance.get(`/registrations/${event._id}/check`)
        .then(res => {
          if (res.data.registered) {
            setIsRegistered(true);
          } else {
            setIsRegistered(false);
            // Remove from localStorage if not registered
            const registeredEvents = JSON.parse(localStorage.getItem("registeredEvents") || "[]");
            const idx = registeredEvents.indexOf(event._id);
            if (idx !== -1) {
              registeredEvents.splice(idx, 1);
              localStorage.setItem("registeredEvents", JSON.stringify(registeredEvents));
            }
          }
        })
        .catch(() => {
          // Optionally handle error
        });
    }
  }, [event._id, user]);

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

  // Check if event is in the past
  const isPastEvent = new Date(endDateTime) < new Date();
  // Check if event is live (ongoing)
  const now = new Date();
  const isLiveEvent = new Date(startDateTime) <= now && now < new Date(endDateTime);

  const handleRegister = (e) => {
    e.stopPropagation(); // prevent card navigation
    navigate(`/volunteer/events/${_id}`);
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
          <strong>Organization:</strong> {typeof organization === 'object' && organization?.name ? organization.name : typeof organization === 'string' ? organization : 'Unknown Org'}
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

        {isPastEvent ? (
          <p className="text-red-600 font-semibold mt-4">This event has ended</p>
        ) : isLiveEvent ? (
          <p className="text-blue-700 font-semibold mt-4">Event is live</p>
        ) : isRegistered ? (
          <p className="text-green-700 font-semibold">✅ Registered Successfully</p>
        ) : (
          <button
            onClick={handleRegister}
            className="mt-4 bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
          >
            Register
          </button>
        )}
      </div>
    </div>
  );
};

export default VolunteerEventCard;
