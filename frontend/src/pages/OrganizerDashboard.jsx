// src/pages/OrganizerDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import EventForm from "../components/event/EventForm";

export default function OrganizerDashboard() {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-24 px-6">
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

            <button
              className="ml-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              onClick={() => setShowEventModal(true)}
              disabled={loadingOrgs || organizations.length === 0}
              title={
                loadingOrgs
                  ? "Loading..."
                  : organizations.length === 0
                  ? "Join an organization first"
                  : "Create Event"
              }
            >
              + Create Event
            </button>

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
    </div>
  );
}
