const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const dotenv = require('dotenv');

// Ensure environment variables are loaded even if process.cwd() is not backend
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage configuration for different file types
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'prakriti-mitra',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
  },
});

// Organization storage - for logos and documents (supports images and PDFs)
const organizationStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'prakriti-mitra/organizations',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    resource_type: 'auto',
  },
});

// Profile storage - for user profile images
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'prakriti-mitra/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' }
    ],
  },
});

// Event storage - for event images and letters (supports images and PDFs)
const eventStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'prakriti-mitra/events',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    resource_type: 'auto',
  },
});

// Chat storage - for chat files (supports images and documents)
const chatStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'prakriti-mitra/chat',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt'],
    resource_type: 'auto',
  },
});

// Certificate storage - for generated PDFs
const certificateStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'prakriti-mitra/certificates',
    allowed_formats: ['pdf'],
    resource_type: 'raw',
  },
});

// QR Code storage - for generated QR codes
const qrCodeStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'prakriti-mitra/qrcodes',
    allowed_formats: ['png'],
    transformation: [{ width: 300, height: 300, crop: 'fill' }],
  },
});

// Helper function to get optimized image URL
const getOptimizedImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: 'auto',
    fetch_format: 'auto',
    ...options
  };
  
  return cloudinary.url(publicId, defaultOptions);
};

// Helper function to delete file from Cloudinary
const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

// Helper function to upload file to Cloudinary
const uploadFile = async (file, folder = 'prakriti-mitra/general') => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: folder,
      resource_type: 'auto',
      transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    });
    return result;
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  cloudinaryStorage,
  organizationStorage,
  profileStorage,
  eventStorage,
  chatStorage,
  certificateStorage,
  qrCodeStorage,
  getOptimizedImageUrl,
  deleteFile,
  uploadFile,
};
