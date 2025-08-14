// src/pages/VolunteerDashboard.jsx

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import VolunteerEventsTab from "../components/volunteer/VolunteerEventsTab";
import VolunteerOrganizationsTab from "../components/volunteer/VolunteerOrganizationsTab";
import SimpleEventCalendar from "../components/calendar/SimpleEventCalendar";

export default function VolunteerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("events");
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    // Check for tab parameter in URL
    const tabParam = searchParams.get('tab');
    if (tabParam && ['events', 'calendar', 'organizations'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Function to handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Update URL with the new tab parameter
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-16 px-1">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Volunteer Dashboard</h1>

        {/* Tab Headers */}
        <div className="flex space-x-4 border-b mb-4">
          <button
            onClick={() => handleTabChange("events")}
            className={`py-2 px-4 font-semibold ${
              activeTab === "events"
                ? "border-b-4 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-500"
            }`}
          >
            Events
          </button>
          <button
            onClick={() => handleTabChange("calendar")}
            className={`py-2 px-4 font-semibold ${
              activeTab === "calendar"
                ? "border-b-4 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-500"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => handleTabChange("organizations")}
            className={`py-2 px-4 font-semibold ${
              activeTab === "organizations"
                ? "border-b-4 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-500"
            }`}
          >
            Organizations
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "events" && <VolunteerEventsTab />}
          {activeTab === "calendar" && user && (
            <div className="max-w-5xl mx-auto">
              <SimpleEventCalendar 
                role="volunteer" 
                userId={user._id} 
              />
            </div>
          )}
          {activeTab === "organizations" && <VolunteerOrganizationsTab />}
        </div>
      </div>
      <Footer />
    </div>
  );
}
