import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function VolunteerForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    age: '',
    city: '',
    dateOfBirth: '',
    gender: '',
    interests: [],
    profileImage: null,
  });

  const navigate = useNavigate();
  const interestsOptions = ['Beach Cleanup', 'Waste Segregation', 'Plastic Collection', 'Awareness Drives'];
  const cityOptions = ['Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'];

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        interests: checked
          ? [...prev.interests, value]
          : prev.interests.filter((i) => i !== value),
      }));
    } else if (type === 'file') {
      setFormData((prev) => ({ ...prev, profileImage: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const data = new FormData();
    for (const key in formData) {
      if (key === 'interests') {
        formData.interests.forEach((i) => data.append('interests[]', i));
      } else {
        data.append(key, formData[key]);
      }
    }

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/signup-volunteer',
        data,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      alert('Signup successful!');
      console.log(response.data);
      navigate('/login');
    } catch (err) {
      alert('Signup failed.');
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input name="name" value={formData.name} onChange={handleChange} placeholder="Full Name"  className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required />
      <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email"  className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required />
      <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password"  className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required />
      <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm Password"  className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required />
      <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone Number"  className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required />
      <input name="age" type="number" value={formData.age} onChange={handleChange} placeholder="Age"  className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required />
      
      <select name="city" value={formData.city} onChange={handleChange}  className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required>
        <option value="">Select City</option>
        {cityOptions.map((city) => (
          <option key={city} value={city}>{city}</option>
        ))}
      </select>

      <input name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange}  className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required />

      <select name="gender" value={formData.gender} onChange={handleChange}  className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" required>
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

      <div>
        <label className="block font-medium mb-1">Upload Profile Image</label>
        <input type="file" accept="image/*" name="profileImage" onChange={handleChange}  className="input w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>

      <button type="submit" className="w-full bg-blue-500 text-white p-2 my-2 rounded">Sign Up</button>
    </form>
  );
}
