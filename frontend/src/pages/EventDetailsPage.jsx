// src/pages/EventDetailsPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const imageBaseUrl = "http://localhost:5000/uploads/";
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const isCreator = (() => {
    if (!event || !currentUser) return false;

    // Handles both string and object form of createdBy
    const createdById =
      typeof event.createdBy === "string"
        ? event.createdBy
        : event.createdBy?._id;

    return createdById?.toString() === currentUser._id;
  })();

  const isOrgAdmin = (() => {
    if (!event?.organization?.team || !currentUser) return false;

    return event.organization.team.some((member) => {
      const memberUserId =
        typeof member.userId === "string" ? member.userId : member.userId?._id;
      return memberUserId?.toString() === currentUser._id && member.isAdmin;
    });
  })();

  const canEdit = isCreator || isOrgAdmin;

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axiosInstance.get(`/events/${id}`);
        setEvent(res.data);
      } catch (err) {
        setError("Event not found or failed to load.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      await axiosInstance.delete(`/events/${id}`);
      alert("Event deleted successfully.");
      navigate(-1); // or navigate('/your-organizations') if you prefer
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Failed to delete event.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="pt-24 max-w-5xl mx-auto px-4">
        <button
          className="mb-4 text-blue-600 underline"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        {canEdit && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => navigate(`/events/${id}/edit`)}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              ✏️ Edit Event
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              🗑️ Delete Event
            </button>
          </div>
        )}

        <h1 className="text-3xl font-bold text-blue-800 mb-3">{event.title}</h1>
        <p className="text-gray-700 mb-4">{event.description}</p>

        <div className="mb-4">
          <strong>Location:</strong> {event.location}
        </div>
        <div className="mb-4">
          <strong>Timing:</strong>{" "}
          {new Date(event.startDateTime).toLocaleString()} —{" "}
          {new Date(event.endDateTime).toLocaleString()}
        </div>
        <div className="mb-4">
          <strong>Type:</strong> {event.eventType || "Not specified"}
        </div>
        <div className="mb-4">
          <strong>Volunteer Slots:</strong>{" "}
          {event.unlimitedVolunteers ? "Unlimited" : event.maxVolunteers}
        </div>

        {event.groupRegistration && (
          <p className="text-sm text-green-700 mb-2">
            Group Registration Enabled
          </p>
        )}

        {event.recurringEvent && (
          <p className="text-sm text-indigo-700 mb-2">
            Recurs {event.recurringType} on {event.recurringValue}
          </p>
        )}

        <div className="mb-4">
          <strong>Instructions:</strong>
          <p>{event.instructions || "None"}</p>
        </div>

        {event.equipmentNeeded?.length > 0 && (
          <div className="mb-4">
            <strong>Equipment Needed:</strong>{" "}
            <ul className="list-disc list-inside">
              {event.equipmentNeeded.map((eq, i) => (
                <li key={i}>{eq}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Questionnaire details */}
        <div className="border-t pt-4 mt-4">
          <h2 className="text-xl font-semibold text-blue-700 mb-3">
            Volunteer Logistics
          </h2>
          <p>
            <strong>Drinking Water:</strong>{" "}
            {event.waterProvided ? "Yes" : "No"}
          </p>
          <p>
            <strong>Medical Support:</strong>{" "}
            {event.medicalSupport ? "Yes" : "No"}
          </p>
          <p>
            <strong>Recommended Age Group:</strong>{" "}
            {event.ageGroup || "Not specified"}
          </p>
          <p>
            <strong>Special Precautions:</strong> {event.precautions || "None"}
          </p>
          <p>
            <strong>Public Transport:</strong>{" "}
            {event.publicTransport || "Not mentioned"}
          </p>
          <p>
            <strong>Contact Person:</strong>{" "}
            {event.contactPerson || "Not listed"}
          </p>
        </div>

        {/* Uploaded files */}
        {event.eventImages?.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-blue-700 mb-2">
              Event Images
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {event.eventImages.map((img) => (
                <img
                  key={img}
                  src={`${imageBaseUrl}${img}`}
                  alt="Event"
                  className="w-full max-w-md rounded shadow my-2"
                />
              ))}
            </div>
          </div>
        )}

        {event.govtApprovalLetter && (
          <a
            href={`${imageBaseUrl}${event.govtApprovalLetter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            View Govt Approval Letter
          </a>
        )}
      </div>
    </div>
  );
}
