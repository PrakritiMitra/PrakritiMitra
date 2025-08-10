import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Box,
  Divider,
  Alert,
  Snackbar,
  IconButton,
  InputAdornment
} from "@mui/material";
import { Visibility, VisibilityOff } from '@mui/icons-material';

export default function OrganizerForm() {
  const initialFormState = {
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    age: "",
    city: "",
    dateOfBirth: "",
    gender: "",
    profileImage: null,
    govtIdProof: null,
    organization: "",
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
      city: "",
      organization: "",
      position: "",
      govtIdProof: null,
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
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' // 'success', 'error', 'warning', 'info'
  });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const navigate = useNavigate();
  const cityOptions = ["Mumbai", "Pune", "Delhi", "Bangalore", "Hyderabad", "Chennai"];

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    
    console.log(`🖊️ Field changed: ${name} = ${value}`, { 
      type,
      hasFiles: !!files,
      currentError: error
    });
    
    // Clear any existing error when user starts typing
    if (name === 'email' && error) {
      console.log('🧹 Clearing email error as user types');
      setError('');
    }

    if (type === "file") {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
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
    console.log('📝 Form submission started', { 
      email: formData.email,
      username: formData.username,
      hasPassword: !!formData.password,
      hasConfirmPassword: !!formData.confirmPassword
    });
    
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
      setError("Passwords do not match");
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
      data.append(key, formData[key]);
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/signup-organizer",
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
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
        if (err.response.status === 400) {
          if (err.response.data.errorType === 'EMAIL_EXISTS' || 
              (err.response.data.message && err.response.data.message.includes('already exists'))) {
            
            setError('An account with this email already exists. Please use a different email or try logging in.');
            
            // Clear just the email and password fields to make it easy to retry
            setFormData(prev => {
              const newState = {
                ...prev,
                email: '',
                password: '',
                confirmPassword: ''
              };
              return newState;
            });
          } else {
            // For other validation errors, show error but keep form data
            console.log('⚠️ Validation error:', err.response.data.message);
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
      
      // Show error in console for debugging
      console.error('Signup error details:', err);
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Organizer Signup
      </Typography>

      <TextField fullWidth margin="normal" name="name" label="Full Name" value={formData.name} onChange={handleChange} required />
      
      <TextField 
        fullWidth 
        margin="normal" 
        name="username" 
        label="Username" 
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
      
      <TextField fullWidth margin="normal" name="email" label="Email" type="email" value={formData.email} onChange={handleChange} required />
      <TextField fullWidth margin="normal" name="password" label="Password" type="password" value={formData.password} onChange={handleChange} required />
      <TextField fullWidth margin="normal" name="confirmPassword" label="Confirm Password" type="password" value={formData.confirmPassword} onChange={handleChange} required />
      <TextField fullWidth margin="normal" name="phone" label="Phone Number" value={formData.phone} onChange={handleChange} required />

      <FormControl fullWidth margin="normal">
        <InputLabel>City</InputLabel>
        <Select name="city" value={formData.city} onChange={handleChange} label="City" required>
          {cityOptions.map((city) => (
            <MenuItem key={city} value={city}>{city}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField fullWidth margin="normal" name="dateOfBirth" label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={handleChange} InputLabelProps={{ shrink: true }} required />

      <FormControl fullWidth margin="normal">
        <InputLabel>Gender</InputLabel>
        <Select name="gender" value={formData.gender} onChange={handleChange} label="Gender" required>
          <MenuItem value="male">Male</MenuItem>
          <MenuItem value="female">Female</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </Select>
      </FormControl>

      <Box mt={2}>
        <Typography variant="subtitle1">Upload Profile Image</Typography>
        <input type="file" accept="image/*" name="profileImage" onChange={handleChange} />
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1">Upload Govt ID Proof (Image/PDF)</Typography>
        <input type="file" accept="image/*,.pdf" name="govtIdProof" onChange={handleChange} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button 
        type="submit" 
        variant="contained" 
        color="primary" 
        fullWidth 
        sx={{ mt: 2 }}
        disabled={loading}
      >
        {loading ? 'Signing up...' : 'Sign Up as Organizer'}
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
