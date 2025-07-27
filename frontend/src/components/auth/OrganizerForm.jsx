import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  Typography,
  Box,
} from "@mui/material";

export default function OrganizerForm() {
  const [formData, setFormData] = useState({
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
  });

  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: ''
  });

  const [usernameError, setUsernameError] = useState('');

  const navigate = useNavigate();
  const cityOptions = ["Mumbai", "Pune", "Delhi", "Bangalore", "Hyderabad", "Chennai"];

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
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

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // Validate username before submission
    if (usernameError) {
      alert("Please fix the username errors before submitting.");
      return;
    }

    if (!formData.username || formData.username.length < 3) {
      alert("Username must be at least 3 characters long.");
      return;
    }

    try {
      const data = new FormData();
      for (const key in formData) {
        if (formData[key]) {
          data.append(key, formData[key]);
        }
      }

      const response = await axios.post(
        "http://localhost:5000/api/auth/signup-organizer",
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("Signup successful!");
      console.log(response.data);
      navigate("/login");
    } catch (err) {
      alert("Signup failed.");
      console.error(err);
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

      <Button type="submit" variant="contained" color="success" fullWidth sx={{ mt: 3 }}>
        Sign Up
      </Button>
    </Box>
  );
}
