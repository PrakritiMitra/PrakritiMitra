// backend/middleware/upload.js

const multer = require('multer');
const path = require('path');

// Store in ./uploads directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/OrganizationDetails'); // Ensure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// For organization registration: support multiple files
const multiUpload = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'ngoRegistration', maxCount: 1 },
  { name: 'letterOfIntent', maxCount: 1 },
]);

module.exports = { upload, multiUpload };
