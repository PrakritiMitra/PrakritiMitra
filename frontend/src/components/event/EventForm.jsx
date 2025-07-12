// src/components/event/EventForm.jsx
import React, { useState } from "react";
import axios from "axios";

export default function EventForm({ organizationOptions = [], selectedOrgId = null, onSuccess }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    date: "",
    organization: selectedOrgId || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post("/api/events/create", formData, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      alert("Event created!");
      setFormData({
        title: "",
        description: "",
        location: "",
        date: "",
        organization: selectedOrgId || "",
      });

      if (onSuccess) onSuccess(response.data);
    } catch (err) {
      alert("Failed to create event.");
      console.error(err);
    }
  };

  

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded shadow">
      <h2 className="text-lg font-bold text-blue-700">Create New Event</h2>

      {!selectedOrgId && (
        <select
          name="organization"
          value={formData.organization}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        >
          <option value="">Select Organization</option>
          {organizationOptions.map((org) => (
            <option key={org._id} value={org._id}>
              {org.name}
            </option>
          ))}
        </select>
      )}

      <input
        type="text"
        name="title"
        placeholder="Event Title"
        value={formData.title}
        onChange={handleChange}
        required
        className="w-full border px-3 py-2 rounded"
      />
      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
        className="w-full border px-3 py-2 rounded"
      />
      <input
        type="text"
        name="location"
        placeholder="Location"
        value={formData.location}
        onChange={handleChange}
        required
        className="w-full border px-3 py-2 rounded"
      />
      <input
        type="datetime-local"
        name="date"
        value={formData.date}
        onChange={handleChange}
        required
        className="w-full border px-3 py-2 rounded"
      />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Create Event
      </button>
    </form>
  );
}
