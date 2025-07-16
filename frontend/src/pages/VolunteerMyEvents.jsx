import React, { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import axiosInstance from "../api/axiosInstance";
import VolunteerEventCard from "../components/volunteer/VolunteerEventCard";

export default function VolunteerMyEvents() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyEvents = async () => {
      try {
        // 1. Get registered event IDs
        const { data } = await axiosInstance.get("/registrations/my-events");
        const eventIds = data.registeredEventIds || [];
        if (eventIds.length === 0) {
          setUpcomingEvents([]);
          setPastEvents([]);
          setLoading(false);
          return;
        }
        // 2. Fetch event details for those IDs
        const eventsRes = await axiosInstance.post("/events/batch", { eventIds });
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 px-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Registered Events</h1>
        {loading ? (
          <p>Loading your events...</p>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-3">Upcoming Events</h2>
              {upcomingEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingEvents.map(event => (
                    <VolunteerEventCard key={event._id} event={event} isRegistered={true} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No upcoming registered events.</p>
              )}
            </section>
            <section>
              <h2 className="text-xl font-semibold mb-3">Past Events</h2>
              {pastEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastEvents.map(event => (
                    <VolunteerEventCard key={event._id} event={event} isRegistered={true} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No past registered events.</p>
              )}
            </section>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
} 