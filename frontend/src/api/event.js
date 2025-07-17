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