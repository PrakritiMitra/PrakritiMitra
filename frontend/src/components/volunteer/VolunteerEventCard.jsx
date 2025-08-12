// src/components/volunteer/VolunteerEventCard.jsx

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import defaultImages from "../../utils/eventTypeImages";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import useEventSlots from '../../hooks/useEventSlots';
import { isEventPast, getRegistrationWithQuestionnaireStatus } from '../../utils/questionnaireUtils';
import { addEventToCalendar, downloadCalendarFile, addToWebsiteCalendar, removeFromWebsiteCalendar, checkWebsiteCalendarStatus } from "../../utils/calendarUtils";
import { FaCalendarPlus, FaCalendarMinus } from "react-icons/fa";
import calendarEventEmitter from "../../utils/calendarEventEmitter";

const VolunteerEventCard = ({ event }) => {
  const navigate = useNavigate();
  const [isRegistered, setIsRegistered] = useState(false);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState({
    isRegistered: false,
    isInCalendar: false,
    canAddToCalendar: false,
    canRemoveFromCalendar: false
  });
  const user = JSON.parse(localStorage.getItem("user"));

  // Handle recurring event instances - use original event ID for API calls
  const getEffectiveEventId = (id) => {
    // If it's a recurring instance ID (contains '_recurring_'), extract the original event ID
    if (id && id.includes('_recurring_')) {
      return id.split('_recurring_')[0];
    }
    return id;
  };

  const effectiveEventId = getEffectiveEventId(event._id);

  // Check if user is removed or banned from this event
  const isRemoved = event?.removedVolunteers?.includes(user?._id);
  const isBanned = event?.bannedVolunteers?.includes(user?._id);

  useEffect(() => {
    const checkRegistrationAndQuestionnaire = async () => {
      if (!effectiveEventId || !user) return;
      
      try {
        // Check if user is registered
        const registrationCheck = await axiosInstance.get(`/api/registrations/${effectiveEventId}/check`);
        
        if (registrationCheck.data.registered) {
          setIsRegistered(true);
          
          // If registered and event is past, check questionnaire status
          if (isEventPast(event.endDateTime)) {
            const { questionnaireCompleted } = await getRegistrationWithQuestionnaireStatus(effectiveEventId);
            setQuestionnaireCompleted(questionnaireCompleted);
          } else {
            setQuestionnaireCompleted(false);
          }
        } else {
          setIsRegistered(false);
          setQuestionnaireCompleted(false);
          
          // Remove from localStorage if not registered
          const registeredEvents = JSON.parse(localStorage.getItem("registeredEvents") || "[]");
          const idx = registeredEvents.indexOf(effectiveEventId);
          if (idx !== -1) {
            registeredEvents.splice(idx, 1);
            localStorage.setItem("registeredEvents", JSON.stringify(registeredEvents));
          }
        }
      } catch (error) {
        console.error('Error checking registration and questionnaire status:', error);
        setIsRegistered(false);
        setQuestionnaireCompleted(false);
      }
    };
    
    checkRegistrationAndQuestionnaire();
  }, [effectiveEventId, user, event.endDateTime]);

  // Check calendar status
  useEffect(() => {
    const checkCalendarStatus = async () => {
      if (!user?._id || !effectiveEventId) return;
      
      try {
        const result = await checkWebsiteCalendarStatus(effectiveEventId);
        if (result.success) {
          setCalendarStatus(result.data);
        }
      } catch (error) {
        console.error('Error checking calendar status:', error);
      }
    };
    checkCalendarStatus();
  }, [effectiveEventId, user?._id]);

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
  const { availableSlots, maxVolunteers: hookMaxVolunteers, unlimitedVolunteers: hookUnlimitedVolunteers, loading: slotsLoading } = useEventSlots(effectiveEventId);

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
            navigate(`/volunteer/events/${effectiveEventId}`);
  };

  // Calendar functions
  const handleAddToCalendar = (e) => {
    e.stopPropagation(); // prevent card navigation
  };

  const handleDownloadCalendar = (e) => {
    e.stopPropagation(); // prevent card navigation
  };

  const handleAddToWebsiteCalendar = async (e) => {
    e.stopPropagation(); // prevent card navigation
    try {
      const result = await addToWebsiteCalendar(event._id);
      if (result.success) {
        const statusResult = await checkWebsiteCalendarStatus(event._id);
        if (statusResult.success) setCalendarStatus(statusResult.data);
      } else { console.error(result.message); }
    } catch (error) { console.error('Error adding to website calendar:', error); }
  };

  const handleRemoveFromWebsiteCalendar = async (e) => {
    e.stopPropagation(); // prevent card navigation
    try {
      const result = await removeFromWebsiteCalendar(event._id);
      if (result.success) {
        const statusResult = await checkWebsiteCalendarStatus(event._id);
        if (statusResult.success) setCalendarStatus(statusResult.data);
      } else { console.error(result.message); }
    } catch (error) { console.error('Error removing from website calendar:', error); }
  };

  return (
    <div
      className="bg-white border rounded-lg shadow hover:shadow-md transition overflow-hidden cursor-pointer relative"
                      onClick={() => navigate(`/volunteer/events/${effectiveEventId}`)}
    >
      {/* Add to Calendar Button */}
      <div className="absolute bottom-2 right-2 z-10">
        <button
          data-calendar-button
          onClick={(e) => {
            e.stopPropagation();
            setShowCalendarOptions(!showCalendarOptions);
          }}
          className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Add to Calendar"
        >
          <FaCalendarPlus className="w-4 h-4" />
        </button>
        
        {/* Calendar Options Dropdown */}
        {showCalendarOptions && (
          <div data-calendar-dropdown className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[220px] z-50">
            {/* Website Calendar Options */}
            {calendarStatus.canAddToCalendar && (
              <button
                onClick={handleAddToWebsiteCalendar}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
              >
                <FaCalendarPlus className="w-4 h-4" />
                Add to Website Calendar
              </button>
            )}
            {calendarStatus.canRemoveFromCalendar && (
              <button
                onClick={handleRemoveFromWebsiteCalendar}
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
            
            {/* External Calendar Options */}
            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={handleAddToCalendar}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <FaCalendarPlus className="w-4 h-4" />
              Add to Google Calendar
            </button>
            <button
              onClick={handleDownloadCalendar}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <FaCalendarPlus className="w-4 h-4" />
              Download .ics File
            </button>
          </div>
        )}
      </div>
      {/* LIVE badge */}
      {isLiveEvent && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow z-10 animate-pulse">
          LIVE
        </div>
      )}
      {/* Questionnaire badge for registered volunteers on past events */}
      {isPastEvent && isRegistered && (
        questionnaireCompleted ? (
          <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow z-10">
            Completed
          </div>
        ) : (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow z-10">
            Questionnaire Pending
          </div>
        )
      )}
      <img src={eventImage} alt={eventType} className="w-full h-40 object-cover" />
      <div className="p-4">
        <h3 className="text-lg font-bold text-blue-800 mb-1">
          {title}
          {event.isRecurringInstance && (
            <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
              #{event.recurringInstanceNumber}
            </span>
          )}
        </h3>
        <p className="text-sm text-gray-800 mb-1">{eventType}</p>
        {event.recurringEvent && (
          <p className="text-sm text-blue-600 mb-1">
            <span className="font-medium">Recurring:</span> {event.recurringType} - {event.recurringValue}
          </p>
        )}
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
        ) : isBanned ? (
          <p className="text-red-600 font-semibold mt-4">🚫 Banned from this event</p>
        ) : isRemoved ? (
          <p className="text-yellow-600 font-semibold mt-4">⚠️ Removed from this event</p>
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
