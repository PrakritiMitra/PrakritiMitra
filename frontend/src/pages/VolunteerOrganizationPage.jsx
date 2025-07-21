// src/pages/VolunteeOrganizationPage.jsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import VolunteerEventCard from "../components/volunteer/VolunteerEventCard";

export default function VolunteerOrganizationPage() {
  const { id } = useParams();
  const [organization, setOrganization] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [orgRes, eventRes] = await Promise.all([
          axiosInstance.get(`/organizations/${id}`),
          axiosInstance.get(`/events/organization/${id}`),
        ]);

        setOrganization(orgRes.data);
        setEvents(eventRes.data);
      } catch (err) {
        console.error("Error loading organization:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.startDateTime) >= now);
  const past = events.filter((e) => new Date(e.startDateTime) < now);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 px-6 max-w-5xl mx-auto">
        {loading ? (
          <p>Loading...</p>
        ) : organization ? (
          <>
            {/* Organization Info */}
            <h1 className="text-3xl font-bold text-blue-700 mb-3">
              {organization.name}
            </h1>
            <p className="text-gray-700 mb-2">{organization.description}</p>

            {organization.website && (
              <p className="text-sm mb-3">
                <strong>Website:</strong>{" "}
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  {organization.website}
                </a>
              </p>
            )}

            <p className="text-sm text-gray-500 mb-6">
              Verified Status: {organization.verifiedStatus}
            </p>

            {/* Upcoming Events */}
            <h2 className="text-xl font-semibold mt-8 mb-2 text-blue-700">
              Upcoming Events
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-gray-500">No upcoming events.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {upcoming.map((e) => (
                  <VolunteerEventCard key={e._id} event={e} />
                ))}
              </div>
            )}

            {/* Past Events */}
            <h2 className="text-xl font-semibold mt-10 mb-2 text-gray-700">
              Past Events
            </h2>
            {past.length === 0 ? (
              <p className="text-gray-500">No past events.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {past.map((e) => (
                  <VolunteerEventCard key={e._id} event={e} />
                ))}
              </div>
            )}
          </>
        ) : (
          <p>Organization not found.</p>
        )}
      </div>
    </div>
  );
}
