import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import axiosInstance from "../api/axiosInstance";
import EventCard from "../components/event/EventCard";
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
import { formatDate } from "../utils/dateUtils";
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
        setVolunteer(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Volunteer not found");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      
      <div className="pt-24 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600">Loading volunteer profile...</span>
            </div>
          ) : error ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Volunteer Not Found</h2>
            <p className="text-gray-600">The volunteer profile you're looking for doesn't exist.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Profile Header */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                {getProfileImageUrl(volunteer) ? (
                  <img
                    src={getProfileImageUrl(volunteer)}
                    alt={volunteer.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-emerald-300 shadow-lg transition-transform duration-500 hover:scale-105"
                  />
                ) : (
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 border-emerald-300 shadow-lg transition-transform duration-500 hover:scale-105 ${getRoleColors('volunteer')}`}>
                      <span className="text-4xl font-bold">{getAvatarInitial(volunteer)}</span>
                    </div>
                  )}
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-center lg:text-left">
                  <h1 className="text-4xl lg:text-5xl font-bold text-emerald-800 mb-2">{volunteer.name}</h1>
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
              </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Details */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <UserIcon className="w-6 h-6" />
                  Personal Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="w-5 h-5 text-gray-500" />
                <div>
                    <span className="font-semibold text-gray-700">Email:</span>
                    <span className="ml-2 text-gray-600">{volunteer.email}</span>
                  </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="w-5 h-5 text-gray-500" />
                    <div>
                    <span className="font-semibold text-gray-700">Phone:</span>
                    <span className="ml-2 text-gray-600">{volunteer.phone}</span>
                  </div>
                    </div>
                  {volunteer.emergencyPhone && (
                    <div className="flex items-center gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                      <div>
                        <span className="font-semibold text-gray-700">Emergency:</span>
                      <span className="ml-2 text-gray-600">{volunteer.emergencyPhone}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <span className="font-semibold text-gray-700">Member Since:</span>
                      <span className="ml-2 text-gray-600">{formatDate(volunteer.createdAt)}</span>
                    </div>
                  </div>
                </div>
                </div>

              {/* Social Links */}
                  {volunteer.socials && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                    <GlobeAltIcon className="w-6 h-6" />
                    Social Media
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                        {volunteer.socials.instagram && (
                      <a 
                        href={volunteer.socials.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 p-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl hover:from-pink-600 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <span className="text-lg">📷</span>
                        <span className="font-semibold">Instagram</span>
                      </a>
                        )}
                        {volunteer.socials.linkedin && (
                      <a 
                        href={volunteer.socials.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <span className="text-lg">💼</span>
                        <span className="font-semibold">LinkedIn</span>
                      </a>
                        )}
                        {volunteer.socials.twitter && (
                      <a 
                        href={volunteer.socials.twitter} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <span className="text-lg">🐦</span>
                        <span className="font-semibold">Twitter</span>
                      </a>
                        )}
                        {volunteer.socials.facebook && (
                      <a 
                        href={volunteer.socials.facebook} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <span className="text-lg">👥</span>
                        <span className="font-semibold">Facebook</span>
                      </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

            {/* About Me Section */}
              {volunteer.aboutMe && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <UserIcon className="w-6 h-6" />
                  About Me
                </h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{volunteer.aboutMe}</p>
                </div>
              )}

            {/* Events Sections */}
            <div className="space-y-8">
              {/* Upcoming Events */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-emerald-800">Upcoming Events</h2>
                    <p className="text-gray-600">Scheduled volunteer activities</p>
                  </div>
              </div>

                {eventsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    <span className="ml-3 text-gray-600">Loading events...</span>
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-gray-500">No upcoming events scheduled.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingEvents.map(e => (
                      <div key={e._id} className="transform hover:scale-[1.02] transition-all duration-300">
                        <EventCard event={e} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past & Live Events */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <CheckCircleIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-blue-800">Past & Live Events</h2>
                    <p className="text-gray-600">Completed and ongoing activities</p>
                  </div>
                </div>

                {eventsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading events...</span>
                  </div>
                ) : pastAndLiveEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">🏆</div>
                    <p className="text-gray-500">No past or live events found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastAndLiveEvents.map(e => (
                      <div key={e._id} className="transform hover:scale-[1.02] transition-all duration-300">
                        <EventCard event={e} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Volunteer Summary */}
            {!eventsLoading && events.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl border border-emerald-200 p-8">
                <h3 className="text-2xl font-bold text-emerald-800 mb-6 flex items-center gap-3">
                  <ExclamationTriangleIcon className="w-7 h-7" />
                  Volunteer Impact Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
                    <div className="text-3xl font-bold text-emerald-600 mb-2">{upcomingEvents.length}</div>
                    <div className="text-gray-700 font-semibold">Upcoming Events</div>
                    <div className="text-sm text-gray-500 mt-1">Scheduled activities</div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{pastAndLiveEvents.length}</div>
                    <div className="text-gray-700 font-semibold">Completed Events</div>
                    <div className="text-sm text-gray-500 mt-1">Past contributions</div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{events.length}</div>
                    <div className="text-gray-700 font-semibold">Total Events</div>
                    <div className="text-sm text-gray-500 mt-1">Volunteer journey</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
    </div>
  );
}
