import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import GoogleOAuthButton from './GoogleOAuthButton';
import RoleSelectionModal from './RoleSelectionModal';
import OAuthRegistrationForm from './OAuthRegistrationForm';
import AccountLinkingModal from './AccountLinkingModal';
import { googleOAuthCallback, linkOAuthAccount, completeOAuthRegistration } from '../../api/oauth';
import { Link } from 'react-router-dom';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // OAuth states
  const [oauthData, setOauthData] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [existingUser, setExistingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Dispatch custom event to notify other components about user data update
      window.dispatchEvent(new CustomEvent('userDataUpdated', {
        detail: { user: res.data.user }
      }));

      if (res.data.user.role === 'organizer') {
        navigate('/organizer/dashboard');
      } else {
        navigate('/volunteer/dashboard');
      }
    } catch (err) {
      // Check if it's a deleted account error
      if (err.response?.data?.code === 'ACCOUNT_DELETED') {
        setError(
          <div>
            <p className="text-red-600 mb-2">{err.response.data.message}</p>
            <Link 
              to="/recover-account" 
              className="text-blue-600 hover:text-blue-500 underline text-sm"
            >
              Click here to recover your account
            </Link>
          </div>
        );
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async (token) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await googleOAuthCallback(token);
      
      if (response.action === 'login') {
        // User exists with OAuth - login directly
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Dispatch custom event to notify other components about user data update
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { user: response.user }
        }));
        
        if (response.user.role === 'organizer') {
          navigate('/organizer/dashboard');
        } else {
          navigate('/volunteer/dashboard');
        }
      } else if (response.action === 'link_account') {
        // User exists with email but no OAuth - show linking modal
        setOauthData(response.oauthData);
        setExistingUser(response.existingUser);
        setShowLinkingModal(true);
      } else if (response.action === 'register') {
        // New user - show role selection
        setOauthData(response.oauthData);
        setShowRoleModal(true);
      }
    } catch (error) {
      // Check if it's a deleted account error
      if (error.response?.data?.code === 'ACCOUNT_DELETED') {
        setError(
          <div>
            <p className="text-red-600 mb-2">{error.response.data.message}</p>
            <Link 
              to="/recover-account" 
              className="text-blue-600 hover:text-blue-500 underline text-sm"
            >
              Click here to recover your account
            </Link>
          </div>
        );
      } else {
        setError(error.message || 'OAuth authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowRoleModal(false);
    setShowRegistrationForm(true);
  };

  const handleRegistrationComplete = async (userData) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await completeOAuthRegistration(userData);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Dispatch custom event to notify other components about user data update
      window.dispatchEvent(new CustomEvent('userDataUpdated', {
        detail: { user: response.user }
      }));
      
      if (response.user.role === 'organizer') {
        navigate('/organizer/dashboard');
      } else {
        navigate('/volunteer/dashboard');
      }
    } catch (error) {
      // Check if it's a recently deleted account error
      if (error.response?.data?.errorType === 'RECENTLY_DELETED_ACCOUNT') {
        setError(
          <div>
            <p className="text-red-600 mb-2">{error.response.data.message}</p>
            <p className="text-sm text-gray-600 mb-2">
              Account: {error.response.data.deletedAccount.username} ({error.response.data.deletedAccount.role})
            </p>
            <div className="space-y-2">
              <Link 
                to="/recover-account" 
                className="block text-blue-600 hover:text-blue-500 underline text-sm"
              >
                🔄 Recover your deleted account
              </Link>
              <p className="text-xs text-gray-500">
                Or use a different email address for a new account
              </p>
            </div>
          </div>
        );
      } else {
        setError(error.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToRoleSelection = () => {
    setShowRegistrationForm(false);
    setShowRoleModal(true);
  };

  const handleLinkAccount = async () => {
    try {
      const response = await linkOAuthAccount({
        userId: existingUser._id,
        oauthId: oauthData.oauthId,
        name: oauthData.name,
        email: oauthData.email,
        picture: oauthData.picture || null
      });
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Dispatch custom event to notify other components about user data update
      window.dispatchEvent(new CustomEvent('userDataUpdated', {
        detail: { user: response.user }
      }));
      
      if (response.user.role === 'organizer') {
        navigate('/organizer/dashboard');
      } else {
        navigate('/volunteer/dashboard');
      }
    } catch (error) {
      setError(error.message || 'Account linking failed');
    }
  };

  const handleCreateNewAccount = () => {
    setShowLinkingModal(false);
    setShowRoleModal(true);
  };

  return (
    <>
      <Box
        component="form"
        onSubmit={handleLogin}
        maxWidth={400}
        mx="auto"
        mt={5}
        p={3}
        boxShadow={3}
        borderRadius={2}
        bgcolor="white"
      >
        <Typography variant="h5" mb={2} fontWeight="bold" color="primary">
          Login
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          margin="normal"
        />

        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          margin="normal"
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </Button>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Divider sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">OR</Typography>
          </Divider>
          
          <GoogleOAuthButton
            onSuccess={handleGoogleOAuth}
            onError={(error) => setError(error.message || 'Google OAuth failed')}
            disabled={loading}
          />
          
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              New user?{' '}
              <Button 
                variant="text" 
                size="small" 
                onClick={() => navigate('/signup')}
                sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
              >
                Create an account
              </Button>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              <Button 
                variant="text" 
                size="small" 
                onClick={() => navigate('/forgot-password')}
                sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
              >
                Forgot your password?
              </Button>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              <Button 
                variant="text" 
                size="small" 
                onClick={() => navigate('/recover-account')}
                sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
              >
                Recover deleted account?
              </Button>
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Role Selection Modal */}
      <RoleSelectionModal
        open={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onRoleSelect={handleRoleSelect}
        oauthData={oauthData}
      />

      {/* OAuth Registration Form */}
      <OAuthRegistrationForm
        open={showRegistrationForm}
        onClose={() => setShowRegistrationForm(false)}
        oauthData={oauthData}
        role={selectedRole}
        onSubmit={handleRegistrationComplete}
        onBack={handleBackToRoleSelection}
      />

      {/* Account Linking Modal */}
      <AccountLinkingModal
        open={showLinkingModal}
        onClose={() => setShowLinkingModal(false)}
        existingUser={existingUser}
        oauthData={oauthData}
        onLinkAccount={handleLinkAccount}
      />
    </>
  );
}
