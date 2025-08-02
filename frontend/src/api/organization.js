// src/api/organization.js
import axios from './axiosInstance';

export const registerOrganization = (data) =>
  axios.post('/api/organizations/register', data);

export const getMyOrganization = () =>
  axios.get('/api/organizations/my');

export const getAllOrganizations = () =>
  axios.get('/api/organizations');

export const getOrganizationById = (id) =>
  axios.get(`/api/organizations/${id}`);

export const requestToJoinOrganization = (id) =>
  axios.post(`/api/organizations/${id}/join`);

export const getOrganizationTeam = (id) =>
  axios.get(`/api/organizations/${id}/team`);

export const getApprovedOrganizations = () =>
  axios.get('/api/organizations/approved');

export const approveTeamMember = (orgId, userId) =>
  axios.patch(`/api/organizations/${orgId}/approve/${userId}`);

export const rejectTeamMember = (orgId, userId) =>
  axios.delete(`/api/organizations/${orgId}/reject/${userId}`);

// Helper: Fetch only approved organizers from the team
export const getOrganizationOrganizers = async (id) => {
  const res = await axios.get(`/api/organizations/${id}/team`);
  // Only approved organizers
  return res.data.filter(
    (member) => member.status === 'approved' && member.userId.role === 'organizer'
  );
};

// Fetch user by ID (for organizer profile)
export const getUserById = (id) =>
  axios.get(`/api/users/${id}`);

// Get organization count for statistics
export const getOrganizationCount = async () => {
  try {
    const response = await axios.get('/api/organizations/count');
    return response.data;
  } catch (error) {
    console.error('Error fetching organization count:', error);
    return { organizationCount: 0 };
  }
};
