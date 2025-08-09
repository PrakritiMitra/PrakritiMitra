import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const AccountLinkingModal = ({ 
  open, 
  onClose, 
  existingUser, 
  oauthData, 
  onLinkAccount, 
  onCreateNewAccount 
}) => {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(''); // 'link' or 'create'

  const handleLinkAccount = async () => {
    setLoading(true);
    setAction('link');
    try {
      await onLinkAccount();
    } catch (error) {
      console.error('Account linking failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewAccount = () => {
    setAction('create');
    onCreateNewAccount();
  };

  const handleClose = () => {
    setLoading(false);
    setAction('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Typography variant="h5" fontWeight="bold" color="primary">
          Account Found
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          We found an existing account with the email {oauthData?.email}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box display="flex" gap={3} flexDirection={{ xs: 'column', md: 'row' }}>
          {/* Existing Account Card */}
          <Card 
            variant="outlined" 
            sx={{ 
              flex: 1,
              border: '2px solid #1976d2',
              backgroundColor: '#f3f8ff'
            }}
          >
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Avatar 
                src={existingUser?.profileImage} 
                alt={existingUser?.name}
                sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
              />
              <Typography variant="h6" fontWeight="bold" mb={1}>
                {existingUser?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {existingUser?.email}
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={2}>
                <Typography variant="body2" color="primary" fontWeight="bold">
                  {existingUser?.role}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • @{existingUser?.username}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                This is your existing account. You can link your Google account to enable faster login.
              </Typography>
            </CardContent>
          </Card>

          {/* Google Account Card */}
          <Card 
            variant="outlined" 
            sx={{ 
              flex: 1,
              border: '2px solid #4285f4',
              backgroundColor: '#f8f9ff'
            }}
          >
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Avatar 
                src={oauthData?.picture || null} 
                alt={oauthData?.name}
                sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
              >
                {oauthData?.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Typography variant="h6" fontWeight="bold" mb={1}>
                {oauthData?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {oauthData?.email}
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={2}>
                <Typography variant="body2" color="#4285f4" fontWeight="bold">
                  Google Account
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                This is your Google account. You can link it to your existing account or create a new one.
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>What happens when you link accounts?</strong><br />
            • You can login with either your password or Google account<br />
            • Your profile information will be updated with Google data<br />
            • All your existing data and activities will be preserved
          </Typography>
        </Alert>

        <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
          <Button
            onClick={handleLinkAccount}
            variant="contained"
            startIcon={loading && action === 'link' ? <CircularProgress size={20} /> : <LinkIcon />}
            disabled={loading}
            fullWidth
            sx={{ 
              backgroundColor: '#1976d2',
              '&:hover': { backgroundColor: '#1565c0' }
            }}
          >
            {loading && action === 'link' ? 'Linking...' : 'Link Accounts'}
          </Button>

          <Button
            onClick={handleCreateNewAccount}
            variant="outlined"
            startIcon={<PersonAddIcon />}
            disabled={loading}
            fullWidth
            sx={{ 
              borderColor: '#4285f4',
              color: '#4285f4',
              '&:hover': { 
                borderColor: '#1976d2',
                backgroundColor: '#f3f8ff'
              }
            }}
          >
            Create New Account
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountLinkingModal;
