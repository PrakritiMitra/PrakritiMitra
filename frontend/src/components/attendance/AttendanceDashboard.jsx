import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axiosInstance from '../../api/axiosInstance';
import { 
  FaUsers, 
  FaUserCheck, 
  FaUserTimes, 
  FaUserClock, 
  FaUserPlus, 
  FaUserMinus,
  FaChartLine,
  FaClock,
  FaCalendarCheck,
  FaCalendarTimes
} from 'react-icons/fa';

const AttendanceDashboard = ({ eventId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch initial stats
  const fetchStats = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsUpdating(true);
      }
      const response = await axiosInstance.get(`/api/registrations/event/${eventId}/stats`);
      if (response.data.success) {
        setStats(response.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching attendance stats:', err);
      if (showLoading) {
        setError('Failed to load attendance statistics');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setIsUpdating(false);
      }
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to attendance socket');
      newSocket.emit('joinAttendanceRoom', eventId);
    });

    newSocket.on('attendanceUpdated', (data) => {
      console.log('Attendance updated:', data);
      // Refresh stats when attendance is updated (silent update)
      fetchStats(false);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from attendance socket');
    });

    setSocket(newSocket);

    // Initial fetch
    fetchStats();

    // Cleanup
    return () => {
      if (newSocket) {
        newSocket.emit('leaveAttendanceRoom', eventId);
        newSocket.disconnect();
      }
    };
  }, [eventId]);

  // Auto-refresh every 2 minutes (less frequent, silent updates)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats(false); // Silent background refresh
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [eventId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventStatusColor = () => {
    if (stats.event.isEnded) return 'text-red-600';
    if (stats.event.isLive) return 'text-green-600';
    return 'text-yellow-600';
  };

  const getEventStatusText = () => {
    if (stats.event.isEnded) return 'Event Ended';
    if (stats.event.isLive) return 'Event Live';
    return 'Event Not Started';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Live Attendance Dashboard</h2>
          <p className="text-gray-600">{stats.event.title}</p>
        </div>
        <div className="text-right">
          <div className={`text-lg font-semibold ${getEventStatusColor()}`}>
            {getEventStatusText()}
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated ? formatTime(lastUpdated) : '—'}
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Participants</p>
              <p className="text-2xl font-bold text-blue-800">{stats.overall.totalParticipants}</p>
            </div>
            <FaUsers className="text-blue-500 text-2xl" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Currently Present</p>
              <p className="text-2xl font-bold text-green-800">{stats.overall.totalPresent}</p>
            </div>
            <FaUserCheck className="text-green-500 text-2xl" />
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-purple-800">{stats.overall.attendanceRate}%</p>
            </div>
            <FaChartLine className="text-purple-500 text-2xl" />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Event Date & Time</p>
              <div className="text-xs font-bold text-orange-800">
                <div>Start: {formatDateTime(stats.event.startDateTime)}</div>
                <div>End: {formatDateTime(stats.event.endDateTime)}</div>
              </div>
            </div>
            <FaClock className="text-orange-500 text-2xl" />
          </div>
        </div>
      </div>

      {/* Volunteer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-600">Total Volunteers</p>
              <p className="text-xl font-bold text-indigo-800">{stats.volunteers.total}</p>
            </div>
            <FaUsers className="text-indigo-500 text-xl" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Checked In</p>
              <p className="text-xl font-bold text-green-800">{stats.volunteers.checkedIn}</p>
            </div>
            <FaUserCheck className="text-green-500 text-xl" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Currently Present</p>
              <p className="text-xl font-bold text-blue-800">{stats.volunteers.currentlyPresent}</p>
            </div>
            <FaUserClock className="text-blue-500 text-xl" />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Checked Out</p>
              <p className="text-xl font-bold text-red-800">{stats.volunteers.checkedOut}</p>
            </div>
            <FaUserTimes className="text-red-500 text-xl" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Not Arrived</p>
              <p className="text-xl font-bold text-yellow-800">{stats.volunteers.notArrived}</p>
            </div>
            <FaUserClock className="text-yellow-500 text-xl" />
          </div>
        </div>
      </div>

      {/* Organizer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Organizers</p>
              <p className="text-xl font-bold text-purple-800">{stats.organizers.total}</p>
            </div>
            <FaUsers className="text-purple-500 text-xl" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Organizers Present</p>
              <p className="text-xl font-bold text-green-800">{stats.organizers.present}</p>
            </div>
            <FaCalendarCheck className="text-green-500 text-xl" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Activity (Last 10 minutes)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <FaUserPlus className="text-green-500 text-lg" />
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Check-ins</p>
              <p className="text-lg font-bold text-green-600">{stats.recentActivity.checkIns}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <FaUserMinus className="text-red-500 text-lg" />
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Check-outs</p>
              <p className="text-lg font-bold text-red-600">{stats.recentActivity.checkOuts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="mt-4 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">
            {isUpdating ? 'Updating...' : 'Live updates enabled'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDashboard; 