import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Box, Button, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const GoogleOAuthButton = ({ onSuccess, onError, disabled = false }) => {
  const handleSuccess = async (credentialResponse) => {
    try {
      onSuccess(credentialResponse.credential);
    } catch (error) {
      console.error('Google OAuth Error:', error);
      onError(error);
    }
  };

  const handleError = (error) => {
    console.error('Google OAuth Error:', error);
    onError(error);
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        disabled={disabled}
        useOneTap={false}
        theme="outline"
        size="large"
        text="continue_with"
        shape="rectangular"
        locale="en"
        style={{
          width: '100%',
          height: '48px',
          borderRadius: '8px',
          border: '1px solid #ddd',
          backgroundColor: '#fff',
          color: '#333',
          fontSize: '16px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      />
    </Box>
  );
};

export default GoogleOAuthButton;
