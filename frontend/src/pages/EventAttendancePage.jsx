import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFullOrganizerTeam, updateOrganizerAttendance } from "../api/event";
import { getVolunteersForEvent, updateVolunteerAttendance, downloadAttendanceReport } from "../api/registration";
import Navbar from "../components/layout/Navbar";
import AttendanceQrScanner from "../components/attendance/AttendanceQrScanner";
import AttendanceDashboard from "../components/attendance/AttendanceDashboard";
import axiosInstance from "../api/axiosInstance"; // <-- Use axiosInstance
import { useRef } from 'react';
import { FaPencilAlt } from 'react-icons/fa';
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  getEmailDisplay, 
  getPhoneDisplay,
  canNavigateToUser,
  getSafeUserId,
  getSafeUserName,
  // Attendance-specific utilities
  getAttendanceUserData,
  getAttendanceDisplayName,
  getAttendanceUsernameDisplay,
  getAttendanceEmailDisplay,
  getAttendancePhoneDisplay,
  getAttendanceProfileImageUrl,
  getAttendanceAvatarInitial
} from "../utils/safeUserUtils";
import { UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

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
  const [downloadingReport, setDownloadingReport] = useState(false);

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

  // Handle report download
  const handleDownloadReport = async (format = 'pdf') => {
    try {
      setDownloadingReport(true);
      const blob = await downloadAttendanceReport(eventId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_report_${format}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert(`Attendance report downloaded successfully as ${format.toUpperCase()}!`);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download attendance report');
    } finally {
      setDownloadingReport(false);
    }
  };

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
          <div className="flex gap-2">
            {/* Download Report Dropdown */}
            <div className="relative">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:opacity-50"
                onClick={() => document.getElementById('reportDropdown').classList.toggle('hidden')}
                disabled={downloadingReport}
              >
                {downloadingReport ? 'Downloading...' : '📊 Download Report'}
              </button>
              <div id="reportDropdown" className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
                <div className="py-1">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleDownloadReport('pdf');
                      document.getElementById('reportDropdown').classList.add('hidden');
                    }}
                  >
                    📄 Download as PDF
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleDownloadReport('excel');
                      document.getElementById('reportDropdown').classList.add('hidden');
                    }}
                  >
                    📊 Download as Excel
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleDownloadReport('csv');
                      document.getElementById('reportDropdown').classList.add('hidden');
                    }}
                  >
                    📋 Download as CSV
                  </button>
                </div>
              </div>
            </div>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-transform transform hover:scale-105"
              onClick={() => setShowScanner(true)}
            >
              Scan Volunteer QR
            </button>
          </div>
        </div>

        {/* Real-time Attendance Dashboard */}
        <AttendanceDashboard eventId={eventId} />

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
                      {organizers.map((obj) => {
                        // Use attendance-specific utilities for attendance records
                        const attendanceUser = getAttendanceUserData(obj.user);
                        const canNavigate = canNavigateToUser(obj.user);
                        
                        return (
                          <tr key={obj.user?._id || obj._id} className="text-center">
                            <td className="p-2 border">
                              {getAttendanceProfileImageUrl(attendanceUser) ? (
                                <img
                                  src={getAttendanceProfileImageUrl(attendanceUser)}
                                  alt={getAttendanceDisplayName(attendanceUser)}
                                  className="w-10 h-10 rounded-full object-cover mx-auto"
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${getRoleColors(attendanceUser.role)}`}>
                                  <span className="text-sm font-bold">{getAttendanceAvatarInitial(attendanceUser)}</span>
                                </div>
                              )}
                            </td>
                            <td className={`p-2 border ${attendanceUser.isDeleted ? 'text-gray-500' : ''}`}>
                              {getAttendanceUsernameDisplay(attendanceUser)}
                            </td>
                            <td className={`p-2 border ${attendanceUser.isDeleted ? 'text-gray-500' : ''}`}>
                              {getAttendanceEmailDisplay(attendanceUser)}
                            </td>
                            <td className={`p-2 border ${attendanceUser.isDeleted ? 'text-gray-500' : ''}`}>
                              {getAttendancePhoneDisplay(attendanceUser)}
                            </td>
                            <td className="p-2 border">
                              <input
                                type="checkbox"
                                checked={!!obj.hasAttended}
                                onChange={e => handleOrganizerAttendance(obj.user._id, e.target.checked)}
                                disabled={attendanceUser.isDeleted}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {/* Volunteers Table */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-emerald-800">Volunteers</h2>
                  <p className="text-gray-600 text-sm">Event participants and helpers</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white/50 backdrop-blur-sm rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-emerald-50 to-emerald-100">
                    <tr>
                      <th className="p-4 text-left font-semibold text-emerald-800">Photo</th>
                      <th className="p-4 text-left font-semibold text-emerald-800">Name</th>
                      <th className="p-4 text-left font-semibold text-emerald-800">Email</th>
                      <th className="p-4 text-left font-semibold text-emerald-800">Phone</th>
                      <th className="p-4 text-center font-semibold text-emerald-800">Attended</th>
                      <th className="p-4 text-center font-semibold text-emerald-800">Status</th>
                      <th className="p-4 text-center font-semibold text-emerald-800">In-Time</th>
                      <th className="p-4 text-center font-semibold text-emerald-800">Out-Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {volunteers.map((v) => {
                      const editState = volunteerEdit[v.registrationId] || {};
                      // Use attendance-specific utilities for attendance records (from Amrut1 branch)
                      const attendanceVolunteer = getAttendanceUserData(v);
                      const canNavigate = canNavigateToUser(v);
                      
                      return (
                        <tr key={v._id} className={`hover:bg-gray-50/50 transition-all duration-300 ${attendanceVolunteer.isDeleted ? 'opacity-60' : ''}`}>
                          <td className="p-4">
                            {getAttendanceProfileImageUrl(attendanceVolunteer) ? (
                              <img
                                src={getAttendanceProfileImageUrl(attendanceVolunteer)}
                                alt={getAttendanceDisplayName(attendanceVolunteer)}
                                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-200"
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-emerald-200 ${getRoleColors(attendanceVolunteer.role)}`}>
                                <span className="text-sm font-bold">{getAttendanceAvatarInitial(attendanceVolunteer)}</span>
                              </div>
                            )}
                          </td>
                          <td className={`p-4 font-medium ${attendanceVolunteer.isDeleted ? 'text-gray-500' : 'text-gray-800'}`}>
                            {getAttendanceDisplayName(attendanceVolunteer)}
                          </td>
                          <td className={`p-4 ${attendanceVolunteer.isDeleted ? 'text-gray-500' : 'text-gray-600'}`}>
                            {getAttendanceEmailDisplay(attendanceVolunteer)}
                          </td>
                          <td className={`p-4 ${attendanceVolunteer.isDeleted ? 'text-gray-500' : 'text-gray-600'}`}>
                            {getAttendancePhoneDisplay(attendanceVolunteer)}
                          </td>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!v.hasAttended}
                              onChange={e => handleVolunteerAttendance(v.registrationId, e.target.checked)}
                              disabled={attendanceVolunteer.isDeleted || !!v.inTime}
                              className="w-5 h-5 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 disabled:opacity-50"
                            />
                          </td>
                          <td className="p-4 text-center">
                            {v.hasAttended ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                                <CheckCircleIcon className="w-4 h-4" />
                                Attended
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          {/* In-Time column */}
                          <td className="p-4 align-top">
                            <div className="flex items-center gap-2">
                              <span className={`${attendanceVolunteer.isDeleted ? 'text-gray-500' : 'text-gray-700'}`}>
                                {formatDateTime(v.inTime)}
                              </span>
                              {!attendanceVolunteer.isDeleted && (
                                <button
                                  className="p-1 text-gray-500 hover:text-blue-600 focus:outline-none transition-all duration-300"
                                  title="Edit In-Time"
                                  onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'in', value: v.inTime ? new Date(v.inTime).toISOString().slice(0,16) : '' } }))}
                                >
                                  <FaPencilAlt size={14} />
                                </button>
                              )}
                            </div>
                            {editState.type === 'in' && !attendanceVolunteer.isDeleted && (
                              <div className="mt-3 space-y-2">
                                <input
                                  type="datetime-local"
                                  value={editState.value}
                                  onChange={e => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'in', value: e.target.value } }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleVolunteerTimeSave(v.registrationId, 'in')} 
                                    className="flex-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all duration-300"
                                  >
                                    Save
                                  </button>
                                  <button 
                                    onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: undefined }))} 
                                    className="flex-1 bg-gray-300 text-gray-800 px-3 py-1 rounded-lg text-sm font-semibold hover:bg-gray-400 transition-all duration-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                          {/* Out-Time column */}
                          <td className="p-4 align-top">
                            <div className="flex items-center gap-2">
                              <span className={`${attendanceVolunteer.isDeleted ? 'text-gray-500' : 'text-gray-700'}`}>
                                {formatDateTime(v.outTime)}
                              </span>
                              {!attendanceVolunteer.isDeleted && (
                                <button
                                  className="p-1 text-gray-500 hover:text-blue-600 focus:outline-none transition-all duration-300"
                                  title="Edit Out-Time"
                                  onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'out', value: v.outTime ? new Date(v.outTime).toISOString().slice(0,16) : '' } }))}
                                >
                                  <FaPencilAlt size={14} />
                                </button>
                              )}
                            </div>
                            {editState.type === 'out' && !attendanceVolunteer.isDeleted && (
                              <div className="mt-3 space-y-2">
                                <input
                                  type="datetime-local"
                                  value={editState.value}
                                  onChange={e => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'out', value: e.target.value } }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleVolunteerTimeSave(v.registrationId, 'out')} 
                                    className="flex-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all duration-300"
                                  >
                                    Save
                                  </button>
                                  <button 
                                    onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: undefined }))} 
                                    className="flex-1 bg-gray-300 text-gray-800 px-3 py-1 rounded-lg text-sm font-semibold hover:bg-gray-400 transition-all duration-300"
                                  >
                                    Cancel
                                  </button>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
} 