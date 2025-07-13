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

  const navigate = useNavigate();
  const cityOptions = ["Mumbai", "Pune", "Delhi", "Bangalore", "Hyderabad", "Chennai"];

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
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
