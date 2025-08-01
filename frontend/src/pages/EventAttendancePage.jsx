import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFullOrganizerTeam, updateOrganizerAttendance } from "../api/event";
import { getVolunteersForEvent, updateVolunteerAttendance } from "../api/registration";
import Navbar from "../components/layout/Navbar";
import AttendanceQrScanner from "../components/attendance/AttendanceQrScanner";
import axiosInstance from "../api/axiosInstance"; // <-- Use axiosInstance
import { useRef } from 'react';
import { FaPencilAlt } from 'react-icons/fa';

export default function EventAttendancePage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const imageBaseUrl = "http://localhost:5000/uploads/Profiles/";
  const [showScanner, setShowScanner] = useState(false);
  const [volunteerEdit, setVolunteerEdit] = useState({}); // { [registrationId]: { type: 'in'|'out', value: '' } }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [orgs, vols] = await Promise.all([
          getFullOrganizerTeam(eventId),
          getVolunteersForEvent(eventId),
        ]);
        setOrganizers(orgs);
        setVolunteers(vols);

      } catch (err) {
        setError("Failed to load attendance data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  // Access control: only organizers
  if (!currentUser || currentUser.role !== "organizer") {
    return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold">Access denied</div>;
  }

  const handleOrganizerAttendance = async (organizerId, checked) => {
    try {
      await updateOrganizerAttendance(eventId, organizerId, checked);
      setOrganizers((prev) =>
        prev.map((obj) =>
          obj.user._id === organizerId ? { ...obj, hasAttended: checked } : obj
        )
      );
    } catch (err) {
      alert("Failed to update organizer attendance");
    }
  };

  const handleVolunteerAttendance = async (registrationId, checked) => {
    try {
      await updateVolunteerAttendance(registrationId, checked);
      setVolunteers((prev) =>
        prev.map((v) =>
          v.registrationId === registrationId ? { ...v, hasAttended: checked } : v
        )
      );
    } catch (err) {
      alert("Failed to update volunteer attendance");
    }
  };

  const handleScan = async (scannedText) => {
    try {
      const data = JSON.parse(scannedText);

      if (data.registrationId) {
        // Entry QR logic
        const registrationId = data.registrationId;
        if (!registrationId) throw new Error("Invalid QR code");
        const response = await axiosInstance.patch(`/api/registrations/${registrationId}/attendance`, { hasAttended: true });
        alert("Attendance marked!");
        // Update inTime from response
        const updated = response.data.registration;
        setVolunteers((prev) => prev.map((v) => v.registrationId === registrationId ? { ...v, hasAttended: true, inTime: updated.inTime } : v));
      } else if (data.exitQrToken) {
        // Exit QR logic
        const exitQrToken = data.exitQrToken;
        if (!exitQrToken) throw new Error("Invalid QR code");
        const response = await axiosInstance.post(`/api/registrations/exit/${exitQrToken}`);
        alert("Exit marked!");
        // Update outTime from response
        const { outTime } = response.data;
        setVolunteers((prev) => prev.map((v) => {
          // Try to match by exitQrToken, fallback to registrationId if not present
          if (v.exitQrToken === exitQrToken) {
            return { ...v, outTime };
          }
          // Try to match by registrationId if possible (from QR data)
          if (data.registrationId && v.registrationId === data.registrationId) {
            return { ...v, outTime };
          }
          return v;
        }));
      } else {
        throw new Error("Invalid QR code");
      }
    } catch (err) {
      alert("Invalid QR code or failed to mark attendance.");
    }
    setShowScanner(false);
  };

  // Manual save for inTime/outTime
  const handleVolunteerTimeSave = async (registrationId, type) => {
    const value = volunteerEdit[registrationId]?.value;
    if (!value) return;
    const endpoint = type === 'in'
      ? `/api/registrations/${registrationId}/in-time`
      : `/api/registrations/${registrationId}/out-time`;
    await axiosInstance.patch(endpoint, {
      [type === 'in' ? 'inTime' : 'outTime']: value
    });
    setVolunteers((prev) => prev.map((v) =>
      v.registrationId === registrationId
        ? { ...v, [type === 'in' ? 'inTime' : 'outTime']: value }
        : v
    ));
    setVolunteerEdit((prev) => ({ ...prev, [registrationId]: undefined }));
  };

  // Helper for formatting date/time
  function formatDateTime(dt) {
    if (!dt) return '—';
    const date = new Date(dt);
    return date.toLocaleString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // Helper: is current user the event creator?
  const isEventCreator = eventId && organizers.length > 0 && organizers[0].user && currentUser && organizers[0].user._id === currentUser._id;

  // Debug: Log volunteers before rendering
  

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="pt-24 max-w-5xl mx-auto px-4">
        <button className="mb-4 text-blue-600 underline" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-800">Event Attendance</h1>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-transform transform hover:scale-105"
            onClick={() => setShowScanner(true)}
          >
            Scan Volunteer QR
          </button>
        </div>

        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 relative w-full max-w-md">
              <h3 className="text-xl font-semibold text-center mb-4 text-gray-800">Scan QR Code</h3>
              <AttendanceQrScanner
                onScan={handleScan}
                onClose={() => setShowScanner(false)}
              />
            </div>
          </div>
        )}
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <>
            {/* Organizers Table - Only show if current user is the event creator */}
            {isEventCreator && (
              <>
                <h2 className="text-lg font-semibold text-blue-700 mb-2">Organizers</h2>
                <div className="overflow-x-auto mb-8">
                  <table className="min-w-full bg-white border rounded shadow">
                    <thead>
                      <tr>
                        <th className="p-2 border">Photo</th>
                        <th className="p-2 border">Name</th>
                        <th className="p-2 border">Email</th>
                        <th className="p-2 border">Phone</th>
                        <th className="p-2 border">Attended</th>
                        <th className="p-2 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {organizers.map((obj) => (
                        <tr key={obj.user?._id || obj._id} className="text-center">
                          <td className="p-2 border">
                            <img
                              src={obj.user && obj.user.profileImage ? `${imageBaseUrl}${obj.user.profileImage}` : '/images/default-profile.jpg'}
                              alt={obj.user ? obj.user.username : 'Organizer'}
                              className="w-10 h-10 rounded-full object-cover mx-auto"
                            />
                          </td>
                          <td className="p-2 border">{obj.user ? (obj.user.username ? `@${obj.user.username}` : obj.user.name) : '-'}</td>
                          <td className="p-2 border">{obj.user ? obj.user.email : '-'}</td>
                          <td className="p-2 border">{obj.user && obj.user.phone ? obj.user.phone : '-'}</td>
                          <td className="p-2 border">
                            <input
                              type="checkbox"
                              checked={!!obj.hasAttended}
                              onChange={e => handleOrganizerAttendance(obj.user._id, e.target.checked)}
                            />
                          </td>
                          <td className="p-2 border">
                            {obj.hasAttended ? (
                              <span className="text-green-700 font-bold">Attended</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {/* Volunteers Table */}
            <h2 className="text-lg font-semibold text-green-700 mb-2">Volunteers</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded shadow">
                <thead>
                  <tr>
                    <th className="p-2 border">Photo</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Email</th>
                    <th className="p-2 border">Phone</th>
                    <th className="p-2 border">Attended</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">In-Time</th>
                    <th className="p-2 border">Out-Time</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map((v) => {
                    const editState = volunteerEdit[v.registrationId] || {};
                    return (
                      <tr key={v._id} className="text-center">
                        <td className="p-2 border">
                          <img
                            src={v.profileImage ? `${imageBaseUrl}${v.profileImage}` : '/images/default-profile.jpg'}
                            alt={v.username}
                            className="w-10 h-10 rounded-full object-cover mx-auto"
                          />
                        </td>
                        <td className="p-2 border">{v.username ? `@${v.username}` : v.name}</td>
                        <td className="p-2 border">{v.email}</td>
                        <td className="p-2 border">{v.phone || '-'}</td>
                        <td className="p-2 border">
                          <input
                            type="checkbox"
                            checked={!!v.hasAttended}
                            onChange={e => handleVolunteerAttendance(v.registrationId, e.target.checked)}
                            disabled={!!v.inTime}
                          />
                        </td>
                        <td className="p-2 border">
                          {v.hasAttended ? (
                            <span className="text-green-700 font-bold">Attended</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        {/* In-Time column */}
                        <td className="p-2 border align-top">
                          <div className="flex items-center gap-2">
                            <span>{formatDateTime(v.inTime)}</span>
                            <button
                              className="ml-1 p-1 text-gray-500 hover:text-blue-600 focus:outline-none"
                              title="Edit In-Time"
                              onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'in', value: v.inTime ? new Date(v.inTime).toISOString().slice(0,16) : '' } }))}
                              style={{ background: 'none', border: 'none' }}
                            >
                              <FaPencilAlt size={14} />
                            </button>
                          </div>
                          {editState.type === 'in' && (
                            <div className="mt-2 flex flex-col gap-1">
                              <input
                                type="datetime-local"
                                value={editState.value}
                                onChange={e => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'in', value: e.target.value } }))}
                                className="border rounded px-2 py-1"
                              />
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => handleVolunteerTimeSave(v.registrationId, 'in')} className="bg-blue-600 text-white px-2 py-1 rounded text-sm">Save</button>
                                <button onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: undefined }))} className="bg-gray-300 text-gray-800 px-2 py-1 rounded text-sm">Cancel</button>
                              </div>
                            </div>
                          )}
                        </td>
                        {/* Out-Time column */}
                        <td className="p-2 border align-top">
                          <div className="flex items-center gap-2">
                            <span>{formatDateTime(v.outTime)}</span>
                            <button
                              className="ml-1 p-1 text-gray-500 hover:text-blue-600 focus:outline-none"
                              title="Edit Out-Time"
                              onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'out', value: v.outTime ? new Date(v.outTime).toISOString().slice(0,16) : '' } }))}
                              style={{ background: 'none', border: 'none' }}
                            >
                              <FaPencilAlt size={14} />
                            </button>
                          </div>
                          {editState.type === 'out' && (
                            <div className="mt-2 flex flex-col gap-1">
                              <input
                                type="datetime-local"
                                value={editState.value}
                                onChange={e => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'out', value: e.target.value } }))}
                                className="border rounded px-2 py-1"
                              />
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => handleVolunteerTimeSave(v.registrationId, 'out')} className="bg-blue-600 text-white px-2 py-1 rounded text-sm">Save</button>
                                <button onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: undefined }))} className="bg-gray-300 text-gray-800 px-2 py-1 rounded text-sm">Cancel</button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 