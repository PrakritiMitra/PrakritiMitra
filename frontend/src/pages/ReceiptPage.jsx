import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import ReceiptDisplay from '../components/receipt/ReceiptDisplay';
import { getReceiptById } from '../api/receipt';

const ReceiptPage = () => {
  const { receiptId } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getReceiptById(receiptId);
        setReceipt(response.receipt);
      } catch (error) {
        console.error('Error fetching receipt:', error);
        setError('Failed to load receipt. Please check the receipt ID and try again.');
      } finally {
        setLoading(false);
      }
    };

    if (receiptId) {
      fetchReceipt();
    }
  }, [receiptId]);

  const handleDownload = async (receiptId) => {
    try {
      // TODO: Implement PDF download
      alert('PDF download feature coming soon!');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = (receiptId) => {
    // TODO: Implement sharing functionality
    const shareUrl = `${window.location.origin}/receipt/${receiptId}`;
    if (navigator.share) {
      navigator.share({
        title: 'Payment Receipt',
        text: 'View my payment receipt',
        url: shareUrl
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Receipt link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Payment Receipt
        </Typography>
      </Box>

      <ReceiptDisplay
        receipt={receipt}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onShare={handleShare}
      />
    </Box>
  );
};

export default ReceiptPage; 