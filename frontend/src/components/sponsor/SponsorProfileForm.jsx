import React, { useState, useEffect } from 'react';
import { sponsorAPI } from '../../api';
import { showAlert } from '../../utils/notifications';

const SponsorProfileForm = ({ onSuccess, onCancel, existingSponsor = null }) => {
  const [formData, setFormData] = useState({
    sponsorType: 'business',
    contactPerson: '',
    email: '',
    phone: '',
    location: {
      city: '',
      state: '',
      country: 'India'
    },
    socialLinks: {
      website: '',
      linkedin: '',
      twitter: '',
      facebook: '',
      instagram: ''
    },
    preferences: {
      focusAreas: [],
      preferredContributionType: [],
      notes: ''
    },
    business: {
      name: '',
      industry: '',
      website: '',
      description: '',
      yearEstablished: '',
      employeeCount: ''
    },
    individual: {
      profession: '',
      organization: '',
      designation: '',
      description: ''
    }
  });

  const [files, setFiles] = useState({
    logo: null,
    gstCertificate: null,
    panCard: null,
    companyRegistration: null
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const focusAreaOptions = [
    'Environmental Conservation',
    'Education & Literacy',
    'Healthcare & Medical',
    'Poverty Alleviation',
    'Women Empowerment',
    'Child Welfare',
    'Animal Welfare',
    'Disaster Relief',
    'Community Development',
    'Arts & Culture',
    'Sports & Recreation',
    'Technology & Innovation',
    'Agriculture & Rural Development',
    'Mental Health',
    'Disability Support'
  ];



  const contributionTypeOptions = [
    'monetary',
    'goods',
    'service',
    'media'
  ];

  useEffect(() => {
    if (existingSponsor) {
      setFormData({
        sponsorType: existingSponsor.sponsorType || 'business',
        contactPerson: existingSponsor.contactPerson || '',
        email: existingSponsor.email || '',
        phone: existingSponsor.phone || '',
        location: existingSponsor.location || { city: '', state: '', country: 'India' },
        socialLinks: existingSponsor.socialLinks || {
          website: '', linkedin: '', twitter: '', facebook: '', instagram: ''
        },
        preferences: existingSponsor.preferences || {
          focusAreas: [], 
          preferredContributionType: [], 
          notes: ''
        },
        business: existingSponsor.business || {
          name: '', industry: '', website: '', description: '', 
          yearEstablished: '', employeeCount: ''
        },
        individual: existingSponsor.individual || {
          profession: '', organization: '', designation: '', description: ''
        }
      });
    }
  }, [existingSponsor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('location.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        location: { ...prev.location, [field]: value }
      }));
    } else if (name.startsWith('socialLinks.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socialLinks: { ...prev.socialLinks, [field]: value }
      }));
    } else if (name.startsWith('preferences.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        preferences: { ...prev.preferences, [field]: value }
      }));
    } else if (name.startsWith('business.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        business: { ...prev.business, [field]: value }
      }));
    } else if (name.startsWith('individual.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        individual: { ...prev.individual, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files[0]) {
      setFiles(prev => ({ ...prev, [name]: files[0] }));
    }
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    
    if (name === 'focusAreas') {
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          focusAreas: checked 
            ? [...prev.preferences.focusAreas, value]
            : prev.preferences.focusAreas.filter(area => area !== value)
        }
      }));
    } else if (name === 'preferredContributionType') {
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          preferredContributionType: checked 
            ? [...prev.preferences.preferredContributionType, value]
            : prev.preferences.preferredContributionType.filter(type => type !== value)
        }
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = 'Contact person is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.location.city.trim()) {
      newErrors['location.city'] = 'City is required';
    }
    if (!formData.location.state.trim()) {
      newErrors['location.state'] = 'State is required';
    }

    if (formData.sponsorType === 'business') {
      if (!formData.business.name.trim()) {
        newErrors['business.name'] = 'Business name is required';
      }
      if (!formData.business.industry.trim()) {
        newErrors['business.industry'] = 'Industry is required';
      }
    } else {
      if (!formData.individual.profession.trim()) {
        newErrors['individual.profession'] = 'Profession is required';
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

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        files
      };

      if (existingSponsor) {
        await sponsorAPI.updateSponsor(existingSponsor._id, submitData);
      } else {
        await sponsorAPI.createSponsor(submitData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving sponsor profile:', error);
      showAlert.error(error.message || 'Failed to save sponsor profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {existingSponsor ? 'Update Sponsor Profile' : 'Become a Sponsor'}
        </h2>
        <p className="text-gray-600">
          {existingSponsor 
            ? 'Update your sponsor profile to continue supporting great causes'
            : 'Join our community of sponsors and make a difference in society'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Sponsor Type Selection */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sponsor Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
              <input
                type="radio"
                name="sponsorType"
                value="business"
                checked={formData.sponsorType === 'business'}
                onChange={handleChange}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">Business Sponsor</div>
                <div className="text-sm text-gray-600">Companies, organizations, or enterprises</div>
              </div>
            </label>
            <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
              <input
                type="radio"
                name="sponsorType"
                value="individual"
                checked={formData.sponsorType === 'individual'}
                onChange={handleChange}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">Individual Sponsor</div>
                <div className="text-sm text-gray-600">Personal sponsorships and donations</div>
              </div>
            </label>
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Person *
            </label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.contactPerson ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Full name of contact person"
            />
            {errors.contactPerson && (
              <p className="text-red-500 text-sm mt-1">{errors.contactPerson}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="contact@example.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+91-9876543210"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            <input
              type="url"
              name="socialLinks.website"
              value={formData.socialLinks.website}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.example.com"
            />
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              name="location.city"
              value={formData.location.city}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors['location.city'] ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Mumbai"
            />
            {errors['location.city'] && (
              <p className="text-red-500 text-sm mt-1">{errors['location.city']}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State *
            </label>
            <input
              type="text"
              name="location.state"
              value={formData.location.state}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors['location.state'] ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Maharashtra"
            />
            {errors['location.state'] && (
              <p className="text-red-500 text-sm mt-1">{errors['location.state']}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              name="location.country"
              value={formData.location.country}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="India"
            />
          </div>
        </div>

        {/* Business/Individual Specific Fields */}
        {formData.sponsorType === 'business' ? (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="business.name"
                  value={formData.business.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['business.name'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ABC Company Ltd."
                />
                {errors['business.name'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['business.name']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry *
                </label>
                <input
                  type="text"
                  name="business.industry"
                  value={formData.business.industry}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['business.industry'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Technology, Healthcare, etc."
                />
                {errors['business.industry'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['business.industry']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year Established
                </label>
                <input
                  type="number"
                  name="business.yearEstablished"
                  value={formData.business.yearEstablished}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Count
                </label>
                <select
                  name="business.employeeCount"
                  value={formData.business.employeeCount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Description
                </label>
                <textarea
                  name="business.description"
                  value={formData.business.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of your business..."
                />
              </div>
            </div>

            {/* Business Documents */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Business Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Logo
                  </label>
                  <input
                    type="file"
                    name="logo"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG (max 5MB)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Certificate
                  </label>
                  <input
                    type="file"
                    name="gstCertificate"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (max 5MB)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Card
                  </label>
                  <input
                    type="file"
                    name="panCard"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (max 5MB)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Registration
                  </label>
                  <input
                    type="file"
                    name="companyRegistration"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (max 5MB)</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profession *
                </label>
                <input
                  type="text"
                  name="individual.profession"
                  value={formData.individual.profession}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['individual.profession'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Software Engineer, Doctor, etc."
                />
                {errors['individual.profession'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['individual.profession']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization
                </label>
                <input
                  type="text"
                  name="individual.organization"
                  value={formData.individual.organization}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Company or organization name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Designation
                </label>
                <input
                  type="text"
                  name="individual.designation"
                  value={formData.individual.designation}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Manager, Director, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="individual.description"
                  value={formData.individual.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us about yourself and your interests..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Sponsorship Preferences */}
        <div className="bg-green-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sponsorship Preferences</h3>
          
          {/* Focus Areas */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Focus Areas (Select all that apply)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {focusAreaOptions.map(area => (
                <label key={area} className="flex items-center">
                  <input
                    type="checkbox"
                    name="focusAreas"
                    value={area}
                    checked={formData.preferences.focusAreas.includes(area)}
                    onChange={handleCheckboxChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{area}</span>
                </label>
              ))}
            </div>
          </div>



          {/* Preferred Contribution Types */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Preferred Contribution Types
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {contributionTypeOptions.map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    name="preferredContributionType"
                    value={type}
                    checked={formData.preferences.preferredContributionType.includes(type)}
                    onChange={handleCheckboxChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              name="preferences.notes"
              value={formData.preferences.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any specific requirements or preferences..."
            />
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn
              </label>
              <input
                type="url"
                name="socialLinks.linkedin"
                value={formData.socialLinks.linkedin}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twitter
              </label>
              <input
                type="url"
                name="socialLinks.twitter"
                value={formData.socialLinks.twitter}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://twitter.com/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facebook
              </label>
              <input
                type="url"
                name="socialLinks.facebook"
                value={formData.socialLinks.facebook}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://facebook.com/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instagram
              </label>
              <input
                type="url"
                name="socialLinks.instagram"
                value={formData.socialLinks.instagram}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://instagram.com/username"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : (existingSponsor ? 'Update Profile' : 'Create Profile')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SponsorProfileForm; 