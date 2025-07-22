import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import VolunteerEventCard from "./VolunteerEventCard";

const VolunteerEventsTab = () => {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axiosInstance.get("/api/events/all-events", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const now = new Date();
        const future = data
          .filter((event) => new Date(event.startDateTime) >= now)
          .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

        const past = data
          .filter((event) => new Date(event.startDateTime) < now)
          .sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime));

        setUpcomingEvents(future);
        setPastEvents(past);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) return <p>Loading events...</p>;

  return (
    <div>
      {/* Upcoming Events */}
      <h2 className="text-xl font-semibold mb-3">Upcoming Events</h2>
      {upcomingEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingEvents.map((event) => (
            <VolunteerEventCard key={event._id} event={event} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No upcoming events available.</p>
      )}

      {/* Past Events */}
      <h2 className="text-xl font-semibold mt-8 mb-3">Past Events</h2>
      {pastEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pastEvents.map((event) => (
            <VolunteerEventCard key={event._id} event={event} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No past events found.</p>
      )}
    </div>
  );
};

export default VolunteerEventsTab;
