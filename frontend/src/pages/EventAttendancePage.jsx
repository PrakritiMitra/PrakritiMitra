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
  ArrowLeftIcon,
  QrCodeIcon,
  DocumentArrowDownIcon,
  UserGroupIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      <div className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <button 
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-all duration-300 font-semibold"
            onClick={() => navigate(-1)}
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back
          </button>
        </div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">Event Attendance</h1>
            <p className="text-gray-600">Manage attendance for your event</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Download Report Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 font-semibold"
                onClick={() => document.getElementById('reportDropdown').classList.toggle('hidden')}
                disabled={downloadingReport}
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                {downloadingReport ? 'Downloading...' : 'Download Report'}
              </button>
              <div id="reportDropdown" className="hidden absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/20 z-50">
                <div className="py-2">
                  <button
                    className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-all duration-300"
                    onClick={() => {
                      handleDownloadReport('pdf');
                      document.getElementById('reportDropdown').classList.add('hidden');
                    }}
                  >
                    <span className="text-lg">📄</span>
                    Download as PDF
                  </button>
                  <button
                    className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-all duration-300"
                    onClick={() => {
                      handleDownloadReport('excel');
                      document.getElementById('reportDropdown').classList.add('hidden');
                    }}
                  >
                    <span className="text-lg">📊</span>
                    Download as Excel
                  </button>
                  <button
                    className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-all duration-300"
                    onClick={() => {
                      handleDownloadReport('csv');
                      document.getElementById('reportDropdown').classList.add('hidden');
                    }}
                  >
                    <span className="text-lg">📋</span>
                    Download as CSV
                  </button>
                </div>
              </div>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl shadow-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 transform hover:scale-105 font-semibold"
              onClick={() => setShowScanner(true)}
            >
              <QrCodeIcon className="w-5 h-5" />
              Scan QR Code
            </button>
          </div>
        </div>

        {/* Real-time Attendance Dashboard */}
        <div className="mb-8">
          <AttendanceDashboard eventId={eventId} />
        </div>

        {showScanner && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 relative w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Scan QR Code</h3>
                <button
                  onClick={() => setShowScanner(false)}
                  className="text-gray-500 hover:text-gray-700 transition-all duration-300"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <AttendanceQrScanner
                onScan={handleScan}
                onClose={() => setShowScanner(false)}
              />
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600">Loading attendance data...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">❌</div>
            <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Data</h3>
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Organizers Table - Only show if current user is the event creator */}
            {isEventCreator && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <UserGroupIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-blue-800">Organizers</h2>
                    <p className="text-gray-600 text-sm">Event management team</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white/50 backdrop-blur-sm rounded-xl overflow-hidden">
                    <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                      <tr>
                        <th className="p-4 text-left font-semibold text-blue-800">Photo</th>
                        <th className="p-4 text-left font-semibold text-blue-800">Name</th>
                        <th className="p-4 text-left font-semibold text-blue-800">Email</th>
                        <th className="p-4 text-left font-semibold text-blue-800">Phone</th>
                        <th className="p-4 text-center font-semibold text-blue-800">Attended</th>
                        <th className="p-4 text-center font-semibold text-blue-800">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {organizers.map((obj) => (
                        <tr key={obj.user?._id || obj._id} className="hover:bg-gray-50/50 transition-all duration-300">
                          <td className="p-4">
                            {getProfileImageUrl(obj.user) ? (
                              <img
                                src={getProfileImageUrl(obj.user)}
                                alt={obj.user ? obj.user.username : 'Organizer'}
                                className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-blue-200 ${getRoleColors('organizer')}`}>
                                <span className="text-sm font-bold">{getAvatarInitial(obj.user)}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-medium text-gray-800">{obj.user ? (obj.user.username ? `@${obj.user.username}` : obj.user.name) : '-'}</td>
                          <td className="p-4 text-gray-600">{obj.user ? obj.user.email : '-'}</td>
                          <td className="p-4 text-gray-600">{obj.user && obj.user.phone ? obj.user.phone : '-'}</td>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!obj.hasAttended}
                              onChange={e => handleOrganizerAttendance(obj.user._id, e.target.checked)}
                              className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                          </td>
                          <td className="p-4 text-center">
                            {obj.hasAttended ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                                <CheckCircleIcon className="w-4 h-4" />
                                Attended
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
                      return (
                        <tr key={v._id} className="hover:bg-gray-50/50 transition-all duration-300">
                          <td className="p-4">
                            {getProfileImageUrl(v) ? (
                              <img
                                src={getProfileImageUrl(v)}
                                alt={v.username}
                                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-200"
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-emerald-200 ${getRoleColors('volunteer')}`}>
                                <span className="text-sm font-bold">{getAvatarInitial(v)}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-medium text-gray-800">{v.username ? `@${v.username}` : v.name}</td>
                          <td className="p-4 text-gray-600">{v.email}</td>
                          <td className="p-4 text-gray-600">{v.phone || '-'}</td>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!v.hasAttended}
                              onChange={e => handleVolunteerAttendance(v.registrationId, e.target.checked)}
                              disabled={!!v.inTime}
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
                              <span className="text-gray-700">{formatDateTime(v.inTime)}</span>
                              <button
                                className="p-1 text-gray-500 hover:text-blue-600 focus:outline-none transition-all duration-300"
                                title="Edit In-Time"
                                onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'in', value: v.inTime ? new Date(v.inTime).toISOString().slice(0,16) : '' } }))}
                              >
                                <FaPencilAlt size={14} />
                              </button>
                            </div>
                            {editState.type === 'in' && (
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
                              <span className="text-gray-700">{formatDateTime(v.outTime)}</span>
                              <button
                                className="p-1 text-gray-500 hover:text-blue-600 focus:outline-none transition-all duration-300"
                                title="Edit Out-Time"
                                onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'out', value: v.outTime ? new Date(v.outTime).toISOString().slice(0,16) : '' } }))}
                              >
                                <FaPencilAlt size={14} />
                              </button>
                            </div>
                            {editState.type === 'out' && (
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
          </div>
        )}
      </div>
    </div>
  );
} 