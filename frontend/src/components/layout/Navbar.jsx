// src/components/layout/Navbar.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { getMyOrganization } from "../../api/organization";

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));

  const [orgExists, setOrgExists] = useState(null); // null = unknown, true/false = resolved

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

  return (
    <nav className="bg-white shadow-md fixed top-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-blue-700">
          PrakritiMitra
        </Link>

        <div className="flex space-x-6">
          {!token ? (
            <>
              <Link
                to="/"
                className={`font-medium text-sm ${
                  isActive("/")
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-500"
                }`}
              >
                Home
              </Link>
              <Link
                to="/signup"
                className={`font-medium text-sm ${
                  isActive("/signup")
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-500"
                }`}
              >
                Sign-up
              </Link>
              <Link
                to="/login"
                className={`font-medium text-sm ${
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
              <Link
                to={getDashboardPath()}
                className={`font-medium text-sm ${
                  isActive(getDashboardPath())
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-500"
                }`}
              >
                Dashboard
              </Link>

              {/* My Events link for organizers */}
              {user?.role === "organizer" && (
                <Link
                  to="/my-events"
                  className={`font-medium text-sm ${
                    isActive("/my-events")
                      ? "text-blue-600"
                      : "text-gray-700 hover:text-blue-500"
                  }`}
                >
                  My Events
                </Link>
              )}

              {/* Show for all organizers: Your Organizations */}
              {user?.role === "organizer" && (
                <Link
                  to="/your-organizations"
                  className={`font-medium text-sm ${
                    isActive("/your-organizations")
                      ? "text-blue-600"
                      : "text-gray-700 hover:text-blue-500"
                  }`}
                >
                  My Organizations
                </Link>
              )}

              {/* Explore other organizations */}
              {user?.role === "organizer" && (
                <Link
                  to="/join-organization"
                  className={`font-medium text-sm ${
                    isActive("/join-organization")
                      ? "text-blue-600"
                      : "text-gray-700 hover:text-blue-500"
                  }`}
                >
                  Explore Organizations
                </Link>
              )}

              {user?.role === "organizer" && orgExists === false && (
                <Link
                  to="/register-organization"
                  className={`font-medium text-sm ${
                    isActive("/register-organization")
                      ? "text-blue-600"
                      : "text-gray-700 hover:text-blue-500"
                  }`}
                >
                  Register Org
                </Link>
              )}

              <Link
                to="/profile"
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-500 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                  {user && user.profileImage ? (
                    <img
                      src={`http://localhost:5000/uploads/${user.profileImage}`}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="text-sm font-bold text-blue-600">
                      {user && user.name
                        ? user.name.charAt(0).toUpperCase()
                        : "U"}
                    </div>
                  )}
                </div>
                <span className="font-medium text-sm"></span>
              </Link>

              <button
                onClick={handleLogout}
                className="font-medium text-sm text-gray-700 hover:text-red-500"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
