//src/components/auth/OrganizerForm.jsx

import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function OrganizerForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    govtIdProofUrl: "",
    organization: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData };
      if (!dataToSend.organization) delete dataToSend.organization;

      const response = await axios.post(
        "http://localhost:5000/api/auth/signup-organizer",
        dataToSend
      );
      alert("Signup successful!");
      console.log(response.data);
      navigate("/login"); // ✅ Redirect to login
    } catch (err) {
      alert("Signup failed.");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Full Name"
        className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        required
      />
      <input
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email"
        className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        required
      />
      <input
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        placeholder="Password"
        className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        required
      />
      <input
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        placeholder="Phone Number"
        className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        required
      />
      <input
        name="dateOfBirth"
        type="date"
        value={formData.dateOfBirth}
        onChange={handleChange}
        className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        required
      />

      <select
        name="gender"
        value={formData.gender}
        onChange={handleChange}
        className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        required
      >
        <option value="">Select Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>

      <input
        name="govtIdProofUrl"
        value={formData.govtIdProofUrl}
        onChange={handleChange}
        placeholder="Govt ID Proof URL"
        className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        required
      />

      {/* Optional: Add organization field here or in a separate "Register Organization" page */}
      {/* <input name="organization" value={formData.organization} onChange={handleChange} placeholder="Organization ID (optional)" className="input" /> */}

      <button
        type="submit"
        className="w-full bg-green-500 text-white p-2 my-2 rounded"
      >
        Sign Up
      </button>
    </form>
  );
}
