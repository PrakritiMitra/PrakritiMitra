// src/components/auth/OrganizationForm.jsx

import React, { useState } from 'react';
import axios from 'axios';

export default function OrganizationForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: '',
    website: '',
    socialLinks: ['']
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialLinkChange = (index, value) => {
    const updatedLinks = [...formData.socialLinks];
    updatedLinks[index] = value;
    setFormData((prev) => ({ ...prev, socialLinks: updatedLinks }));
  };

  const addSocialLink = () => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, '']
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/organizations/register', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      alert('Organization registered successfully!');
      console.log(response.data);
    } catch (err) {
      alert('Failed to register organization.');
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4 text-blue-700">Register New Organization</h2>

      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Organization Name"
        required
        className="input w-full mb-4 px-4 py-2 border rounded"
      />

      <textarea
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Brief Description"
        required
        className="input w-full mb-4 px-4 py-2 border rounded"
      />

      <input
        type="url"
        name="logoUrl"
        value={formData.logoUrl}
        onChange={handleChange}
        placeholder="Logo URL (optional)"
        className="input w-full mb-4 px-4 py-2 border rounded"
      />

      <input
        type="url"
        name="website"
        value={formData.website}
        onChange={handleChange}
        placeholder="Website URL (optional)"
        className="input w-full mb-4 px-4 py-2 border rounded"
      />

      <label className="font-medium block mb-2">Social Media Links</label>
      {formData.socialLinks.map((link, index) => (
        <input
          key={index}
          type="url"
          value={link}
          onChange={(e) => handleSocialLinkChange(index, e.target.value)}
          placeholder={`Link #${index + 1}`}
          className="input w-full mb-2 px-4 py-2 border rounded"
        />
      ))}
      <button type="button" onClick={addSocialLink} className="text-blue-600 text-sm mb-4">
        + Add Another Link
      </button>

      <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded">
        Submit
      </button>
    </form>
  );
}
