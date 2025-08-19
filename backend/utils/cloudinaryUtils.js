const { cloudinary } = require('../config/cloudinary');

/**
 * Extract public ID from Cloudinary URL
 * @param {string} cloudinaryUrl - The Cloudinary URL
 * @returns {string|null} - The public ID or null if not found
 */
function extractPublicIdFromUrl(cloudinaryUrl) {
  if (!cloudinaryUrl || typeof cloudinaryUrl !== 'string') {
    return null;
  }

  try {
    // Handle different Cloudinary URL formats
    const url = new URL(cloudinaryUrl);
    
    // Extract path segments
    const pathSegments = url.pathname.split('/').filter(segment => segment);
    
    // Find the upload segment and get the public ID
    const uploadIndex = pathSegments.findIndex(segment => segment === 'upload');
    if (uploadIndex !== -1 && uploadIndex + 1 < pathSegments.length) {
      // Get everything after 'upload'
      const afterUpload = pathSegments.slice(uploadIndex + 1);
      // Drop version segment if present (e.g., v1701234567)
      const first = afterUpload[0];
      const restSegments = /^v\d+$/.test(first) ? afterUpload.slice(1) : afterUpload;
      if (restSegments.length === 0) return null;
      // Join remaining and strip extension
      const withoutExt = restSegments.join('/').replace(/\.[^/.]+$/, '');
      return withoutExt;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting public ID from URL:', error);
    return null;
  }
}

/**
 * Delete file from Cloudinary
 * @param {string} cloudinaryUrl - The Cloudinary URL
 * @param {string} resourceType - The resource type (image, video, raw, etc.)
 * @returns {Promise<Object>} - The deletion result
 */
async function deleteFromCloudinary(cloudinaryUrl, resourceType = 'image') {
  try {
    const publicId = extractPublicIdFromUrl(cloudinaryUrl);
    if (!publicId) {
      throw new Error('Could not extract public ID from Cloudinary URL');
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    console.log(`✅ Deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
}

/**
 * Check if a URL is a Cloudinary URL
 * @param {string} url - The URL to check
 * @returns {boolean} - True if it's a Cloudinary URL
 */
function isCloudinaryUrl(url) {
  return url && typeof url === 'string' && url.includes('cloudinary.com');
}

/**
 * Get optimized image URL with transformations
 * @param {string} cloudinaryUrl - The original Cloudinary URL
 * @param {Object} options - Transformation options
 * @returns {string} - The optimized URL
 */
function getOptimizedImageUrl(cloudinaryUrl, options = {}) {
  try {
    const publicId = extractPublicIdFromUrl(cloudinaryUrl);
    if (!publicId) {
      return cloudinaryUrl; // Return original if we can't extract public ID
    }

    const defaultOptions = {
      quality: 'auto',
      fetch_format: 'auto',
      ...options
    };

    return cloudinary.url(publicId, defaultOptions);
  } catch (error) {
    console.error('Error generating optimized URL:', error);
    return cloudinaryUrl; // Return original on error
  }
}

module.exports = {
  extractPublicIdFromUrl,
  deleteFromCloudinary,
  isCloudinaryUrl,
  getOptimizedImageUrl
};
