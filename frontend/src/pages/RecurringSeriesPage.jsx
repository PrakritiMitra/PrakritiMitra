import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import RecurringSeriesCard from '../components/recurring/RecurringSeriesCard';
import { getUserRecurringSeries } from '../api/recurringEvents';
import { Box, Typography, Button, CircularProgress, Alert, Chip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

export default function RecurringSeriesPage() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const response = await getUserRecurringSeries();
      if (response.success) {
        setSeries(response.data);
      } else {
        setError('Failed to fetch recurring series');
      }
    } catch (err) {
      console.error('Error fetching series:', err);
      setError('Failed to load recurring series');
    } finally {
      setLoading(false);
    }
  };

  const handleSeriesUpdate = () => {
    fetchSeries(); // Refresh the list
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <Navbar />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <div>
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              Recurring Event Series
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Manage your recurring event series and track their progress
            </Typography>
          </div>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/create-event')}
          >
            Create New Series
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {series.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No recurring series found
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={3}>
              Create your first recurring event series to get started
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/create-event')}
            >
              Create First Series
            </Button>
          </Box>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {series.map((seriesItem) => (
              <RecurringSeriesCard
                key={seriesItem._id}
                series={seriesItem}
                onUpdate={handleSeriesUpdate}
              />
            ))}
          </div>
        )}

        {/* Series Statistics Summary */}
        {series.length > 0 && (
          <Box mt={6} p={3} bgcolor="background.paper" borderRadius={2} boxShadow={1}>
            <Typography variant="h6" gutterBottom>
              Series Overview
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Chip 
                label={`${series.length} Total Series`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                label={`${series.filter(s => s.status === 'active').length} Active`} 
                color="success" 
                variant="outlined" 
              />
              <Chip 
                label={`${series.filter(s => s.status === 'paused').length} Paused`} 
                color="warning" 
                variant="outlined" 
              />
              <Chip 
                label={`${series.filter(s => s.status === 'completed').length} Completed`} 
                color="info" 
                variant="outlined" 
              />
              <Chip 
                label={`${series.filter(s => s.status === 'cancelled').length} Cancelled`} 
                color="error" 
                variant="outlined" 
              />
            </Box>
          </Box>
        )}
      </div>
    </div>
  );
} 