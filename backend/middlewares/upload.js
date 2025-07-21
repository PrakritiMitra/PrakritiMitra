// backend/middleware/upload.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Organization storage - store in ./uploads/OrganizationDetails
const organizationStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/OrganizationDetails';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Event storage - store in ./uploads/Events
const eventStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/Events';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Create separate upload instances
const organizationUpload = multer({ storage: organizationStorage });
const eventUpload = multer({ storage: eventStorage });

// For organization registration: support multiple files
const multiUpload = organizationUpload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'ngoRegistration', maxCount: 1 },
  { name: 'letterOfIntent', maxCount: 1 },
]);

// Profile storage - store in ./uploads/Profiles
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/Profiles';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const profileUpload = multer({ storage: profileStorage });

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

// Chat storage - store in ./uploads/Chat
const chatStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/Chat';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const chatUpload = multer({ storage: chatStorage });

module.exports = {
  organizationUpload,
  eventUpload,
  profileUpload,
  multiUpload,
  eventMultiUpload,
  profileMultiUpload,
  profileSingleUpload,
  chatUpload, // <-- Export chat upload
};
