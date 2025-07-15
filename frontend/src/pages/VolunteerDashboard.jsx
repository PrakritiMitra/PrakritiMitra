// src/pages/VolunteerDashboard.jsx

import React, { useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import VolunteerEventsTab from "../components/volunteer/VolunteerEventsTab";
import VolunteerOrganizationsTab from "../components/volunteer/VolunteerOrganizationsTab";

export default function VolunteerDashboard() {
  const [activeTab, setActiveTab] = useState("events");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-24 px-6">
        <h1 className="text-2xl font-bold mb-6">Volunteer Dashboard</h1>

        {/* Tab Headers */}
        <div className="flex space-x-4 border-b mb-6">
          <button
            onClick={() => setActiveTab("events")}
            className={`py-2 px-4 font-semibold ${
              activeTab === "events"
                ? "border-b-4 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-500"
            }`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab("organizations")}
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
          {activeTab === "organizations" && <VolunteerOrganizationsTab />}
        </div>
      </div>

      <Footer />
    </div>
  );
}
