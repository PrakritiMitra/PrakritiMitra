import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import axiosInstance from "../api/axiosInstance";
import EventCard from "../components/event/EventCard";
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
import { formatDate } from "../utils/dateUtils";
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  getSafeUserName, 
  getSafeUserRole 
} from "../utils/safeUserUtils";
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon, 
  CalendarIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon
} from "@heroicons/react/24/outline";

export default function VolunteerPublicPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    axiosInstance.get(`/api/users/${id}`)
      .then(res => {
        // Check if user data indicates a deleted account
        const safeVolunteerData = getSafeUserData(res.data);
        if (safeVolunteerData.isDeleted) {
          setError("This volunteer account has been deleted");
          setLoading(false);
          return;
        }
        setVolunteer(safeVolunteerData);
        setLoading(false);
      })
      .catch((err) => {
        if (err.response?.data?.error === 'ACCOUNT_DELETED') {
          setError("This volunteer account has been deleted");
        } else {
          setError("Volunteer not found");
        }
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setEventsLoading(true);
    // 1. Get registrations for this volunteer
    axiosInstance.get(`/api/registrations/volunteer/${id}`)
      .then(async res => {
        const registrations = res.data; // array of registration objects
        // 2. For each registration, get eventId
        const eventIds = registrations.map(r => r.eventId);
        // 3. Fetch event details for all eventIds
        const eventPromises = eventIds.map(eventId =>
          axiosInstance.get(`/api/events/${eventId}`).then(eRes => eRes.data).catch(() => null)
        );
        const eventsData = (await Promise.all(eventPromises)).filter(e => !!e);
        setEvents(eventsData);
        setEventsLoading(false);
      })
      .catch(() => setEventsLoading(false));
  }, [id]);

  // Split events into upcoming and past+live
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.startDateTime) > now);
  const pastAndLiveEvents = events.filter(e => new Date(e.startDateTime) <= now).sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-8 animate-fade-in">
          {loading ? (
            <div className="animate-pulse space-y-6">
              <div className="h-24 w-24 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto" />
              <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
              <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto" />
              <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto" />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 font-semibold text-lg">{error}</div>
          ) : (
            <>
              <div className="flex flex-col items-center mb-6">
                {getProfileImageUrl(volunteer) ? (
                  <img
                    src={getProfileImageUrl(volunteer)}
                    alt={getSafeUserName(volunteer)}
                    className="w-32 h-32 rounded-full object-cover border-4 border-emerald-300 shadow-lg transition-transform duration-500 hover:scale-105"
                  />
                ) : (
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 border-emerald-300 shadow-lg transition-transform duration-500 hover:scale-105 ${getRoleColors('volunteer')}`}>
                    <span className="text-4xl font-bold">{getAvatarInitial(volunteer)}</span>
                  </div>
                )}
                {/* Profile Info */}
                <div className="flex-1 text-center lg:text-left">
                  <h1 className="text-4xl lg:text-5xl font-bold text-emerald-800 mb-2">{getSafeUserName(volunteer)}</h1>
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                    <span className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-full text-sm">
                      Volunteer
                    </span>
                    {volunteer.city && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <MapPinIcon className="w-4 h-4" />
                        <span>{volunteer.city}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-lg text-gray-600 max-w-2xl">
                    {volunteer.aboutMe || "Passionate volunteer making a difference in the community."}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700">Email:</span>
                    <span className="ml-2 text-gray-600">{volunteer.email || 'Not available'}</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700">Phone:</span>
                    <span className="ml-2 text-gray-600">{volunteer.phone || 'Not available'}</span>
                  </div>
                  {volunteer.city && (
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">City:</span>
                      <span className="ml-2 text-gray-600">{volunteer.city}</span>
                    </div>
                  )}
                  {volunteer.emergencyPhone && (
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Emergency Phone:</span>
                      <span className="ml-2 text-gray-600">{volunteer.emergencyPhone}</span>
                    </div>
                  )}
                </div>
                <div>
                  {volunteer.socials && (
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Socials:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {volunteer.socials.instagram && (
                          <a href={volunteer.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">Instagram</a>
                        )}
                        {volunteer.socials.linkedin && (
                          <a href={volunteer.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">LinkedIn</a>
                        )}
                        {volunteer.socials.twitter && (
                          <a href={volunteer.socials.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Twitter</a>
                        )}
                        {volunteer.socials.facebook && (
                          <a href={volunteer.socials.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Facebook</a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {volunteer.aboutMe && (
                <div className="mb-4">
                  <span className="font-semibold text-gray-700">About Me:</span>
                  <p className="ml-2 text-gray-600 mt-1 whitespace-pre-line">{volunteer.aboutMe}</p>
                </div>
              )}
              <div className="mb-4">
                <span className="font-semibold text-gray-700">Member Since:</span>
                <span className="ml-2 text-gray-600">{formatDate(volunteer.createdAt)}</span>
              </div>
              {/* Registered Events */}
              <div className="mt-10">
                <h2 className="text-2xl font-bold text-green-700 mb-4">Upcoming Events</h2>
                {eventsLoading ? (
                  <p>Loading events...</p>
                ) : upcomingEvents.length === 0 ? (
                  <p className="text-gray-500">No upcoming events.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {upcomingEvents.map(e => (
                      <EventCard key={e._id} event={e} />
                    ))}
                  </div>
                )}
                <h2 className="text-2xl font-bold text-gray-700 mt-10 mb-4">Past & Live Events</h2>
                {eventsLoading ? (
                  <p>Loading events...</p>
                ) : pastAndLiveEvents.length === 0 ? (
                  <p className="text-gray-500">No past or live events.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {pastAndLiveEvents.map(e => (
                      <EventCard key={e._id} event={e} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {/* Fade-in animation keyframes */}
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
        .animate-fade-in-slow {
          animation: fadeIn 1.2s cubic-bezier(0.4,0,0.2,1) both;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
