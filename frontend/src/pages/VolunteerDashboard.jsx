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

      <div className="pt-16 sm:pt-20 px-2 sm:px-4 md:px-6 lg:px-8 w-full">
        {/* Header Section */}
        <div className={`mb-4 sm:mb-6 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="relative">
            {/* User Name Display - More compact and responsive */}
            <div className="text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-1 sm:gap-2 lg:gap-3 mb-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold">
                  <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 bg-clip-text text-transparent animate-pulse">
                    Hello,
                  </span>
                </h1>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold relative">
                  <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                    {user?.name || 'Volunteer'}
                  </span>
                  {/* Enhanced Underline Effect */}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-full transform scale-x-0 animate-pulse" 
                       style={{ 
                         animationDuration: '2s',
                         animationDelay: '0.5s'
                       }}></div>
                </h2>
              </div>
              <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-4xl mx-auto sm:mx-0 leading-relaxed">
                Ready to make a difference? Let's explore amazing environmental events together! 🌱✨
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Headers */}
        <div className={`bg-white/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-white/30 p-1 sm:p-2 mb-4 sm:mb-6 lg:mb-8 transition-all duration-1000 delay-200 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="flex flex-wrap sm:flex-nowrap gap-1 sm:gap-2">
            <button
              onClick={() => handleTabChange("events")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 ease-out transform hover:scale-105 ${
                activeTab === "events"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg scale-105"
                  : "text-slate-600 hover:text-emerald-600 hover:bg-slate-100/60 hover:shadow-md"
              }`}
            >
              <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Events</span>
              <span className="xs:hidden">Events</span>
            </button>
            <button
              onClick={() => handleTabChange("calendar")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 ease-out transform hover:scale-105 ${
                activeTab === "calendar"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg scale-105"
                  : "text-slate-600 hover:text-emerald-600 hover:bg-slate-100/60 hover:shadow-md"
              }`}
            >
              <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Calendar</span>
              <span className="xs:hidden">Cal</span>
            </button>
            <button
              onClick={() => handleTabChange("organizations")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 ease-out transform hover:scale-105 ${
                activeTab === "organizations"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg scale-105"
                  : "text-slate-600 hover:text-emerald-600 hover:bg-slate-100/60 hover:shadow-md"
              }`}
            >
              <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Organizations</span>
              <span className="xs:hidden">Orgs</span>
            </button>
          </div>
        </div>

        {/* Enhanced Tab Content */}
        <div className={`transition-all duration-1000 delay-300 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {activeTab === "events" && (
            <div className="animate-fadeIn">
              <VolunteerEventsTab />
            </div>
          )}
          {activeTab === "calendar" && user && (
            <div className="bg-white/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-white/30 p-3 sm:p-4 lg:p-6 animate-fadeIn">
              <div className="w-full">
                <SimpleEventCalendar 
                  role="volunteer" 
                  userId={user._id} 
                />
              </div>
            </div>
          )}
          {activeTab === "organizations" && (
            <div className="animate-fadeIn">
              <VolunteerOrganizationsTab />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
