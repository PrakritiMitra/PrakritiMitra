import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import OrganizationForm from '../components/auth/OrganizationForm';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

export default function RegisterOrganization() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div
          className={`mb-10 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="text-center">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-md">
              <BuildingOfficeIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-3">
              Register Your Organization
            </h1>
            <p className="text-slate-600 text-lg max-w-3xl mx-auto">
              Create a new organization to start hosting environmental events and making a positive impact in your community.
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div
          className={`transition-all duration-1000 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="max-w-7xl mx-auto">
            <OrganizationForm />
          </div>
        </div>
      </div>
    </div>
  );
}
