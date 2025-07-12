//src/components/auth/VolunteerForm.jsx

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function VolunteerForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    interests: [],
  });

  const navigate = useNavigate();
  const interestsOptions = ['Beach Cleanup', 'Waste Segregation', 'Plastic Collection', 'Awareness Drives'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        interests: checked
          ? [...prev.interests, value]
          : prev.interests.filter((i) => i !== value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/signup-volunteer', formData);
      alert('Signup successful!');
      console.log(response.data);
      navigate('/login'); // ✅ Redirect to login
    } catch (err) {
      alert('Signup failed.');
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required />
      <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required />
      <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password" className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required />
      <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone Number" className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required />
      <input name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required />

      <select name="gender" value={formData.gender} onChange={handleChange} className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required>
        <option value="">Select Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>

      <div>
        <label className="block mb-1 font-medium">Interests</label>
        <div className="flex flex-wrap gap-2">
          {interestsOptions.map((interest) => (
            <label key={interest} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="interests"
                value={interest}
                checked={formData.interests.includes(interest)}
                onChange={handleChange}
              />
              {interest}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" className="w-full bg-blue-500 text-white p-2 my-2 rounded">Sign Up</button>
    </form>
  );
}
