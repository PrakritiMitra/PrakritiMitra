// src/api/auth.js
import axios from 'axios';
import axiosInstance from './axiosInstance';

const API_BASE = 'http://localhost:5000/api/auth';
const USER_API = 'http://localhost:5000/api/users';

export const signupVolunteer = (data) => axios.post(`${API_BASE}/signup-volunteer`, data);
export const signupOrganizer = (data) => axios.post(`${API_BASE}/signup-organizer`, data);
export const loginUser = (data) => axios.post(`${API_BASE}/login`, data);
export const setPassword = (data) => axios.post(`${API_BASE}/set-password`, data);

export const updateProfile = (data) => {
  const token = localStorage.getItem('token');
  return axios.put(`${USER_API}/profile`, data, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Get user counts for statistics
export const getUserCounts = async () => {
  try {
    console.log('🔹 Frontend: Calling getUserCounts...');
    const response = await axiosInstance.get('/api/users/counts');
    console.log('🔹 Frontend: Response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Frontend: Error fetching user counts:', error);
    console.error('❌ Frontend: Error response:', error.response?.data);
    console.error('❌ Frontend: Error status:', error.response?.status);
    return { volunteerCount: 0, organizerCount: 0 };
  }
};
