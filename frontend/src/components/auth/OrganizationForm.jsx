import React, { useState } from 'react';
import axios from 'axios';
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Divider
} from '@mui/material';

const FOCUS_AREAS = [
  'Environment',
  'Education',
  'Health',
  'Women Empowerment',
  'Animal Welfare',
  'Rural Development',
  'Other'
];

function getFilePreview(file) {
  if (!file) return null;
  if (file.type.startsWith('image/')) {
    return <img src={URL.createObjectURL(file)} alt="preview" style={{ maxWidth: 120, maxHeight: 120, marginTop: 8, borderRadius: 8 }} />;
  }
  if (file.type === 'application/pdf') {
    return <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{file.name}</Typography>;
  }
  return <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{file.name}</Typography>;
}

export default function OrganizationForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    socialLinks: [''],
    headOfficeLocation: '',
    orgEmail: '',
    visionMission: '',
    orgPhone: '',
    yearOfEstablishment: '',
    focusArea: '',
    focusAreaOther: '',
  });
  const [files, setFiles] = useState({
    logo: null,
    gstCertificate: null,
    panCard: null,
    ngoRegistration: null,
    letterOfIntent: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    setFiles((prev) => ({ ...prev, [name]: fileList[0] }));
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
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'socialLinks') {
          data.append('socialLinks', JSON.stringify(value));
        } else {
          data.append(key, value);
        }
      });
      Object.entries(files).forEach(([key, file]) => {
        if (file) data.append(key, file);
      });
      const response = await axios.post('/api/organizations/register', data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true
      });
      alert('Organization registered successfully!');
      console.log(response.data);
    } catch (err) {
      if (err.response && err.response.status === 409) {
        alert('An organization with this name already exists. Please choose a different name.');
      } else {
        alert('Failed to register organization. Please check your network or try again.');
      }
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
      encType="multipart/form-data"
    >
      <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>
        Register New Organization
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Basic Info Section */}
      <Typography variant="subtitle1" fontWeight="bold">Basic Information</Typography>
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
        label="Website URL (optional)"
        name="website"
        value={formData.website}
        onChange={handleChange}
        type="url"
      />

      <Divider sx={{ my: 2 }} />
      {/* Contact Section */}
      <Typography variant="subtitle1" fontWeight="bold">Contact & Details</Typography>
      <TextField
        label="Head Office Location"
        name="headOfficeLocation"
        value={formData.headOfficeLocation}
        onChange={handleChange}
        required
      />
      <TextField
        label="Organization Email"
        name="orgEmail"
        value={formData.orgEmail}
        onChange={handleChange}
        type="email"
        required
      />
      <TextField
        label="Organization Phone"
        name="orgPhone"
        value={formData.orgPhone}
        onChange={handleChange}
        type="tel"
        required
      />
      <TextField
        label="Year of Establishment"
        name="yearOfEstablishment"
        value={formData.yearOfEstablishment}
        onChange={handleChange}
        type="number"
        required
      />

      <Divider sx={{ my: 2 }} />
      {/* Vision & Focus Area Section */}
      <Typography variant="subtitle1" fontWeight="bold">Vision & Focus Area</Typography>
      <TextField
        label="Vision & Mission"
        name="visionMission"
        value={formData.visionMission}
        onChange={handleChange}
        multiline
        rows={3}
        required
      />
      <TextField
        select
        label="Focus Area"
        name="focusArea"
        value={formData.focusArea}
        onChange={handleChange}
        required
      >
        {FOCUS_AREAS.map((area) => (
          <MenuItem key={area} value={area}>{area}</MenuItem>
        ))}
      </TextField>
      {formData.focusArea === 'Other' && (
        <TextField
          label="Please specify Focus Area"
          name="focusAreaOther"
          value={formData.focusAreaOther}
          onChange={handleChange}
          required
        />
      )}

      <Divider sx={{ my: 2 }} />
      {/* Social Links Section */}
      <Typography variant="subtitle1" fontWeight="bold">Social Media Links</Typography>
      {formData.socialLinks.map((link, index) => (
        <TextField
          key={index}
          label={`Link #${index + 1}`}
          value={link}
          onChange={(e) => handleSocialLinkChange(index, e.target.value)}
          type="url"
          sx={{ mb: 1 }}
        />
      ))}
      <Button onClick={addSocialLink} variant="text" color="primary" sx={{ width: 'fit-content', mb: 2 }}>
        + Add Another Link
      </Button>

      <Divider sx={{ my: 2 }} />
      {/* Documents Section */}
      <Typography variant="subtitle1" fontWeight="bold">Upload Documents</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Button
            variant="outlined"
            component="label"
            sx={{ textAlign: 'left', justifyContent: 'flex-start', width: '100%' }}
          >
            Upload Logo (Image/PDF)
            <input
              type="file"
              name="logo"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          {getFilePreview(files.logo)}
        </Box>
        <Box>
          <Button
            variant="outlined"
            component="label"
            sx={{ textAlign: 'left', justifyContent: 'flex-start', width: '100%' }}
          >
            GST Certificate (Image/PDF)
            <input
              type="file"
              name="gstCertificate"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          {getFilePreview(files.gstCertificate)}
        </Box>
        <Box>
          <Button
            variant="outlined"
            component="label"
            sx={{ textAlign: 'left', justifyContent: 'flex-start', width: '100%' }}
          >
            PAN Card (Image/PDF)
            <input
              type="file"
              name="panCard"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          {getFilePreview(files.panCard)}
        </Box>
        <Box>
          <Button
            variant="outlined"
            component="label"
            sx={{ textAlign: 'left', justifyContent: 'flex-start', width: '100%' }}
          >
            NGO Registration Certificate (Image/PDF)
            <input
              type="file"
              name="ngoRegistration"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          {getFilePreview(files.ngoRegistration)}
        </Box>
        <Box>
          <Button
            variant="outlined"
            component="label"
            sx={{ textAlign: 'left', justifyContent: 'flex-start', width: '100%' }}
          >
            Letter of Intent (Image/PDF)
            <input
              type="file"
              name="letterOfIntent"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          {getFilePreview(files.letterOfIntent)}
        </Box>
      </Box>

      <Button type="submit" variant="contained" color="primary" sx={{ mt: 3 }}>
        Submit
      </Button>
    </Box>
  );
}
