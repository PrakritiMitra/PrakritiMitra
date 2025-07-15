import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import EventCard from "../components/event/EventCard";
import Footer from "../components/layout/Footer";

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingVisible, setUpcomingVisible] = useState(3);
  const [pastVisible, setPastVisible] = useState(3);
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));

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
  // Debug output
  console.log("All events:", events);
  console.log("Past events:", past);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 px-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Events</h1>
        <h2 className="text-xl font-semibold mb-2">Upcoming Events</h2>
        {loading ? (
          <p>Loading events...</p>
        ) : upcoming.length === 0 ? (
          <p className="text-gray-500">No upcoming events.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcoming.slice(0, upcomingVisible).map(event => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
            {upcoming.length > upcomingVisible && (
              <div className="flex justify-center mt-4">
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  onClick={() => setUpcomingVisible(v => v + 3)}
                >
                  See More
                </button>
              </div>
            )}
          </>
        )}
        <h2 className="text-xl font-semibold mt-10 mb-2">Past Events</h2>
        {loading ? (
          <p>Loading events...</p>
        ) : past.length === 0 ? (
          <p className="text-gray-500 mb-10">No past events.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {past.slice(0, pastVisible).map(event => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
            {past.length > pastVisible && (
              <div className="flex justify-center mt-4">
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  onClick={() => setPastVisible(v => v + 3)}
                >
                  See More
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
} 