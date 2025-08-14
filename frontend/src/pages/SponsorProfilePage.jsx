import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sponsorAPI } from "../api";
import { SponsorProfileForm, SponsorProfileDisplay } from "../components/sponsor";
import Navbar from "../components/layout/Navbar";
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
import {
  CurrencyDollarIcon,
  UserIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  SparklesIcon,
  CheckCircleIcon,
  BoltIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";

export default function SponsorProfilePage() {
  const [user, setUser] = useState(null);
  const [sponsorProfile, setSponsorProfile] = useState(null);
  const [showSponsorForm, setShowSponsorForm] = useState(false);
  const [sponsorLoading, setSponsorLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    setUser(userData);
    setLoading(false);

    // Fetch sponsor profile if user is a sponsor
    if (userData.sponsor?.isSponsor) {
      fetchSponsorProfile();
    }

    // Trigger animations
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [navigate]);

  // Fetch sponsor profile data
  const fetchSponsorProfile = async () => {
    setSponsorLoading(true);
    try {
      const sponsorResponse = await sponsorAPI.getMySponsorProfile();
      setSponsorProfile(sponsorResponse);
    } catch (error) {
      console.error('Error fetching sponsor profile:', error);
    } finally {
      setSponsorLoading(false);
    }
  };

  const handleCreateSponsor = () => {
    setShowSponsorForm(true);
  };

  const handleSponsorSuccess = async () => {
    setShowSponsorForm(false);
    
    // Update user data in localStorage
    const userData = JSON.parse(localStorage.getItem("user"));
    userData.sponsor = { isSponsor: true };
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    
    // Dispatch custom event to notify other components about user data update
    window.dispatchEvent(new CustomEvent('userDataUpdated', {
      detail: { user: userData }
    }));
    
    // Refresh sponsor profile
    await fetchSponsorProfile();
    
    alert('Sponsor profile created successfully!');
  };

  const handleSponsorCancel = () => {
    setShowSponsorForm(false);
  };

  const handleEditSponsor = () => {
    setShowSponsorForm(true);
  };

  const handleDeleteSponsor = async () => {
    if (window.confirm('Are you sure you want to delete your sponsor profile? This action cannot be undone.')) {
      try {
        await sponsorAPI.deleteSponsorProfile();
        
        // Update user data in localStorage
        const userData = JSON.parse(localStorage.getItem("user"));
        userData.sponsor = { isSponsor: false };
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        
        // Dispatch custom event to notify other components about user data update
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { user: userData }
        }));
        
        setSponsorProfile(null);
        alert('Sponsor profile deleted successfully!');
      } catch (error) {
        console.error('Error deleting sponsor profile:', error);
        alert('Failed to delete sponsor profile. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Navbar />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Profile Not Found</h1>
            <p className="text-slate-600">Please log in to view your sponsor profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center overflow-hidden border-4 border-purple-200 shadow-lg">
                  {getProfileImageUrl(user) ? (
                    <img
                      src={getProfileImageUrl(user)}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${getRoleColors('sponsor')}`}>
                      <span className="text-2xl font-bold text-white">{getAvatarInitial(user)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-blue-900 bg-clip-text text-transparent">Sponsor Profile</h1>
                <p className="text-lg text-purple-600 font-medium">{user.name}</p>
                <p className="text-slate-600">{user.username ? `@${user.username}` : ''}</p>
                <p className="text-sm text-slate-500 capitalize">{user.role === "organizer" ? "Event Organizer" : "Volunteer"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {user.sponsor?.isSponsor && sponsorProfile && (
                <button
                  onClick={handleEditSponsor}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <PencilIcon className="w-5 h-5" />
                  Edit Sponsor Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sponsor Section */}
        {!showSponsorForm && (
          <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mr-3">
                    <CurrencyDollarIcon className="w-5 h-5 text-white" />
                  </div>
                  Sponsor Capabilities
                </h2>
                <p className="text-slate-600 text-lg">
                  {user.sponsor?.isSponsor 
                    ? 'You have sponsor capabilities enabled. Manage your sponsor profile below.'
                    : 'Upgrade your account to become a sponsor and support great causes.'
                  }
                </p>
              </div>
              {!user.sponsor?.isSponsor && (
                <button
                  onClick={handleCreateSponsor}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <SparklesIcon className="w-5 h-5" />
                  Become a Sponsor
                </button>
              )}
            </div>

            {user.sponsor?.isSponsor ? (
              <div>
                {sponsorLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 text-lg">Loading sponsor profile...</p>
                  </div>
                ) : sponsorProfile ? (
                  <SponsorProfileDisplay
                    sponsor={sponsorProfile}
                    onEdit={handleEditSponsor}
                    onDelete={handleDeleteSponsor}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ExclamationTriangleIcon className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-slate-600 mb-6 text-lg">Your sponsor profile is being processed...</p>
                    <button
                      onClick={handleCreateSponsor}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <PencilIcon className="w-5 h-5" />
                      Create Sponsor Profile
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center group">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <CurrencyDollarIcon className="w-10 h-10 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-3 text-lg">Support Causes</h3>
                    <p className="text-slate-600">Contribute to events and organizations that make a difference</p>
                  </div>
                  <div className="text-center group">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <CheckCircleIcon className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-3 text-lg">Get Recognition</h3>
                    <p className="text-slate-600">Receive acknowledgment and visibility for your contributions</p>
                  </div>
                  <div className="text-center group">
                    <div className="w-20 h-20 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <BoltIcon className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-3 text-lg">Track Impact</h3>
                    <p className="text-slate-600">Monitor the impact of your sponsorships and contributions</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sponsor Form Modal */}
        {showSponsorForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
              <SponsorProfileForm
                onSuccess={handleSponsorSuccess}
                onCancel={handleSponsorCancel}
                existingSponsor={sponsorProfile}
              />
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className={`mt-8 pt-6 border-t border-slate-200 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>
    </div>
  );
} 