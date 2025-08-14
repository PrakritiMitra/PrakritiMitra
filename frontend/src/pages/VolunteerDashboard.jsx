// src/pages/VolunteerDashboard.jsx

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import VolunteerEventsTab from "../components/volunteer/VolunteerEventsTab";
import VolunteerOrganizationsTab from "../components/volunteer/VolunteerOrganizationsTab";
import SimpleEventCalendar from "../components/calendar/SimpleEventCalendar";
import {
  CalendarDaysIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";

export default function VolunteerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("events");
  const [user, setUser] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Get user from localStorage
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    // Check for tab parameter in URL
    const tabParam = searchParams.get('tab');
    if (tabParam && ['events', 'calendar', 'organizations'].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    // Trigger animations
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Function to handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Update URL with the new tab parameter
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />

      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-emerald-900 to-emerald-700 bg-clip-text text-transparent">
                Volunteer Dashboard
              </h1>
              <p className="text-slate-600 mt-1">Manage your events, calendar, and organizations</p>
            </div>
          </div>
        </div>

        {/* Tab Headers */}
        <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-2 mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex space-x-2">
            <button
              onClick={() => handleTabChange("events")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === "events"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg"
                  : "text-slate-600 hover:text-emerald-600 hover:bg-slate-100/50"
              }`}
            >
              <CalendarDaysIcon className="w-5 h-5" />
              Events
            </button>
            <button
              onClick={() => handleTabChange("calendar")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === "calendar"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg"
                  : "text-slate-600 hover:text-emerald-600 hover:bg-slate-100/50"
              }`}
            >
              <CalendarDaysIcon className="w-5 h-5" />
              Calendar
            </button>
            <button
              onClick={() => handleTabChange("organizations")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === "organizations"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg"
                  : "text-slate-600 hover:text-emerald-600 hover:bg-slate-100/50"
              }`}
            >
              <BuildingOfficeIcon className="w-5 h-5" />
              Organizations
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {activeTab === "events" && <VolunteerEventsTab />}
          {activeTab === "calendar" && user && (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="max-w-5xl mx-auto">
                <SimpleEventCalendar 
                  role="volunteer" 
                  userId={user._id} 
                />
              </div>
            </div>
          )}
          {activeTab === "organizations" && <VolunteerOrganizationsTab />}
        </div>
      </div>

    </div>
  );
}
