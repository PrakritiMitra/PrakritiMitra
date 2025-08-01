import axiosInstance from './axiosInstance';

// Get volunteers for an event (with hasAttended and registrationId)
export const getVolunteersForEvent = async (eventId) => {
  const res = await axiosInstance.get(`/api/registrations/event/${eventId}/volunteers`);
  return res.data;
};

// Update attendance for a volunteer registration
export const updateVolunteerAttendance = async (registrationId, hasAttended) => {
  const res = await axiosInstance.patch(`/api/registrations/${registrationId}/attendance`, { hasAttended });
  return res.data;
}; 