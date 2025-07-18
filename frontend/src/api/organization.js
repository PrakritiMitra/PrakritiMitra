// src/api/organization.js
import axios from './axiosInstance';

export const registerOrganization = (data) =>
  axios.post('/organizations/register', data);

export const getMyOrganization = () =>
  axios.get('/organizations/my');

export const getAllOrganizations = () =>
  axios.get('/organizations');

export const getOrganizationById = (id) =>
  axios.get(`/organizations/${id}`);

export const requestToJoinOrganization = (id) =>
  axios.post(`/organizations/${id}/join`);

export const getOrganizationTeam = (id) =>
  axios.get(`/organizations/${id}/team`);

export const getApprovedOrganizations = () =>
  axios.get('/organizations/approved');

export const approveTeamMember = (orgId, userId) =>
  axios.patch(`/organizations/${orgId}/approve/${userId}`);

export const rejectTeamMember = (orgId, userId) =>
  axios.delete(`/organizations/${orgId}/reject/${userId}`);

// Helper: Fetch only approved organizers from the team
export const getOrganizationOrganizers = async (id) => {
  const res = await axios.get(`/organizations/${id}/team`);
  // Only approved organizers
  return res.data.filter(
    (member) => member.status === 'approved' && member.userId.role === 'organizer'
  );
};

// Fetch user by ID (for organizer profile)
export const getUserById = (id) =>
  axios.get(`/users/${id}`);
