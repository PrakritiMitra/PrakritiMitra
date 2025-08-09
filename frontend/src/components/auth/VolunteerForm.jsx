import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import GoogleOAuthButton from './GoogleOAuthButton';
import RoleSelectionModal from './RoleSelectionModal';
import OAuthRegistrationForm from './OAuthRegistrationForm';
import AccountLinkingModal from './AccountLinkingModal';
import { googleOAuthCallback, completeOAuthRegistration, linkOAuthAccount } from '../../api/oauth';

export default function VolunteerForm() {
  const [formData, setFormData] = useState({
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
  });

  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: ''
  });

  const [usernameError, setUsernameError] = useState('');
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
  const interestsOptions = ['Beach Cleanup', 'Waste Segregation', 'Plastic Collection', 'Awareness Drives'];
  const cityOptions = ['Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'];

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
      setError(error.message || 'OAuth authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowRoleModal(false);
    setShowRegistrationForm(true);
  };

  const handleOAuthRegistration = async (userData) => {
    try {
      setLoading(true);
      const response = await completeOAuthRegistration({
        ...userData,
        role: selectedRole,
        oauthData
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
      setError(error.message || 'Registration failed. Please try again.');
      setShowRegistrationForm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccount = async (password) => {
    try {
      setLoading(true);
      const response = await linkOAuthAccount({
        email: existingUser.email,
        password,
        oauthData
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
      setError(error.message || 'Account linking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
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

      alert('Signup successful! Please login with your credentials.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Volunteer Signup
      </Typography>
      
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

      <Box sx={{ my: 2, textAlign: 'center' }}>
        <Divider sx={{ mb: 2 }}>OR</Divider>
        <GoogleOAuthButton 
          onSuccess={handleGoogleOAuth} 
          onError={(error) => setError(error.message || 'Google sign in failed')}
          disabled={loading}
        />
      </Box>
        
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

      {/* OAuth Modals */}
      <RoleSelectionModal
        open={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSelectRole={handleRoleSelect}
      />

      <OAuthRegistrationForm
        open={showRegistrationForm}
        onClose={() => setShowRegistrationForm(false)}
        onSubmit={handleOAuthRegistration}
        oauthData={oauthData}
        role={selectedRole}
        loading={loading}
      />

      <AccountLinkingModal
        open={showLinkingModal}
        onClose={() => setShowLinkingModal(false)}
        onSubmit={handleLinkAccount}
        email={existingUser?.email}
        loading={loading}
      />
    </Box>
  );
}
