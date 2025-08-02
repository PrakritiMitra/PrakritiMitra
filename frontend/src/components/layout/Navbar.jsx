// src/components/layout/Navbar.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import axiosInstance from "../../api/axiosInstance";
import { getMyOrganization } from "../../api/organization";
import { ChevronDown, LogOut, User } from "react-feather";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState({ volunteers: [], organizers: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSearchTab, setActiveSearchTab] = useState("volunteers"); // "volunteers" or "organizers"

  const [orgExists, setOrgExists] = useState(null); // null = unknown, true/false = resolved
  
  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    const handleStorage = () => {
      setUser(JSON.parse(localStorage.getItem("user")));
    };
    window.addEventListener("storage", handleStorage);
    // Also update on mount and on route change
    handleStorage();
    return () => window.removeEventListener("storage", handleStorage);
  }, [pathname]);

  useEffect(() => {
    const checkOrganization = async () => {
      if (user?.role !== "organizer") return;
      try {
        const res = await getMyOrganization();

        if (res.data && res.data._id) setOrgExists(true);
        else setOrgExists(false);
      } catch (err) {
        setOrgExists(false);
      }
    };

    if (token && user?.role === "organizer") {
      checkOrganization();
    }
  }, [token, user]);

  // Search for users (volunteers and organizers)
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults({ volunteers: [], organizers: [] });
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const [volunteersRes, organizersRes] = await Promise.all([
        axiosInstance.get(`/api/users/volunteers?search=${query}`),
        axiosInstance.get(`/api/users/organizers?search=${query}`)
      ]);

      setSearchResults({
        volunteers: volunteersRes.data,
        organizers: organizersRes.data
      });
      setShowSearchResults(true);
      setActiveSearchTab("volunteers"); // Reset to volunteers tab
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults({ volunteers: [], organizers: [] });
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle user click
  const handleUserClick = (user, type) => {
    if (type === 'volunteer') {
      navigate(`/volunteer/${user._id}`);
    } else {
      navigate(`/organizer/${user._id}`);
    }
    setShowSearchResults(false);
    setSearchTerm("");
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
      if (!event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isActive = (path) => pathname === path;

  const getDashboardPath = () => {
    if (user?.role === "organizer") return "/organizer/dashboard";
    if (user?.role === "volunteer") return "/volunteer/dashboard";
    return "/";
  };

  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  const getUserDisplayName = () => {
    if (!user) return "User";
    return user.username || user.name || "User";
  };

  return (
    <nav className="bg-white shadow-md fixed top-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-blue-700">
          PrakritiMitra
        </Link>

        {/* Search Bar - Only show for logged-in users */}
        {token && (
          <div className="flex-1 max-w-md mx-6 search-container">
            <div className="relative">
              <input
                type="text"
                placeholder="Search volunteers and organizers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 pl-8 pr-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-hidden z-50">
                  {searchLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      Searching...
                    </div>
                  ) : (
                    <div>
                      {/* Tab Headers */}
                      <div className="flex border-b border-gray-200">
                        <button
                          onClick={() => setActiveSearchTab("volunteers")}
                          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                            activeSearchTab === "volunteers"
                              ? "text-green-600 border-b-2 border-green-600 bg-green-50"
                              : "text-gray-500 hover:text-green-600"
                          }`}
                        >
                          Volunteers ({searchResults.volunteers.length})
                        </button>
                        <button
                          onClick={() => setActiveSearchTab("organizers")}
                          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                            activeSearchTab === "organizers"
                              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                              : "text-gray-500 hover:text-blue-600"
                          }`}
                        >
                          Organizers ({searchResults.organizers.length})
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div className="p-2 max-h-80 overflow-y-auto">
                        <AnimatePresence mode="wait">
                          {activeSearchTab === "volunteers" ? (
                            <motion.div
                              key="volunteers"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.2 }}
                            >
                              {searchResults.volunteers.length > 0 ? (
                                searchResults.volunteers.map((user) => {
                                  const displayName = user.username || user.name || 'User';
                                  const displayText = user.username ? `@${user.username}` : displayName;
                                  
                                  return (
                                    <div
                                      key={user._id}
                                      onClick={() => handleUserClick(user, 'volunteer')}
                                      className="flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition cursor-pointer hover:bg-green-50 mb-2"
                                    >
                                      <img
                                        src={user.profileImage ? `http://localhost:5000/uploads/Profiles/${user.profileImage}` : '/images/default-profile.jpg'}
                                        alt={displayName}
                                        className="w-12 h-12 rounded-full object-cover border-2 border-green-400 mr-3"
                                      />
                                      <div className="flex flex-col flex-1">
                                        <span className="font-medium text-base text-green-800">{displayText}</span>
                                        {user.username && user.name && (
                                          <span className="text-sm text-gray-600">{user.name}</span>
                                        )}
                                        <span className="text-xs text-gray-500 capitalize">volunteer</span>
                                      </div>
                                      <div className="px-2 py-1 rounded text-xs font-bold text-white bg-green-500">
                                        Volunteer
                                      </div>
                                    </div>
                                  );
                                })
                              ) : searchTerm.trim() ? (
                                <div className="p-4 text-center text-gray-500">
                                  No volunteers found matching "{searchTerm}"
                                </div>
                              ) : (
                                <div className="p-4 text-center text-gray-500">
                                  No volunteers available
                                </div>
                              )}
                            </motion.div>
                          ) : (
                            <motion.div
                              key="organizers"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.2 }}
                            >
                              {searchResults.organizers.length > 0 ? (
                                searchResults.organizers.map((user) => {
                                  const displayName = user.username || user.name || 'User';
                                  const displayText = user.username ? `@${user.username}` : displayName;
                                  
                                  return (
                                    <div
                                      key={user._id}
                                      onClick={() => handleUserClick(user, 'organizer')}
                                      className="flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition cursor-pointer hover:bg-blue-50 mb-2"
                                    >
                                      <img
                                        src={user.profileImage ? `http://localhost:5000/uploads/Profiles/${user.profileImage}` : '/images/default-profile.jpg'}
                                        alt={displayName}
                                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-400 mr-3"
                                      />
                                      <div className="flex flex-col flex-1">
                                        <span className="font-medium text-base text-blue-800">{displayText}</span>
                                        {user.username && user.name && (
                                          <span className="text-sm text-gray-600">{user.name}</span>
                                        )}
                                        <span className="text-xs text-gray-500 capitalize">organizer</span>
                                      </div>
                                      <div className="px-2 py-1 rounded text-xs font-bold text-white bg-blue-500">
                                        Organizer
                                      </div>
                                    </div>
                                  );
                                })
                              ) : searchTerm.trim() ? (
                                <div className="p-4 text-center text-gray-500">
                                  No organizers found matching "{searchTerm}"
                                </div>
                              ) : (
                                <div className="p-4 text-center text-gray-500">
                                  No organizers available
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-5">
          {!token ? (
            <>
              <Link
                to="/"
                className={`text-sm font-medium ${
                  isActive("/")
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-500"
                }`}
              >
                Home
              </Link>
              <Link
                to="/signup"
                className={`text-sm font-medium ${
                  isActive("/signup")
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-500"
                }`}
              >
                Sign-up
              </Link>
              <Link
                to="/login"
                className={`text-sm font-medium ${
                  isActive("/login")
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-500"
                }`}
              >
                Login
              </Link>
            </>
          ) : (
            <>
              {/* Dashboard - Always first */}
              <Link
                to={getDashboardPath()}
                className={`text-sm font-medium ${
                  isActive(getDashboardPath())
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-500"
                }`}
              >
                Dashboard
              </Link>

              {/* Events Management Dropdown for Organizers */}
              {user?.role === "organizer" && (
                <div className="relative dropdown-container">
                  <button
                    onClick={() => toggleDropdown('events')}
                    className={`text-sm font-medium flex items-center gap-1 ${
                      isActive("/my-events") || isActive("/recurring-series")
                        ? "text-blue-600"
                        : "text-gray-700 hover:text-blue-500"
                    }`}
                  >
                    Events
                    <ChevronDown size={14} className={`transition-transform ${activeDropdown === 'events' ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {activeDropdown === 'events' && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="absolute left-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                      >
                        <Link
                          to="/my-events"
                          onClick={() => setActiveDropdown(null)}
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-t-lg transition-colors"
                        >
                          My Events
                        </Link>
                        <Link
                          to="/recurring-series"
                          onClick={() => setActiveDropdown(null)}
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-b-lg transition-colors"
                        >
                          Recurring Series
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* My Events for Volunteers */}
              {user?.role === "volunteer" && (
                <Link
                  to="/volunteer/my-events"
                  className={`text-sm font-medium ${isActive("/volunteer/my-events") ? "text-blue-600" : "text-gray-700 hover:text-blue-500"}`}
                >
                  My Events
                </Link>
              )}

              {/* Organizations Management Dropdown for Organizers */}
              {user?.role === "organizer" && (
                <div className="relative dropdown-container">
                  <button
                    onClick={() => toggleDropdown('organizations')}
                    className={`text-sm font-medium flex items-center gap-1 ${
                      isActive("/your-organizations") || isActive("/join-organization") || isActive("/register-organization")
                        ? "text-blue-600"
                        : "text-gray-700 hover:text-blue-500"
                    }`}
                  >
                    Organizations
                    <ChevronDown size={14} className={`transition-transform ${activeDropdown === 'organizations' ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {activeDropdown === 'organizations' && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                      >
                        <Link
                          to="/your-organizations"
                          onClick={() => setActiveDropdown(null)}
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-t-lg transition-colors"
                        >
                          My Organizations
                        </Link>
                        <Link
                          to="/join-organization"
                          onClick={() => setActiveDropdown(null)}
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                        >
                          Explore Organizations
                        </Link>
                        {orgExists === false && (
                          <Link
                            to="/register-organization"
                            onClick={() => setActiveDropdown(null)}
                            className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-b-lg transition-colors"
                          >
                            Register Organization
                          </Link>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Sponsorships Dropdown - for all users */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => toggleDropdown('sponsorships')}
                  className={`text-sm font-medium flex items-center gap-1 ${
                    isActive("/my-applications")
                      ? "text-blue-600"
                      : "text-gray-700 hover:text-blue-500"
                  }`}
                >
                  Sponsorships
                  <ChevronDown size={14} className={`transition-transform ${activeDropdown === 'sponsorships' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeDropdown === 'sponsorships' && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                    >
                      <Link
                        to="/my-applications"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-t-lg transition-colors"
                      >
                        My Sponsorship Applications
                      </Link>
                      {/* Future sponsorship-related links can be added here */}
                      {/* Example:
                      <Link
                        to="/sponsor-profile"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                      >
                        Sponsor Profile
                      </Link>
                      <Link
                        to="/sponsorship-opportunities"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-b-lg transition-colors"
                      >
                        Find Opportunities
                      </Link>
                      */}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Resource Center dropdown for all logged-in users */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => toggleDropdown('resources')}
                  className={`text-sm font-medium flex items-center gap-1 ${
                    isActive("/resources") || isActive("/faqs")
                      ? "text-blue-600"
                      : "text-gray-700 hover:text-blue-500"
                  }`}
                >
                  Resources
                  <ChevronDown size={14} className={`transition-transform ${activeDropdown === 'resources' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeDropdown === 'resources' && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute left-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                    >
                      <Link
                        to="/resources"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-t-lg transition-colors"
                      >
                        Resource Center
                      </Link>
                      <Link
                        to="/faqs"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-b-lg transition-colors"
                      >
                        FAQs
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile & Logout Dropdown */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => toggleDropdown('profile')}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-500 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                    {user && user.profileImage ? (
                      <img
                        src={`http://localhost:5000/uploads/Profiles/${user.profileImage}`}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="text-sm font-bold text-blue-600">
                        {user && (user.username || user.name)
                          ? (user.username || user.name).charAt(0).toUpperCase()
                          : "U"}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium">{getUserDisplayName()}</span>
                  <ChevronDown size={14} className={`transition-transform ${activeDropdown === 'profile' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeDropdown === 'profile' && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                    >
                      <Link
                        to="/profile"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-t-lg transition-colors"
                      >
                        <User size={16} className="mr-2" />
                        Profile
                      </Link>
                      <Link
                        to="/sponsor-profile"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                      >
                        <User size={16} className="mr-2" />
                        Sponsor Profile
                      </Link>
                      <button
                        onClick={() => {
                          setActiveDropdown(null);
                          handleLogout();
                        }}
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-red-600 rounded-b-lg transition-colors"
                      >
                        <LogOut size={16} className="mr-2" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
