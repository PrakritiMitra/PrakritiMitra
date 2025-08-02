import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sponsorshipIntentAPI, getOrganizationById, sponsorAPI } from '../api';
import Navbar from '../components/layout/Navbar';



export default function SponsorshipApplicationPage() {
  
  const { organizationId, eventId } = useParams();
  const navigate = useNavigate();
  

  const [organization, setOrganization] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [userSponsorProfile, setUserSponsorProfile] = useState(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [formData, setFormData] = useState({
    sponsor: {
      user: null,
      name: '',
      email: '',
      phone: '',
      sponsorType: 'business',
      business: {
        name: '',
        industry: '',
        website: '',
        description: ''
      },
      individual: {
        profession: '',
        organization: '',
        designation: ''
      },
      location: {
        city: '',
        state: '',
        country: 'India'
      }
    },
    sponsorship: {
      type: 'monetary',
      description: '',
      estimatedValue: '',
      currency: 'INR',
      monetary: {
        amount: '',
        paymentMethod: '',
        paymentTimeline: ''
      },
      goods: {
        items: [],
        quantity: '',
        deliveryTimeline: ''
      },
      service: {
        serviceType: '',
        duration: '',
        expertise: ''
      },
      media: {
        reach: '',
        platforms: [],
        duration: ''
      }
    },
    recognition: {
      recognitionLevel: '',
      specificBenefits: [],
      additionalRequests: ''
    },
    additionalInfo: {
      howDidYouHear: '',
      previousExperience: '',
      timeline: '',
      specialRequirements: '',
      questions: ''
    }
  });

  const [errors, setErrors] = useState({});
  const [minimumContribution, setMinimumContribution] = useState(0);

  useEffect(() => {
    fetchOrganizationData();
    checkUserSponsorProfile();
  }, [organizationId, eventId]);



  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      const [orgRes] = await Promise.all([
        getOrganizationById(organizationId)
      ]);
      setOrganization(orgRes.data);
      
      // Set minimum contribution from organization settings
      if (orgRes.data?.sponsorship?.minimumContribution) {
        setMinimumContribution(orgRes.data.sponsorship.minimumContribution);
      }
      
      if (eventId) {
        // Fetch event data if eventId is provided
        // You'll need to implement this API call
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserSponsorProfile = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData) {
        return;
      }

      const sponsorResponse = await sponsorAPI.getMySponsorProfile();
      
      if (sponsorResponse) {
        setUserSponsorProfile(sponsorResponse);
        setHasExistingProfile(true);
        prefillFormWithSponsorData(sponsorResponse);
      }
    } catch (error) {
      // Silently handle error - user might not have a sponsor profile
    }
  };

  const prefillFormWithSponsorData = (sponsorData) => {
    
    setFormData(prev => ({
      ...prev,
      sponsor: {
        ...prev.sponsor,
        user: sponsorData.user?._id || sponsorData.user, // Include the user ID
        name: sponsorData.contactPerson || '', // Use contactPerson from sponsor profile
        email: sponsorData.email || '',
        phone: sponsorData.phone || '',
        sponsorType: sponsorData.sponsorType || 'business',
        business: {
          name: sponsorData.business?.name || '',
          industry: sponsorData.business?.industry || '',
          website: sponsorData.business?.website || sponsorData.socialLinks?.website || '', // Check both business.website and socialLinks.website
          description: sponsorData.business?.description || ''
        },
        individual: {
          profession: sponsorData.individual?.profession || '',
          organization: sponsorData.individual?.organization || '',
          designation: sponsorData.individual?.designation || ''
        },
        location: {
          city: sponsorData.location?.city || '',
          state: sponsorData.location?.state || '',
          country: sponsorData.location?.country || 'India'
        }
      }
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      
      if (section === 'sponsor' && name.includes('.')) {
        const field = name.split('.')[1];
        if (field === 'business' || field === 'individual' || field === 'location') {
          const subField = name.split('.')[2];
          setFormData(prev => ({
            ...prev,
            sponsor: {
              ...prev.sponsor,
              [field]: {
                ...prev.sponsor[field],
                [subField]: value
              }
            }
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            sponsor: {
              ...prev.sponsor,
              [field]: value
            }
          }));
        }
      } else if (section === 'sponsorship' && name.includes('.')) {
        const field = name.split('.')[1];
        if (field === 'monetary' || field === 'goods' || field === 'service' || field === 'media') {
          const subField = name.split('.')[2];
          setFormData(prev => ({
            ...prev,
            sponsorship: {
              ...prev.sponsorship,
              [field]: {
                ...prev.sponsorship[field],
                [subField]: value
              }
            }
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            sponsorship: {
              ...prev.sponsorship,
              [field]: value
            }
          }));
        }
      } else if (section === 'recognition' && name.includes('.')) {
        const field = name.split('.')[1];
        setFormData(prev => ({
          ...prev,
          recognition: {
            ...prev.recognition,
            [field]: value
          }
        }));
      } else if (section === 'additionalInfo' && name.includes('.')) {
        const field = name.split('.')[1];
        setFormData(prev => ({
          ...prev,
          additionalInfo: {
            ...prev.additionalInfo,
            [field]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.sponsor.name.trim()) newErrors.name = 'Name is required';
      if (!formData.sponsor.email.trim()) newErrors.email = 'Email is required';
      if (!formData.sponsor.phone.trim()) newErrors.phone = 'Phone is required';
      
      if (formData.sponsor.sponsorType === 'business') {
        if (!formData.sponsor.business.name.trim()) newErrors.businessName = 'Business name is required';
        if (!formData.sponsor.business.industry.trim()) newErrors.industry = 'Industry is required';
      } else {
        if (!formData.sponsor.individual.profession.trim()) newErrors.profession = 'Profession is required';
      }
    }
    
    if (step === 2) {
      if (!formData.sponsorship.description.trim()) newErrors.description = 'Description is required';
      if (!formData.sponsorship.estimatedValue) newErrors.estimatedValue = 'Estimated value is required';
      if (Number(formData.sponsorship.estimatedValue) <= 0) newErrors.estimatedValue = 'Estimated value must be greater than 0';
      
      // Check minimum contribution requirement
      if (minimumContribution > 0 && Number(formData.sponsorship.estimatedValue) < minimumContribution) {
        newErrors.estimatedValue = `Minimum contribution required is ₹${minimumContribution.toLocaleString()}`;
      }
      
      if (formData.sponsorship.type === 'monetary') {
        if (!formData.sponsorship.monetary.amount) newErrors.amount = 'Amount is required';
        if (Number(formData.sponsorship.monetary.amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
        
        // Check minimum contribution for monetary sponsorships
        if (minimumContribution > 0 && Number(formData.sponsorship.monetary.amount) < minimumContribution) {
          newErrors.amount = `Minimum contribution required is ₹${minimumContribution.toLocaleString()}`;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (submitting) {
      return;
    }
    
    // Only submit if we're on the final step (step 3)
    if (currentStep !== 3) {
      return;
    }
    
    if (!validateStep(currentStep)) {
      return;
    }

    try {
      setSubmitting(true);
      
      const submitData = {
        ...formData,
        organizationId,
        eventId,
        sponsorProfileId: userSponsorProfile?._id || null
      };

      // Use the formatIntentData function to properly format the data
      const formattedData = sponsorshipIntentAPI.formatIntentData(submitData);
      
      await sponsorshipIntentAPI.submitIntent(formattedData);
      
      alert('Sponsorship application submitted successfully!');
      navigate(`/organizations/${organizationId}`);
    } catch (error) {
      console.error('Error submitting application:', error);
      
      // Show specific error message for minimum contribution
      if (error.response?.data?.message && error.response.data.message.includes('Minimum contribution required')) {
        alert(`Submission failed: ${error.response.data.message}. Please increase your estimated value and try again.`);
      } else {
        alert('Failed to submit application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
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

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Organization Not Found</h1>
            <p className="text-gray-600">The organization you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Sponsor {organization.name}
              </h1>
              <p className="text-gray-600 mb-4">
                Complete the form below to submit your sponsorship application.
              </p>
              
              {/* Process Overview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">📋 Application Process</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Step 1:</strong> Sponsor Information - Tell us about yourself or your organization</p>
                  <p><strong>Step 2:</strong> Sponsorship Details - Describe what you're offering and its value</p>
                  <p><strong>Step 3:</strong> Recognition & Additional Info - Choose recognition preferences and provide additional details</p>
                  {minimumContribution > 0 && (
                    <p className="text-xs mt-2 text-orange-700">
                      💡 <strong>Note:</strong> This organization requires a minimum contribution of ₹{minimumContribution.toLocaleString()}. 
                      Please ensure your estimated value meets this requirement.
                    </p>
                  )}
                  <p className="text-xs mt-2">After submission, our team will review your application and contact you within 2-3 business days.</p>
                </div>
              </div>
              
              {hasExistingProfile && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800 text-sm">
                    ✓ Your existing sponsor profile has been pre-filled. You can modify any fields as needed.
                  </p>
                </div>
              )}
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step}
                    </div>
                    {step < 3 && (
                      <div className={`w-16 h-1 mx-2 ${
                        currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>Sponsor Details</span>
                <span>Sponsorship Details</span>
                <span>Additional Info</span>
              </div>
            </div>

            <div>
              {/* Step 1: Sponsor Details */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Sponsor Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="sponsor.name"
                        value={formData.sponsor.name || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your full name"
                      />
                      {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="sponsor.email"
                        value={formData.sponsor.email || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your email address"
                      />
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="sponsor.phone"
                        value={formData.sponsor.phone || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your phone number"
                      />
                      {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                    </div>

                                      <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sponsor Type
                    </label>
                    <select
                      name="sponsor.sponsorType"
                      value={formData.sponsor.sponsorType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="business">Business/Organization</option>
                      <option value="individual">Individual</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      Choose whether you're representing a business/organization or sponsoring as an individual
                    </p>
                  </div>
                  </div>

                  {formData.sponsor.sponsorType === 'business' ? (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Business Website
                          </label>
                          <input
                            type="url"
                            name="sponsor.business.website"
                            value={formData.sponsor.business.website || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://example.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Business Name *
                          </label>
                          <input
                            type="text"
                            name="sponsor.business.name"
                            value={formData.sponsor.business.name || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter business name"
                          />
                          {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Industry *
                          </label>
                          <input
                            type="text"
                            name="sponsor.business.industry"
                            value={formData.sponsor.business.industry || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Technology, Healthcare, Education"
                          />
                          {errors.industry && <p className="text-red-500 text-sm mt-1">{errors.industry}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Description
                        </label>
                        <textarea
                          name="sponsor.business.description"
                          value={formData.sponsor.business.description || ''}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Brief description of your business..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-gray-900">Individual Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Profession *
                          </label>
                          <input
                            type="text"
                            name="sponsor.individual.profession"
                            value={formData.sponsor.individual.profession || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Doctor, Engineer, Teacher"
                          />
                          {errors.profession && <p className="text-red-500 text-sm mt-1">{errors.profession}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Organization
                          </label>
                          <input
                            type="text"
                            name="sponsor.individual.organization"
                            value={formData.sponsor.individual.organization || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Where you work (optional)"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Designation
                          </label>
                          <input
                            type="text"
                            name="sponsor.individual.designation"
                            value={formData.sponsor.individual.designation || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Senior Manager, Director"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Location</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          name="sponsor.location.city"
                          value={formData.sponsor.location.city || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter city"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          name="sponsor.location.state"
                          value={formData.sponsor.location.state || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter state"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <input
                          type="text"
                          name="sponsor.location.country"
                          value={formData.sponsor.location.country || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter country"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Sponsorship Details */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Sponsorship Details</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sponsorship Description *
                    </label>
                    <textarea
                      name="sponsorship.description"
                      value={formData.sponsorship.description || ''}
                      onChange={handleChange}

                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe your sponsorship proposal and how it will benefit the organization..."
                    />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estimated Value (INR) *
                      </label>
                      <input
                        type="number"
                        name="sponsorship.estimatedValue"
                        value={formData.sponsorship.estimatedValue || ''}
                        onChange={handleChange}
                        min={minimumContribution > 0 ? minimumContribution : 0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Enter estimated value${minimumContribution > 0 ? ` (min: ₹${minimumContribution.toLocaleString()})` : ''}`}
                      />
                      {minimumContribution > 0 && (
                        <p className="text-sm text-blue-600 mt-1">
                          💡 Minimum contribution required: ₹{minimumContribution.toLocaleString()}
                        </p>
                      )}
                      {errors.estimatedValue && <p className="text-red-500 text-sm mt-1">{errors.estimatedValue}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        name="sponsorship.currency"
                        value={formData.sponsorship.currency || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="INR">Indian Rupee (INR)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sponsorship Type
                    </label>
                    <select
                      name="sponsorship.type"
                      value={formData.sponsorship.type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="monetary">💰 Monetary (Cash/Financial Support)</option>
                      <option value="goods">📦 Goods/Services (Products, Equipment, Materials)</option>
                      <option value="service">🛠️ Professional Services (Expertise, Skills, Time)</option>
                      <option value="media">📢 Media/Advertising (Promotion, Marketing Support)</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      Select the type of sponsorship you're offering. This helps us understand your contribution better.
                    </p>
                  </div>

                  {formData.sponsorship.type === 'monetary' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-gray-900">Monetary Sponsorship</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amount (INR) *
                          </label>
                          <input
                            type="number"
                            name="sponsorship.monetary.amount"
                            value={formData.sponsorship.monetary.amount || ''}
                            onChange={handleChange}
                            min={minimumContribution > 0 ? minimumContribution : 0}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Enter amount${minimumContribution > 0 ? ` (min: ₹${minimumContribution.toLocaleString()})` : ''}`}
                          />
                          {minimumContribution > 0 && (
                            <p className="text-sm text-blue-600 mt-1">
                              💡 Minimum contribution required: ₹{minimumContribution.toLocaleString()}
                            </p>
                          )}
                          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Method
                          </label>
                          <select
                            name="sponsorship.monetary.paymentMethod"
                            value={formData.sponsorship.monetary.paymentMethod || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select payment method</option>
                            <option value="bank_transfer">🏦 Bank Transfer (NEFT/RTGS/IMPS)</option>
                            <option value="cheque">📄 Cheque (Post-dated or immediate)</option>
                            <option value="online_payment">💳 Online Payment (UPI/Card/Net Banking)</option>
                            <option value="cash">💵 Cash (For smaller amounts)</option>
                          </select>
                          <p className="text-sm text-gray-500 mt-1">
                            Choose your preferred payment method. We'll coordinate the details after approval.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Timeline
                        </label>
                        <select
                          name="sponsorship.monetary.paymentTimeline"
                          value={formData.sponsorship.monetary.paymentTimeline || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select payment timeline</option>
                          <option value="immediate">Immediate</option>
                          <option value="within_week">Within 1 week</option>
                          <option value="within_month">Within 1 month</option>
                          <option value="before_event">Before event</option>
                          <option value="after_event">After event</option>
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                          When would you like to make the payment?
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.sponsorship.type === 'goods' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-gray-900">Goods/Services Sponsorship</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Items/Services
                        </label>
                        <input
                          type="text"
                          name="sponsorship.goods.items"
                          value={formData.sponsorship.goods.items?.join(', ') || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const items = value.split(',').map(item => item.trim()).filter(item => item);
                            setFormData(prev => ({
                              ...prev,
                              sponsorship: {
                                ...prev.sponsorship,
                                goods: {
                                  ...prev.sponsorship.goods,
                                  items
                                }
                              }
                            }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., T-shirts, Banners, Food items (comma separated)"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity
                          </label>
                          <input
                            type="text"
                            name="sponsorship.goods.quantity"
                            value={formData.sponsorship.goods.quantity || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 100 pieces, 50 kg"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Delivery Timeline
                          </label>
                          <input
                            type="text"
                            name="sponsorship.goods.deliveryTimeline"
                            value={formData.sponsorship.goods.deliveryTimeline || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 1 week before event"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.sponsorship.type === 'service' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-gray-900">Professional Services</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Service Type
                          </label>
                          <input
                            type="text"
                            name="sponsorship.service.serviceType"
                            value={formData.sponsorship.service.serviceType || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Legal consultation, Marketing support"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Duration
                          </label>
                          <input
                            type="text"
                            name="sponsorship.service.duration"
                            value={formData.sponsorship.service.duration || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 6 months, 1 year"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expertise Area
                        </label>
                        <input
                          type="text"
                          name="sponsorship.service.expertise"
                          value={formData.sponsorship.service.expertise || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Digital marketing, Legal compliance"
                        />
                      </div>
                    </div>
                  )}

                  {formData.sponsorship.type === 'media' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-gray-900">Media/Advertising</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reach/Audience
                          </label>
                          <input
                            type="text"
                            name="sponsorship.media.reach"
                            value={formData.sponsorship.media.reach || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 10,000 followers, 50,000 readers"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Duration
                          </label>
                          <input
                            type="text"
                            name="sponsorship.media.duration"
                            value={formData.sponsorship.media.duration || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 1 month, 3 months"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Platforms
                        </label>
                        <input
                          type="text"
                          name="sponsorship.media.platforms"
                          value={formData.sponsorship.media.platforms?.join(', ') || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const platforms = value.split(',').map(platform => platform.trim()).filter(platform => platform);
                            setFormData(prev => ({
                              ...prev,
                              sponsorship: {
                                ...prev.sponsorship,
                                media: {
                                  ...prev.sponsorship.media,
                                  platforms
                                }
                              }
                            }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Instagram, Facebook, YouTube (comma separated)"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Recognition & Additional Info */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Recognition & Additional Information</h2>
                  
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Recognition Preferences</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      💡 <strong>Note:</strong> Recognition levels are based on your actual contribution value and are automatically calculated. 
                      This preference helps us understand your visibility requirements.
                    </p>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferred Recognition Level
                      </label>
                      <select
                        name="recognition.recognitionLevel"
                        value={formData.recognition.recognitionLevel || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select recognition level (optional)</option>
                        <option value="high">🌟 High Visibility - Logo prominently displayed, social media mentions, website acknowledgment</option>
                        <option value="medium">⭐ Medium Visibility - Logo displayed, social media mentions</option>
                        <option value="low">✨ Low Visibility - Website acknowledgment only</option>
                        <option value="minimal">💫 Minimal Recognition - Simple thank you mention</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        Choose your preferred level of recognition. This helps us understand your visibility preferences.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Recognition Requests
                      </label>
                      <textarea
                        name="recognition.additionalRequests"
                        value={formData.recognition.additionalRequests || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Any specific recognition requests..."
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          How did you hear about us?
                        </label>
                        <select
                          name="additionalInfo.howDidYouHear"
                          value={formData.additionalInfo.howDidYouHear || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select option</option>
                          <option value="social_media">📱 Social Media (Instagram, Facebook, etc.)</option>
                          <option value="website">🌐 Website (Our official website)</option>
                          <option value="referral">👥 Referral (Friend, colleague, partner)</option>
                          <option value="event">🎉 Previous Event (Attended our past events)</option>
                          <option value="search">🔍 Search Engine (Google, Bing, etc.)</option>
                          <option value="other">📋 Other (Please specify in notes)</option>
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                          This helps us understand which channels are most effective for reaching potential sponsors
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timeline
                        </label>
                        <select
                          name="additionalInfo.timeline"
                          value={formData.additionalInfo.timeline || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select timeline</option>
                          <option value="immediate">Immediate</option>
                          <option value="within_week">Within 1 week</option>
                          <option value="within_month">Within 1 month</option>
                          <option value="before_event">Before event</option>
                          <option value="after_event">After event</option>
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                          When would you like to provide this sponsorship? This helps us plan accordingly.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Previous Sponsorship Experience
                      </label>
                      <textarea
                        name="additionalInfo.previousExperience"
                        value={formData.additionalInfo.previousExperience || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe any previous sponsorship experience..."
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Tell us about any previous events or organizations you've sponsored. This helps us understand your experience level.
                      </p>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Special Requirements
                      </label>
                      <textarea
                        name="additionalInfo.specialRequirements"
                        value={formData.additionalInfo.specialRequirements || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Any special requirements or considerations..."
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Any specific requirements for your sponsorship? (e.g., specific event dates, delivery methods, special arrangements)
                      </p>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Questions or Comments
                      </label>
                      <textarea
                        name="additionalInfo.questions"
                        value={formData.additionalInfo.questions || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Any questions or additional comments..."
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Have questions about the sponsorship process? Feel free to ask here and we'll get back to you.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-8 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex space-x-4">
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 