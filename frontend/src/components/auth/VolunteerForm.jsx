import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import RecentlyDeletedAccountModal from './RecentlyDeletedAccountModal';
import GoogleOAuthButton from './GoogleOAuthButton';
import RoleSelectionModal from './RoleSelectionModal';
import OAuthRegistrationForm from './OAuthRegistrationForm';
import AccountLinkingModal from './AccountLinkingModal';
import { googleOAuthCallback, linkOAuthAccount, completeOAuthRegistration } from '../../api/oauth';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  InputLabel,
  FormControl,
  Select,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Typography,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';

export default function VolunteerForm() {
  const initialFormState = {
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    age: '',
    city: '',
    dateOfBirth: '',
    gender: '',
    interests: [],
    profileImage: null,
  };

  const resetForm = () => {
    const initialState = {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      interests: [],
      city: "",
      profileImage: null,
    };
    setFormData(initialState);
    setError('');
    setUsernameStatus({
      checking: false,
      available: null,
      message: ''
    });
    return initialState;
  };

  const [formData, setFormData] = useState(initialFormState);
  
  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: ''
  });

  const [usernameError, setUsernameError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameLastTyped, setUsernameLastTyped] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' // 'success', 'error', 'warning', 'info'
  });

  const [recentlyDeletedAccount, setRecentlyDeletedAccount] = useState(null);
  const [showRecentlyDeletedModal, setShowRecentlyDeletedModal] = useState(false);
  
  // OAuth states
  const [oauthData, setOauthData] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [existingUser, setExistingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleCloseRecentlyDeletedModal = () => {
    setShowRecentlyDeletedModal(false);
    setRecentlyDeletedAccount(null);
  };

  const handleProceedWithNewAccount = () => {
    // Clear the email field and allow user to proceed with new account
    setFormData(prev => ({
      ...prev,
      email: '',
      password: '',
      confirmPassword: ''
    }));
    setShowRecentlyDeletedModal(false);
    setRecentlyDeletedAccount(null);
    setError('Please use a different email address for your new account.');
  };

  const handleGoogleOAuth = async (token) => {
    console.log('🚀 VolunteerForm: OAuth started', { tokenLength: token?.length });
    setLoading(true);
    setError('');
    
    try {
      console.log('📡 VolunteerForm: Calling googleOAuthCallback...');
      const response = await googleOAuthCallback(token);
      console.log('✅ VolunteerForm: OAuth response received', { 
        action: response.action,
        hasToken: !!response.token,
        hasUser: !!response.user,
        userRole: response.user?.role
      });
      
      if (response.action === 'login') {
        console.log('🔑 VolunteerForm: User exists, logging in...');
        // User exists with OAuth - login directly
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Dispatch custom event to notify other components about user data update
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { user: response.user }
        }));
        
        if (response.user.role === 'organizer') {
          console.log('🏢 VolunteerForm: Navigating to organizer dashboard');
          navigate('/organizer/dashboard');
        } else {
          console.log('👥 VolunteerForm: Navigating to volunteer dashboard');
          navigate('/volunteer/dashboard');
        }
      } else if (response.action === 'link_account') {
        console.log('🔗 VolunteerForm: Showing account linking modal');
        // User exists with email but no OAuth - show linking modal
        setOauthData(response.oauthData);
        setExistingUser(response.existingUser);
        setShowLinkingModal(true);
      } else if (response.action === 'register') {
        console.log('📝 VolunteerForm: Showing role selection modal');
        // New user - show role selection
        setOauthData(response.oauthData);
        setShowRoleModal(true);
        console.log('🔍 VolunteerForm: Modal state set to true, oauthData:', response.oauthData);
      }
    } catch (error) {
      console.error('❌ VolunteerForm: OAuth error', { 
        error,
        response: error.response?.data,
        status: error.response?.status,
        code: error.response?.data?.code
      });
      
      // Check if it's a deleted account error
      if (error.response?.data?.code === 'ACCOUNT_DELETED') {
        console.log('🗑️ VolunteerForm: Account deleted error detected');
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
        console.log('⚠️ VolunteerForm: Generic OAuth error');
        setError(error.message || 'OAuth authentication failed');
      }
    } finally {
      console.log('🏁 VolunteerForm: OAuth flow completed');
      setLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    console.log('🎯 VolunteerForm: Role selected', { role });
    setSelectedRole(role);
    setShowRoleModal(false);
    setShowRegistrationForm(true);
    console.log('📝 VolunteerForm: Showing registration form, modal states:', { 
      showRoleModal: false, 
      showRegistrationForm: true 
    });
  };

  const handleRegistrationComplete = async (userData) => {
    console.log('📝 VolunteerForm: OAuth registration started', { userData });
    setLoading(true);
    setError('');
    
    try {
      console.log('📡 VolunteerForm: Calling completeOAuthRegistration...');
      const response = await completeOAuthRegistration(userData);
      console.log('✅ VolunteerForm: Registration completed', { 
        hasToken: !!response.token,
        hasUser: !!response.user,
        userRole: response.user?.role
      });
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Dispatch custom event to notify other components about user data update
      window.dispatchEvent(new CustomEvent('userDataUpdated', {
        detail: { user: response.user }
      }));
      
      if (response.user.role === 'organizer') {
        console.log('🏢 VolunteerForm: Navigating to organizer dashboard');
        navigate('/organizer/dashboard');
      } else {
        console.log('👥 VolunteerForm: Navigating to volunteer dashboard');
        navigate('/volunteer/dashboard');
      }
    } catch (error) {
      console.error('❌ VolunteerForm: Registration error', { 
        error,
        response: error.response?.data,
        status: error.response?.status,
        errorType: error.response?.data?.errorType
      });
      
      // Check if it's a recently deleted account error
      if (error.response?.data?.errorType === 'RECENTLY_DELETED_ACCOUNT') {
        console.log('🗑️ VolunteerForm: Recently deleted account error detected');
        setError(
          <div>
            <p className="text-red-600 mb-2">{error.response.data.message}</p>
            <p className="text-sm text-gray-600 mb-2">
              Account: {error.response.data.deletedAccount.username} ({error.response.data.deletedAccount.role})
            </p>
            <div className="space-y-2">
              <Link 
                to="/recover-account" 
                className="text-blue-600 hover:text-blue-500 underline text-sm"
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
        console.log('⚠️ VolunteerForm: Generic registration error');
        setError(error.message || 'Registration failed');
      }
    } finally {
      console.log('🏁 VolunteerForm: Registration flow completed');
      setLoading(false);
    }
  };

  const handleBackToRoleSelection = () => {
    setShowRegistrationForm(false);
    setShowRoleModal(true);
  };

  const handleLinkAccount = async () => {
    console.log('🔗 VolunteerForm: Account linking started', { 
      existingUserId: existingUser._id,
      oauthId: oauthData.oauthId,
      email: oauthData.email
    });
    
    try {
      console.log('📡 VolunteerForm: Calling linkOAuthAccount...');
      const response = await linkOAuthAccount({
        userId: existingUser._id,
        oauthId: oauthData.oauthId,
        name: oauthData.name,
        email: oauthData.email,
        picture: oauthData.picture || null
      });
      console.log('✅ VolunteerForm: Account linking completed', { 
        hasToken: !!response.token,
        hasUser: !!response.user,
        userRole: response.user?.role
      });
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Dispatch custom event to notify other components about user data update
      window.dispatchEvent(new CustomEvent('userDataUpdated', {
        detail: { user: response.user }
      }));
      
      if (response.user.role === 'organizer') {
        console.log('🏢 VolunteerForm: Navigating to organizer dashboard');
        navigate('/organizer/dashboard');
      } else {
        console.log('👥 VolunteerForm: Navigating to volunteer dashboard');
        navigate('/volunteer/dashboard');
      }
    } catch (error) {
      console.error('❌ VolunteerForm: Account linking error', { 
        error,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.message || 'Account linking failed');
    }
  };

  const navigate = useNavigate();
  const interestsOptions = ['Beach Cleanup', 'Waste Segregation', 'Plastic Collection', 'Awareness Drives'];
  const cityOptions = ['Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'];

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'checkbox' && name === 'interests') {
      setFormData((prev) => ({
        ...prev,
        interests: checked
          ? [...prev.interests, value]
          : prev.interests.filter((i) => i !== value),
      }));
    } else if (type === 'file') {
      setFormData((prev) => ({ ...prev, profileImage: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      
      // Check username availability when username field changes
      if (name === 'username') {
        // Clear any username-related errors
        setUsernameError('');
        
        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (value.length > 0 && !usernameRegex.test(value)) {
          setUsernameError('Username can only contain letters, numbers, and underscores');
          setUsernameStatus({
            checking: false,
            available: null,
            message: ''
          });
        } else if (value.length > 0 && value.length < 3) {
          setUsernameError('Username must be at least 3 characters long');
          setUsernameStatus({
            checking: false,
            available: null,
            message: ''
          });
        } else if (value.length > 30) {
          setUsernameError('Username must be 30 characters or less');
          setUsernameStatus({
            checking: false,
            available: null,
            message: ''
          });
        } else {
          setUsernameError('');
          if (value.length >= 3) {
            checkUsernameAvailability(value);
          } else {
            setUsernameStatus({
              checking: false,
              available: null,
              message: ''
            });
          }
        }
      }
    }
  };

  const checkUsernameAvailability = async (username) => {
    setUsernameStatus({ checking: true, available: null, message: '' });
    
    try {
      const response = await axios.get(`http://localhost:5000/api/user/check-username/${username}`);
      setUsernameStatus({
        checking: false,
        available: response.data.available,
        message: response.data.message
      });
    } catch (error) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: 'Error checking username availability'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate form data
    if (!formData.email || !formData.password) {
      const errorMsg = !formData.email ? 'Email is required' : 'Password is required';
      setError(errorMsg);
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    // Validate username before submission
    if (usernameError) {
      setError("Please fix the username errors before submitting.");
      setLoading(false);
      return;
    }

    if (!formData.username || formData.username.length < 3) {
      setError("Username must be at least 3 characters long.");
      setLoading(false);
      return;
    }

    const data = new FormData();
    for (const key in formData) {
      if (key === 'interests') {
        formData.interests.forEach((i) => data.append('interests[]', i));
      } else {
        data.append(key, formData[key]);
      }
    }

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/signup-volunteer',
        data,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Show success message and redirect to login
      setError('');
      setSnackbar({
        open: true,
        message: 'Signup successful! Please login with your credentials.',
        severity: 'success'
      });
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      // Handle different types of errors
      if (err.response) {
        // Server responded with an error status code
        if (err.response.status === 409 && err.response.data.errorType === 'RECENTLY_DELETED_ACCOUNT') {
          // Handle recently deleted account
          setRecentlyDeletedAccount(err.response.data.deletedAccount);
          setShowRecentlyDeletedModal(true);
          setError(''); // Clear any existing errors
        } else if (err.response.status === 400) {
          if (err.response.data.errorType === 'EMAIL_EXISTS' || 
              (err.response.data.message && err.response.data.message.includes('already exists'))) {
            
            // For duplicate email, keep the form data but show error
            setError('An account with this email already exists. Please use a different email or try logging in.');
            
            // Clear just the email and password fields to make it easy to retry
            setFormData(prev => ({
              ...prev,
              email: '',
              password: '',
              confirmPassword: ''
            }));
          } else {
            // For other validation errors, show error but keep form data
            setError(err.response.data.message || 'Validation error. Please check your input and try again.');
          }
        } else if (err.response.status === 500) {
          // Only reset form for server errors
          resetForm();
          setError('Server error. Please try again with a different email or username.');
        } else {
          setError(err.response.data?.message || 'An error occurred. Please try again.');
        }
      } else if (err.request) {
        // Request was made but no response was received
        setError('Network error. Please check your connection and try again.');
      } else {
        // Something else happened
        setError('An unexpected error occurred. Please try again.');
      }
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Volunteer Signup
      </Typography>
      
      {/* Google OAuth Button */}
      <GoogleOAuthButton 
        onSuccess={handleGoogleOAuth}
        onError={(error) => {
          console.error('❌ VolunteerForm: Google OAuth button error', { error });
          setError(error.message || 'OAuth authentication failed');
        }}
        disabled={loading}
      />
      
      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          OR
        </Typography>
      </Divider>
      
      <TextField fullWidth margin="normal" label="Full Name" name="name" value={formData.name} onChange={handleChange} required />
      
      <TextField 
        fullWidth 
        margin="normal" 
        label="Username" 
        name="username" 
        value={formData.username} 
        onChange={handleChange} 
        required 
        helperText={
          usernameError 
            ? usernameError
            : usernameStatus.checking 
            ? 'Checking availability...' 
            : usernameStatus.available === true 
            ? '✅ Username available' 
            : usernameStatus.available === false 
            ? '❌ Username not available' 
            : 'Username must be 3-30 characters, letters, numbers, and underscores only'
        }
        error={usernameError || usernameStatus.available === false}
      />
      
      <TextField fullWidth margin="normal" label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
      <TextField fullWidth margin="normal" label="Password" name="password" type="password" value={formData.password} onChange={handleChange} required />
      <TextField fullWidth margin="normal" label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required />
      <TextField fullWidth margin="normal" label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required />

      <FormControl fullWidth margin="normal">
        <InputLabel>City</InputLabel>
        <Select name="city" value={formData.city} onChange={handleChange} required label="City">
          {cityOptions.map((city) => (
            <MenuItem key={city} value={city}>{city}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        margin="normal"
        name="dateOfBirth"
        label="Date of Birth"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={formData.dateOfBirth}
        onChange={handleChange}
        required
      />

      <FormControl fullWidth margin="normal">
        <InputLabel>Gender</InputLabel>
        <Select name="gender" value={formData.gender} onChange={handleChange} required label="Gender">
          <MenuItem value="male">Male</MenuItem>
          <MenuItem value="female">Female</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </Select>
      </FormControl>

      <Box mt={2}>
        <Typography variant="subtitle1" fontWeight="medium" mb={1}>Interests</Typography>
        <FormGroup row>
          {interestsOptions.map((interest) => (
            <FormControlLabel
              key={interest}
              control={
                <Checkbox
                  name="interests"
                  value={interest}
                  checked={formData.interests.includes(interest)}
                  onChange={handleChange}
                />
              }
              label={interest}
            />
          ))}
        </FormGroup>
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1">Upload Profile Image</Typography>
        <input
          type="file"
          accept="image/*"
          name="profileImage"
          onChange={handleChange}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button 
        variant="contained" 
        color="success" 
        type="submit" 
        fullWidth 
        sx={{ mt: 2 }}
        disabled={loading}
      >
        {loading ? 'Signing up...' : 'Sign Up'}
      </Button>

      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Already a user?{' '}
          <Button 
            variant="text" 
            size="small" 
            onClick={() => navigate('/login')}
            sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
          >
            Login
          </Button>
        </Typography>
      </Box>

      {/* Snackbar for success/error messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Recently Deleted Account Modal */}
      <RecentlyDeletedAccountModal
        isOpen={showRecentlyDeletedModal}
        onClose={handleCloseRecentlyDeletedModal}
        deletedAccount={recentlyDeletedAccount}
        onProceedWithNewAccount={handleProceedWithNewAccount}
        email={formData.email}
      />

      {/* OAuth Modals */}
      {showRoleModal && (
        <RoleSelectionModal
          open={showRoleModal}
          onRoleSelect={handleRoleSelect}
          onClose={() => setShowRoleModal(false)}
          oauthData={oauthData}
        />
      )}

      {showRegistrationForm && (
        <OAuthRegistrationForm
          open={showRegistrationForm}
          oauthData={oauthData}
          role={selectedRole}
          onSubmit={handleRegistrationComplete}
          onBack={handleBackToRoleSelection}
          onClose={() => setShowRegistrationForm(false)}
        />
      )}

      {showLinkingModal && (
        <AccountLinkingModal
          open={showLinkingModal}
          existingUser={existingUser}
          oauthData={oauthData}
          onLink={handleLinkAccount}
          onClose={() => setShowLinkingModal(false)}
        />
      )}
    </Box>
  );
};
