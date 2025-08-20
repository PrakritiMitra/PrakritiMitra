const cloudinary = require('../config/cloudinary');

// Upload file to Cloudinary
const uploadToCloudinary = async (file, folder = 'general') => {
  try {
    // Validate file
    if (!file || !file.buffer) {
      throw new Error('Invalid file object or missing buffer');
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit');
    }
    
    // Convert buffer to base64 string
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    
    console.log(`📤 Starting Cloudinary upload for ${file.originalname} to folder: ${folder}`);
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
      transformation: [
        { quality: 'auto:good' }, // Optimize quality
        { fetch_format: 'auto' }  // Auto-format for web
      ]
    });
    
    console.log(`✅ Cloudinary upload successful: ${result.public_id} (${result.bytes} bytes)`);
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      filename: file.originalname || `file.${result.format}`,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error('No public ID provided for deletion');
    }
    
    console.log(`🗑️ Deleting file from Cloudinary: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      console.log(`✅ Successfully deleted file from Cloudinary: ${publicId}`);
      return {
        success: true,
        message: result.result
      };
    } else {
      console.warn(`⚠️ Cloudinary deletion returned unexpected result: ${result.result}`);
      return {
        success: false,
        error: `Unexpected result: ${result.result}`
      };
    }
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get optimized image URL
const getOptimizedImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: 'auto:good',
    fetch_format: 'auto',
    ...options
  };
  
  return cloudinary.url(publicId, defaultOptions);
};

// Get file info from Cloudinary URL
const getFileInfoFromUrl = (url) => {
  try {
    // Extract public ID from Cloudinary URL
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    if (uploadIndex === -1) return null;
    
    const publicId = urlParts.slice(uploadIndex + 2).join('/').split('.')[0];
    return {
      publicId,
      url: url
    };
  } catch (error) {
    console.error('Error parsing Cloudinary URL:', error);
    return null;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedImageUrl,
  getFileInfoFromUrl
};
