// src/pages/OrganizationPage.jsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import EventForm from "../components/event/EventForm";
import { approveTeamMember, rejectTeamMember } from "../api/organization";

export default function OrganizationPage() {
  const { id } = useParams();
  const [organization, setOrganization] = useState(null);
  const [memberEntry, setMemberEntry] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  const user = JSON.parse(localStorage.getItem("user"));

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

        if (user?.role === "organizer") {
          const teamRes = await axiosInstance.get(`/organizations/${id}/team`);
          const team = teamRes.data;

          const memberEntry = team.find(
            (member) => member.userId._id === user._id
          );

          if (memberEntry) {
            setMemberEntry(memberEntry);
            if (memberEntry.status === "pending") {
              setHasRequested(true);
              setIsMember(false);
              setIsAdmin(false);
            } else if (memberEntry.status === "approved") {
              setHasRequested(false);
              setIsMember(true);
              setIsAdmin(
                orgRes.data.createdBy === user._id || memberEntry.isAdmin
              );
            }
          } else {
            setHasRequested(false);
            setIsMember(false);
            setIsAdmin(false);
          }

          const pending = team.filter((member) => member.status === "pending");
          setPendingRequests(pending);
        }
      } catch (err) {
        console.error("Error loading organization:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleJoinRequest = async () => {
    try {
      setJoining(true);
      await axiosInstance.post(`/organizations/${id}/join`);
      setHasRequested(true);
      alert("Join request sent.");
    } catch (err) {
      alert(err.response?.data?.message || "Request failed.");
    } finally {
      setJoining(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await approveTeamMember(id, userId);
      alert("User approved successfully");
      setPendingRequests((prev) => prev.filter((m) => m.userId._id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || "Approval failed");
    }
  };

  const handleReject = async (userId) => {
    try {
      await rejectTeamMember(id, userId);
      alert("User rejected successfully");
      setPendingRequests((prev) => prev.filter((m) => m.userId._id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || "Rejection failed");
    }
  };

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.date) >= now);
  const past = events.filter((e) => new Date(e.date) < now);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 px-6 max-w-5xl mx-auto">
        {loading ? (
          <p>Loading...</p>
        ) : organization ? (
          <>
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

            {/* Join request status or button */}
            {user?.role === "organizer" && (
              <div className="mb-6">
                {isAdmin ? (
                  <p className="text-green-600 font-medium">
                    Joined as admin
                    {memberEntry?.updatedAt && (
                      <>
                        {" "}
                        on{" "}
                        {new Date(memberEntry.updatedAt).toLocaleDateString()}
                      </>
                    )}
                  </p>
                ) : isMember ? (
                  <p className="text-green-600 font-medium">
                    Joined as member
                    {memberEntry?.updatedAt && (
                      <>
                        {" "}
                        on{" "}
                        {new Date(memberEntry.updatedAt).toLocaleDateString()}
                      </>
                    )}
                  </p>
                ) : hasRequested ? (
                  <p className="text-yellow-600 font-medium">
                    Join request sent
                  </p>
                ) : (
                  <button
                    onClick={handleJoinRequest}
                    disabled={joining}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    {joining ? "Sending..." : "Request to Join"}
                  </button>
                )}
              </div>
            )}

            {/* Create Event for Admins and Members */}
            {(isAdmin || isMember) && (
              <button
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mb-4"
                onClick={() => setShowEventForm(true)}
              >
                + Create New Event
              </button>
            )}

            {/* Show join request controls only for Admin */}
            {isAdmin && pendingRequests.length > 0 && (
              <ul className="space-y-2">
                {pendingRequests.map((req) => (
                  <li
                    key={req.userId._id}
                    className="flex justify-between items-center bg-white border rounded p-3"
                  >
                    <span>
                      {req.userId.name} ({req.userId.email})
                    </span>
                    <div className="space-x-2">
                      <button
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        onClick={() => handleApprove(req.userId._id)}
                      >
                        Approve
                      </button>
                      <button
                        className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        onClick={() => handleReject(req.userId._id)}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Upcoming Events */}
            <h2 className="text-xl font-semibold mt-8 mb-2 text-blue-700">
              Upcoming Events
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-gray-500">No upcoming events.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map((e) => (
                  <div
                    key={e._id}
                    className="bg-white border p-4 rounded shadow"
                  >
                    <h3 className="text-lg font-bold text-blue-700">
                      {e.title}
                    </h3>
                    <p>{new Date(e.date).toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{e.location}</p>
                  </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {past.map((e) => (
                  <div
                    key={e._id}
                    className="bg-white border p-4 rounded shadow"
                  >
                    <h3 className="text-lg font-bold">{e.title}</h3>
                    <p>{new Date(e.date).toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{e.location}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p>Organization not found.</p>
        )}
      </div>

      {/* Modal for Event Form */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl relative">
            <button
              className="absolute top-2 right-3 text-gray-500 hover:text-red-600 text-lg"
              onClick={() => setShowEventForm(false)}
            >
              ×
            </button>
            <EventForm
              selectedOrgId={id}
              onSuccess={() => {
                setShowEventForm(false);
                window.location.reload(); // simple refresh
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
