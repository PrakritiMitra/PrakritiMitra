import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import defaultImages from "../../utils/eventTypeImages";
import { format } from "date-fns";
import { joinAsOrganizer, getOrganizerTeam } from "../../api/event";
import axiosInstance from "../../api/axiosInstance";
import useEventSlots from '../../hooks/useEventSlots';
import { addEventToCalendar, downloadCalendarFile, addToWebsiteCalendar, removeFromWebsiteCalendar, checkWebsiteCalendarStatus } from "../../utils/calendarUtils";
import { FaCalendarPlus, FaCalendarMinus } from "react-icons/fa";
import calendarEventEmitter from "../../utils/calendarEventEmitter";

export default function EventCard({ event }) {
  const {
    _id,
    title,
    description,
    eventType,
    organization,
    startDateTime,
    endDateTime,
    location,
    createdBy,
  } = event;

  // Handle recurring event instances - use original event ID for API calls
  const getEffectiveEventId = (id) => {
    // If it's a recurring instance ID (contains '_recurring_'), extract the original event ID
    if (id && id.includes('_recurring_')) {
      return id.split('_recurring_')[0];
    }
    return id;
  };

  const effectiveEventId = getEffectiveEventId(_id);

  // Use the new hook for live slot info
  const { availableSlots, maxVolunteers, unlimitedVolunteers, loading: slotsLoading } = useEventSlots(effectiveEventId);

  // User-friendly slot message with color
  let slotMessage = '';
  let slotColor = '';
  if (slotsLoading) {
    slotMessage = 'Loading slots...';
    slotColor = '';
  } else if (unlimitedVolunteers) {
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
  
  // Recurring event indicators
  const isRecurringInstance = event.isRecurringInstance;
  const recurringInstanceNumber = event.recurringInstanceNumber;
  const recurringPattern = event.recurringEvent ? `${event.recurringType} - ${event.recurringValue}` : null;
  let cityState = location?.split(",").slice(-2).join(", ").trim();

  const [organizerTeam, setOrganizerTeam] = useState([]);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null); // 'pending', 'rejected', null
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState({
    isRegistered: false,
    isInCalendar: false,
    canAddToCalendar: false,
    canRemoveFromCalendar: false
  });

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const isCreator = createdBy === currentUser?._id || createdBy?._id === currentUser?._id;
  const isOrganizer = currentUser?.role === "organizer";
  const canJoinAsOrganizer = isOrganizer && !isCreator && !isTeamMember;

  // Helper: check if user has a rejected request (even if not pending)
  const hasRejectedRequest = event?.organizerJoinRequests?.some(r => {
    const userId = r.user?._id || r.user;
    return userId === currentUser?._id && (r.status === 'rejected' || r._wasRejected);
  });

  // Find the current user's organizerTeam object (handle both object and ID)
  const myOrganizerObj = event.organizerTeam?.find(obj => {
    if (!obj.user) return false;
    if (typeof obj.user === 'object') return obj.user._id === currentUser?._id;
    return obj.user === currentUser?._id;
  });
  const myQuestionnaireCompleted = myOrganizerObj?.questionnaire?.completed;
  const isPast = new Date() > new Date(endDateTime);

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

  // Check calendar status
  useEffect(() => {
    const checkCalendarStatus = async () => {
      if (!currentUser?._id || !_id) return;
      
      try {
        const result = await checkWebsiteCalendarStatus(_id);
        if (result.success) {
          setCalendarStatus(result.data);
        }
      } catch (error) {
        console.error('Error checking calendar status:', error);
      }
    };
    
    checkCalendarStatus();
  }, [_id, currentUser?._id]);

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
  const isPastEvent = new Date(endDateTime) < new Date();

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
      const result = await addToWebsiteCalendar(_id);
      if (result.success) {
        // Refresh calendar status
        const statusResult = await checkWebsiteCalendarStatus(_id);
        if (statusResult.success) {
          setCalendarStatus(statusResult.data);
        }
        console.log(result.message);
      } else {
        console.error(result.message);
      }
    } catch (error) {
      console.error('Error adding to website calendar:', error);
    }
  };

  const handleRemoveFromWebsiteCalendar = async () => {
    try {
      const result = await removeFromWebsiteCalendar(_id);
      if (result.success) {
        // Refresh calendar status
        const statusResult = await checkWebsiteCalendarStatus(_id);
        if (statusResult.success) {
          setCalendarStatus(statusResult.data);
        }
        console.log(result.message);
      } else {
        console.error(result.message);
      }
    } catch (error) {
      console.error('Error removing from website calendar:', error);
    }
  };

  return (
    <div className="relative">
              <Link to={`/events/${effectiveEventId}`}>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative">
          {/* Show LIVE or Ended badge */}
          {isLive && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow z-0 animate-pulse">
              LIVE
            </div>
          )}
          {/* Questionnaire badge for organizers on past events */}
          {isPast && isOrganizer && myOrganizerObj && (
            myQuestionnaireCompleted ? (
              <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow z-0">
                Completed
              </div>
            ) : (
              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow z-0">
                Questionnaire Pending
              </div>
            )
          )}
          <img
            src={eventImage}
            alt={eventType}
            className="w-full h-32 object-cover"
          />
          <div className="p-3">
            <h3 className="text-base font-semibold text-gray-800 mb-1 line-clamp-1">
              {title}
              {isRecurringInstance && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  #{recurringInstanceNumber}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-600 mb-1 capitalize">{eventType}</p>
            {recurringPattern && (
              <p className="text-xs text-blue-600 mb-1">
                <span className="font-medium">Recurring:</span> {recurringPattern}
              </p>
            )}
            <p className="text-xs text-gray-700 mb-1"><span className="font-medium">Org:</span> {organization?.name || "Unknown"}</p>
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{description}</p>
            <p className="text-xs text-gray-700 mb-1"><span className="font-medium">Date:</span> {formattedDate}</p>
            <p className={`text-xs ${slotColor} mb-1`}><span className="font-medium">Slots:</span> {slotMessage}</p>
            <p className="text-xs text-gray-700"><span className="font-medium">Location:</span> {cityState || location}</p>
          </div>
        </div>
      </Link>

      {/* Only show join as organizer buttons if event is not completed */}
      {!isPastEvent && canJoinAsOrganizer && joinRequestStatus !== 'pending' && (
        <button
          onClick={handleRequestJoinAsOrganizer}
          className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 z-0"
          disabled={joining}
        >
          {joining ? "Requesting..." : "Join as Organizer"}
        </button>
      )}
      {!isPastEvent && canJoinAsOrganizer && joinRequestStatus === 'pending' && (
        <div className="absolute top-2 left-2 bg-blue-100 text-blue-700 px-3 py-1 rounded z-0 text-xs font-semibold">Join request sent</div>
      )}
      {!isPastEvent && canJoinAsOrganizer && joinRequestStatus !== 'pending' && hasRejectedRequest && !joining && (
        <button
          onClick={handleRequestJoinAsOrganizer}
          className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 z-0"
          disabled={joining}
        >
          {joining ? "Reapplying..." : "Reapply as Organizer"}
        </button>
      )}
      {!isPastEvent && canJoinAsOrganizer && joinRequestStatus !== 'pending' && !hasRejectedRequest && (
        <button
          onClick={handleRequestJoinAsOrganizer}
          className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 z-0"
          disabled={joining}
        >
          {joining ? "Requesting..." : "Join as Organizer"}
        </button>
      )}
      {!isPastEvent && canJoinAsOrganizer && joinRequestStatus === 'rejected' && joining && (
        <div className="absolute top-2 left-2 bg-blue-100 text-blue-700 px-3 py-1 rounded z-0 text-xs font-semibold">Reapplying...</div>
      )}
      {joinError && <p className="text-xs text-red-600 mt-1 ml-2">{joinError}</p>}
      {joinSuccess && <p className="text-xs text-green-600 mt-1 ml-2">{joinSuccess}</p>}
      
      {/* Add to Calendar Button */}
      <div className="absolute bottom-2 right-2">
        <div className="relative">
          <button
            data-calendar-button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowCalendarOptions(!showCalendarOptions);
            }}
            className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10"
            title="Add to Calendar"
          >
            <FaCalendarPlus className="w-4 h-4" />
          </button>
          
          {/* Calendar Options Dropdown */}
          {showCalendarOptions && (
            <div data-calendar-dropdown className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[220px] z-20">
              {/* Website Calendar Options */}
              {calendarStatus.canAddToCalendar && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddToWebsiteCalendar();
                    setShowCalendarOptions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <FaCalendarPlus className="w-4 h-4" />
                  Add to Website Calendar
                </button>
              )}
              {calendarStatus.canRemoveFromCalendar && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveFromWebsiteCalendar();
                    setShowCalendarOptions(false);
                  }}
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
              {calendarStatus.isOrganizerEvent && (
                <div className="px-3 py-2 text-sm text-gray-500 italic">
                  Organizer events are automatically in calendar
                </div>
              )}
              
              {/* External Calendar Options */}
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddToCalendar();
                  setShowCalendarOptions(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
              >
                <FaCalendarPlus className="w-4 h-4" />
                Add to Google Calendar
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDownloadCalendar();
                  setShowCalendarOptions(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
              >
                <FaCalendarPlus className="w-4 h-4" />
                Download .ics File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
