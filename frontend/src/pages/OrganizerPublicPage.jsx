import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { getUserById } from "../api/organization";
import { FaInstagram, FaLinkedin, FaTwitter, FaFacebook } from "react-icons/fa";
import axiosInstance from "../api/axiosInstance";
import EventCard from "../components/event/EventCard";

export default function UserProfilePage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("all");

  useEffect(() => {
    setLoading(true);
    setError("");
    getUserById(id)
      .then((res) => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("User not found");
        setLoading(false);
      });
  }, [id]);

  // Fetch organizations this organizer is a part of
  useEffect(() => {
    if (!id) return;
    axiosInstance
      .get(`/organizations/user/${id}`)
      .then((res) => setOrganizations(res.data))
      .catch(() => setOrganizations([]));
  }, [id]);

  // Fetch events for this organizer (all or filtered by org)
  useEffect(() => {
    if (!id) return;
    setEventsLoading(true);
    let url = "";
    if (selectedOrg === "all") {
      url = `/events/created-by/${id}`;
    } else {
      url = `/events/by-organizer-and-org/${id}/${selectedOrg}`;
    }
    axiosInstance
      .get(url)
      .then((res) => {
        setEvents(res.data);
        setEventsLoading(false);
      })
      .catch(() => setEventsLoading(false));
  }, [id, selectedOrg]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-8 animate-fade-in">
          {loading ? (
            <div className="animate-pulse space-y-6">
              <div className="h-24 w-24 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto" />
              <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
              <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto" />
              <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto" />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 font-semibold text-lg">{error}</div>
          ) : (
            <>
              <div className="flex flex-col items-center mb-6">
                <img
                  src={user.profileImage ? `http://localhost:5000/uploads/${user.profileImage}` : '/images/default-profile.jpg'}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-300 shadow mb-2 transition-transform duration-500 hover:scale-105"
                />
                <h1 className="text-3xl font-bold text-blue-800 mb-1 animate-fade-in-slow">{user.name}</h1>
                <span className="text-blue-600 font-medium capitalize mb-1">{user.role === 'organizer' ? 'Event Organizer' : user.role}</span>
                {user.position && <span className="text-gray-500 text-sm">{user.position}</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700">Email:</span>
                    <span className="ml-2 text-gray-600">{user.email}</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700">Phone:</span>
                    <span className="ml-2 text-gray-600">{user.phone}</span>
                  </div>
                  {user.city && (
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">City:</span>
                      <span className="ml-2 text-gray-600">{user.city}</span>
                    </div>
                  )}
                  {user.organization && (
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Organization ID:</span>
                      <span className="ml-2 text-gray-600">{user.organization}</span>
                    </div>
                  )}
                  {user.emergencyPhone && (
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Emergency Phone:</span>
                      <span className="ml-2 text-gray-600">{user.emergencyPhone}</span>
                    </div>
                  )}
                </div>
                <div>
                  {user.socials && (
                    <>
                      {console.log('user.socials:', user.socials)}
                      <div className="mb-2">
                        <span className="font-semibold text-gray-700">Socials:</span>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {user.socials.instagram && (
                            <a
                              href={user.socials.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="transition-colors text-gray-400 hover:text-pink-500 text-2xl"
                              title="Instagram"
                            >
                              <FaInstagram />
                            </a>
                          )}
                          {user.socials.linkedin && (
                            <a
                              href={user.socials.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="transition-colors text-gray-400 hover:text-blue-700 text-2xl"
                              title="LinkedIn"
                            >
                              <FaLinkedin />
                            </a>
                          )}
                          {user.socials.twitter && (
                            <a
                              href={user.socials.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="transition-colors text-gray-400 hover:text-blue-400 text-2xl"
                              title="Twitter"
                            >
                              <FaTwitter />
                            </a>
                          )}
                          {user.socials.facebook && (
                            <a
                              href={user.socials.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="transition-colors text-gray-400 hover:text-blue-600 text-2xl"
                              title="Facebook"
                            >
                              <FaFacebook />
                            </a>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {user.aboutMe && (
                <div className="mb-4">
                  <span className="font-semibold text-gray-700">About Me:</span>
                  <p className="ml-2 text-gray-600 mt-1 whitespace-pre-line">{user.aboutMe}</p>
                </div>
              )}

              {/* Events Created by this Organizer */}
              <div className="mt-10">
                <div className="flex items-center mb-4 gap-4">
                  <h2 className="text-2xl font-bold text-blue-700">Events Created by {user.name}</h2>
                  {organizations.length > 0 && (
                    <div>
                      <label htmlFor="orgDropdown" className="mr-2 font-medium text-gray-700">Organizations:</label>
                      <select
                        id="orgDropdown"
                        className="border rounded px-2 py-1"
                        value={selectedOrg}
                        onChange={e => setSelectedOrg(e.target.value)}
                      >
                        <option value="all">All Organizations</option>
                        {organizations.map(org => (
                          <option key={org._id} value={org._id}>{org.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {eventsLoading ? (
                  <p>Loading events...</p>
                ) : events.length === 0 ? (
                  <p className="text-gray-500">No events created by this organizer{selectedOrg !== "all" ? " in this organization" : ""}.</p>
                ) : (
                  <>
                    {/* Split into Upcoming and Past */}
                    {(() => {
                      const now = new Date();
                      const upcoming = events.filter(e => new Date(e.startDateTime) >= now);
                      const past = events.filter(e => new Date(e.startDateTime) < now);
                      return (
                        <>
                          <h3 className="text-xl font-semibold mt-8 mb-2 text-blue-700">Upcoming Events</h3>
                          {upcoming.length === 0 ? (
                            <p className="text-gray-500">No upcoming events.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {upcoming.map(e => (
                                <EventCard key={e._id} event={e} />
                              ))}
                            </div>
                          )}
                          <h3 className="text-xl font-semibold mt-10 mb-2 text-gray-700">Past Events</h3>
                          {past.length === 0 ? (
                            <p className="text-gray-500">No past events.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {past.map(e => (
                                <EventCard key={e._id} event={e} />
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
      {/* Fade-in animation keyframes */}
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
        .animate-fade-in-slow {
          animation: fadeIn 1.2s cubic-bezier(0.4,0,0.2,1) both;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
} 