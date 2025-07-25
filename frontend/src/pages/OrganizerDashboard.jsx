// src/pages/OrganizerDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import EventForm from "../components/event/EventStepOne";
import EventCard from "../components/event/EventCard";
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

      <div className="pt-24 px-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Organizer Dashboard</h1>

        {user ? (
          <div className="space-y-4">
            <div>
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
            </div>

            <Link
              to="/join-organization"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Explore & Join Organizations
            </Link>

            {organizations.length === 0 && !loadingOrgs && (
              <p className="text-sm text-red-500">
                You must be an approved member of an organization to create events.
              </p>
            )}
          </div>
        ) : (
          <p>Loading user data...</p>
        )}
      </div>

      {/* Events Section */}
      <div className="pt-24 px-6 max-w-7xl mx-auto">
        <h2 className="text-xl font-semibold mb-2">Upcoming Events</h2>
        {loadingEvents ? (
          <p>Loading events...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
      <div className="pt-24 px-6 max-w-7xl mx-auto">
        <h2 className="text-xl font-semibold mb-2">Past Events</h2>
        {loadingEvents ? (
          <p>Loading events...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
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

      {/* Event Form Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
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
