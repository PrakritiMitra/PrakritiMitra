// src/pages/VolunteerDashboard.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/layout/Navbar"; // ✅ Import Navbar
import Footer from "./Footer";

export default function VolunteerDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios
      .get("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        withCredentials: true,
      })
      .then((res) => setUser(res.data.user))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar /> {/* ✅ Include Navbar */}

      <div className="pt-24 px-6">
        <h1 className="text-2xl font-bold mb-4">Volunteer Dashboard</h1>
        {user ? (
          <div>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </div>
        ) : (
          <p>Loading user data...</p>
        )}
      </div>
      <Footer />
    </div>
  );
}
