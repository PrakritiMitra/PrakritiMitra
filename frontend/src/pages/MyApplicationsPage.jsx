import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sponsorshipIntentAPI } from '../api';
import { getReceiptsBySponsorship } from '../api/receipt';
import Navbar from '../components/layout/Navbar';
import { formatDate } from '../utils/dateUtils';

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user from localStorage
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchApplications();
  }, []);

  // Function to handle organization link click
  const handleOrganizationClick = (organizationId) => {
    if (!organizationId) return;
    
    if (user?.role === 'volunteer') {
      // For volunteers, navigate to organization public page
      navigate(`/organizations/${organizationId}`);
    } else if (user?.role === 'organizer') {
      // For organizers, navigate to organization page
      navigate(`/organization/${organizationId}`);
    }
  };

  // Function to handle explore organizations button click
  const handleExploreOrganizations = () => {
    if (user?.role === 'volunteer') {
      // For volunteers, navigate to volunteer dashboard organizations tab
      navigate('/volunteer/dashboard?tab=organizations');
    } else if (user?.role === 'organizer') {
      // For organizers, navigate to join organization page
      navigate('/join-organization');
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // Fetch all applications without pagination to ensure we get all of them
      const response = await sponsorshipIntentAPI.getUserIntents({ 
        page: 1, 
        limit: 100, // Get a large number to ensure we get all applications
        status: 'all' // Get all statuses
      });
      
      // Store debug info
      setDebugInfo({
        response,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      // Handle different response structures
      if (response.intents) {
        setApplications(response.intents);
      } else if (Array.isArray(response)) {
        setApplications(response);
      } else {
        console.error('Unexpected response structure:', response);
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setDebugInfo({
        error: error.message,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      alert('Failed to load your applications. Please try again.');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status, sponsorshipType, convertedTo) => {
    const statusConfig = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-800', 
        label: 'Pending Review' 
      },
      under_review: { 
        color: 'bg-blue-100 text-blue-800', 
        label: 'Under Review' 
      },
      approved: { 
        color: sponsorshipType === 'monetary' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800', 
        label: sponsorshipType === 'monetary' ? 
          (convertedTo ? 'Approved - Payment Completed' : 'Approved - Payment Required') : 
          'Approved' 
      },
      rejected: { 
        color: 'bg-red-100 text-red-800', 
        label: 'Rejected' 
      },
      changes_requested: { 
        color: 'bg-purple-100 text-purple-800', 
        label: 'Changes Requested' 
      },
      converted: { 
        color: 'bg-green-100 text-green-800', 
        label: 'Converted to Sponsorship' 
      }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status.replace('_', ' ').toUpperCase() };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Using the utility function instead of local formatDate

  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  const handleEditApplication = (application) => {
    // Navigate to edit page with application data
    navigate(`/applications/${application._id}/edit`);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedApplication(null);
  };

  // Add refresh function
  const handleRefresh = () => {
    fetchApplications();
  };

  const handleViewReceipt = async (application) => {
    try {
      // If the application has a convertedTo (sponsorship), we can get receipts for that sponsorship
      if (application.convertedTo) {
        // Fetch receipts for the converted sponsorship
        const response = await getReceiptsBySponsorship(application.convertedTo);
        if (response.success && response.receipts && response.receipts.length > 0) {
          // Navigate to the first receipt's details page
          navigate(`/receipt/${response.receipts[0]._id}`);
        } else {
          alert('No receipt found for this sponsorship. Please check back later.');
        }
      } else {
        alert('Receipt not available yet. Please wait for the sponsorship to be created.');
      }
    } catch (error) {
      console.error('Error viewing receipt:', error);
      alert('Failed to load receipt. Please try again.');
    }
  };

  // Listen for navigation back to this page
  useEffect(() => {
    const handleFocus = () => {
      // Refresh data when user returns to this page
      fetchApplications();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-10 bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  My Sponsorship Applications
                </h1>
                <p className="text-gray-600">
                  Track the status of your sponsorship applications and manage your submissions.
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Found</h3>
              <p className="text-gray-600 mb-4">
                {loading ? 'Loading your applications...' : 'No sponsorship applications found in your account.'}
              </p>              
              
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={handleExploreOrganizations}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Browse Organizations
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Your Applications ({applications.length})
                  </h3>
                  <div className="text-sm text-gray-500">
                    Showing all applications
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applications.map((application) => (
                      <tr key={application._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div 
                              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                              onClick={() => handleOrganizationClick(application.organization?._id)}
                            >
                              {application.organization?.name || 'Unknown Organization'}
                            </div>
                            {application.event && (
                              <div className="text-sm text-gray-500">
                                Event: {application.event.title}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">
                            {application.sponsorship.type}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.sponsor.sponsorType}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(application.sponsorship.estimatedValue, application.sponsorship.currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(application.status, application.sponsorship.type, application.convertedTo)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(application.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewDetails(application)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Details
                            </button>
                            {(application.status === 'changes_requested' || application.status === 'pending') && (
                              <button
                                onClick={() => handleEditApplication(application)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Edit
                              </button>
                            )}
                            {application.status === 'approved' && application.sponsorship.type === 'monetary' && !application.convertedTo && (
                              <button
                                onClick={() => navigate(`/intent-payment/${application._id}`)}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                Payment
                              </button>
                            )}
                            
                            {application.status === 'approved' && application.sponsorship.type === 'monetary' && application.convertedTo && (
                              <button
                                onClick={() => navigate(`/payment-status/${application.convertedTo}`)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View Payment
                              </button>
                            )}

                            {/* Show payment status for completed payments even if not converted */}
                            {application.status === 'approved' && 
                             application.sponsorship.type === 'monetary' && 
                             !application.convertedTo && 
                             application.payment?.status === 'completed' && (
                              <button
                                onClick={() => navigate(`/intent-payment/${application._id}`)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Payment Completed
                              </button>
                            )}

                            {/* Receipt link for completed payments */}
                            {(application.status === 'approved' || application.status === 'converted') && 
                             application.sponsorship.type === 'monetary' && 
                             application.payment?.status === 'completed' && 
                             application.convertedTo && (
                              <button
                                onClick={() => handleViewReceipt(application)}
                                className="text-purple-600 hover:text-purple-900"
                              >
                                View Receipt
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Application Details Modal */}
      {showDetailsModal && selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Application Details
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Organization</h4>
                  <p 
                    className="text-gray-600 cursor-pointer hover:text-blue-600 hover:underline"
                    onClick={() => handleOrganizationClick(selectedApplication.organization?._id)}
                  >
                    {selectedApplication.organization?.name}
                  </p>
                  {selectedApplication.event && (
                    <p className="text-sm text-gray-500">Event: {selectedApplication.event.title}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(selectedApplication.status)}
                    <span className="text-sm text-gray-500">
                      {selectedApplication.review?.reviewedAt && 
                        `Reviewed on ${formatDate(selectedApplication.review.reviewedAt)}`
                      }
                    </span>
                  </div>
                </div>

                {/* Sponsorship Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Sponsorship Details</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p><strong>Type:</strong> {selectedApplication.sponsorship.type}</p>
                    <p><strong>Value:</strong> {formatCurrency(selectedApplication.sponsorship.estimatedValue, selectedApplication.sponsorship.currency)}</p>
                    <p><strong>Description:</strong> {selectedApplication.sponsorship.description}</p>
                  </div>
                </div>

                {/* Admin Review */}
                {selectedApplication.review && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Admin Review</h4>
                    <div className="bg-blue-50 p-3 rounded">
                      <p><strong>Decision:</strong> {selectedApplication.review.decision?.replace('_', ' ').toUpperCase()}</p>
                      {selectedApplication.review.reviewNotes && (
                        <p><strong>Review Notes:</strong> {selectedApplication.review.reviewNotes}</p>
                      )}
                      {selectedApplication.review.adminNotes && (
                        <p><strong>Admin Notes:</strong> {selectedApplication.review.adminNotes}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  {(selectedApplication.status === 'changes_requested' || selectedApplication.status === 'pending') && (
                    <button
                      onClick={() => {
                        handleCloseModal();
                        handleEditApplication(selectedApplication);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit Application
                    </button>
                  )}
                  
                  {/* Receipt link for completed payments */}
                  {(selectedApplication.status === 'approved' || selectedApplication.status === 'converted') && 
                   selectedApplication.sponsorship.type === 'monetary' && 
                   selectedApplication.payment?.status === 'completed' && 
                   selectedApplication.convertedTo && (
                    <button
                      onClick={async () => {
                        try {
                          const response = await getReceiptsBySponsorship(selectedApplication.convertedTo);
                          if (response.success && response.receipts && response.receipts.length > 0) {
                            navigate(`/receipt/${response.receipts[0]._id}`);
                            handleCloseModal();
                          } else {
                            alert('No receipt found for this sponsorship. Please check back later.');
                          }
                        } catch (error) {
                          console.error('Error viewing receipt:', error);
                          alert('Failed to load receipt. Please try again.');
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      View Receipt
                    </button>
                  )}
                  
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 