import { useEffect, useState, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import { io } from 'socket.io-client';

// Singleton socket instance for slots (separate from chat)
let socket = null;

export default function useEventSlots(eventId) {
  const [slotInfo, setSlotInfo] = useState({
    availableSlots: null,
    maxVolunteers: null,
    unlimitedVolunteers: false,
    loading: true,
  });
  const joinedRoomRef = useRef(false);

  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;
    setSlotInfo((prev) => ({ ...prev, loading: true }));

    // Fetch initial slot info
    axiosInstance.get(`/api/events/${eventId}/slots`)
      .then(res => {
        if (isMounted) {
          setSlotInfo({ ...res.data, loading: false });
        }
      })
      .catch(() => {
        if (isMounted) {
          setSlotInfo((prev) => ({ ...prev, loading: false }));
        }
      });

    // Setup socket connection if not already
    if (!socket) {
      socket = io('http://localhost:5000', {
        auth: { token: localStorage.getItem('token') },
        autoConnect: true,
      });
    }

    // Join the slot update room
    if (socket && !joinedRoomRef.current) {
      socket.emit('joinEventSlotsRoom', eventId);
      joinedRoomRef.current = true;
    }

    // Listen for slotsUpdated events
    const handleSlotsUpdated = (data) => {
      if (data.eventId === eventId && isMounted) {
        setSlotInfo({
          availableSlots: data.availableSlots,
          maxVolunteers: data.maxVolunteers,
          unlimitedVolunteers: data.unlimitedVolunteers,
          loading: false,
        });
      }
    };
    socket.on('slotsUpdated', handleSlotsUpdated);

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (socket && joinedRoomRef.current) {
        socket.emit('leaveEventSlotsRoom', eventId);
        joinedRoomRef.current = false;
      }
      socket.off('slotsUpdated', handleSlotsUpdated);
    };
    // eslint-disable-next-line
  }, [eventId]);

  return slotInfo;
} 