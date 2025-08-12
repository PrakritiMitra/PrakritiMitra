import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { verifyRecoveryToken } from '../api/auth';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const RecoveryConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No recovery token provided');
      setIsLoading(false);
      return;
    }

    // Auto-recover the account when the page loads
    handleRecovery();
  }, [token]);

  const handleRecovery = async () => {
    if (!token) return;

    setIsRecovering(true);
    
    try {
      const data = await verifyRecoveryToken({ token });
      
      setRecoveryStatus('success');
      
      // Store the new password if provided
      if (data.newPassword) {
        setNewPassword(data.newPassword);
        toast.success('Account recovered successfully! Check below for your new password.');
      } else {
        toast.success('Account recovered successfully! You can now log in.');
      }
      
      // Store the recovered user data and token
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { user: data.user }
        }));
      }
    } catch (error) {
      setRecoveryStatus('error');
      setError(error.response?.data?.message || 'Recovery failed');
      toast.error(error.response?.data?.message || 'Recovery failed');
    } finally {
      setIsLoading(false);
      setIsRecovering(false);
    }
  };

  const handleRetry = () => {
    setRecoveryStatus(null);
    setError('');
    setIsLoading(true);
    handleRecovery();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Recovering Your Account</h2>
            <p className="text-gray-600">Please wait while we restore your account...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (recoveryStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-green-900 mb-4">Account Recovered!</h2>
            <p className="text-gray-600 mb-6">
              Your account has been successfully restored. You can now log in and access all your data.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                <strong>Welcome back!</strong> All your events, messages, and data have been preserved.
              </p>
            </div>
            
            {newPassword && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">🔑 Your New Password</h3>
                <div className="bg-white border border-blue-300 rounded p-3 mb-2">
                  <code className="text-lg font-mono text-blue-900 select-all">{newPassword}</code>
                </div>
                <p className="text-xs text-blue-700">
                  <strong>Important:</strong> Use this password to login, then change it immediately for security.
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Link
                to="/volunteer/dashboard"
                className="block w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                Go to Dashboard
              </Link>
              
              <Link
                to="/login"
                className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (recoveryStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-red-900 mb-4">Recovery Failed</h2>
            <p className="text-gray-600 mb-6">
              {error || 'We were unable to recover your account. The recovery link may have expired or is invalid.'}
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                <strong>Possible reasons:</strong>
              </p>
              <ul className="text-sm text-red-700 mt-2 text-left list-disc list-inside space-y-1">
                <li>Recovery link has expired (valid for 1 hour)</li>
                <li>Recovery link has already been used</li>
                <li>Account was not found or is not deleted</li>
                <li>Invalid or corrupted recovery token</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                disabled={isRecovering}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isRecovering ? 'Retrying...' : 'Try Again'}
              </button>
              
              <Link
                to="/recover-account"
                className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
              >
                Request New Recovery Link
              </Link>
              
              <Link
                to="/login"
                className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return null;
};

export default RecoveryConfirmationPage;
