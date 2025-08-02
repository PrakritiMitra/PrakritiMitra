import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sponsorshipIntentAPI, sponsorAPI, getOrganizationById } from '../api';
import Navbar from '../components/layout/Navbar';

export default function SponsorshipApplicationsReviewPage() {
  const { organizationId } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    decision: '',
    reviewNotes: '',
    adminNotes: ''
  });
  const [editableData, setEditableData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [orgRes, applicationsRes] = await Promise.all([
        getOrganizationById(organizationId),
        sponsorshipIntentAPI.getOrganizationIntents(organizationId)
      ]);
      
      setOrganization(orgRes.data);
      setApplications(applicationsRes?.intents || []);
    } catch (error) {
      
      // If it's a 403 error, show a specific message
      if (error.response?.status === 403) {
        alert('Access denied: You need admin privileges to view sponsorship applications.');
      } else if (error.response?.status === 401) {
        alert('Please log in to view sponsorship applications.');
      } else {
        alert('Failed to load sponsorship applications. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (isSubmitting) return; // Prevent multiple submissions
    
    try {
      setIsSubmitting(true);
      
      // Set convertToSponsorship to true when decision is convert_to_sponsorship
      const reviewDataWithConversion = {
        ...reviewData,
        convertToSponsorship: reviewData.decision === 'convert_to_sponsorship',
        // Include editable data if it exists
        ...(editableData && {
          sponsorshipUpdates: {
            description: editableData.description,
            estimatedValue: editableData.estimatedValue === '' ? undefined : editableData.estimatedValue,
            currency: editableData.currency
          }
        })
      };
      
      const response = await sponsorshipIntentAPI.reviewIntent(selectedApplication._id, reviewDataWithConversion);
      setShowModal(false);
      setSelectedApplication(null);
      setReviewData({ decision: '', reviewNotes: '', adminNotes: '' });
      setEditableData(null);
      fetchData(); // Refresh the list
      
      // Show appropriate success message
      if (reviewData.decision === 'convert_to_sponsorship') {
        if (selectedApplication.status === 'converted') {
          alert('Sponsorship updated successfully! The existing sponsorship has been updated with the new details.');
        } else {
          alert('Application converted to sponsorship successfully! A new active sponsorship has been created.');
        }
      } else {
        alert('Application reviewed successfully!');
      }
    } catch (error) {
      console.error('Error reviewing application:', error);
      alert('Failed to review application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCleanupOrphaned = async () => {
    try {
      const response = await sponsorshipIntentAPI.cleanupOrphanedIntents();
      alert(`Cleanup completed! ${response.cleanedCount} orphaned intents were cleaned up.`);
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error cleaning up orphaned intents:', error);
      alert('Failed to cleanup orphaned intents. Please try again.');
    }
  };

  const handleCheckDuplicates = async () => {
    try {
      const result = await sponsorAPI.checkDuplicateSponsors();
      if (result.duplicates.length === 0) {
        alert('No duplicate sponsor profiles found!');
      } else {
        alert(`Found and cleaned ${result.duplicates.length} duplicate sponsor profiles. Check console for details.`);
      }
    } catch (error) {
      console.error('Error checking duplicate sponsors:', error);
      alert('Failed to check duplicate sponsors');
    }
  };

  const handleApplicationClick = (application) => {
    setSelectedApplication(application);
    setEditableData({
      estimatedValue: application.sponsorship.estimatedValue,
      description: application.sponsorship.description,
      currency: application.sponsorship.currency,
      // Add other editable fields as needed
    });
    // Pre-fill review data if decision already exists
    if (application.review?.decision) {
      setReviewData({
        decision: application.review.decision,
        reviewNotes: application.review.reviewNotes || '',
        adminNotes: application.review.adminNotes || ''
      });
    } else {
      setReviewData({ decision: '', reviewNotes: '', adminNotes: '' });
    }
    setShowModal(true);
    setShowFullHistory(false); // Reset to show recent only
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      converted: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Helper function to get the current estimated value for display
  const getCurrentEstimatedValue = () => {
    if (editableData?.estimatedValue !== undefined && editableData.estimatedValue !== '') {
      return editableData.estimatedValue;
    }
    return selectedApplication?.sponsorship?.estimatedValue || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
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
             <h1 className="text-3xl font-bold text-gray-900 mb-2">
               Sponsorship Applications Review
             </h1>
             <p className="text-gray-600 mb-4">
               Review and manage sponsorship applications for {organization?.name}
             </p>
             
             {/* Review Process Info */}
             <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
               <h3 className="text-sm font-medium text-yellow-900 mb-2">📝 Review Guidelines</h3>
               <div className="text-sm text-yellow-800 space-y-1">
                 <p><strong>✅ Approve:</strong> Accept the application and proceed with sponsorship</p>
                 <p><strong>❌ Reject:</strong> Decline with constructive feedback</p>
                 <p><strong>🔄 Request Changes:</strong> Ask sponsor to modify their proposal</p>
                 <p><strong>💰 Convert:</strong> Automatically create an active sponsorship relationship</p>
                 <p className="text-xs mt-2">All decisions will be communicated to the sponsor with your review notes.</p>
               </div>
             </div>
             
             {/* Admin Tools */}
             <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
               <h3 className="text-sm font-medium text-blue-900 mb-2">🔧 Admin Tools</h3>
               <div className="text-sm text-blue-800 space-y-1">
                 <p>If you encounter issues with sponsorship applications, you can clean up orphaned data:</p>
                 <div className="flex space-x-2 mt-2">
                   <button
                     onClick={handleCleanupOrphaned}
                     className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                   >
                     🧹 Cleanup Orphaned Intents
                   </button>
                   <button
                     onClick={handleCheckDuplicates}
                     className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
                   >
                     🔍 Check Duplicate Sponsors
                   </button>
                 </div>
               </div>
             </div>
           </div>

          {applications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
              <p className="text-gray-600">No sponsorship applications have been submitted yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sponsor
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
                        Date
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
                            <div className="text-sm font-medium text-gray-900">
                              {application.sponsor.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {application.sponsor.email}
                            </div>
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
                          {application.review?.decision && (
                            <div className="text-xs text-gray-500 mt-1">
                              Decision: {application.review.decision.replace('_', ' ').toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(application.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(application.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleApplicationClick(application)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            {application.status === 'pending' ? 'Review' : 'View & Edit'}
                          </button>
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
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Sponsorship Application Details
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedApplication(null);
                    setReviewData({ decision: '', reviewNotes: '', adminNotes: '' });
                    setEditableData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6 max-h-96 overflow-y-auto">
                {/* Sponsor Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Sponsor Information</h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium">{selectedApplication.sponsor.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{selectedApplication.sponsor.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium">{selectedApplication.sponsor.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-medium capitalize">{selectedApplication.sponsor.sponsorType}</p>
                      </div>
                      {selectedApplication.sponsor.location && (
                        <div>
                          <p className="text-sm text-gray-600">Location</p>
                          <p className="font-medium">
                            {selectedApplication.sponsor.location.city}, {selectedApplication.sponsor.location.state}, {selectedApplication.sponsor.location.country}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Business/Individual Details */}
                    {selectedApplication.sponsor.sponsorType === 'business' && selectedApplication.sponsor.business && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Business Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Business Name</p>
                            <p className="font-medium">{selectedApplication.sponsor.business.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Industry</p>
                            <p className="font-medium">{selectedApplication.sponsor.business.industry}</p>
                          </div>
                          {selectedApplication.sponsor.business.website && (
                            <div>
                              <p className="text-sm text-gray-600">Website</p>
                              <p className="font-medium">{selectedApplication.sponsor.business.website}</p>
                            </div>
                          )}
                          {selectedApplication.sponsor.business.description && (
                            <div>
                              <p className="text-sm text-gray-600">Description</p>
                              <p className="font-medium">{selectedApplication.sponsor.business.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {selectedApplication.sponsor.sponsorType === 'individual' && selectedApplication.sponsor.individual && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Individual Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Profession</p>
                            <p className="font-medium">{selectedApplication.sponsor.individual.profession}</p>
                          </div>
                          {selectedApplication.sponsor.individual.organization && (
                            <div>
                              <p className="text-sm text-gray-600">Organization</p>
                              <p className="font-medium">{selectedApplication.sponsor.individual.organization}</p>
                            </div>
                          )}
                          {selectedApplication.sponsor.individual.designation && (
                            <div>
                              <p className="text-sm text-gray-600">Designation</p>
                              <p className="font-medium">{selectedApplication.sponsor.individual.designation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sponsorship Details */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Sponsorship Details</h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-medium capitalize">{selectedApplication.sponsorship.type}</p>
                      </div>
                      
                      {/* Editable Fields */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description (Editable)
                        </label>
                        <textarea
                          value={editableData?.description || selectedApplication.sponsorship.description}
                          onChange={(e) => setEditableData({ ...editableData, description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estimated Value (Editable)
                            </label>
                            <input
                              type="number"
                              value={editableData?.estimatedValue !== undefined ? editableData.estimatedValue : selectedApplication.sponsorship.estimatedValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEditableData({ 
                                  ...editableData, 
                                  estimatedValue: value === '' ? '' : Number(value) 
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Currency
                            </label>
                            <select
                              value={editableData?.currency || selectedApplication.sponsorship.currency}
                              onChange={(e) => setEditableData({ ...editableData, currency: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="INR">INR (₹)</option>
                              <option value="USD">USD ($)</option>
                              <option value="EUR">EUR (€)</option>
                            </select>
                          </div>
                        </div>
                        
                        {/* Calculated Tier Display */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Calculated Tier (Auto-updated)
                          </label>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              getCurrentEstimatedValue() >= 50000 ? 'bg-gradient-to-r from-gray-800 to-gray-600 text-white' :
                              getCurrentEstimatedValue() >= 25000 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-white' :
                              getCurrentEstimatedValue() >= 10000 ? 'bg-gradient-to-r from-gray-400 to-gray-300 text-white' :
                              'bg-gradient-to-r from-green-500 to-green-400 text-white'
                            }`}>
                              {getCurrentEstimatedValue() >= 50000 ? '💎 Platinum' :
                               getCurrentEstimatedValue() >= 25000 ? '🥇 Gold' :
                               getCurrentEstimatedValue() >= 10000 ? '🥈 Silver' :
                               '🏘️ Community'}
                            </span>
                            <span className="text-sm text-gray-600">
                              (Based on ₹{getCurrentEstimatedValue().toLocaleString()})
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Tier is automatically calculated based on contribution value and will be updated when you save.
                          </p>
                        </div>
                      
                      {/* Type-specific details */}
                      {selectedApplication.sponsorship.type === 'monetary' && selectedApplication.sponsorship.monetary && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Monetary Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Amount</p>
                              <p className="font-medium">{formatCurrency(selectedApplication.sponsorship.monetary.amount, selectedApplication.sponsorship.currency)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Payment Method</p>
                              <p className="font-medium">{selectedApplication.sponsorship.monetary.paymentMethod}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Payment Timeline</p>
                              <p className="font-medium">{selectedApplication.sponsorship.monetary.paymentTimeline}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedApplication.sponsorship.type === 'goods' && selectedApplication.sponsorship.goods && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Goods Details</h5>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600">Items/Services</p>
                              <p className="font-medium">{selectedApplication.sponsorship.goods.items?.join(', ')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Quantity</p>
                              <p className="font-medium">{selectedApplication.sponsorship.goods.quantity}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Delivery Timeline</p>
                              <p className="font-medium">{selectedApplication.sponsorship.goods.deliveryTimeline}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedApplication.sponsorship.type === 'service' && selectedApplication.sponsorship.service && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Service Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Service Type</p>
                              <p className="font-medium">{selectedApplication.sponsorship.service.serviceType}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Duration</p>
                              <p className="font-medium">{selectedApplication.sponsorship.service.duration}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Expertise</p>
                              <p className="font-medium">{selectedApplication.sponsorship.service.expertise}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedApplication.sponsorship.type === 'media' && selectedApplication.sponsorship.media && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Media Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Reach</p>
                              <p className="font-medium">{selectedApplication.sponsorship.media.reach}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Platforms</p>
                              <p className="font-medium">{selectedApplication.sponsorship.media.platforms?.join(', ')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Duration</p>
                              <p className="font-medium">{selectedApplication.sponsorship.media.duration}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recognition Preferences */}
                {selectedApplication.recognition && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Recognition Preferences</h4>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="space-y-3">
                        {selectedApplication.recognition.recognitionLevel && (
                          <div>
                            <p className="text-sm text-gray-600">Recognition Level</p>
                            <p className="font-medium capitalize">
                              {selectedApplication.recognition.recognitionLevel === 'high' && '🌟 High Visibility'}
                              {selectedApplication.recognition.recognitionLevel === 'medium' && '⭐ Medium Visibility'}
                              {selectedApplication.recognition.recognitionLevel === 'low' && '✨ Low Visibility'}
                              {selectedApplication.recognition.recognitionLevel === 'minimal' && '💫 Minimal Recognition'}
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedApplication.recognition.logoDisplay}
                              disabled
                              className="mr-2"
                            />
                            <span className="text-sm">🏷️ Logo Display</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedApplication.recognition.socialMediaMention}
                              disabled
                              className="mr-2"
                            />
                            <span className="text-sm">📱 Social Media</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedApplication.recognition.websiteAcknowledgement}
                              disabled
                              className="mr-2"
                            />
                            <span className="text-sm">🌐 Website</span>
                          </label>
                        </div>
                        {selectedApplication.recognition.additionalRequests && (
                          <div>
                            <p className="text-sm text-gray-600">Additional Requests</p>
                            <p className="font-medium">{selectedApplication.recognition.additionalRequests}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                {selectedApplication.additionalInfo && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Additional Information</h4>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="space-y-3">
                        {selectedApplication.additionalInfo.howDidYouHear && (
                          <div>
                            <p className="text-sm text-gray-600">How did you hear about us?</p>
                            <p className="font-medium">{selectedApplication.additionalInfo.howDidYouHear}</p>
                          </div>
                        )}
                        {selectedApplication.additionalInfo.previousExperience && (
                          <div>
                            <p className="text-sm text-gray-600">Previous Experience</p>
                            <p className="font-medium">{selectedApplication.additionalInfo.previousExperience}</p>
                          </div>
                        )}
                        {selectedApplication.additionalInfo.timeline && (
                          <div>
                            <p className="text-sm text-gray-600">Timeline</p>
                            <p className="font-medium">{selectedApplication.additionalInfo.timeline}</p>
                          </div>
                        )}
                        {selectedApplication.additionalInfo.specialRequirements && (
                          <div>
                            <p className="text-sm text-gray-600">Special Requirements</p>
                            <p className="font-medium">{selectedApplication.additionalInfo.specialRequirements}</p>
                          </div>
                        )}
                        {selectedApplication.additionalInfo.questions && (
                          <div>
                            <p className="text-sm text-gray-600">Questions</p>
                            <p className="font-medium">{selectedApplication.additionalInfo.questions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Suggestions Tracking */}
                {selectedApplication.adminSuggestions && selectedApplication.adminSuggestions.requested.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">📝 Admin Suggestions</h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800 mb-3">
                        <strong>Suggestions made to the sponsor:</strong>
                      </p>
                      {selectedApplication.adminSuggestions.requested.map((suggestion, index) => (
                        <div key={index} className={`mb-2 p-2 rounded ${suggestion.implemented ? 'bg-green-100 border border-green-200' : 'bg-yellow-100 border border-yellow-200'}`}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${suggestion.implemented ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                              {suggestion.suggestion}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded ${suggestion.implemented ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                              {suggestion.implemented ? '✅ Implemented' : '⏳ Pending'}
                            </span>
                          </div>
                          {suggestion.implemented && suggestion.implementedAt && (
                            <p className="text-xs text-gray-600 mt-1">
                              Implemented on {new Date(suggestion.implementedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Change History */}
                {selectedApplication.changeHistory && selectedApplication.changeHistory.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-md font-medium text-gray-900">📋 Change History</h4>
                      <button
                        onClick={() => setShowFullHistory(!showFullHistory)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        {showFullHistory ? 'Show Recent Only' : 'View Full History'}
                      </button>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 max-h-60 overflow-y-auto">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-600">
                          <strong>Changes made to this application:</strong>
                        </p>
                        <span className="text-xs text-gray-500">
                          {selectedApplication.changeHistory.length} total change{selectedApplication.changeHistory.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {(showFullHistory ? selectedApplication.changeHistory : selectedApplication.changeHistory.slice(-5)).reverse().map((change, index) => (
                        <div key={index} className="mb-3 p-3 bg-white rounded border shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                change.changeType === 'created' ? 'bg-green-100 text-green-800' :
                                change.changeType === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                                change.changeType === 'updated' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {change.changeType.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(change.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {change.changedByUser && (
                              <div className="text-xs text-gray-600">
                                by <span className="font-medium">{change.changedByUser.name || change.changedByUser.username}</span>
                              </div>
                            )}
                          </div>
                          
                          {change.changes && Array.isArray(change.changes) && change.changes.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-700">Field Changes:</p>
                              {change.changes.map((fieldChange, fieldIndex) => (
                                <div key={fieldIndex} className="text-xs bg-gray-50 p-2 rounded border-l-2 border-blue-300">
                                  <div className="font-medium text-gray-800 mb-1">
                                    {fieldChange.field}:
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-red-600 bg-red-50 px-1 rounded">
                                      {fieldChange.oldValue === 'None' ? 'Empty' : 
                                       fieldChange.oldValue === '' ? 'Empty' : 
                                       fieldChange.oldValue}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-green-600 bg-green-50 px-1 rounded">
                                      {fieldChange.newValue === 'None' ? 'Empty' : 
                                       fieldChange.newValue === '' ? 'Empty' : 
                                       fieldChange.newValue}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {change.notes && (
                            <div className="mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-400">
                              <p className="text-xs text-blue-800">{change.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Section */}
                {(
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">
                      {selectedApplication.status === 'pending' ? 'Review Application' : 'Update Decision'}
                    </h4>
                    {selectedApplication.status !== 'pending' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-800">
                          💡 <strong>Note:</strong> You can change the decision for this application. 
                          The sponsor will be notified of any changes.
                        </p>
                        {selectedApplication.review?.decision && (
                          <p className="text-sm text-blue-700 mt-2">
                            <strong>Current Decision:</strong> {selectedApplication.review.decision.replace('_', ' ').toUpperCase()}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="space-y-4">
                                             <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Decision
                         </label>
                         <select
                           value={reviewData.decision}
                           onChange={(e) => setReviewData({ ...reviewData, decision: e.target.value })}
                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                         >
                           <option value="">Select decision</option>
                           <option value="approve">✅ Approve (Accept the sponsorship application)</option>
                           <option value="reject">❌ Reject (Decline the sponsorship application)</option>
                           <option value="request_changes">🔄 Request Changes (Ask sponsor to modify their proposal)</option>
                           <option value="convert_to_sponsorship">💰 Convert to Sponsorship (Automatically create active sponsorship)</option>
                         </select>
                         <p className="text-sm text-gray-500 mt-1">
                           <strong>Approve:</strong> Accept the application and contact sponsor for next steps<br/>
                           <strong>Reject:</strong> Decline with feedback to the sponsor<br/>
                           <strong>Request Changes:</strong> Ask sponsor to modify their proposal<br/>
                           <strong>Convert:</strong> Automatically create an active sponsorship relationship
                         </p>
                       </div>
                                             <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Review Notes (Visible to Sponsor)
                         </label>
                         <textarea
                           value={reviewData.reviewNotes}
                           onChange={(e) => setReviewData({ ...reviewData, reviewNotes: e.target.value })}
                           rows={3}
                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="Notes that will be shared with the sponsor..."
                         />
                         <p className="text-sm text-gray-500 mt-1">
                           These notes will be visible to the sponsor. Be professional and constructive in your feedback.
                         </p>
                       </div>
                                             <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Admin Notes (Internal)
                         </label>
                         <textarea
                           value={reviewData.adminNotes}
                           onChange={(e) => setReviewData({ ...reviewData, adminNotes: e.target.value })}
                           rows={3}
                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="Internal notes for your team..."
                         />
                         <p className="text-sm text-gray-500 mt-1">
                           These notes are private and only visible to your team. Use for internal discussions, follow-ups, or reminders.
                         </p>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedApplication(null);
                    setReviewData({ decision: '', reviewNotes: '', adminNotes: '' });
                    setEditableData(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={handleReview}
                  disabled={!reviewData.decision || isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>
                    {isSubmitting 
                      ? 'Processing...' 
                      : (selectedApplication.status === 'pending' ? 'Submit Review' : 'Update Decision')
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 