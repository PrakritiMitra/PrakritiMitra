import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import VolunteerEventCard from "./VolunteerEventCard";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

const VolunteerEventsTab = () => {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [upcomingVisible, setUpcomingVisible] = useState(6);
  const [pastVisible, setPastVisible] = useState(6);

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

  // Filter events based on search term
  const filterEvents = (events) => {
    if (!searchTerm.trim()) return events;
    
    const searchLower = searchTerm.toLowerCase();
    return events.filter(event => {
      const title = event.title?.toLowerCase() || '';
      const description = event.description?.toLowerCase() || '';
      const organizationName = event.organization?.name?.toLowerCase() || '';
      const eventType = event.eventType?.toLowerCase() || '';
      const location = event.location?.toLowerCase() || '';
      
      return title.includes(searchLower) ||
             description.includes(searchLower) ||
             organizationName.includes(searchLower) ||
             eventType.includes(searchLower) ||
             location.includes(searchLower);
    });
  };

  const filteredUpcomingEvents = filterEvents(upcomingEvents);
  const filteredPastEvents = filterEvents(pastEvents);

  if (loading) return <p>Loading events...</p>;

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search events by title, description, organization, type, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <h2 className="text-xl font-semibold mb-3">Upcoming Events</h2>
      {filteredUpcomingEvents.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUpcomingEvents.slice(0, upcomingVisible).map((event) => (
              <VolunteerEventCard key={event._id} event={event} />
            ))}
          </div>
          {filteredUpcomingEvents.length > upcomingVisible && (
            <div className="flex justify-center mt-6">
              <button
                className="group px-6 py-3 bg-white/80 backdrop-blur-sm text-slate-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-2 border-slate-200 hover:border-slate-300"
                onClick={() => setUpcomingVisible(v => v + 6)}
              >
                <span className="flex items-center justify-center">
                  Show More Events
                  <ChevronDownIcon className="w-4 h-4 ml-2 group-hover:translate-y-1 transition-transform" />
                </span>
              </button>
            </div>
          )}
        </>
      ) : searchTerm ? (
        <p className="text-gray-500">No upcoming events found matching "{searchTerm}".</p>
      ) : (
        <p className="text-gray-500">No upcoming events available.</p>
      )}

      {/* Past Events */}
      <h2 className="text-xl font-semibold mt-8 mb-3">Past Events</h2>
      {filteredPastEvents.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPastEvents.slice(0, pastVisible).map((event) => (
              <VolunteerEventCard key={event._id} event={event} />
            ))}
          </div>
          {filteredPastEvents.length > pastVisible && (
            <div className="flex justify-center mt-6">
              <button
                className="group px-6 py-3 bg-white/80 backdrop-blur-sm text-slate-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-2 border-slate-200 hover:border-slate-300"
                onClick={() => setPastVisible(v => v + 6)}
              >
                <span className="flex items-center justify-center">
                  Show More Events
                  <ChevronDownIcon className="w-4 h-4 ml-2 group-hover:translate-y-1 transition-transform" />
                </span>
              </button>
            </div>
          )}
        </>
      ) : searchTerm ? (
        <p className="text-gray-500">No past events found matching "{searchTerm}".</p>
      ) : (
        <p className="text-gray-500">No past events found.</p>
      )}
    </div>
  );
};

export default VolunteerEventsTab;
