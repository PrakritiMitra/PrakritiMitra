import React from 'react';
import { ToastContainer as ReactToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Custom toast functions with consistent styling
export const showToast = {
  success: (message, options = {}) => {
    return toast.success(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: '#10B981',
        color: 'white',
        fontWeight: '500',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      ...options
    });
  },
  
  error: (message, options = {}) => {
    return toast.error(message, {
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: '#EF4444',
        color: 'white',
        fontWeight: '500',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      ...options
    });
  },
  
  warning: (message, options = {}) => {
    return toast.warning(message, {
      position: "top-right",
      autoClose: 3500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: '#F59E0B',
        color: 'white',
        fontWeight: '500',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      ...options
    });
  },
  
  info: (message, options = {}) => {
    return toast.info(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        background: '#3B82F6',
        color: 'white',
        fontWeight: '500',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      ...options
    });
  }
};

// Main ToastContainer component
const ToastContainer = () => {
  return (
    <ReactToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      toastStyle={{
        margin: '8px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
      }}
    />
  );
};

export default ToastContainer;
