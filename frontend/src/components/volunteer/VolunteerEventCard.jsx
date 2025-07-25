// src/components/volunteer/VolunteerEventCard.jsx

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import defaultImages from "../../utils/eventTypeImages";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import useEventSlots from '../../hooks/useEventSlots';

const VolunteerEventCard = ({ event }) => {
  const navigate = useNavigate();
  const [isRegistered, setIsRegistered] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (event && event._id && user) {
      axiosInstance.get(`/api/registrations/${event._id}/check`)
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

  // Use the new hook for live slot info
  const { availableSlots, maxVolunteers: hookMaxVolunteers, unlimitedVolunteers: hookUnlimitedVolunteers, loading: slotsLoading } = useEventSlots(_id);

  // User-friendly slot message with color
  let slotMessage = '';
  let slotColor = '';
  if (slotsLoading) {
    slotMessage = 'Loading slots...';
    slotColor = '';
  } else if (hookUnlimitedVolunteers) {
    slotMessage = 'Unlimited slots';
    slotColor = '';
  } else if (typeof availableSlots === 'number') {
    if (availableSlots <= 0) {
      slotMessage = 'No slots left';
      slotColor = 'text-red-600';
    } else if (availableSlots === 1 || availableSlots === 2) {
      slotMessage = `Only ${availableSlots} slot${availableSlots === 1 ? '' : 's'} remaining`;
      slotColor = 'text-red-600';
    } else if (availableSlots >= 3 && availableSlots <= 5) {
      slotMessage = `Only ${availableSlots} slots remaining`;
      slotColor = 'text-orange-500';
    } else {
      slotMessage = `${availableSlots} slots left`;
      slotColor = 'text-green-700';
    }
  }

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
      className="bg-white border rounded-lg shadow hover:shadow-md transition overflow-hidden cursor-pointer relative"
      onClick={() => navigate(`/volunteer/events/${_id}`)}
    >
      {/* LIVE badge */}
      {isLiveEvent && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow z-10 animate-pulse">
          LIVE
        </div>
      )}
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
        <p className={`text-sm ${slotColor}`}>
          <strong>Slots:</strong> {slotMessage}
        </p>
        <p className="text-sm text-gray-800">
          <strong>Location:</strong> {cityState || location}
        </p>
        {/* Registration button logic: hide/disable if no slots left */}
        {isPastEvent ? (
          <p className="text-red-600 font-semibold mt-4">This event has ended</p>
        ) : isRegistered ? (
          <p className="text-green-700 font-semibold">✅ Registered Successfully</p>
        ) : (availableSlots > 0 || hookUnlimitedVolunteers) && (
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
