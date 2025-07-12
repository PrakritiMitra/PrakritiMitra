// src/api/auth.js
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/auth';

export const signupVolunteer = (data) => axios.post(`${API_BASE}/signup-volunteer`, data);
export const signupOrganizer = (data) => axios.post(`${API_BASE}/signup-organizer`, data);
export const loginUser = (data) => axios.post(`${API_BASE}/login`, data);
