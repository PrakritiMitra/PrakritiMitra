import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateUtils';

const RecentlyDeletedAccountModal = ({ 
  isOpen, 
  onClose, 
  deletedAccount, 
  onProceedWithNewAccount,
  email 
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  // Using the utility function instead of local formatDate

  const handleRecoverAccount = () => {
    onClose();
    navigate('/recover-account');
  };

  const handleProceedWithNew = () => {
    onClose();
    onProceedWithNewAccount();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl mx-4 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Account Recently Deleted
        </h3>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-orange-800 mb-3">
            <strong>We found a recently deleted account with the email:</strong> {email}
          </p>
          
          <div className="space-y-2 text-sm text-orange-700">
            <div><strong>Username:</strong> {deletedAccount.username}</div>
            <div><strong>Name:</strong> {deletedAccount.name}</div>
            <div><strong>Role:</strong> {deletedAccount.role}</div>
            <div><strong>Deleted:</strong> {formatDate(deletedAccount.deletedAt)}</div>
            {deletedAccount.deletionSequence > 1 && (
              <div><strong>Deletion #:</strong> {deletedAccount.deletionSequence}</div>
            )}
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>What would you like to do?</strong>
          </p>
          <p className="text-sm text-blue-700 mt-1">
            You can recover your deleted account (with all your data) or create a completely new account.
          </p>
        </div>
        
        <div className="space-y-3">
          {deletedAccount.canRecover && (
            <button
              onClick={handleRecoverAccount}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              🔄 Recover My Deleted Account
            </button>
          )}
          
          <button
            onClick={handleProceedWithNew}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            ✨ Create New Account
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
        
        <div className="mt-6 text-xs text-gray-500">
          <p><strong>Note:</strong> If you create a new account, it will be completely separate from your deleted account.</p>
          <p>All your previous data, events, and history will remain with the deleted account.</p>
        </div>
      </div>
    </div>
  );
};

export default RecentlyDeletedAccountModal;
