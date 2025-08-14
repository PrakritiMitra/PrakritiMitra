import React, { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import axiosInstance from "../api/axiosInstance";
import VolunteerEventCard from "../components/volunteer/VolunteerEventCard";
import { CalendarIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function VolunteerMyEvents() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyEvents = async () => {
      try {
        // 1. Get registered event IDs
        const { data } = await axiosInstance.get("/api/registrations/my-events");
        const eventIds = data.registeredEventIds || [];
        if (eventIds.length === 0) {
          setUpcomingEvents([]);
          setPastEvents([]);
          setLoading(false);
          return;
        }
        // 2. Fetch event details for those IDs
        const eventsRes = await axiosInstance.post("/api/events/batch", { eventIds });
        const now = new Date();
        const upcoming = eventsRes.data.filter(e => new Date(e.endDateTime) >= now);
        const past = eventsRes.data.filter(e => new Date(e.endDateTime) < now);
        setUpcomingEvents(upcoming);
        setPastEvents(past);
      } catch (err) {
        setUpcomingEvents([]);
        setPastEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMyEvents();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      
      <div className="pt-24 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-blue-800 mb-4 flex items-center gap-3">
            <CalendarIcon className="w-10 h-10 text-blue-600" />
            My Registered Events
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Track your volunteer journey and stay updated on your upcoming commitments. 
            Review your past contributions and their impact on the community.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600">Loading your events...</span>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <div className="space-y-12">
            {/* Upcoming Events Section */}
            <section className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <ClockIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-emerald-800">Upcoming Events</h2>
                  <p className="text-gray-600">Your scheduled volunteer activities</p>
                </div>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingEvents.map(event => (
                    <div key={event._id} className="transform hover:scale-[1.02] transition-all duration-300">
                      <VolunteerEventCard event={event} isRegistered={true} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Upcoming Events</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    You don't have any upcoming registered events. 
                    Explore volunteer opportunities to get started!
                  </p>
                </div>
              )}
            </section>

            {/* Past Events Section */}
            <section className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-blue-800">Past Events</h2>
                  <p className="text-gray-600">Your completed volunteer activities</p>
                </div>
              </div>

              {pastEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastEvents.map(event => (
                    <div key={event._id} className="transform hover:scale-[1.02] transition-all duration-300">
                      <VolunteerEventCard event={event} isRegistered={true} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏆</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Past Events</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    You haven't completed any events yet. 
                    Start volunteering to build your impact history!
                  </p>
                </div>
              )}
            </section>

            {/* Summary Section */}
            {!loading && (upcomingEvents.length > 0 || pastEvents.length > 0) && (
              <section className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl border border-emerald-200 p-8">
                <h3 className="text-2xl font-bold text-emerald-800 mb-6 flex items-center gap-3">
                  <ExclamationTriangleIcon className="w-7 h-7" />
                  Your Volunteer Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
                    <div className="text-3xl font-bold text-emerald-600 mb-2">{upcomingEvents.length}</div>
                    <div className="text-gray-700 font-semibold">Upcoming Events</div>
                    <div className="text-sm text-gray-500 mt-1">Scheduled activities</div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{pastEvents.length}</div>
                    <div className="text-gray-700 font-semibold">Completed Events</div>
                    <div className="text-sm text-gray-500 mt-1">Past contributions</div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{upcomingEvents.length + pastEvents.length}</div>
                    <div className="text-gray-700 font-semibold">Total Events</div>
                    <div className="text-sm text-gray-500 mt-1">Your volunteer journey</div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}