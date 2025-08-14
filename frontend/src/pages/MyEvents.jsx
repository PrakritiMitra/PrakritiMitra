import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import EventCard from "../components/event/EventCard";
import { 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingVisible, setUpcomingVisible] = useState(3);
  const [pastVisible, setPastVisible] = useState(3);
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animation on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    axios
      .get("/api/events/my-events", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setEvents(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
      });
  }, [user]);

  // Helper to get the event's date for filtering
  // Only consider events with valid startDateTime
  const now = new Date();
  const validEvents = events.filter(e => e.startDateTime && !isNaN(new Date(e.startDateTime)));
  const upcoming = validEvents.filter(e => new Date(e.startDateTime) >= now).sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
  const past = validEvents.filter(e => new Date(e.startDateTime) < now).sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime));

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-6 animate-pulse">
          <div className="h-4 bg-slate-200 rounded mb-3"></div>
          <div className="h-6 bg-slate-200 rounded mb-4"></div>
          <div className="h-3 bg-slate-200 rounded mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
            My Events
          </h1>
          <p className="text-slate-600 text-lg">
            Manage and view all your upcoming and past events
          </p>
        </div>

        {/* Quick Stats */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-2xl shadow-lg border border-blue-200/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 font-medium">Upcoming Events</p>
                <p className="text-2xl font-bold text-slate-900">{upcoming.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 rounded-2xl shadow-lg border border-emerald-200/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 font-medium">Past Events</p>
                <p className="text-2xl font-bold text-slate-900">{past.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 rounded-2xl shadow-lg border border-purple-200/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 font-medium">Total Events</p>
                <p className="text-2xl font-bold text-slate-900">{events.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Events Section */}
        <div className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center">
              <CalendarIcon className="w-6 h-6 mr-3 text-emerald-600" />
              Upcoming Events
            </h2>
            {upcoming.length > 0 && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                {upcoming.length} event{upcoming.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {loading ? (
            <LoadingSkeleton />
          ) : upcoming.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Upcoming Events</h3>
              <p className="text-slate-600">You haven't registered for any upcoming events yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {upcoming.slice(0, upcomingVisible).map(event => (
                  <div key={event._id} className="transform hover:-translate-y-1 transition-all duration-300">
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
              {upcoming.length > upcomingVisible && (
                <div className="flex justify-center mt-8">
                  <button
                    className="group px-6 py-3 bg-white/80 backdrop-blur-sm text-slate-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-2 border-slate-200 hover:border-slate-300"
                    onClick={() => setUpcomingVisible(v => v + 3)}
                  >
                    <span className="flex items-center justify-center">
                      Show More Events
                      <ChevronDownIcon className="w-4 h-4 ml-2 group-hover:translate-y-1 transition-transform" />
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Past Events Section */}
        <div className={`mb-8 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center">
              <CheckCircleIcon className="w-6 h-6 mr-3 text-blue-600" />
              Past Events
            </h2>
            {past.length > 0 && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {past.length} event{past.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {loading ? (
            <LoadingSkeleton />
          ) : past.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DocumentTextIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Past Events</h3>
              <p className="text-slate-600">Your completed events will appear here.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {past.slice(0, pastVisible).map(event => (
                  <div key={event._id} className="transform hover:-translate-y-1 transition-all duration-300">
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
              {past.length > pastVisible && (
                <div className="flex justify-center mt-8">
                  <button
                    className="group px-6 py-3 bg-white/80 backdrop-blur-sm text-slate-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-2 border-slate-200 hover:border-slate-300"
                    onClick={() => setPastVisible(v => v + 3)}
                  >
                    <span className="flex items-center justify-center">
                      Show More Events
                      <ChevronDownIcon className="w-4 h-4 ml-2 group-hover:translate-y-1 transition-transform" />
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 