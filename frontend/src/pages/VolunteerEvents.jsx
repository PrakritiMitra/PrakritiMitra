//src/pages/VolunteerEvents.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import Footer from "./Footer";

export default function VolunteerEvents() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [user, setUser] = useState(null); // ⬅️ Added user state

  useEffect(() => {
    // Fetch upcoming events
    axios
      .get("http://localhost:5000/api/events/upcoming")
      .then((res) => setEvents(res.data))
      .catch((err) => console.error(err));

    // Fetch logged-in user info from profile
    axios
      .get("http://localhost:5000/api/user/profile", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        withCredentials: true,
      })
      .then((res) => setUser(res.data.user))
      .catch((err) => console.error("User fetch failed", err));
  }, []);

  return (
    <div className="pt-20 px-6 min-h-screen bg-gray-50">
      <Navbar />
      <h1 className="text-2xl font-bold mb-4">Upcoming Events</h1>
      {events.length === 0 ? (
        <p className="text-gray-500">No upcoming events right now.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => (
            <div
              key={event._id}
              className="bg-white border p-4 rounded shadow cursor-pointer hover:shadow-md transition"
              onClick={() => setSelectedEvent(event)}
            >
              <h3 className="font-semibold text-blue-700">{event.title}</h3>
              <p>{new Date(event.date).toLocaleString()}</p>
              <p className="text-sm text-gray-600">{event.location}</p>
              <p className="text-sm italic text-gray-500 mt-1">
                {event.organization?.name || "Unknown organization"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ✅ Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full relative">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-2 right-3 text-xl text-gray-500 hover:text-red-500"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-2 text-blue-700">
              {selectedEvent.title}
            </h2>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(selectedEvent.date).toLocaleString()}
            </p>
            <p>
              <strong>Location:</strong> {selectedEvent.location}
            </p>
            <p>
              <strong>Organization:</strong> {selectedEvent.organization?.name}
            </p>
            <p className="mt-3">
              <strong>Description:</strong>
            </p>
            <p>{selectedEvent.description || "No description provided."}</p>

            {/* ✅ Register Button inside modal */}
            {user?.role === "volunteer" && (
              <button
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={async () => {
                  try {
                    const res = await axios.post(
                      `http://localhost:5000/api/events/${selectedEvent._id}/register`,
                      {},
                      {
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                        withCredentials: true,
                      }
                    );
                    alert("Registered successfully!");
                  } catch (err) {
                    alert(err.response?.data?.message || "Registration failed");
                  }
                }}
              >
                Register for Event
              </button>
            )}
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
