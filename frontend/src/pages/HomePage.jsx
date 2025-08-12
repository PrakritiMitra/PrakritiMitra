// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { getUserCounts } from '../api/auth';
import { getOrganizationCount } from '../api/organization';
import { getEventCount } from '../api/event';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  const [stats, setStats] = useState({
    volunteerCount: 0,
    organizerCount: 0,
    organizationCount: 0,
    eventCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Handle success message from location state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state to prevent showing it again on refresh
      window.history.replaceState({}, document.title);
      
      // Auto-dismiss the message after 10 seconds
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Get user from localStorage
  const user = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  }, []);

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        const [userCounts, orgCount, eventCount] = await Promise.all([
          getUserCounts(),
          getOrganizationCount(),
          getEventCount()
        ]);

        setStats({
          volunteerCount: userCounts.volunteerCount || 0,
          organizerCount: userCounts.organizerCount || 0,
          organizationCount: orgCount.organizationCount || 0,
          eventCount: eventCount.eventCount || 0
        });
      } catch (error) {
        console.error('❌ Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Determine dashboard link based on user role
  let dashboardLink = null;
  if (user) {
    if (user.role === 'organizer') {
      dashboardLink = '/organizer/dashboard';
    } else if (user.role === 'volunteer') {
      dashboardLink = '/volunteer/dashboard';
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navbar />
      
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                {successMessage}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  onClick={() => setSuccessMessage('')}
                  className="inline-flex rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 min-h-screen flex flex-col justify-between">
        <div className="max-w-7xl mx-auto flex-1 flex flex-col justify-center">
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Environmental Conservation Platform
              </div>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                PrakritiMitra
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-600 max-w-4xl mx-auto mb-10 leading-relaxed">
              Join hands with environmentalists across the globe to protect and preserve our planet. Volunteer for impactful initiatives or organize your own events using our comprehensive environmental conservation platform.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
              {user && dashboardLink ? (
                <a
                  href={dashboardLink}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold text-lg"
                >
                  Go to Dashboard
                </a>
              ) : (
                <>
                  <a
                    href="/signup"
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold text-lg"
                  >
                    Join as Volunteer/Organizer
                  </a>
                  <a
                    href="/login"
                    className="px-8 py-4 bg-white text-blue-700 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold text-lg border-2 border-blue-200 hover:border-blue-300"
                  >
                    Already Registered? Login
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose PrakritiMitra?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform unites environmental enthusiasts, volunteers, and organizations to create sustainable impact worldwide
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Community Building</h3>
              <p className="text-gray-600 leading-relaxed">
                Connect with like-minded individuals and organizations dedicated to environmental conservation
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Verified Organizations</h3>
              <p className="text-gray-600 leading-relaxed">
                Work with certified and verified environmental organizations with proven track records
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Platform</h3>
              <p className="text-gray-600 leading-relaxed">
                Leverage advanced technology to match volunteers with the perfect environmental initiatives
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-green-600">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Our Impact</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Together, we're making a real difference in Mumbai's environmental conservation
            </p>
          </div>

          <div className="flex justify-between items-center max-w-6xl mx-auto">
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-white mb-2">
                {loading ? '...' : `${stats.volunteerCount}+`}
              </div>
              <div className="text-blue-100">Active Volunteers</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-white mb-2">
                {loading ? '...' : `${stats.organizerCount}+`}
              </div>
              <div className="text-blue-100">Active Organizers</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-white mb-2">
                {loading ? '...' : `${stats.organizationCount}+`}
              </div>
              <div className="text-blue-100">Organizations</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-white mb-2">
                {loading ? '...' : `${stats.eventCount}+`}
              </div>
              <div className="text-blue-100">Events Completed</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-white mb-2">10K+</div>
              <div className="text-blue-100">KG Waste Collected</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Ready to Make a Difference?</h2>
          <p className="text-xl text-gray-600 mb-10">
            Join thousands of volunteers and organizations working together to preserve Mumbai's natural beauty
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold text-lg"
            >
              Get Started Today
            </a>
            <a
              href="/login"
              className="px-8 py-4 bg-white text-blue-700 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold text-lg border-2 border-blue-200 hover:border-blue-300"
            >
              Sign In
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>

  );
}
