import axiosInstance from './axiosInstance';

// Get volunteers for an event (with hasAttended and registrationId)
export const getVolunteersForEvent = async (eventId) => {
  const res = await axiosInstance.get(`/registrations/event/${eventId}/volunteers`);
  return res.data;
};

// Update attendance for a volunteer registration
export const updateVolunteerAttendance = async (registrationId, hasAttended) => {
  const res = await axiosInstance.patch(`/registrations/${registrationId}/attendance`, { hasAttended });
  return res.data;
}; 