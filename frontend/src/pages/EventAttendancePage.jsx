import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFullOrganizerTeam, updateOrganizerAttendance } from "../api/event";
import { getVolunteersForEvent, updateVolunteerAttendance } from "../api/registration";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function EventAttendancePage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const imageBaseUrl = "http://localhost:5000/uploads/";

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

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="pt-24 max-w-5xl mx-auto px-4">
        <button className="mb-4 text-blue-600 underline" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-blue-800 mb-6">Event Attendance</h1>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <>
            {/* Organizers Table */}
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
                          alt={obj.user ? obj.user.name : 'Organizer'}
                          className="w-10 h-10 rounded-full object-cover mx-auto"
                        />
                      </td>
                      <td className="p-2 border">{obj.user ? obj.user.name : '-'}</td>
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
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map((v) => (
                    <tr key={v._id} className="text-center">
                      <td className="p-2 border">
                        <img
                          src={v.profileImage ? `${imageBaseUrl}${v.profileImage}` : '/images/default-profile.jpg'}
                          alt={v.name}
                          className="w-10 h-10 rounded-full object-cover mx-auto"
                        />
                      </td>
                      <td className="p-2 border">{v.name}</td>
                      <td className="p-2 border">{v.email}</td>
                      <td className="p-2 border">{v.phone || '-'}</td>
                      <td className="p-2 border">
                        <input
                          type="checkbox"
                          checked={!!v.hasAttended}
                          onChange={e => handleVolunteerAttendance(v.registrationId, e.target.checked)}
                        />
                      </td>
                      <td className="p-2 border">
                        {v.hasAttended ? (
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
      </div>
      <Footer />
    </div>
  );
} 