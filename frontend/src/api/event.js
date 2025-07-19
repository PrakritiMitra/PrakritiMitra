import axiosInstance from './axiosInstance';

// Join an event as an organizer
export const joinAsOrganizer = async (eventId) => {
  const res = await axiosInstance.post(`/events/${eventId}/join-organizer`);
  return res.data;
};

// Get the organizer team for an event
export const getOrganizerTeam = async (eventId) => {
  const res = await axiosInstance.get(`/events/${eventId}/organizer-team`);
  return res.data.organizerTeam;
};

// Get the full organizer team for an event (with hasAttended)
export const getFullOrganizerTeam = async (eventId) => {
  const res = await axiosInstance.get(`/events/${eventId}/organizer-team?full=1`);
  return res.data.organizerTeam;
};

// Update attendance for an organizer
export const updateOrganizerAttendance = async (eventId, organizerId, hasAttended) => {
  const res = await axiosInstance.patch(`/events/${eventId}/organizer/${organizerId}/attendance`, { hasAttended });
}
// Get events by organization ID
export const getEventsByOrganization = async (orgId) => {
  const res = await axiosInstance.get(`/events/organization/${orgId}`);
  return res.data;
}; 