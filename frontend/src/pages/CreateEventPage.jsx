import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import EventCreationWrapper from '../components/event/EventCreationWrapper';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function CreateEventPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);

  // Get organization from URL parameter
  const orgFromUrl = searchParams.get('org');

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/api/organizations/approved');
        setOrganizations(response.data);
        
        // If org is specified in URL and exists in user's organizations, use it
        if (orgFromUrl && response.data.find(org => org._id === orgFromUrl)) {
          setSelectedOrgId(orgFromUrl);
          setShowEventForm(true);
        } else if (response.data.length > 0) {
          // Otherwise, select the first organization
          setSelectedOrgId(response.data[0]._id);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [orgFromUrl]);

  const handleOrganizationChange = (orgId) => {
    setSelectedOrgId(orgId);
  };

  const handleClose = () => {
    setShowEventForm(false);
    navigate('/organizer/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 px-6 max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading organizations...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 px-6 max-w-7xl mx-auto">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Create Event</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-600 mb-4">
                You need to be a member of an organization to create events.
              </p>
              <button
                onClick={() => navigate('/join-organization')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Join Organization
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 px-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create Event</h1>

        {!showEventForm ? (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold mb-4">Select Organization</h2>
            <p className="text-gray-600 mb-4">
              Choose the organization for which you want to create the event.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => handleOrganizationChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {organizations.map(org => (
                  <option key={org._id} value={org._id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/organizer/dashboard')}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowEventForm(true)}
                disabled={!selectedOrgId}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Creating Event for: {organizations.find(org => org._id === selectedOrgId)?.name}
              </h2>
              <button
                onClick={() => setShowEventForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to Organization Selection
              </button>
            </div>
            
            <EventCreationWrapper
              selectedOrgId={selectedOrgId}
              organizationOptions={organizations}
              onClose={handleClose}
            />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
} 