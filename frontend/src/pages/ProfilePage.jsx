import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile, deleteAccount } from "../api/auth";
import { getMyOrganization } from "../api/organization";
import Navbar from "../components/layout/Navbar";
import { formatDate } from "../utils/dateUtils";
import {
  UserIcon,
  CameraIcon,
  IdentificationIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  GlobeAltIcon,
  LockClosedIcon,
  KeyIcon
} from "@heroicons/react/24/outline";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [govtIdPreview, setGovtIdPreview] = useState(null);
  const [removeProfileImage, setRemoveProfileImage] = useState(false);
  const [removeGovtIdProof, setRemoveGovtIdProof] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [usernameError, setUsernameError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch organization details if user is an organizer
        if (userData.role === "organizer") {
          try {
            const orgResponse = await getMyOrganization();
            if (orgResponse.data && orgResponse.data._id) {
              setOrganization(orgResponse.data);
            }
          } catch (error) {
            console.error("No organization found or error fetching organization");
          }
        }

        setUser(userData);
        setFormData({
          name: userData.name || "",
          username: userData.username || "",
          email: userData.email || "",
          phone: userData.phone || "",
          emergencyPhone: userData.emergencyPhone || "",
          dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString().split('T')[0] : "",
          city: userData.city || "",
          gender: userData.gender || "",
          aboutMe: userData.aboutMe || "",
          socials: {
            instagram: userData.socials?.instagram || "",
            linkedin: userData.socials?.linkedin || "",
            twitter: userData.socials?.twitter || "",
            facebook: userData.socials?.facebook || "",
          },
          newPassword: "",
          confirmPassword: "",
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
        // Trigger animations
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
      }
    };

    fetchData();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validate username format
    if (name === 'username') {
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (value.length > 0 && !usernameRegex.test(value)) {
        setUsernameError('Username can only contain letters, numbers, and underscores');
      } else if (value.length > 0 && value.length < 3) {
        setUsernameError('Username must be at least 3 characters long');
      } else if (value.length > 30) {
        setUsernameError('Username must be 30 characters or less');
      } else {
        setUsernameError('');
      }
    }
    
    if (name.startsWith('socials.')) {
      const socialKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socials: {
          ...prev.socials,
          [socialKey]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, profileImage: file }));
      setProfileImagePreview(URL.createObjectURL(file));
      setRemoveProfileImage(false); // Reset remove flag when new file is selected
    }
  };

  const handleGovtIdChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, govtIdProof: file }));
      setGovtIdPreview(URL.createObjectURL(file));
      setRemoveGovtIdProof(false); // Reset remove flag when new file is selected
    }
  };

  const handleRemoveProfileImage = () => {
    setRemoveProfileImage(true);
    setProfileImagePreview(null);
    setFormData(prev => ({ ...prev, profileImage: undefined }));
  };

  const handleRemoveGovtIdProof = () => {
    setRemoveGovtIdProof(true);
    setGovtIdPreview(null);
    setFormData(prev => ({ ...prev, govtIdProof: undefined }));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.toLowerCase() !== 'delete my account') {
      alert('Please type "delete my account" exactly as shown to confirm deletion.');
      return;
    }

    if (!window.confirm('⚠️ WARNING: This will permanently delete your account and all associated data. This action cannot be undone. Are you absolutely sure?')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteAccount();
      
      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to home with a success message in the state
      navigate('/', { 
        state: { 
          message: 'Your account has been successfully deleted. We\'re sorry to see you go!',
          messageType: 'success'
        },
        replace: true // Replace the current entry in the history stack
      });
      
      // Force a full page reload to ensure all state is cleared
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error deleting account:', error);
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Failed to delete account. Please try again later.';
      
      alert(`Error: ${errorMessage}`);
      
      // If it's an authentication error, log the user out
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
      }
      
      // Close the dialog on error
      setShowDeleteDialog(false);
      setDeleteConfirmation('');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.username && formData.username.length < 3) {
      alert("Username must be at least 3 characters long.");
      return;
    }
    
    setSaving(true);

    try {
      const data = new FormData();
      
      // Add all form data
      Object.keys(formData).forEach(key => {
        if (key === 'socials') {
          data.append('socials', JSON.stringify(formData.socials));
        } else if (key === 'profileImage' && formData[key]) {
          data.append('profileImage', formData[key]);
        } else if (key === 'govtIdProof' && formData[key]) {
          data.append('govtIdProof', formData[key]);
        } else if (formData[key] && key !== 'newPassword' && key !== 'confirmPassword' && key !== 'organization') {
          data.append(key, formData[key]);
        }
      });

      // Add remove flags
      if (removeProfileImage) {
        data.append('removeProfileImage', 'true');
      }
      if (removeGovtIdProof) {
        data.append('removeGovtIdProof', 'true');
      }

      // Handle password change
      if (formData.newPassword && formData.newPassword === formData.confirmPassword) {
        data.append('password', formData.newPassword);
      }

      const response = await updateProfile(data);
      
      if (response.data.success) {
        // Update localStorage with new user data
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        setEditing(false);
        // Update previews after save
        setProfileImagePreview(null);
        setGovtIdPreview(null);
        setRemoveProfileImage(false);
        setRemoveGovtIdProof(false);
        setRefreshKey(prev => prev + 1);
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          newPassword: "",
          confirmPassword: "",
          profileImage: undefined,
          govtIdProof: undefined,
        }));
        
        // Dispatch custom event to notify other components about user data update
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { user: response.data.user }
        }));
        
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
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
            <p className="text-slate-600">Please log in to view your profile.</p>
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
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center overflow-hidden border-4 border-blue-200 shadow-lg">
                  {user.profileImage ? (
                    <img
                      src={`http://localhost:5000/uploads/Profiles/${user.profileImage}?k=${refreshKey}`}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                      {(user.username || user.name) ? (user.username || user.name).charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                </div>
                {/* Govt ID Proof */}
                {user.govtIdProofUrl ? (
                  user.govtIdProofUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                    <img
                      src={`http://localhost:5000/uploads/Profiles/${user.govtIdProofUrl}?k=${refreshKey}`}
                      alt="Govt ID"
                      className="w-20 h-14 object-contain border rounded shadow-md mt-2"
                    />
                  ) : (
                    <a
                      href={`http://localhost:5000/uploads/Profiles/${user.govtIdProofUrl}?k=${refreshKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-xs mt-2"
                    >
                      View Govt ID
                    </a>
                  )
                ) : (
                  <span className="text-slate-400 text-xs mt-2">No Govt ID uploaded</span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent">{user.name}</h1>
                <p className="text-lg text-blue-600 font-medium">{user.username ? `@${user.username}` : ''}</p>
                <p className="text-slate-600 capitalize">{user.role === "organizer" ? "Event Organizer" : "Volunteer"}</p>
                {organization && (
                  <p className="text-sm text-blue-600 font-medium">{organization.name}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(!editing)}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                  editing 
                    ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-700 hover:to-slate-800' 
                    : 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:from-blue-700 hover:to-emerald-700'
                }`}
              >
                {editing ? <XMarkIcon className="w-5 h-5" /> : <PencilIcon className="w-5 h-5" />}
                {editing ? 'Cancel' : 'Edit Profile'}
              </button>
              {editing && (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <CheckIcon className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Photo Section */}
          {editing && (
            <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3">
                  <CameraIcon className="w-5 h-5 text-white" />
                </div>
                Profile Photo
              </h2>
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center overflow-hidden border-4 border-blue-200 shadow-lg transition-transform duration-500 hover:scale-110">
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt="Profile Preview"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : user.profileImage ? (
                    <img
                      src={`http://localhost:5000/uploads/Profiles/${user.profileImage}`}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                      {(user.username || user.name) ? (user.username || user.name).charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Change Profile Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-slate-500 mt-1">Recommended: Square image, max 2MB</p>
                  {user.profileImage && !removeProfileImage && (
                    <button
                      type="button"
                      onClick={handleRemoveProfileImage}
                      className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Remove Current Photo
                    </button>
                  )}
                </div>
              </div>
              {/* Govt ID Proof Section */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center">
                  <div className="w-7 h-7 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mr-2">
                    <IdentificationIcon className="w-4 h-4 text-white" />
                  </div>
                  Govt ID Proof
                </h3>
                <div className="flex items-center gap-6">
                  {govtIdPreview ? (
                    <div>
                      <span className="block text-xs text-slate-500 mb-1">Preview:</span>
                      <img
                        src={govtIdPreview}
                        alt="Govt ID Preview"
                        className="w-32 h-20 object-contain border rounded shadow-md"
                      />
                    </div>
                  ) : user.govtIdProofUrl ? (
                    <div>
                      <span className="block text-xs text-slate-500 mb-1">Current:</span>
                      {user.govtIdProofUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                        <img
                          src={`http://localhost:5000/uploads/Profiles/${user.govtIdProofUrl}`}
                          alt="Govt ID"
                          className="w-32 h-20 object-contain border rounded shadow-md"
                        />
                      ) : (
                        <a
                          href={`http://localhost:5000/uploads/Profiles/${user.govtIdProofUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline text-sm"
                        >
                          View Govt ID
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm">No Govt ID uploaded</span>
                  )}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Change Govt ID Proof</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleGovtIdChange}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                    <p className="text-xs text-slate-500 mt-1">Accepted: Image/PDF, max 5MB</p>
                    {user.govtIdProofUrl && !removeGovtIdProof && (
                      <button
                        type="button"
                        onClick={handleRemoveGovtIdProof}
                        className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Remove Current Govt ID
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                Personal Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={!editing}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={!editing}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors ${
                        usernameError ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="username"
                    />
                    {editing && (
                      <p className={`text-xs mt-1 ${
                        usernameError ? 'text-red-500' : 'text-slate-500'
                      }`}>
                        {usernameError || 'Username can only contain letters, numbers, and underscores'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      disabled={!editing}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      disabled={!editing}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4" />
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                  />
                </div>
                {/* About Me moved here */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">About Me</label>
                  <textarea
                    name="aboutMe"
                    value={formData.aboutMe}
                    onChange={handleChange}
                    disabled={!editing}
                    rows={6}
                    placeholder="Tell us about yourself, your interests, and what drives you to make a difference..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mr-3">
                  <PhoneIcon className="w-5 h-5 text-white" />
                </div>
                Contact Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4" />
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <ShieldCheckIcon className="w-4 h-4" />
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Account Information & Socials */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Account Information */}
            <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                </div>
                Account Information
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-slate-200">
                  <span className="font-medium text-slate-700">Role:</span>
                  <span className="text-slate-900 capitalize font-semibold">{user.role}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-200">
                  <span className="font-medium text-slate-700">Member Since:</span>
                  <span className="text-slate-900">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
                {organization && (
                  <div className="flex justify-between py-3 border-b border-slate-200">
                    <span className="font-medium text-slate-700">Organization:</span>
                    <span className="text-blue-600 font-semibold">{organization.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Socials */}
            <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mr-3">
                  <GlobeAltIcon className="w-5 h-5 text-white" />
                </div>
                Social Media
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Instagram</label>
                  <input
                    type="url"
                    name="socials.instagram"
                    value={formData.socials.instagram}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="https://instagram.com/username"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn</label>
                  <input
                    type="url"
                    name="socials.linkedin"
                    value={formData.socials.linkedin}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Twitter</label>
                  <input
                    type="url"
                    name="socials.twitter"
                    value={formData.socials.twitter}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="https://twitter.com/username"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Facebook</label>
                  <input
                    type="url"
                    name="socials.facebook"
                    value={formData.socials.facebook}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="https://facebook.com/username"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center mr-3">
                <LockClosedIcon className="w-5 h-5 text-white" />
              </div>
              Change Password
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <KeyIcon className="w-4 h-4" />
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <KeyIcon className="w-4 h-4" />
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors"
                />
              </div>
              {formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p className="text-red-500 text-sm">Passwords do not match</p>
              )}
            </div>
          </div>
        </form>

        {/* Account Deletion Section */}
        <div className={`mt-8 pt-6 border-t border-slate-200 transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mr-2">
              <TrashIcon className="w-5 h-5 text-white" />
            </div>
            Delete Account
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <TrashIcon className="w-4 h-4" />
            Delete My Account
          </button>
        </div>

        {/* Back Button */}
        <div className={`mt-8 pt-6 border-t border-slate-200 transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back
          </button>
        </div>

        {/* Delete Account Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/20">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Delete Your Account</h3>
              <p className="text-slate-700 mb-4">
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <p className="text-sm text-slate-600 mb-4">
                Type <span className="font-mono bg-slate-100 px-2 py-1 rounded">delete my account</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg mb-4"
                placeholder="Type 'delete my account' to confirm"
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteConfirmation('');
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmation.toLowerCase() !== 'delete my account'}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    deleteConfirmation.toLowerCase() === 'delete my account' 
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' 
                      : 'bg-red-300 cursor-not-allowed'
                  }`}
                >
                  {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}