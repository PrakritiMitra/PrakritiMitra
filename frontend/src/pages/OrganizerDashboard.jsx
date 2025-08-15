// src/pages/OrganizerDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import EventForm from "../components/event/EventStepOne";
import EventCard from "../components/event/EventCard";
import SimpleEventCalendar from "../components/calendar/SimpleEventCalendar";
import Footer from "../components/layout/Footer";
import { 
  PlusIcon, 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

export default function OrganizerDashboard() {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [events, setEvents] = useState([]);
  const [upcomingVisible, setUpcomingVisible] = useState(4);
  const [pastVisible, setPastVisible] = useState(4);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animation on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Fetch user profile
    axios
      .get("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        withCredentials: true,
      })
      .then((res) => setUser(res.data.user))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoadingEvents(true);
    axios
      .get("/api/events/all-events", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setEvents(res.data);
        setLoadingEvents(false);
      })
      .catch((err) => {
        console.error("Error fetching events:", err);
        setLoadingEvents(false);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // ✅ Use optimized backend route that returns only approved orgs
    axios
      .get("/api/organizations/approved", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setOrganizations(res.data);
        setLoadingOrgs(false);
      })
      .catch((err) => {
        console.error("Error fetching approved organizations:", err);
        setLoadingOrgs(false);
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 animate-pulse">
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

      {/* Main Content with Calendar Sidebar */}
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Header Section */}
            <div className={`mb-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="relative">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  
                </div>

                {/* User Name Display - More compact */}
                <div className="text-center lg:text-left">
                  <div className="flex flex-col lg:flex-row items-center lg:items-baseline gap-2 lg:gap-3 mb-2">
                    <h1 className="text-2xl lg:text-4xl font-bold">
                      <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                        Welcome back,
                      </span>
                    </h1>
                    <h2 className="text-3xl lg:text-5xl font-extrabold relative">
                      <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                        {user?.name || 'Organizer'}
                      </span>
                      {/* Underline Effect */}
                      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-full transform scale-x-0 animate-pulse" style={{ animationDuration: '2s' }}></div>
                    </h2>
                  </div>
                  <p className="text-base lg:text-lg text-slate-600 max-w-2.5xl mx-auto lg:mx-0">
                    Ready to make a difference? Let's create some amazing environmental events together! 🌱✨
                  </p>
                </div>
              </div>
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

            {/* Events Section */}
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
              
              {loadingEvents ? (
                <LoadingSkeleton />
              ) : upcoming.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ExclamationTriangleIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Upcoming Events</h3>
                  <p className="text-slate-600 mb-4">You haven't created any upcoming events yet.</p>
                  <button
                    onClick={() => setShowEventModal(true)}
                    className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 font-medium"
                  >
                    Create Your First Event
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                        onClick={() => setUpcomingVisible(v => v + 4)}
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
              
              {loadingEvents ? (
                <LoadingSkeleton />
              ) : past.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClockIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Past Events</h3>
                  <p className="text-slate-600">Your completed events will appear here.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                        onClick={() => setPastVisible(v => v + 4)}
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

          {/* Calendar Sidebar */}
          <div className="lg:w-80 xl:w-96 lg:flex-shrink-0">
            {user && (
              <div className={`lg:sticky lg:top-20 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center">
                      <CalendarIcon className="w-5 h-5 mr-2 text-emerald-600" />
                      Event Calendar
                    </h3>
                  </div>
                  <SimpleEventCalendar 
                    role="organizer" 
                    userId={user._id} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Form Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white rounded-t-2xl px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Create New Event</h2>
                <button
                  className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:text-red-600 transition-colors"
                  onClick={() => setShowEventModal(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <EventForm
                organizationOptions={organizations}
                onSuccess={() => setShowEventModal(false)}
              />
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
