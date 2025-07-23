// src/pages/OrganizationPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import { approveTeamMember, rejectTeamMember, getOrganizationOrganizers } from "../api/organization";
import EventCreationWrapper from "../components/event/EventCreationWrapper";
import EventCard from "../components/event/EventCard";

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
  const [organizers, setOrganizers] = useState([]);
  const [organizersError, setOrganizersError] = useState("");
  const [showOrganizers, setShowOrganizers] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setOrganizersError("");

        const [orgRes, eventRes] = await Promise.all([
          axiosInstance.get(`/api/organizations/${id}`),
          axiosInstance.get(`/api/events/organization/${id}`),
        ]);

        setOrganization(orgRes.data);
        setEvents(eventRes.data);

        if (user?.role === "organizer") {
          const teamRes = await axiosInstance.get(`/api/organizations/${id}/team`);
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
        // Fetch organizers for this org (all roles) only if token exists
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const orgOrganizers = await getOrganizationOrganizers(id);
            setOrganizers(orgOrganizers);
          } catch (err) {
            setOrganizersError("You must be logged in to see organizers.");
            setOrganizers([]);
          }
        } else {
          setOrganizersError("You must be logged in to see organizers.");
          setOrganizers([]);
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
      await axiosInstance.post(`/api/organizations/${id}/join`);
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

  // Add this function to remove a pending request by userId
  const removePendingRequest = (userId) => {
    setPendingRequests((prev) => prev.filter((m) => m.userId._id !== userId));
  };

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.startDateTime) >= now);
  const past = events.filter((e) => new Date(e.startDateTime) < now);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Navbar />
      {/* Show Organizers Button - fixed top right */}
      {organizers.length > 0 && !organizersError && (
        <button
          className={`fixed z-50 bg-blue-600 text-white px-5 py-2 rounded shadow hover:bg-blue-700 transition
            top-[calc(2cm+1.5rem)]
            ${showOrganizers ? 'right-[340px]' : 'right-8'}
          `}
          style={{ transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)' }}
          onClick={() => setShowOrganizers((prev) => !prev)}
        >
          {showOrganizers ? 'Hide Organizers' : 'Show Organizers'}
        </button>
      )}
      {/* Organizers Drawer */}
      {organizers.length > 0 && !organizersError && (
        <div
          className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${showOrganizers ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-blue-700">Organizers</h2>
            <button
              className="text-gray-500 hover:text-red-600 text-2xl font-bold"
              onClick={() => setShowOrganizers(false)}
              aria-label="Close organizers drawer"
            >
              ×
            </button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-64px)] px-6 py-4 space-y-4">
            {organizers.map((org) => (
              <div
                key={org.userId._id}
                className="flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition cursor-pointer hover:bg-blue-50"
                onClick={() => navigate(`/organizer/${org.userId._id}`)}
              >
                <img
                  src={org.userId.profileImage ? `http://localhost:5000/uploads/Profiles/${org.userId.profileImage}` : '/images/default-profile.jpg'}
                  alt={org.userId.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-blue-400 mr-4"
                />
                <span className="font-medium text-blue-800 text-lg">{org.userId.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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

            {/* Join status UI */}
            {user?.role === "organizer" && (
              <div className="mb-6">
                {isAdmin ? (
                  <p className="text-green-600 font-medium">
                    Joined as admin{" "}
                    {memberEntry?.updatedAt &&
                      `on ${new Date(
                        memberEntry.updatedAt
                      ).toLocaleDateString()}`}
                  </p>
                ) : isMember ? (
                  <p className="text-green-600 font-medium">
                    Joined as member{" "}
                    {memberEntry?.updatedAt &&
                      `on ${new Date(
                        memberEntry.updatedAt
                      ).toLocaleDateString()}`}
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

            {(isAdmin || isMember) && (
              <button
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mb-4"
                onClick={() => setShowEventForm(true)}
              >
                + Create New Event
              </button>
            )}

            {isAdmin && pendingRequests.length > 0 && (
              <ul className="space-y-2">
                {pendingRequests.map((req) => (
                  <li
                    key={req.userId._id}
                    data-userid={req.userId._id}
                    className="flex justify-between items-center bg-white border rounded p-3"
                  >
                    <span className="flex items-center gap-3">
                      {req.userId.profileImage ? (
                        <img
                          src={`http://localhost:5000/uploads/Profiles/${req.userId.profileImage}`}
                          alt={req.userId.name}
                          className="w-10 h-10 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-lg font-bold text-blue-700">
                          {req.userId.name?.[0]}
                        </div>
                      )}
                      <span>
                        {req.userId.name} ({req.userId.email})
                      </span>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {upcoming.map((e) => (
                  <EventCard key={e._id} event={e} />
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
                  <EventCard key={e._id} event={e} />
                ))}
              </div>
            )}
          </>
        ) : (
          <p>Organization not found.</p>
        )}
      </div>

      {/* Event creation modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl relative my-10 max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-8 text-gray-500 hover:text-red-600 text-[30px]"
              onClick={() => setShowEventForm(false)}
            >
              ×
            </button>
            <EventCreationWrapper
              selectedOrgId={id}
              onClose={() => setShowEventForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
