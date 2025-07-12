//src/pages/RegisterOrganization.jsx

import React from 'react';
import Navbar from '../components/layout/Navbar';
import OrganizationForm from '../components/auth/OrganizationForm';

export default function RegisterOrganization() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 px-4">
        <OrganizationForm />
      </div>
    </div>
  );
}
