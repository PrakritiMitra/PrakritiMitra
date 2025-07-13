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
} from '@mui/material';

export default function VolunteerForm() {
  const [formData, setFormData] = useState({
    name: '',
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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
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

      alert('Signup successful!');
      console.log(response.data);
      navigate('/login');
    } catch (err) {
      alert('Signup failed.');
      console.error(err);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Volunteer Signup
      </Typography>
      
      <TextField fullWidth margin="normal" label="Full Name" name="name" value={formData.name} onChange={handleChange} required />
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

      <Button variant="contained" color="success" type="submit" fullWidth sx={{ mt: 3 }}>
        Sign Up
      </Button>
    </Box>
  );
}
