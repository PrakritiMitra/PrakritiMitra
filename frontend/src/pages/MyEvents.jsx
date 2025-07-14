import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import EventCard from "../components/event/EventCard";

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
      .get("/api/events", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        // Only keep events created by this organizer
        setEvents(res.data.filter(e => e.createdBy === user._id || (e.createdBy && e.createdBy._id === user._id)));
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
      });
  }, [user]);

  // Helper to get the event's date for filtering
  const getEventDate = (event) => {
    return (
      event.startDateTime ? new Date(event.startDateTime) :
      event.date ? new Date(event.date) :
      event.endDateTime ? new Date(event.endDateTime) :
      null
    );
  };

  const now = new Date();
  const upcoming = events.filter(e => {
    const d = getEventDate(e);
    return d && d >= now;
  }).sort((a, b) => getEventDate(a) - getEventDate(b));
  // Past events: endDateTime < now, or if no endDateTime, startDateTime < now
  const past = events.filter(e => {
    const start = e.startDateTime ? new Date(e.startDateTime) : null;
    const end = e.endDateTime ? new Date(e.endDateTime) : null;
    if (end) return end < now;
    if (start && !end) return start < now;
    return false;
  }).sort((a, b) => {
    const da = getEventDate(a);
    const db = getEventDate(b);
    return db - da;
  });
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
          <p className="text-gray-500">No past events.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
    </div>
  );
} 