// backend/middleware/upload.js

const multer = require('multer');
const { 
  organizationStorage, 
  profileStorage, 
  eventStorage, 
  chatStorage, 
  certificateStorage, 
  qrCodeStorage 
} = require('../config/cloudinary');

// Create separate upload instances with Cloudinary storage
const organizationUpload = multer({ storage: organizationStorage });
const eventUpload = multer({ storage: eventStorage });
const profileUpload = multer({ storage: profileStorage });
const chatUpload = multer({ storage: chatStorage });
const certificateUpload = multer({ storage: certificateStorage });
const qrCodeUpload = multer({ storage: qrCodeStorage });

// For organization registration: support multiple files
const multiUpload = organizationUpload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'ngoRegistration', maxCount: 1 },
  { name: 'letterOfIntent', maxCount: 1 },
]);

// For profile uploads: support profile image and government ID proof
const profileMultiUpload = profileUpload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'govtIdProof', maxCount: 1 },
]);

// For single profile image upload (for volunteer signup)
const profileSingleUpload = profileUpload.single('profileImage');

// For event uploads: support event images and government approval letter
const eventMultiUpload = eventUpload.fields([
  { name: 'eventImages', maxCount: 5 },
  { name: 'govtApprovalLetter', maxCount: 1 },
]);

// For chat file uploads
const chatSingleUpload = chatUpload.single('file');

// For certificate uploads
const certificateSingleUpload = certificateUpload.single('certificate');

// For QR code uploads
const qrCodeSingleUpload = qrCodeUpload.single('qrcode');

// Legacy support - keep old function names for backward compatibility
const completedEventUpload = eventUpload; // Use event storage for completed events

module.exports = {
  organizationUpload,
  eventUpload,
  profileUpload,
  multiUpload,
  eventMultiUpload,
  profileMultiUpload,
  profileSingleUpload,
  chatUpload: chatSingleUpload, // Export as single upload for chat
  completedEventUpload,
  certificateUpload: certificateSingleUpload,
  qrCodeUpload: qrCodeSingleUpload,
};
