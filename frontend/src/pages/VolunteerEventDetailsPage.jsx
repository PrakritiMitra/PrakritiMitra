// src/pages/VolunteerEventDetailsPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import defaultImages from "../utils/eventTypeImages";
import { useState as useReactState } from "react";

export default function VolunteerEventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));
  const imageBaseUrl = "http://localhost:5000/uploads/";

  // Carousel state
  const [carouselIndex, setCarouselIndex] = useReactState(0);
  let images = [];
  let hasImages = false;
  let handlePrev = () => {};
  let handleNext = () => {};

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

  // Registration handler
  const handleRegister = async () => {
    setRegistering(true);
    try {
      await axios.post(
        `http://localhost:5000/api/events/${event._id}/register`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          withCredentials: true,
        }
      );
      setRegisterSuccess(true);
      alert("Registered successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    } finally {
      setRegistering(false);
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

  // Only set images and handlers after event is loaded
  images = event.eventImages || [];
  hasImages = images.length > 0;
  handlePrev = () => setCarouselIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  handleNext = () => setCarouselIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));

  const createdBy = event.createdBy;
  const createdByName = typeof createdBy === "object" ? createdBy.name : "Organizer";
  const createdByPhoto = typeof createdBy === "object" && createdBy.profileImage
    ? `${imageBaseUrl}${createdBy.profileImage}`
    : null;

  const eventImage = defaultImages[event.eventType?.toLowerCase()] || defaultImages["default"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-12">
      <Navbar />
      <div className="pt-24 w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <button
          className="mb-4 text-blue-600 underline"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        {/* Event Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 w-full">
          {/* Event Image Header (static background) */}
          <div className="relative w-full bg-gray-200 flex items-center justify-center" style={{ minHeight: '180px', maxHeight: '220px' }}>
            <img
              src={eventImage}
              alt={event.eventType}
              className="w-full h-full object-cover object-center opacity-40 absolute top-0 left-0 z-0"
            />
            <div className="absolute bottom-2 left-2 bg-white/80 px-3 py-1 rounded text-sm font-semibold text-blue-700 shadow z-20">
              {event.eventType || "Event"}
            </div>
          </div>

          <div className="p-6">
            {/* Title & Organizer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-blue-800 flex-1">{event.title}</h1>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs mr-1">Created by:</span>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-4 border-blue-200">
                  {createdByPhoto ? (
                    <img
                      src={createdByPhoto}
                      alt="Organizer"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="text-xl font-bold text-blue-600">
                      {createdByName ? createdByName.charAt(0).toUpperCase() : "O"}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <p className="text-base text-gray-900 font-semibold">
                    {createdByName}
                  </p>
                  <span className="text-xs text-gray-500">Organizer</span>
                </div>
              </div>
            </div>

            {/* Register Button */}
            {user?.role === "volunteer" && (
              <button
                onClick={handleRegister}
                className="mb-6 bg-green-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-green-700 transition"
                disabled={registering}
              >
                {registering ? "Registering..." : registerSuccess ? "Registered" : "Register"}
              </button>
            )}

            {/* Event Info Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Organization:</span> {event.organization?.name || "N/A"}
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Location:</span> {event.location}
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Timing:</span> <br/>
                  <span className="text-sm text-gray-600">{new Date(event.startDateTime).toLocaleString()} — {new Date(event.endDateTime).toLocaleString()}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Type:</span> {event.eventType || "Not specified"}
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Volunteer Slots:</span> {event.unlimitedVolunteers ? "Unlimited" : event.maxVolunteers}
                </div>
                {event.groupRegistration && (
                  <div className="text-xs text-green-700 font-medium mt-1">Group Registration Enabled</div>
                )}
                {event.recurringEvent && (
                  <div className="text-xs text-indigo-700 font-medium mt-1">Recurs {event.recurringType} on {event.recurringValue}</div>
                )}
              </div>
              <div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Description:</span>
                  <p className="text-gray-700 mt-1">{event.description}</p>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Instructions:</span>
                  <p className="text-gray-700 mt-1">{event.instructions || "None"}</p>
                </div>
                {event.equipmentNeeded?.length > 0 && (
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700">Equipment Needed:</span>
                    <ul className="list-disc list-inside text-gray-700 mt-1">
                      {event.equipmentNeeded.map((eq, i) => (
                        <li key={i}>{eq}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Volunteer Logistics Section */}
            <div className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold text-blue-700 mb-3">
                Volunteer Logistics
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p><span className="font-semibold text-gray-700">Drinking Water:</span> {event.waterProvided ? "Yes" : "No"}</p>
                  <p><span className="font-semibold text-gray-700">Medical Support:</span> {event.medicalSupport ? "Yes" : "No"}</p>
                  <p><span className="font-semibold text-gray-700">Recommended Age Group:</span> {event.ageGroup || "Not specified"}</p>
                </div>
                <div>
                  <p><span className="font-semibold text-gray-700">Special Precautions:</span> {event.precautions || "None"}</p>
                  <p><span className="font-semibold text-gray-700">Public Transport:</span> {event.publicTransport || "Not mentioned"}</p>
                  <p><span className="font-semibold text-gray-700">Contact Person:</span> {event.contactPerson || "Not listed"}</p>
                </div>
              </div>
            </div>

            {/* Event Images Carousel at the bottom */}
            {hasImages && (
              <div className="mt-10 w-full flex flex-col items-center">
                <h2 className="text-xl font-semibold text-blue-700 mb-2">Event Images</h2>
                <div className="relative w-full max-w-4xl mx-auto bg-gray-100 flex items-center justify-center rounded-lg shadow-lg" style={{ minHeight: '420px', maxHeight: '520px' }}>
                  <button
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-blue-700 rounded-full shadow p-2 z-10"
                    aria-label="Previous image"
                  >
                    &#8592;
                  </button>
                  <div className="mx-auto flex items-center justify-center w-full">
                    <img
                      src={`${imageBaseUrl}${images[carouselIndex]}`}
                      alt={`Event ${carouselIndex + 1}`}
                      className="max-h-[420px] aspect-video rounded-lg border-4 border-white shadow-lg object-contain bg-white mx-auto"
                      style={{ maxWidth: '95%', minWidth: '320px', background: 'white' }}
                    />
                  </div>
                  <button
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-blue-700 rounded-full shadow p-2 z-10"
                    aria-label="Next image"
                  >
                    &#8594;
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                    {images.map((_, idx) => (
                      <span
                        key={idx}
                        className={`inline-block w-2 h-2 rounded-full ${idx === carouselIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
