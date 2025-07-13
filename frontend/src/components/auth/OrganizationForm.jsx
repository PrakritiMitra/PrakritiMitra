import React, { useState } from 'react';
import axios from 'axios';
import {
  Box,
  TextField,
  Button,
  Typography
} from '@mui/material';

export default function OrganizationForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: '',
    website: '',
    socialLinks: ['']
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialLinkChange = (index, value) => {
    const updatedLinks = [...formData.socialLinks];
    updatedLinks[index] = value;
    setFormData((prev) => ({ ...prev, socialLinks: updatedLinks }));
  };

  const addSocialLink = () => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, '']
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/organizations/register', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      alert('Organization registered successfully!');
      console.log(response.data);
    } catch (err) {
      alert('Failed to register organization.');
      console.error(err);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: 600,
        mx: 'auto',
        p: 4,
        backgroundColor: 'white',
        borderRadius: 2,
        boxShadow: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
    >
      <Typography variant="h5" fontWeight="bold" color="primary">
        Register New Organization
      </Typography>

      <TextField
        label="Organization Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
      />

      <TextField
        label="Brief Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        multiline
        rows={3}
        required
      />

      <TextField
        label="Logo URL (optional)"
        name="logoUrl"
        value={formData.logoUrl}
        onChange={handleChange}
        type="url"
      />

      <TextField
        label="Website URL (optional)"
        name="website"
        value={formData.website}
        onChange={handleChange}
        type="url"
      />

      <Typography fontWeight="medium">Social Media Links</Typography>
      {formData.socialLinks.map((link, index) => (
        <TextField
          key={index}
          label={`Link #${index + 1}`}
          value={link}
          onChange={(e) => handleSocialLinkChange(index, e.target.value)}
          type="url"
        />
      ))}

      <Button onClick={addSocialLink} variant="text" color="primary">
        + Add Another Link
      </Button>

      <Button type="submit" variant="contained" color="primary">
        Submit
      </Button>
    </Box>
  );
}
