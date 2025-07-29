// src/pages/OrganizerDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import EventForm from "../components/event/EventStepOne";
import EventCard from "../components/event/EventCard";
import SimpleEventCalendar from "../components/calendar/SimpleEventCalendar";
import Footer from "../components/layout/Footer";

export default function OrganizerDashboard() {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [events, setEvents] = useState([]);
  const [upcomingVisible, setUpcomingVisible] = useState(4);
  const [pastVisible, setPastVisible] = useState(4);
  const [loadingEvents, setLoadingEvents] = useState(true);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content with Calendar Sidebar */}
      <div className="pt-16 px-1 w-full">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Main Content */}
          <div className="flex-1">
            {/* Events Section */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-800">Upcoming Events</h2>
              {loadingEvents ? (
                <p>Loading events...</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {upcoming.slice(0, upcomingVisible).map(event => (
                      <EventCard key={event._id} event={event} />
                    ))}
                  </div>
                  {upcoming.length > upcomingVisible && (
                    <div className="flex justify-center mt-4">
                      <button
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        onClick={() => setUpcomingVisible(v => v + 4)}
                      >
                        See More
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-800">Past Events</h2>
              {loadingEvents ? (
                <p>Loading events...</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
                    {past.slice(0, pastVisible).map(event => (
                      <EventCard key={event._id} event={event} />
                    ))}
                  </div>
                  {past.length > pastVisible && (
                    <div className="flex justify-center mt-4">
                      <button
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        onClick={() => setPastVisible(v => v + 4)}
                      >
                        See More
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Calendar Sidebar */}
          <div className="lg:w-96 lg:flex-shrink-0">
            {user && (
              <div className="sticky top-20">
                <SimpleEventCalendar 
                  role="organizer" 
                  userId={user._id} 
                />
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Event Form Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-xl relative">
            <button
              className="absolute top-2 right-3 text-xl text-gray-500 hover:text-red-600"
              onClick={() => setShowEventModal(false)}
            >
              ×
            </button>
            <EventForm
              organizationOptions={organizations}
              onSuccess={() => setShowEventModal(false)}
            />
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
