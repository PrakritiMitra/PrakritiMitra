import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { getUserById } from "../api/organization";

export default function UserProfilePage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                  src={user.profileImage ? `/uploads/${user.profileImage}` : '/images/default-profile.jpg'}
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
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Socials:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {user.socials.instagram && (
                          <a href={user.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">Instagram</a>
                        )}
                        {user.socials.linkedin && (
                          <a href={user.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">LinkedIn</a>
                        )}
                        {user.socials.twitter && (
                          <a href={user.socials.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Twitter</a>
                        )}
                        {user.socials.facebook && (
                          <a href={user.socials.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Facebook</a>
                        )}
                      </div>
                    </div>
                  )}
                  {user.govtIdProofUrl && (
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Govt ID Proof:</span>
                      <a
                        href={`/uploads/${user.govtIdProofUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 underline"
                      >
                        View
                      </a>
                    </div>
                  )}
                </div>
              </div>
              {user.aboutMe && (
                <div className="mb-4">
                  <span className="font-semibold text-gray-700">About Me:</span>
                  <p className="ml-2 text-gray-600 mt-1 whitespace-pre-line">{user.aboutMe}</p>
                </div>
              )}
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