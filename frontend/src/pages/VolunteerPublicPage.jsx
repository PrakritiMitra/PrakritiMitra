import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import axiosInstance from "../api/axiosInstance";
import EventCard from "../components/event/EventCard";

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
    axiosInstance.get(`/users/${id}`)
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
    axiosInstance.get(`/registrations/volunteer/${id}`)
      .then(async res => {
        const registrations = res.data; // array of registration objects
        // 2. For each registration, get eventId
        const eventIds = registrations.map(r => r.eventId);
        // 3. Fetch event details for all eventIds
        const eventPromises = eventIds.map(eventId =>
          axiosInstance.get(`/events/${eventId}`).then(eRes => eRes.data).catch(() => null)
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
                <img
                  src={volunteer.profileImage ? `http://localhost:5000/uploads/Profiles/${volunteer.profileImage}` : '/images/default-profile.jpg'}
                  alt={volunteer.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-green-300 shadow mb-2 transition-transform duration-500 hover:scale-105"
                />
                <h1 className="text-3xl font-bold text-green-800 mb-1 animate-fade-in-slow">{volunteer.name}</h1>
                <span className="text-green-600 font-medium capitalize mb-1">Volunteer</span>
                {volunteer.city && <span className="text-gray-500 text-sm">{volunteer.city}</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700">Email:</span>
                    <span className="ml-2 text-gray-600">{volunteer.email}</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700">Phone:</span>
                    <span className="ml-2 text-gray-600">{volunteer.phone}</span>
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
                <span className="ml-2 text-gray-600">{volunteer.createdAt ? new Date(volunteer.createdAt).toLocaleDateString() : "Not available"}</span>
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
