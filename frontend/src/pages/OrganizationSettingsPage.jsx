import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showAlert } from '../utils/notifications';
import { getOrganizationById, updateOrganization } from '../api';
import Navbar from '../components/layout/Navbar';

export default function OrganizationSettingsPage() {
  const { organizationId } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    orgEmail: '',
    orgPhone: '',
    website: '',
    headOfficeLocation: '',
    focusArea: '',
    focusAreaOther: '',
    yearOfEstablishment: '',
    visionMission: '',
    socialLinks: [],
    sponsorship: {
      enabled: false,
      description: '',
      contactEmail: '',
      minimumContribution: '',
      allowCustomSponsorship: true,
      customSponsorshipContact: {
        email: '',
        phone: '',
        description: ''
      }
    }
  });

  useEffect(() => {
    fetchOrganizationData();
  }, [organizationId]);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      const response = await getOrganizationById(organizationId);
      const orgData = response.data;
      
      // Check if current user is admin of this organization
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData) {
        showAlert.error('You must be logged in to edit this organization.');
        navigate(`/organization/${organizationId}`);
        return;
      }
      
      // Check if user is the creator or an admin team member
      const isCreator = orgData.createdBy === userData._id;
      const isAdminMember = orgData.team && Array.isArray(orgData.team) ? orgData.team.some(member => 
        member.userId === userData._id && 
        member.status === 'approved' && 
        member.isAdmin
      ) : false;
      
      if (!isCreator && !isAdminMember) {
        showAlert.error('You do not have permission to edit this organization.');
        navigate(`/organization/${organizationId}`);
        return;
      }

      setOrganization(orgData);
      setFormData({
        name: orgData.name || '',
        description: orgData.description || '',
        orgEmail: orgData.orgEmail || '',
        orgPhone: orgData.orgPhone || '',
        website: orgData.website || '',
        headOfficeLocation: orgData.headOfficeLocation || '',
        focusArea: orgData.focusArea || '',
        focusAreaOther: orgData.focusAreaOther || '',
        yearOfEstablishment: orgData.yearOfEstablishment ? orgData.yearOfEstablishment.toString() : '',
        visionMission: orgData.visionMission || '',
        socialLinks: orgData.socialLinks || [],
        sponsorship: {
          enabled: orgData.sponsorship?.enabled || false,
          description: orgData.sponsorship?.description || '',
          contactEmail: orgData.sponsorship?.contactEmail || '',
          minimumContribution: orgData.sponsorship?.minimumContribution || 5000,
          allowCustomSponsorship: orgData.sponsorship?.allowCustomSponsorship !== false,
          customSponsorshipContact: {
            email: orgData.sponsorship?.customSponsorshipContact?.email || '',
            phone: orgData.sponsorship?.customSponsorshipContact?.phone || '',
            description: orgData.sponsorship?.customSponsorshipContact?.description || ''
          }
        }
      });
    } catch (error) {
      console.error('Error fetching organization data:', error);
              showAlert.error('Failed to load organization data');
      navigate(`/organization/${organizationId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'socialLinks') {
      // Handle social links as comma-separated string
      const links = value.split(',').map(link => link.trim()).filter(link => link);
      setFormData(prev => ({ ...prev, socialLinks: links }));
    } else if (name.startsWith('sponsorship.customSponsorshipContact.')) {
      const field = name.split('.')[2];
      setFormData(prev => ({
        ...prev,
        sponsorship: {
          ...prev.sponsorship,
          customSponsorshipContact: {
            ...prev.sponsorship.customSponsorshipContact,
            [field]: value
          }
        }
      }));
    } else if (name.startsWith('sponsorship.')) {
      const field = name.split('.')[1];
      if (type === 'checkbox') {
        setFormData(prev => ({
          ...prev,
          sponsorship: { ...prev.sponsorship, [field]: checked }
        }));
      } else if (field === 'minimumContribution') {
        setFormData(prev => ({
          ...prev,
          sponsorship: { ...prev.sponsorship, [field]: value }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          sponsorship: { ...prev.sponsorship, [field]: value }
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Organization name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.orgEmail.trim()) newErrors.orgEmail = 'Email is required';
    if (!formData.headOfficeLocation.trim()) newErrors.headOfficeLocation = 'Head office location is required';

    // Sponsorship validation
    if (formData.sponsorship.enabled) {
      if (!formData.sponsorship.description.trim()) {
        newErrors['sponsorship.description'] = 'Sponsorship description is required when sponsorship is enabled';
      }
      if (!formData.sponsorship.contactEmail.trim()) {
        newErrors['sponsorship.contactEmail'] = 'Sponsorship contact email is required when sponsorship is enabled';
      }
      if (formData.sponsorship.minimumContribution <= 0) {
        newErrors['sponsorship.minimumContribution'] = 'Minimum contribution must be greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        orgEmail: formData.orgEmail,
        orgPhone: formData.orgPhone,
        website: formData.website,
        headOfficeLocation: formData.headOfficeLocation,
        focusArea: formData.focusArea,
        focusAreaOther: formData.focusAreaOther,
        yearOfEstablishment: formData.yearOfEstablishment,
        visionMission: formData.visionMission,
        socialLinks: formData.socialLinks,
        sponsorship: formData.sponsorship
      };

      await updateOrganization(organizationId, updateData);
      
      // Show success toast
              showAlert.success('Organization settings updated successfully!');
      
      navigate(`/organization/${organizationId}`);
    } catch (error) {
      console.error('Error updating organization:', error);
      
      // Show error toast
              showAlert.error(error.response?.data?.message || error.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 px-6 max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 px-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Organization Settings</h1>
              <p className="text-gray-600">Manage your organization's details and sponsorship settings</p>
            </div>
            <button
              onClick={() => navigate(`/organization/${organizationId}`)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to Organization
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Organization name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

                             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Email *
                 </label>
                 <input
                   type="email"
                   name="orgEmail"
                   value={formData.orgEmail}
                   onChange={handleChange}
                   className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                     errors.orgEmail ? 'border-red-500' : 'border-gray-300'
                   }`}
                   placeholder="contact@organization.com"
                 />
                 {errors.orgEmail && (
                   <p className="text-red-500 text-sm mt-1">{errors.orgEmail}</p>
                 )}
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Phone
                 </label>
                 <input
                   type="tel"
                   name="orgPhone"
                   value={formData.orgPhone}
                   onChange={handleChange}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="+91-9876543210"
                 />
               </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.organization.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Describe your organization..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>
            </div>
          </div>

                     {/* Organization Details */}
           <div className="mb-8">
             <h2 className="text-xl font-semibold text-gray-900 mb-6">Organization Details</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Head Office Location *
                 </label>
                 <input
                   type="text"
                   name="headOfficeLocation"
                   value={formData.headOfficeLocation}
                   onChange={handleChange}
                   className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                     errors.headOfficeLocation ? 'border-red-500' : 'border-gray-300'
                   }`}
                   placeholder="Mumbai, Maharashtra"
                 />
                 {errors.headOfficeLocation && (
                   <p className="text-red-500 text-sm mt-1">{errors.headOfficeLocation}</p>
                 )}
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Focus Area
                 </label>
                 <select
                   name="focusArea"
                   value={formData.focusArea}
                   onChange={handleChange}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 >
                   <option value="">Select Focus Area</option>
                   <option value="Environment">Environment</option>
                   <option value="Education">Education</option>
                   <option value="Healthcare">Healthcare</option>
                   <option value="Poverty">Poverty</option>
                   <option value="Women Empowerment">Women Empowerment</option>
                   <option value="Child Welfare">Child Welfare</option>
                   <option value="Animal Welfare">Animal Welfare</option>
                   <option value="Other">Other</option>
                 </select>
               </div>

               {formData.focusArea === 'Other' && (
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Specify Focus Area
                   </label>
                   <input
                     type="text"
                     name="focusAreaOther"
                     value={formData.focusAreaOther}
                     onChange={handleChange}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="Specify your focus area"
                   />
                 </div>
               )}

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Year of Establishment
                 </label>
                 <input
                   type="number"
                   name="yearOfEstablishment"
                   value={formData.yearOfEstablishment}
                   onChange={handleChange}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="2020"
                   min="1900"
                   max={new Date().getFullYear()}
                 />
               </div>

               <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Vision & Mission
                 </label>
                 <textarea
                   name="visionMission"
                   value={formData.visionMission}
                   onChange={handleChange}
                   rows={4}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="Describe your organization's vision and mission..."
                 />
               </div>
             </div>
           </div>

                     {/* Social Media */}
           <div className="mb-8">
             <h2 className="text-xl font-semibold text-gray-900 mb-6">Social Media</h2>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Social Media Links
               </label>
               <textarea
                 name="socialLinks"
                                   value={(formData.socialLinks || []).join(', ')}
                 onChange={handleChange}
                 rows={3}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="https://facebook.com/organization, https://twitter.com/organization, https://instagram.com/organization"
               />
               <p className="text-sm text-gray-500 mt-1">
                 Enter social media URLs separated by commas
               </p>
             </div>
           </div>

          {/* Sponsorship Settings */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Sponsorship Settings</h2>
              {formData.sponsorship.enabled && (
                <button
                  onClick={() => navigate(`/organization/${organizationId}/applications`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  View Applications
                </button>
              )}
            </div>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  name="sponsorship.enabled"
                  checked={formData.sponsorship.enabled}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-lg font-medium text-gray-900">
                  Enable Sponsorship Program
                </label>
              </div>
              <p className="text-sm text-gray-600">
                When enabled, organizations and individuals can apply to sponsor your events and activities.
              </p>
            </div>

            {formData.sponsorship.enabled && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsorship Description *
                  </label>
                  <textarea
                    name="sponsorship.description"
                    value={formData.sponsorship.description || ''}
                    onChange={handleChange}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors['sponsorship.description'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Describe your sponsorship opportunities and what sponsors can expect..."
                  />
                  {errors['sponsorship.description'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['sponsorship.description']}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sponsorship Contact Email *
                    </label>
                    <input
                      type="email"
                      name="sponsorship.contactEmail"
                      value={formData.sponsorship.contactEmail || ''}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors['sponsorship.contactEmail'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="sponsorship@organization.com"
                    />
                    {errors['sponsorship.contactEmail'] && (
                      <p className="text-red-500 text-sm mt-1">{errors['sponsorship.contactEmail']}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Contribution (₹)
                    </label>
                    <input
                      type="number"
                      name="sponsorship.minimumContribution"
                      value={formData.sponsorship.minimumContribution || ''}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors['sponsorship.minimumContribution'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="5000"
                      min="0"
                    />
                    {errors['sponsorship.minimumContribution'] && (
                      <p className="text-red-500 text-sm mt-1">{errors['sponsorship.minimumContribution']}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      name="sponsorship.allowCustomSponsorship"
                      checked={formData.sponsorship.allowCustomSponsorship}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-lg font-medium text-gray-900">
                      Allow Custom Sponsorship Proposals
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    When enabled, potential sponsors can submit custom sponsorship proposals beyond predefined packages.
                  </p>

                  {formData.sponsorship.allowCustomSponsorship && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Sponsorship Contact Email
                        </label>
                        <input
                          type="email"
                          name="sponsorship.customSponsorshipContact.email"
                          value={formData.sponsorship.customSponsorshipContact.email || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="custom@organization.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Sponsorship Contact Phone
                        </label>
                        <input
                          type="tel"
                          name="sponsorship.customSponsorshipContact.phone"
                          value={formData.sponsorship.customSponsorshipContact.phone || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="+91-9876543210"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Sponsorship Description
                        </label>
                        <textarea
                          name="sponsorship.customSponsorshipContact.description"
                          value={formData.sponsorship.customSponsorshipContact.description || ''}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Describe how potential sponsors can reach out for custom proposals..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-8 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 