// src/api/auth.js
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/auth';
const USER_API = 'http://localhost:5000/api/users';

export const signupVolunteer = (data) => axios.post(`${API_BASE}/signup-volunteer`, data);
export const signupOrganizer = (data) => axios.post(`${API_BASE}/signup-organizer`, data);
export const loginUser = (data) => axios.post(`${API_BASE}/login`, data);

export const updateProfile = (data) => {
  const token = localStorage.getItem('token');
  return axios.put(`${USER_API}/profile`, data, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
};
