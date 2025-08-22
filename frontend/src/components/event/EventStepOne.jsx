// src/components/event/EventStepOne.jsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  TextField,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  FormGroup,
  Alert,
  Chip,
} from "@mui/material";
import LocationPicker from './LocationPicker'; // Make sure this path is correct
import TimeSlotBuilder from './TimeSlotBuilder';
import { showAlert } from "../../utils/notifications";
import axiosInstance from "../../api/axiosInstance"; 

// CSS animations for enhanced UI
const spinAnimation = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject CSS if not already present
if (!document.getElementById('event-step-one-styles')) {
  const style = document.createElement('style');
  style.id = 'event-step-one-styles';
  style.textContent = spinAnimation;
  document.head.appendChild(style);
}

export default function EventStepOne({
  formData,
  setFormData,
  setLetterFile,
  selectedOrgId,
  organizationOptions = [],
  onNext,
  existingImages = [],
  existingLetter = null,
  onRemoveExistingImage,
  onRemoveExistingLetter,
  readOnly = false,
  // Upload state management props
  uploadProgress = {},
  uploadStatus = {},
  isUploading = false,
  uploadErrors = {},
  onUploadProgress = () => {},
  onUploadStatus = () => {},
  onUploadError = () => {}
}) {
  const [remainingVolunteers, setRemainingVolunteers] = useState(0);
  const [allocationError, setAllocationError] = useState("");
  const [editingCategory, setEditingCategory] = useState(null); // Track which category is being edited
  const [newLetterFile, setNewLetterFile] = useState(null); // Track newly uploaded letter

  // Calculate remaining volunteers, optionally excluding a specific category
  const calculateRemainingVolunteers = useCallback((excludeCategory = null) => {
    if (formData.unlimitedVolunteers) {
      return Infinity;
    }

    const eventMax = parseInt(formData.maxVolunteers) || 0;
    if (eventMax <= 0) {
      return 0;
    }

    // Calculate total allocated volunteers across all time slots and categories
    let totalAllocated = 0;
    if (formData.timeSlots && formData.timeSlots.length > 0) {
      formData.timeSlots.forEach(slot => {
        slot.categories.forEach(category => {
          // Skip the category being edited if specified
          if (excludeCategory && 
              excludeCategory.slotId === slot.id && 
              excludeCategory.categoryId === category.id) {
            return;
          }
          
          if (category.maxVolunteers && category.maxVolunteers > 0) {
            totalAllocated += category.maxVolunteers;
          }
        });
      });
    }

    return eventMax - totalAllocated;
  }, [formData.maxVolunteers, formData.unlimitedVolunteers, formData.timeSlots]);

  useEffect(() => {
    const remaining = calculateRemainingVolunteers(editingCategory);
    setRemainingVolunteers(remaining);

    // Set error if over-allocated
    if (remaining < 0) {
      setAllocationError(`Over-allocated by ${Math.abs(remaining)} volunteers`);
    } else {
      setAllocationError("");
    }
  }, [formData.maxVolunteers, formData.unlimitedVolunteers, formData.timeSlots, editingCategory]);

  // Cleanup upload states when component unmounts
  useEffect(() => {
    return () => {
      // Reset any upload-related states
      if (typeof onUploadProgress === 'function') {
        onUploadProgress({});
      }
      if (typeof onUploadStatus === 'function') {
        onUploadStatus({});
      }
      if (typeof onUploadError === 'function') {
        onUploadError({});
      }
      
      // Clean up any object URLs to prevent memory leaks
      if (formData.eventImages) {
        formData.eventImages.forEach(file => {
          if (!file.uploaded && file instanceof File) {
            URL.revokeObjectURL(URL.createObjectURL(file));
          }
        });
      }
      
      if (newLetterFile && !newLetterFile.uploaded && newLetterFile instanceof File) {
        URL.revokeObjectURL(URL.createObjectURL(newLetterFile));
      }
    };
  }, [onUploadProgress, onUploadStatus, onUploadError, formData.eventImages, newLetterFile]);

  const handleMaxVolunteersChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const equipmentOptions = ["Gloves", "Bags", "Masks", "Tools"];
  const eventTypes = [
    "Beach Cleanup",
    "Tree Plantation",
    "Awareness Drive",
    "Animal Rescue",
    "Education"
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      if (name === "equipmentNeeded") {
        setFormData((prev) => ({
          ...prev,
          equipmentNeeded: checked
            ? [...prev.equipmentNeeded, value]
            : prev.equipmentNeeded.filter((item) => item !== value),
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: checked }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };
  
  const handleLocationChange = (newLocation) => {
    // Handle null/undefined values to prevent crashes
    if (!newLocation) {
      setFormData((prev) => ({
        ...prev,
        mapLocation: null,
      }));
      return;
    }

    // newLocation is { lat, lng, address } from the map click or search
    setFormData((prev) => ({
      ...prev,
      mapLocation: {
        lat: newLocation.lat,
        lng: newLocation.lng,
        address: newLocation.address, // Update address from LocationPicker
      },
      // Also reflect the chosen address in the simple text field so users see it immediately
      location: newLocation.address || prev.location || '',
    }));
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    // Enhanced file validation with better feedback
    const validationResults = validateImageFiles(files);
    
    if (validationResults.invalidFiles.length > 0) {
      const errorMessage = `❌ File validation failed:\n${validationResults.invalidFiles.join('\n')}`;
      showAlert.warning(errorMessage);
    }

    if (validationResults.validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    // Show success message for valid files
    if (validationResults.validFiles.length > 0) {
      const fileNames = validationResults.validFiles.map(f => f.name).join(', ');
      showAlert.success(`✅ ${validationResults.validFiles.length} image(s) validated: ${fileNames}`);
    }

    // Start upload for each valid file
    for (const file of validationResults.validFiles) {
      await handleImageUpload(file);
    }

    // Clear the file input
    e.target.value = '';
  };

  // Enhanced image file validation with comprehensive checks
  const validateImageFiles = (files) => {
    const validFiles = [];
    const invalidFiles = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const maxFiles = 5;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    // Check total file count
    if (files.length > maxFiles) {
      invalidFiles.push(`Maximum ${maxFiles} images allowed (you selected ${files.length})`);
      return { validFiles: [], invalidFiles };
    }

    // Check existing files count
    const existingCount = (formData.eventImages || []).length;
    if (existingCount + files.length > maxFiles) {
      invalidFiles.push(`Total images would exceed ${maxFiles} limit (${existingCount} existing + ${files.length} new)`);
      return { validFiles: [], invalidFiles };
    }

    for (const file of files) {
      let isValid = true;
      let errorMessage = '';

      // File size validation
      if (file.size > maxSize) {
        isValid = false;
        errorMessage = `${file.name}: File size (${formatFileSize(file.size)}) exceeds 10MB limit`;
      }

      // File type validation
      if (!allowedTypes.includes(file.type)) {
        isValid = false;
        errorMessage = `${file.name}: Invalid file type (${file.type}). Allowed: JPEG, PNG, GIF, WebP`;
      }

      // File name validation
      if (file.name.length > 100) {
        isValid = false;
        errorMessage = `${file.name}: File name too long (max 100 characters)`;
      }

      // Check for duplicate files
      const existingFiles = formData.eventImages || [];
      const isDuplicate = existingFiles.some(existing => 
        existing.name === file.name && existing.size === file.size
      );
      
      if (isDuplicate) {
        isValid = false;
        errorMessage = `${file.name}: Duplicate file detected`;
      }

      // Check for suspicious file extensions
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const suspiciousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js'];
      if (suspiciousExtensions.includes(fileExtension)) {
        isValid = false;
        errorMessage = `${file.name}: File type not allowed for security reasons`;
      }

      if (isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(errorMessage);
      }
    }

    return { validFiles, invalidFiles };
  };

  // Utility function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Enhanced error categorization with user guidance
  const categorizeUploadError = (error, fileName) => {
    let category = 'unknown';
    let message = 'Upload failed. Please try again.';
    let suggestion = 'Check your internet connection and try again.';

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      
      switch (status) {
        case 400:
          category = 'validation';
          message = 'Invalid file format or corrupted file.';
          suggestion = 'Please check the file format and try uploading again.';
          break;
        case 401:
          category = 'authentication';
          message = 'Authentication required. Please log in again.';
          suggestion = 'Try refreshing the page and logging in again.';
          break;
        case 403:
          category = 'permission';
          message = 'Upload permission denied.';
          suggestion = 'Contact your administrator if you believe this is an error.';
          break;
        case 413:
          category = 'size';
          message = 'File size exceeds the maximum limit.';
          suggestion = 'Please compress the file or choose a smaller one.';
          break;
        case 429:
          category = 'rate_limit';
          message = 'Too many upload attempts. Please wait a moment.';
          suggestion = 'Wait a few minutes before trying again.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          category = 'server';
          message = 'Server error occurred during upload.';
          suggestion = 'Please try again in a few minutes.';
          break;
        default:
          category = 'server';
          message = `Server error (${status}). Please try again.`;
          suggestion = 'If the problem persists, contact support.';
      }
    } else if (error.request) {
      // Network error
      category = 'network';
      message = 'Network error. Upload could not be completed.';
      suggestion = 'Check your internet connection and try again.';
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      category = 'timeout';
      message = 'Upload timed out. File may be too large.';
      suggestion = 'Try uploading a smaller file or check your connection speed.';
    } else {
      // Other errors
      category = 'unknown';
      message = 'An unexpected error occurred.';
      suggestion = 'Please try again or contact support if the problem persists.';
    }

    return { category, message, suggestion };
  };

  // Enhanced error recovery and user guidance functions
  const getErrorRecoverySteps = (errorCategory, fileName) => {
    const recoverySteps = {
      validation: [
        'Check if the file format is supported (JPEG, PNG, GIF, WebP for images; PDF for letters)',
        'Ensure the file is not corrupted by opening it in another application',
        'Try converting the file to a different format if possible',
        'Verify the file size is under 10MB'
      ],
      size: [
        'Compress the image using online tools like TinyPNG or ImageOptim',
        'Reduce image dimensions while maintaining quality',
        'Convert to a more efficient format (e.g., JPEG instead of PNG)',
        'Split large documents into smaller parts if applicable'
      ],
      network: [
        'Check your internet connection stability',
        'Try switching between WiFi and mobile data',
        'Close other bandwidth-heavy applications',
        'Wait a few minutes and try again'
      ],
      server: [
        'Wait a few minutes and try uploading again',
        'Check if the service is experiencing issues',
        'Try uploading during off-peak hours',
        'Contact support if the problem persists'
      ],
      timeout: [
        'Try uploading a smaller file first',
        'Check your internet connection speed',
        'Close other applications that might be using bandwidth',
        'Try uploading during off-peak hours'
      ],
      rate_limit: [
        'Wait 5-10 minutes before trying again',
        'Avoid uploading multiple files simultaneously',
        'Check if you have other uploads in progress',
        'Try uploading during off-peak hours'
      ],
      permission: [
        'Ensure you are logged in with the correct account',
        'Check if your account has upload permissions',
        'Try refreshing the page and logging in again',
        'Contact your administrator if the problem persists'
      ],
      authentication: [
        'Refresh the page and log in again',
        'Check if your session has expired',
        'Clear browser cookies and cache',
        'Try using a different browser'
      ],
      unknown: [
        'Refresh the page and try again',
        'Clear browser cache and cookies',
        'Try using a different browser',
        'Contact support if the problem persists'
      ]
    };

    return recoverySteps[errorCategory] || recoverySteps.unknown;
  };

  const getFileOptimizationTips = (fileType) => {
    const tips = {
      image: [
        'Use JPEG format for photographs (better compression)',
        'Use PNG format for graphics with transparency',
        'Optimize images to 1200x800px for web display',
        'Keep file sizes under 2MB for faster uploads'
      ],
      letter: [
        'Use PDF format for best compatibility',
        'Ensure text is clearly readable when scanned',
        'Use high-resolution scans (300 DPI recommended)',
        'Compress PDFs if they exceed 5MB'
      ]
    };

    return tips[fileType] || tips.image;
  };

  const handleRetryUpload = async (fileName, fileType) => {
    try {
      // Find the file in the appropriate state
      let fileToRetry = null;
      
      if (fileType === 'image') {
        fileToRetry = formData.eventImages?.find(img => img.name === fileName);
      } else if (fileType === 'letter') {
        fileToRetry = newLetterFile?.name === fileName ? newLetterFile : null;
      }

      if (!fileToRetry) {
        showAlert.error(`❌ File ${fileName} not found for retry`);
        return;
      }

      // Clear the error
      onUploadError(fileName, '');
      
      // Show retry message
      showAlert.info(`🔄 Retrying upload for ${fileName}...`);
      
      // Retry the upload
      if (fileType === 'image') {
        await handleImageUpload(fileToRetry);
      } else if (fileType === 'letter') {
        await handleLetterUpload(fileToRetry);
      }

    } catch (error) {
      console.error(`Error retrying upload for ${fileName}:`, error);
      showAlert.error(`❌ Failed to retry upload for ${fileName}`);
    }
  };

  const handleFileOptimization = (fileName, fileType) => {
    const tips = getFileOptimizationTips(fileType);
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    `;
    
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 10px;">
          🛠️ File Optimization Tips for ${fileName}
        </h3>
        <p style="margin: 0; color: #666; font-size: 14px;">
          Here are some tips to optimize your ${fileType} file for better upload performance:
        </p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">💡 Optimization Recommendations:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #555;">
          ${tips.map(tip => `<li style="margin-bottom: 8px;">${tip}</li>`).join('')}
        </ul>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">🔧 Quick Actions:</h4>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button id="retryBtn" style="
            background: #1976d2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">🔄 Retry Upload</button>
          <button id="closeBtn" style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">Close</button>
        </div>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listeners
    const retryBtn = content.querySelector('#retryBtn');
    const closeBtn = content.querySelector('#closeBtn');
    
    retryBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      handleRetryUpload(fileName, fileType);
    });
    
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  };

  // Help section functions
  const handleShowUploadTroubleshooting = () => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 700px;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    `;
    
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 10px;">
          🔧 Upload Troubleshooting Guide
        </h3>
        <p style="margin: 0; color: #666; font-size: 14px;">
          Common upload issues and their solutions:
        </p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">❌ Common Upload Errors:</h4>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">File Too Large</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Compress images using online tools like TinyPNG<br>
            • Convert to more efficient formats (JPEG instead of PNG)<br>
            • Reduce image dimensions while maintaining quality
          </p>
        </div>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">Invalid File Type</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Images: Use JPEG, PNG, GIF, or WebP formats<br>
            • Letters: Use images or PDF format<br>
            • Check file extension matches the actual format
          </p>
        </div>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">Network Issues</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Check internet connection stability<br>
            • Try switching between WiFi and mobile data<br>
            • Close bandwidth-heavy applications<br>
            • Wait a few minutes and try again
          </p>
        </div>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">Upload Timeout</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Try uploading smaller files first<br>
            • Check connection speed<br>
            • Upload during off-peak hours
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">💡 Pro Tips:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #555;">
          <li>Always compress images before uploading</li>
          <li>Use appropriate formats (JPEG for photos, PNG for graphics)</li>
          <li>Keep file sizes under 2MB for faster uploads</li>
          <li>Ensure government letters are clearly readable</li>
          <li>Upload during off-peak hours for better performance</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <button id="closeTroubleshootingBtn" style="
          background: #1976d2;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Got it! Close</button>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listener
    const closeBtn = content.querySelector('#closeTroubleshootingBtn');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  };

  const handleShowFileOptimizationGuide = () => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 700px;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    `;
    
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 10px;">
          📚 File Optimization Guide
        </h3>
        <p style="margin: 0; color: #666; font-size: 14px;">
          Learn how to optimize your files for better upload performance:
        </p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">🖼️ Image Optimization:</h4>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">Format Selection</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • <strong>JPEG:</strong> Best for photographs and complex images<br>
            • <strong>PNG:</strong> Best for graphics with transparency<br>
            • <strong>WebP:</strong> Modern format with excellent compression<br>
            • <strong>GIF:</strong> Use only for simple animations
          </p>
        </div>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">Size Optimization</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Recommended dimensions: 1200x800px<br>
            • Maximum file size: 2MB for optimal performance<br>
            • Use online tools: TinyPNG, ImageOptim, Squoosh<br>
            • Maintain quality while reducing file size
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">📄 Document Optimization:</h4>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">PDF Optimization</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Use PDF compression tools<br>
            • Remove unnecessary metadata<br>
            • Optimize images within PDFs<br>
            • Target size: under 5MB
          </p>
        </div>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">Image Scans</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Scan at 300 DPI for good quality<br>
            • Use JPEG format for scanned documents<br>
            • Ensure text is clearly readable<br>
            • Compress after scanning
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">🛠️ Tools & Resources:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #555;">
          <li><strong>Image Compression:</strong> TinyPNG, ImageOptim, Squoosh</li>
          <li><strong>PDF Tools:</strong> Adobe Acrobat, SmallPDF, PDF24</li>
          <li><strong>Online Converters:</strong> Convertio, CloudConvert</li>
          <li><strong>File Management:</strong> Use the optimization tips in error messages</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <button id="closeOptimizationBtn" style="
          background: #1976d2;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Got it! Close</button>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listener
    const closeBtn = content.querySelector('#closeOptimizationBtn');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  };

  // Enhanced upload guidance for different file types
  const getUploadGuidance = (fileType, fileName) => {
    const guidance = {
      image: {
        tips: [
          '📸 Use high-quality images for better event presentation',
          '🖼️ Supported formats: JPEG, PNG, GIF, WebP',
          '📏 Maximum file size: 10MB per image',
          '🔢 Maximum images: 5 total for the event'
        ],
        recommendations: [
          'Use landscape orientation for better display',
          'Ensure good lighting and clear subject matter',
          'Consider image dimensions (recommended: 1200x800px)'
        ]
      },
      letter: {
        tips: [
          '📄 Upload government approval letter or official document',
          '📋 Supported formats: Images (JPEG, PNG, GIF, WebP) and PDF',
          '📏 Maximum file size: 10MB',
          '✅ Required for event approval'
        ],
        recommendations: [
          'Ensure document is clearly readable',
          'Use high-resolution scans for better quality',
          'Include all relevant approval details'
        ]
      }
    };

    return guidance[fileType] || guidance.image;
  };

  // Enhanced upload statistics and user feedback
  const getUploadStatistics = () => {
    const totalFiles = (formData.eventImages || []).length + (newLetterFile ? 1 : 0);
    const uploadedFiles = (formData.eventImages || []).filter(img => img.uploaded).length + 
                         (newLetterFile && newLetterFile.uploaded ? 1 : 0);
    const pendingFiles = totalFiles - uploadedFiles;
    const errorFiles = Object.keys(uploadErrors).length;
    
    return {
      total: totalFiles,
      uploaded: uploadedFiles,
      pending: pendingFiles,
      errors: errorFiles,
      progress: totalFiles > 0 ? Math.round((uploadedFiles / totalFiles) * 100) : 0
    };
  };

  // Performance optimization and utility functions
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const memoizedFormatFileSize = useMemo(() => {
    const sizeCache = new Map();
    return (bytes) => {
      if (sizeCache.has(bytes)) {
        return sizeCache.get(bytes);
      }
      const result = formatFileSize(bytes);
      sizeCache.set(bytes, result);
      return result;
    };
  }, []);

  const getFileTypeIconMemoized = useMemo(() => {
    return (fileType) => getFileTypeIcon(fileType);
  }, []);

  const isUploadInProgress = useMemo(() => {
    return isUploading || Object.values(uploadProgress).some(progress => progress > 0 && progress < 100);
  }, [isUploading, uploadProgress]);

  const hasCriticalErrors = useMemo(() => {
    return Object.keys(uploadErrors).length > 0;
  }, [uploadErrors]);

  const canProceedToNextStepOptimized = useMemo(() => {
    return !isUploadInProgress && !hasCriticalErrors;
  }, [isUploadInProgress, hasCriticalErrors]);

  // Enhanced file validation with caching
  const validateFileWithCache = useCallback((file, fileType) => {
    const cacheKey = `${file.name}-${file.size}-${file.type}-${fileType}`;
    
    if (validationCache.current.has(cacheKey)) {
      return validationCache.current.get(cacheKey);
    }
    
    let result;
    if (fileType === 'image') {
      result = validateImageFiles([file]);
      result = result.validFiles.length > 0 ? { isValid: true, file: result.validFiles[0] } : { isValid: false, errors: result.invalidFiles };
    } else {
      result = validateLetterFile(file);
    }
    
    validationCache.current.set(cacheKey, result);
    return result;
  }, []);

  // Initialize validation cache
  const validationCache = useRef(new Map());

  // Loading state manager
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  const setProcessingState = useCallback((loading, message = '') => {
    setIsProcessing(loading);
    setProcessingMessage(message);
  }, []);

  // Error boundary state
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  const handleError = useCallback((error, context) => {
    console.error(`Error in ${context}:`, error);
    setHasError(true);
    setErrorDetails({ error, context, timestamp: new Date().toISOString() });
    
    // Show user-friendly error message
    showAlert.error(`❌ An error occurred while ${context}. Please try again or contact support if the problem persists.`);
  }, []);

  const resetErrorState = useCallback(() => {
    setHasError(false);
    setErrorDetails(null);
  }, []);

  // Enhanced file preview and management functions
  
  // Helper function to get file type icon
  const getFileTypeIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return '🖼️';
    } else if (fileType === 'application/pdf') {
      return '📄';
    } else if (fileType.startsWith('text/')) {
      return '📝';
    } else if (fileType.startsWith('video/')) {
      return '🎥';
    } else if (fileType.startsWith('audio/')) {
      return '🎵';
    } else {
      return '📁';
    }
  };

  const handlePreviewImage = (file, index) => {
    try {
      const imageUrl = file.uploaded && file.cloudinaryUrl ? file.cloudinaryUrl : URL.createObjectURL(file);
      
      // Create a modal for image preview
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        cursor: pointer;
      `;
      
      const image = document.createElement('img');
      image.src = imageUrl;
      image.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      `;
      
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '✕';
      closeButton.style.cssText = `
        position: absolute;
        top: 20px;
        right: 30px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s;
      `;
      
      closeButton.addEventListener('mouseenter', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
      });
      
      closeButton.addEventListener('mouseleave', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      });
      
      const fileInfo = document.createElement('div');
      fileInfo.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        text-align: center;
      `;
      fileInfo.innerHTML = `
        <div><strong>${file.name}</strong></div>
        <div>${formatFileSize(file.size)}</div>
        <div>${file.type}</div>
        <div>${file.uploaded ? '✅ Uploaded' : '⏳ Pending Upload'}</div>
      `;
      
      modal.appendChild(image);
      modal.appendChild(closeButton);
      modal.appendChild(fileInfo);
      document.body.appendChild(modal);
      
      // Close modal on click
      const closeModal = () => {
        document.body.removeChild(modal);
        if (!file.uploaded) {
          URL.revokeObjectURL(imageUrl);
        }
      };
      
      modal.addEventListener('click', closeModal);
      closeButton.addEventListener('click', closeModal);
      
      // Close on escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
      
    } catch (error) {
      console.error('Error previewing image:', error);
      showAlert.error('❌ Failed to preview image. Please try again.');
    }
  };

  const handlePreviewExistingImage = (img, index) => {
    try {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        cursor: pointer;
      `;
      
      const image = document.createElement('img');
      image.src = img.url;
      image.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      `;
      
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '✕';
      closeButton.style.cssText = `
        position: absolute;
        top: 20px;
        right: 30px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s;
      `;
      
      closeButton.addEventListener('mouseenter', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
      });
      
      closeButton.addEventListener('mouseleave', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      });
      
      const fileInfo = document.createElement('div');
      fileInfo.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        text-align: center;
      `;
      fileInfo.innerHTML = `
        <div><strong>${img.filename || `Event Image ${index + 1}`}</strong></div>
        <div>Existing File</div>
        <div>Stored in System</div>
      `;
      
      modal.appendChild(image);
      modal.appendChild(closeButton);
      modal.appendChild(fileInfo);
      document.body.appendChild(modal);
      
      // Close modal on click
      const closeModal = () => {
        document.body.removeChild(modal);
      };
      
      modal.addEventListener('click', closeModal);
      closeButton.addEventListener('click', closeModal);
      
      // Close on escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
      
    } catch (error) {
      console.error('Error previewing existing image:', error);
      showAlert.error('❌ Failed to preview image. Please try again.');
    }
  };

  const handlePreviewLetter = (file) => {
    try {
      if (file.type === 'application/pdf') {
        // For PDFs, open in new tab
        const url = file.uploaded && file.cloudinaryUrl ? file.cloudinaryUrl : URL.createObjectURL(file);
        window.open(url, '_blank');
      } else {
        // For images, show preview modal
        const imageUrl = file.uploaded && file.cloudinaryUrl ? file.cloudinaryUrl : URL.createObjectURL(file);
        
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          cursor: pointer;
        `;
        
        const image = document.createElement('img');
        image.src = imageUrl;
        image.style.cssText = `
          max-width: 90%;
          max-height: 90%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
          position: absolute;
          top: 20px;
          right: 30px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.3s;
        `;
        
        closeButton.addEventListener('mouseenter', () => {
          closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        });
        
        closeButton.addEventListener('mouseleave', () => {
          closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        
        const fileInfo = document.createElement('div');
        fileInfo.style.cssText = `
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 14px;
          text-align: center;
        `;
        fileInfo.innerHTML = `
          <div><strong>${file.name}</strong></div>
          <div>${formatFileSize(file.size)}</div>
          <div>${file.type}</div>
          <div>${file.uploaded ? '✅ Uploaded' : '⏳ Pending Upload'}</div>
        `;
        
        modal.appendChild(image);
        modal.appendChild(closeButton);
        modal.appendChild(fileInfo);
        document.body.appendChild(modal);
        
        // Close modal on click
        const closeModal = () => {
          document.body.removeChild(modal);
          if (!file.uploaded) {
            URL.revokeObjectURL(imageUrl);
          }
        };
        
        modal.addEventListener('click', closeModal);
        closeButton.addEventListener('click', closeModal);
        
        // Close on escape key
        const handleEscape = (e) => {
          if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
          }
        };
        document.addEventListener('keydown', handleEscape);
      }
      
    } catch (error) {
      console.error('Error previewing letter:', error);
      showAlert.error('❌ Failed to preview letter. Please try again.');
    }
  };

  const handleImageUpload = async (file) => {
    const fileName = file.name;
    
    // Initialize upload progress and status
    onUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
    onUploadStatus(prev => ({ ...prev, [fileName]: 'uploading' }));
    
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'events');

      // Upload to Cloudinary via backend
      const response = await axiosInstance.post('/api/events/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(prev => ({ ...prev, [fileName]: progress }));
        }
      });

      if (response.data.success) {
        // Mark upload as successful
        onUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        onUploadStatus(prev => ({ ...prev, [fileName]: 'completed' }));
        
        // Add uploaded file info to form data
        setFormData(prev => ({
          ...prev,
          eventImages: [...(prev.eventImages || []), {
            ...file,
            cloudinaryUrl: response.data.url,
            cloudinaryId: response.data.publicId,
            uploaded: true
          }]
        }));

        showAlert.success(`✅ ${fileName} uploaded successfully!`);
        
        // Clear upload states after success
        setTimeout(() => {
          onUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
          });
          onUploadStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[fileName];
            return newStatus;
          });
        }, 2000);

      } else {
        throw new Error(response.data.message || 'Upload failed');
      }

    } catch (error) {
      console.error(`❌ Image upload failed for ${fileName}:`, error);
      
      // Mark upload as failed
      onUploadStatus(prev => ({ ...prev, [fileName]: 'error' }));
      onUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
      
      // Enhanced error categorization and user guidance
      const errorInfo = categorizeUploadError(error, fileName);
      
      onUploadError(fileName, errorInfo.message);
      showAlert.error(`❌ ${fileName}: ${errorInfo.message}`);
      
      // Log detailed error for debugging
      console.error(`Upload error details for ${fileName}:`, {
        status: error.response?.status,
        message: error.message,
        category: errorInfo.category,
        suggestion: errorInfo.suggestion
      });
    }
  };

  const handleLetterChange = async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;

    // Enhanced letter file validation
    const validationResult = validateLetterFile(file);
    
    if (!validationResult.isValid) {
      showAlert.error(`❌ ${validationResult.errorMessage}`);
      e.target.value = '';
      return;
    }

    // Show success message for valid file
    showAlert.success(`✅ ${file.name} validated successfully! Starting upload...`);

    // Start upload
    await handleLetterUpload(file);
    
    // Clear the file input
    e.target.value = '';
  };

  // Enhanced letter file validation with comprehensive checks
  const validateLetterFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

    // File size validation
    if (file.size > maxSize) {
      return {
        isValid: false,
        errorMessage: `File size (${formatFileSize(file.size)}) exceeds 10MB limit`
      };
    }

    // File type validation
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        errorMessage: `Invalid file type (${file.type}). Allowed: Images (JPEG, PNG, GIF, WebP) and PDF files`
      };
    }

    // File name validation
    if (file.name.length > 100) {
      return {
        isValid: false,
        errorMessage: `File name too long (max 100 characters)`
      };
    }

    // Check for suspicious file extensions
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const suspiciousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js'];
    if (suspiciousExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        errorMessage: `File type not allowed for security reasons`
      };
    }

    // Check if file is empty
    if (file.size === 0) {
      return {
        isValid: false,
        errorMessage: `File appears to be empty`
      };
    }

    return { isValid: true, errorMessage: '' };
  };

  const handleLetterUpload = async (file) => {
    const fileName = file.name;
    
    // Initialize upload progress and status
    onUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
    onUploadStatus(prev => ({ ...prev, [fileName]: 'uploading' }));
    
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'events/letters');

      // Upload to Cloudinary via backend
      const response = await axiosInstance.post('/api/events/upload-letter', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(prev => ({ ...prev, [fileName]: progress }));
        }
      });

      if (response.data.success) {
        // Mark upload as successful
        onUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        onUploadStatus(prev => ({ ...prev, [fileName]: 'completed' }));
        
        // Set the uploaded file
        const uploadedFile = {
          ...file,
          cloudinaryUrl: response.data.url,
          cloudinaryId: response.data.publicId,
          uploaded: true
        };
        
        setNewLetterFile(uploadedFile);
        setLetterFile(uploadedFile);

        showAlert.success(`✅ ${fileName} uploaded successfully!`);
        
        // Clear upload states after success
        setTimeout(() => {
          onUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
          });
          onUploadStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[fileName];
            return newStatus;
          });
        }, 2000);

      } else {
        throw new Error(response.data.message || 'Upload failed');
      }

    } catch (error) {
      console.error(`❌ Letter upload failed for ${fileName}:`, error);
      
      // Mark upload as failed
      onUploadStatus(prev => ({ ...prev, [fileName]: 'error' }));
      onUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
      
      // Enhanced error categorization and user guidance
      const errorInfo = categorizeUploadError(error, fileName);
      
      onUploadError(fileName, errorInfo.message);
      showAlert.error(`❌ ${fileName}: ${errorInfo.message}`);
      
      // Log detailed error for debugging
      console.error(`Letter upload error details for ${fileName}:`, {
        status: error.response?.status,
        message: error.message,
        category: errorInfo.category,
        suggestion: errorInfo.suggestion
      });
    }
  };

  const handleProceed = (e) => {
    e.preventDefault();
    
    // Check if time slots are enabled and validate volunteer allocation
    if (formData.timeSlotsEnabled && formData.timeSlots && formData.timeSlots.length > 0 && !formData.unlimitedVolunteers) {
      if (remainingVolunteers < 0) {
        // Show error and prevent proceeding
        showAlert(`❌ Cannot proceed: You have over-allocated ${Math.abs(remainingVolunteers)} volunteers. Please adjust your category limits before continuing.`, 'error');
        return;
      }
    }
    
    // Clear editing state before proceeding to ensure accurate validation
    setEditingCategory(null);
    onNext();
  };

  // Helper to handle appending new files
  const handleAddImages = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    // Enhanced file validation with better feedback
    const validationResults = validateImageFiles(files);
    
    if (validationResults.invalidFiles.length > 0) {
      const errorMessage = `❌ Additional file validation failed:\n${validationResults.invalidFiles.join('\n')}`;
      showAlert.warning(errorMessage);
    }

    if (validationResults.validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    // Show success message for valid files
    if (validationResults.validFiles.length > 0) {
      const fileNames = validationResults.validFiles.map(f => f.name).join(', ');
      showAlert.success(`✅ ${validationResults.validFiles.length} additional image(s) validated: ${fileNames}`);
    }

    // Start upload for each valid file
    for (const file of validationResults.validFiles) {
      await handleImageUpload(file);
    }

    // Clear the file input
    e.target.value = '';
  };

  const handleRemoveNewImage = (idx) => {
    const removedImage = formData.eventImages[idx];
    setFormData(prev => ({
      ...prev,
      eventImages: prev.eventImages.filter((_, i) => i !== idx)
    }));
    
    if (removedImage) {
      showAlert(`🗑️ Image removed: ${removedImage.name}`, 'info');
    }
  };

  const handleRemoveNewLetter = () => {
    console.log("[EventStepOne] Removing new letter:", newLetterFile?.name);
    
    if (newLetterFile) {
      showAlert(`🗑️ Government approval letter removed: ${newLetterFile.name}`, 'warning');
    }
    
    setNewLetterFile(null);
    setLetterFile(null);
    
    // Clear the file input more reliably
    const fileInputs = document.querySelectorAll('input[type="file"][accept="image/*,application/pdf"]');
    fileInputs.forEach(input => {
      if (input.files && input.files.length > 0) {
        input.value = '';
        console.log("[EventStepOne] Cleared file input");
      }
    });
  };

  const handleRemoveImage = (index) => {
    const removedFile = formData.eventImages[index];
    if (removedFile) {
      showAlert(`🗑️ Image removed: ${removedFile.name}`, 'warning');
      
      // Remove from form data
      setFormData(prev => ({
        ...prev,
        eventImages: prev.eventImages.filter((_, i) => i !== index)
      }));

      // Clear upload states for this file
      if (removedFile.name) {
        onUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[removedFile.name];
          return newProgress;
        });
        onUploadStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[removedFile.name];
          return newStatus;
        });
        onUploadError(removedFile.name, null); // Clear error
      }
    }
  };

  const clearUploadError = (fileName) => {
    onUploadError(fileName, null);
    showAlert.success(`✅ Upload error cleared for ${fileName}`);
  };

  return (
    <Box component="form" onSubmit={handleProceed} sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Step 1: Event Details
      </Typography>

      {!selectedOrgId && (
        <FormControl fullWidth margin="normal">
          <InputLabel>Select Organization</InputLabel>
          <Select
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            required
            label="Select Organization"
          >
            {organizationOptions.map((org) => (
              <MenuItem key={org._id} value={org._id}>
                {org.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <TextField fullWidth margin="normal" name="title" label="Event Name" value={formData.title} onChange={handleChange} required />
      <TextField fullWidth margin="normal" multiline rows={3} name="description" label="Event Description" value={formData.description} onChange={handleChange} />
      
      {/* --- NEW LOCATION SECTION --- */}
      <Box mt={2} mb={2}>
        <Typography variant="subtitle1" gutterBottom sx={{ mb: 1 }}>
          Event Location
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Search for a location or click on the map to set the exact coordinates. The address will be automatically filled.
        </Typography>
        <LocationPicker
          value={formData.mapLocation} // Pass the mapLocation object
          onChange={handleLocationChange}
        />
         <TextField 
          fullWidth 
          margin="normal" 
          name="location"
          label="Location (Simple Text)" 
          value={formData.location || ''} 
          onChange={handleChange}
          helperText="A simple text description of the location (e.g., 'Near Central Park')."
        />
      </Box>
      {/* --- END NEW LOCATION SECTION --- */}

      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <TextField fullWidth type="datetime-local" name="startDateTime" label="Start Date & Time" InputLabelProps={{ shrink: true }} value={formData.startDateTime} onChange={handleChange} required />
        <TextField fullWidth type="datetime-local" name="endDateTime" label="End Date & Time" InputLabelProps={{ shrink: true }} value={formData.endDateTime} onChange={handleChange} required min={formData.startDateTime || undefined} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
        <TextField
          fullWidth
          type="number"
          name="maxVolunteers"
          label="Max Volunteers"
          value={formData.maxVolunteers}
          onChange={handleMaxVolunteersChange}
          disabled={formData.unlimitedVolunteers}
          inputProps={{ min: 1 }}
        />
        <FormControlLabel
          control={<Checkbox checked={formData.unlimitedVolunteers} onChange={handleChange} name="unlimitedVolunteers" />}
          label="Unlimited"
        />
      </Box>

      {/* Volunteer Allocation Status */}
      {formData.timeSlotsEnabled && formData.timeSlots && formData.timeSlots.length > 0 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Volunteer Allocation Status
          </Typography>
          
          {formData.unlimitedVolunteers ? (
            <Chip 
              label="Unlimited volunteers - no allocation limits" 
              color="success" 
              variant="outlined"
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                label={`Remaining: ${remainingVolunteers} volunteers`}
                color={remainingVolunteers < 0 ? 'error' : remainingVolunteers < 10 ? 'warning' : 'success'}
                variant="outlined"
              />
              {allocationError && (
                <Alert severity="error" sx={{ flexGrow: 1 }}>
                  {allocationError}
                </Alert>
              )}
            </Box>
          )}
        </Box>
      )}

      <FormControl fullWidth margin="normal">
        <InputLabel>Event Type</InputLabel>
        <Select name="eventType" value={formData.eventType} onChange={handleChange} label="Event Type">
          {eventTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Equipment Needed
        </Typography>
        <FormGroup row>
          {equipmentOptions.map((item) => (
            <FormControlLabel
              key={item}
              control={
                <Checkbox
                  name="equipmentNeeded"
                  value={item}
                  checked={formData.equipmentNeeded.includes(item)}
                  onChange={handleChange}
                />
              }
              label={item}
            />
          ))}
        </FormGroup>
      </Box>

      <TextField fullWidth margin="normal" name="otherEquipment" label="Other Equipment" value={formData.otherEquipment} onChange={handleChange} />
      <TextField fullWidth multiline rows={2} margin="normal" name="instructions" label="Additional Instructions" value={formData.instructions} onChange={handleChange} />

      <Box mt={2}>
        <FormControlLabel control={<Checkbox checked={formData.groupRegistration} onChange={handleChange} name="groupRegistration" />} label="Enable Group Registration" />
      </Box>

      <Box mt={2}>
        <FormControlLabel control={<Checkbox checked={formData.recurringEvent} onChange={handleChange} name="recurringEvent" />} label="Recurring Event?" />
      </Box>

      {formData.recurringEvent && (
        <Box mt={2}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Recurring Event Settings
          </Typography>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Recurring Type</InputLabel>
            <Select name="recurringType" value={formData.recurringType} onChange={handleChange} label="Recurring Type">
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>

          {formData.recurringType === "weekly" && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Day of the Week</InputLabel>
              <Select name="recurringValue" value={formData.recurringValue} onChange={handleChange} label="Day of the Week">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {formData.recurringType === "monthly" && (
            <TextField
              fullWidth
              margin="normal"
              type="number"
              name="recurringValue"
              label="Day of the Month (e.g. 1 for 1st)"
              value={formData.recurringValue}
              onChange={handleChange}
              inputProps={{ min: 1, max: 31 }}
            />
          )}

          <TextField
            fullWidth
            margin="normal"
            type="date"
            name="recurringEndDate"
            label="Series End Date (Optional)"
            value={formData.recurringEndDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: new Date().toISOString().split('T')[0] }}
          />

          <TextField
            fullWidth
            margin="normal"
            type="number"
            name="recurringMaxInstances"
            label="Maximum Instances (Optional)"
            value={formData.recurringMaxInstances}
            onChange={handleChange}
            inputProps={{ min: 1, max: 100 }}
            helperText="Leave empty for unlimited instances"
          />

          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="body2" color="textSecondary">
              <strong>How it works:</strong> When this event completes, a new instance will be automatically created 
              with the same details but on the next scheduled date. Each instance will have independent volunteer 
              registrations, but the organizer team will remain the same.
            </Typography>
          </Box>
        </Box>
      )}

      {/* Enhanced Status Indicator */}
      <Box mb={3} p={2} bgcolor="grey.50" borderRadius={2} border="1px solid" borderColor="grey.300">
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="subtitle2" color="textPrimary">
              📊 Upload Status Overview
            </Typography>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: hasCriticalErrors ? 'error.main' : isUploadInProgress ? 'warning.main' : 'success.main'
              }}
            >
              {hasCriticalErrors ? '❌ Errors' : isUploadInProgress ? '⏳ In Progress' : '✅ Ready'}
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" gap={2}>
            {isProcessing && (
              <Box display="flex" alignItems="center" gap={1}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    border: '2px solid',
                    borderColor: 'primary.main',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <Typography variant="caption" color="textSecondary">
                  {processingMessage || 'Processing...'}
                </Typography>
              </Box>
            )}
            
            {hasError && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={resetErrorState}
                sx={{ fontSize: '0.75rem' }}
              >
                Reset Error State
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* Comprehensive Help Section */}
      <Box mb={3} p={3} bgcolor="primary.light" borderRadius={2} border="1px solid" borderColor="primary.main">
        <Typography variant="h6" color="primary.contrastText" gutterBottom>
          🆘 Need Help with File Uploads?
        </Typography>
        <Typography variant="body2" color="primary.contrastText" paragraph>
          Having trouble uploading files? Here's a quick guide to help you get started:
        </Typography>
        
        <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
          <Box sx={{ flex: 1, minWidth: 250 }}>
            <Typography variant="subtitle2" color="primary.contrastText" gutterBottom>
              📷 Image Requirements:
            </Typography>
            <Box component="ul" sx={{ margin: 0, paddingLeft: 2, color: 'primary.contrastText' }}>
              <li>Maximum 5 images per event</li>
              <li>Supported formats: JPEG, PNG, GIF, WebP</li>
              <li>Maximum file size: 10MB per image</li>
              <li>Recommended dimensions: 1200x800px</li>
            </Box>
          </Box>
          
          <Box sx={{ flex: 1, minWidth: 250 }}>
            <Typography variant="subtitle2" color="primary.contrastText" gutterBottom>
              📄 Letter Requirements:
            </Typography>
            <Box component="ul" sx={{ margin: 0, paddingLeft: 2, color: 'primary.contrastText' }}>
              <li>Government approval letter required</li>
              <li>Supported formats: Images (JPEG, PNG, GIF, WebP) and PDF</li>
              <li>Maximum file size: 10MB</li>
              <li>Ensure text is clearly readable</li>
            </Box>
          </Box>
        </Box>
        
        <Box display="flex" gap={2} flexWrap="wrap">
          <Button
            size="small"
            variant="contained"
            onClick={() => handleShowUploadTroubleshooting()}
            sx={{ 
              backgroundColor: 'white',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'grey.100'
              }
            }}
            startIcon={<span>🔧</span>}
          >
            Upload Troubleshooting
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => handleShowFileOptimizationGuide()}
            sx={{ 
              backgroundColor: 'white',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'grey.100'
              }
            }}
            startIcon={<span>📚</span>}
          >
            File Optimization Guide
          </Button>
        </Box>
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Event Images (optional)
        </Typography>
        
        {/* Upload Guidance */}
        <Box mb={2} p={2} bgcolor="info.light" borderRadius={1}>
          <Typography variant="subtitle2" color="info.contrastText" gutterBottom>
            💡 Upload Tips & Guidelines
          </Typography>
          {getUploadGuidance('image').tips.map((tip, index) => (
            <Typography key={index} variant="caption" color="info.contrastText" display="block">
              {tip}
            </Typography>
          ))}
          <Typography variant="caption" color="info.contrastText" sx={{ mt: 1, fontStyle: 'italic' }}>
            💭 Pro tip: {getUploadGuidance('image').recommendations[0]}
          </Typography>
        </Box>
        
        {/* File Management Summary */}
        <Box mb={2} p={2} bgcolor="grey.50" borderRadius={1} border="1px solid" borderColor="grey.300">
          <Typography variant="subtitle2" color="textPrimary" gutterBottom>
            📊 File Management Summary
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="caption" color="textSecondary">
                📷 Images: {existingImages.length + (formData.eventImages?.length || 0)} total
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: (existingImages.length + (formData.eventImages?.length || 0)) >= 5 ? 'error.main' : 'success.main'
                }}
              >
                {Math.min((existingImages.length + (formData.eventImages?.length || 0)), 5)}/5
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="caption" color="textSecondary">
                📄 Letter: {existingLetter || newLetterFile ? 'Available' : 'Not Uploaded'}
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: existingLetter || newLetterFile ? 'success.main' : 'warning.main'
                }}
              >
                {existingLetter || newLetterFile ? '✓' : '!'}
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="caption" color="textSecondary">
                ⚠️ Errors: {Object.keys(uploadErrors).length}
              </Typography>
              {Object.keys(uploadErrors).length > 0 && (
                <Box
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: 'error.main'
                  }}
                >
                  {Object.keys(uploadErrors).length}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
        
        {/* Upload Statistics */}
        {(() => {
          const stats = getUploadStatistics();
          if (stats.total > 0) {
            return (
              <Box mb={2} p={2} bgcolor="success.light" borderRadius={1}>
                <Typography variant="subtitle2" color="success.contrastText" gutterBottom>
                  📊 Upload Progress Summary
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="caption" color="success.contrastText">
                    Total Files: {stats.total}
                  </Typography>
                  <Typography variant="caption" color="success.contrastText">
                    Progress: {stats.progress}%
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="success.contrastText">
                    ✅ Uploaded: {stats.uploaded}
                  </Typography>
                  <Typography variant="caption" color="success.contrastText">
                    ⏳ Pending: {stats.pending}
                  </Typography>
                  {stats.errors > 0 && (
                    <Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>
                      ❌ Errors: {stats.errors}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          }
          return null;
        })()}
        
        {/* Image Upload Status */}
        {Array.isArray(formData.eventImages) && formData.eventImages.length > 0 && (
          <Box mb={2} p={2} bgcolor="success.light" borderRadius={1}>
            <Typography variant="body2" color="success.contrastText">
              ✓ {formData.eventImages.length} image{formData.eventImages.length !== 1 ? 's' : ''} uploaded
            </Typography>
          </Box>
        )}

        {/* Upload Progress Indicator */}
        {isUploading && Object.keys(uploadProgress).length > 0 && (
          <Box mb={2} p={2} bgcolor="info.light" borderRadius={1}>
            <Typography variant="body2" color="info.contrastText" gutterBottom>
              📤 Uploading files... Please wait before proceeding
            </Typography>
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <Box key={fileName} mt={1}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="caption" color="info.contrastText">
                    {fileName}
                  </Typography>
                  <Typography variant="caption" color="info.contrastText">
                    {progress}%
                  </Typography>
                </Box>
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: 8, 
                    bgcolor: 'info.main', 
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}
                >
                  <Box 
                    sx={{ 
                      width: `${progress}%`, 
                      height: '100%', 
                      bgcolor: 'white',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* Enhanced Upload Errors with Recovery Options */}
        {Object.keys(uploadErrors).length > 0 && (
          <Box mb={2} p={2} bgcolor="error.light" borderRadius={1}>
            <Typography variant="body2" color="error.contrastText" gutterBottom>
              ❌ Upload errors detected. Please resolve before proceeding:
            </Typography>
            {Object.entries(uploadErrors).map(([fileName, error]) => {
              // Determine file type for recovery options
              const fileType = fileName.includes('.pdf') || fileName.includes('letter') ? 'letter' : 'image';
              
              // Smart error categorization based on error message
              const getErrorCategory = (errorMsg) => {
                const msg = errorMsg.toLowerCase();
                if (msg.includes('size') || msg.includes('large') || msg.includes('mb')) return 'size';
                if (msg.includes('format') || msg.includes('type') || msg.includes('invalid')) return 'validation';
                if (msg.includes('network') || msg.includes('connection')) return 'network';
                if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
                if (msg.includes('permission') || msg.includes('denied')) return 'permission';
                if (msg.includes('authentication') || msg.includes('login')) return 'authentication';
                if (msg.includes('server') || msg.includes('500') || msg.includes('502')) return 'server';
                if (msg.includes('rate') || msg.includes('too many')) return 'rate_limit';
                return 'unknown';
              };
              
              const errorCategory = getErrorCategory(error);
              
              return (
                <Box key={fileName} mt={2} p={2} bgcolor="error.main" borderRadius={1}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="white" gutterBottom>
                        <strong>📁 {fileName}</strong>
                      </Typography>
                      <Typography variant="caption" color="white" display="block">
                        ❌ {error}
                      </Typography>
                    </Box>
                    
                    {/* Action Buttons */}
                    <Box display="flex" gap={1}>
                      <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        onClick={() => handleRetryUpload(fileName, fileType)}
                        sx={{ 
                          minWidth: 'auto', 
                          px: 1,
                          backgroundColor: 'white',
                          color: 'primary.main',
                          '&:hover': {
                            backgroundColor: 'grey.100'
                          }
                        }}
                        title="Retry Upload"
                      >
                        🔄 Retry
                      </Button>
                      <Button
                        size="small"
                        color="secondary"
                        variant="contained"
                        onClick={() => handleFileOptimization(fileName, fileType)}
                        sx={{ 
                          minWidth: 'auto', 
                          px: 1,
                          backgroundColor: 'white',
                          color: 'secondary.main',
                          '&:hover': {
                            backgroundColor: 'grey.100'
                          }
                        }}
                        title="Get Optimization Tips"
                      >
                        🛠️ Optimize
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="contained"
                        onClick={() => clearUploadError(fileName)}
                        sx={{ 
                          minWidth: 'auto', 
                          px: 1,
                          backgroundColor: 'white',
                          color: 'error.main',
                          '&:hover': {
                            backgroundColor: 'grey.100'
                          }
                        }}
                        title="Clear Error"
                      >
                        ✕ Clear
                      </Button>
                    </Box>
                  </Box>
                  
                  {/* Recovery Steps */}
                  <Box mt={2} p={2} bgcolor="rgba(255,255,255,0.1)" borderRadius={1}>
                    <Typography variant="caption" color="white" gutterBottom display="block">
                      💡 Recovery Steps:
                    </Typography>
                    <Box component="ul" sx={{ margin: 0, paddingLeft: 2, color: 'white' }}>
                      {getErrorRecoverySteps(errorCategory, fileName).slice(0, 2).map((step, index) => (
                        <Box component="li" key={index} sx={{ fontSize: '0.75rem', marginBottom: 0.5 }}>
                          {step}
                        </Box>
                      ))}
                    </Box>
                    <Typography variant="caption" color="white" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                      Click "Optimize" for more detailed tips and "Retry" to attempt upload again.
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
        
        {/* Initial Image Upload Button */}
        {(!formData.eventImages || formData.eventImages.length === 0) && (
          <Button
            variant="outlined"
            component="label"
            sx={{ mb: 2 }}
            startIcon={<span>📷</span>}
          >
            Upload Event Images
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleImageChange}
            />
          </Button>
        )}
        
        {/* Enhanced Existing Images */}
        {existingImages.length > 0 && (
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              🖼️ Existing Images ({existingImages.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {existingImages.map((img, index) => {
                // Handle Cloudinary structure
                if (typeof img === 'object' && img.url) {
                  return (
                    <Box 
                      key={index} 
                      sx={{
                        position: 'relative',
                        border: '2px solid',
                        borderColor: 'info.main',
                        borderRadius: 2,
                        p: 1,
                        minWidth: 120,
                        backgroundColor: 'background.paper',
                        '&:hover': {
                          boxShadow: 2,
                          transform: 'scale(1.02)',
                          transition: 'all 0.2s ease'
                        }
                      }}
                    >
                      {/* Status Badge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          color: 'white',
                          backgroundColor: 'info.main',
                          zIndex: 1
                        }}
                      >
                        📁
                      </Box>

                      {/* Image Preview */}
                      <Box
                        sx={{
                          width: 120,
                          height: 120,
                          borderRadius: 1,
                          overflow: 'hidden',
                          mb: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8
                          }
                        }}
                        onClick={() => handlePreviewExistingImage(img, index)}
                      >
                        <img 
                          src={img.url} 
                          alt={img.filename || `Event Image ${index + 1}`} 
                          width="100%"
                          height="100%"
                          style={{ objectFit: 'cover' }} 
                        />
                      </Box>

                      {/* File Information */}
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography 
                          variant="caption" 
                          color="textSecondary" 
                          sx={{ 
                            display: 'block',
                            fontWeight: 'medium',
                            wordBreak: 'break-word',
                            lineHeight: 1.2
                          }}
                        >
                          {img.filename ? 
                            (img.filename.length > 20 ? img.filename.substring(0, 20) + '...' : img.filename) :
                            `Event Image ${index + 1}`
                          }
                        </Typography>
                        
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                          Existing File
                        </Typography>

                        {/* Action Buttons */}
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                          <Button 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            onClick={() => handlePreviewExistingImage(img, index)}
                            sx={{ minWidth: 'auto', px: 1 }}
                            title="Preview Image"
                          >
                            👁️
                          </Button>
                          <Button 
                            size="small" 
                            color="error" 
                            variant="outlined"
                            onClick={() => onRemoveExistingImage(img)}
                            sx={{ minWidth: 'auto', px: 1 }}
                            title="Remove Image"
                          >
                            🗑️
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  );
                }
                return null;
              })}
            </Box>
          </Box>
        )}
        
        {/* Enhanced New Uploads Preview */}
        {Array.isArray(formData.eventImages) && formData.eventImages.length > 0 && (
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              📸 New Images ({formData.eventImages.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {formData.eventImages.map((file, idx) => (
                <Box 
                  key={idx} 
                  sx={{
                    position: 'relative',
                    border: '2px solid',
                    borderColor: file.uploaded ? 'success.main' : 'warning.main',
                    borderRadius: 2,
                    p: 1,
                    minWidth: 120,
                    backgroundColor: 'background.paper',
                    '&:hover': {
                      boxShadow: 2,
                      transform: 'scale(1.02)',
                      transition: 'all 0.2s ease'
                    }
                  }}
                >
                  {/* File Status Badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: 'white',
                      backgroundColor: file.uploaded ? 'success.main' : 'warning.main',
                      zIndex: 1
                    }}
                  >
                    {file.uploaded ? '✅' : '⏳'}
                  </Box>

                  {/* Image Preview */}
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: 1,
                      overflow: 'hidden',
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 0.8
                      }
                    }}
                    onClick={() => handlePreviewImage(file, idx)}
                  >
                    <img
                      src={file.uploaded && file.cloudinaryUrl ? file.cloudinaryUrl : URL.createObjectURL(file)}
                      alt={`Upload Preview ${idx + 1}`}
                      width="100%"
                      height="100%"
                      style={{ objectFit: 'cover' }}
                    />
                  </Box>

                  {/* File Information */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography 
                      variant="caption" 
                      color="textSecondary" 
                      sx={{ 
                        display: 'block',
                        fontWeight: 'medium',
                        wordBreak: 'break-word',
                        lineHeight: 1.2
                      }}
                    >
                      {file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}
                    </Typography>
                    
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                      {getFileTypeIcon(file.type)} {formatFileSize(file.size)}
                    </Typography>

                    {/* Upload Progress for Pending Files */}
                    {!file.uploaded && uploadProgress[file.name] && (
                      <Box sx={{ mt: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography variant="caption" color="textSecondary">
                            {uploadProgress[file.name]}%
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: '100%',
                            height: 4,
                            bgcolor: 'grey.300',
                            borderRadius: 2,
                            overflow: 'hidden'
                          }}
                        >
                          <Box
                            sx={{
                              width: `${uploadProgress[file.name]}%`,
                              height: '100%',
                              bgcolor: 'warning.main',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </Box>
                      </Box>
                    )}

                    {/* Action Buttons */}
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                      <Button 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        onClick={() => handlePreviewImage(file, idx)}
                        sx={{ minWidth: 'auto', px: 1 }}
                        title="Preview Image"
                      >
                        👁️
                      </Button>
                      <Button 
                        size="small" 
                        color="error" 
                        variant="outlined"
                        onClick={() => handleRemoveImage(idx)}
                        sx={{ minWidth: 'auto', px: 1 }}
                        title="Remove Image"
                      >
                        🗑️
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        
        {/* Add Another Image Button - Only show if there are already images */}
        {Array.isArray(formData.eventImages) && formData.eventImages.length > 0 && (
          <Button
            variant="outlined"
            component="label"
            sx={{ mt: 1 }}
            startIcon={<span>➕</span>}
          >
            Add More Images
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={e => {
                handleAddImages(e);
                e.target.value = null; // Reset input after handling
              }}
            />
          </Button>
        )}
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Govt Approval Letter (Image/PDF)
        </Typography>
        
        {/* Upload Guidance */}
        <Box mb={2} p={2} bgcolor="info.light" borderRadius={1}>
          <Typography variant="subtitle2" color="info.contrastText" gutterBottom>
            💡 Upload Tips & Guidelines
          </Typography>
          {getUploadGuidance('letter').tips.map((tip, index) => (
            <Typography key={index} variant="caption" color="info.contrastText" display="block">
              {tip}
            </Typography>
          ))}
          <Typography variant="caption" color="info.contrastText" sx={{ mt: 1, fontStyle: 'italic' }}>
            💭 Pro tip: {getUploadGuidance('letter').recommendations[0]}
          </Typography>
        </Box>
        
        {/* Letter Status Summary */}
        <Box mb={2} p={2} bgcolor="grey.50" borderRadius={1} border="1px solid" borderColor="grey.300">
          <Typography variant="subtitle2" color="textPrimary" gutterBottom>
            📋 Letter Status Overview
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="caption" color="textSecondary">
                📄 Current Status: {existingLetter ? 'Existing Letter' : newLetterFile ? 'New Letter' : 'No Letter'}
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: existingLetter ? 'success.main' : newLetterFile ? 'warning.main' : 'error.main'
                }}
              >
                {existingLetter ? 'STORED' : newLetterFile ? 'PENDING' : 'MISSING'}
              </Box>
            </Box>
            
            {newLetterFile && (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="caption" color="textSecondary">
                  ⏳ Upload: {newLetterFile.uploaded ? 'Completed' : 'In Progress'}
                </Typography>
                <Box
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: newLetterFile.uploaded ? 'success.main' : 'warning.main'
                  }}
                >
                  {newLetterFile.uploaded ? '✅' : '⏳'}
                </Box>
              </Box>
            )}
            
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="caption" color="textSecondary">
                ⚠️ Errors: {uploadErrors[newLetterFile?.name] ? 1 : 0}
              </Typography>
              {uploadErrors[newLetterFile?.name] && (
                <Box
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: 'error.main'
                  }}
                >
                  1
                </Box>
              )}
            </Box>
          </Box>
        </Box>
        
        {/* Letter Upload Statistics */}
        {(() => {
          const stats = getUploadStatistics();
          if (newLetterFile || existingLetter) {
            return (
              <Box mb={2} p={2} bgcolor="success.light" borderRadius={1}>
                <Typography variant="subtitle2" color="success.contrastText" gutterBottom>
                  📊 Letter Upload Status
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="success.contrastText">
                    {existingLetter ? '📄 Existing Letter: Available' : '📄 New Letter: Ready'}
                  </Typography>
                  {newLetterFile && (
                    <Typography variant="caption" color="success.contrastText">
                      {newLetterFile.uploaded ? '✅ Uploaded' : '⏳ Pending Upload'}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          }
          return null;
        })()}
        
        {/* Enhanced Existing Letter Display */}
        {existingLetter && (
          <Box 
            sx={{
              border: '2px solid',
              borderColor: 'info.main',
              borderRadius: 2,
              p: 2,
              mb: 2,
              backgroundColor: 'background.paper',
              '&:hover': {
                boxShadow: 1,
                transition: 'all 0.2s ease'
              }
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box sx={{ flex: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="body2" color="info.main" sx={{ fontWeight: 'bold' }}>
                    📁 Existing Letter Available
                  </Typography>
                  <Box
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: 'white',
                      backgroundColor: 'info.main'
                    }}
                  >
                    STORED
                  </Box>
                </Box>
                
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  📄 {existingLetter}
                </Typography>
                
                <Typography variant="caption" color="textSecondary" display="block">
                  💾 This letter is already stored in the system
                </Typography>
              </Box>

              {/* Action Buttons */}
              <Box display="flex" flexDirection="column" gap={1}>
                <Button 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  component="a"
                  href={`http://localhost:5000/uploads/${existingLetter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ minWidth: 'auto', px: 1 }}
                  title="View Letter"
                >
                  👁️ View
                </Button>
                <Button 
                  size="small" 
                  color="error" 
                  variant="outlined"
                  onClick={onRemoveExistingLetter}
                  sx={{ minWidth: 'auto', px: 1 }}
                  title="Remove Letter"
                >
                  🗑️ Remove
                </Button>
              </Box>
            </Box>
          </Box>
        )}
        
        {/* Enhanced New Letter Upload Status */}
        {newLetterFile && (
          <Box 
            sx={{
              border: '2px solid',
              borderColor: newLetterFile.uploaded ? 'success.main' : 'warning.main',
              borderRadius: 2,
              p: 2,
              mb: 2,
              backgroundColor: 'background.paper',
              '&:hover': {
                boxShadow: 1,
                transition: 'all 0.2s ease'
              }
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ flex: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography 
                    variant="body2" 
                    color={newLetterFile.uploaded ? 'success.main' : 'warning.main'} 
                    sx={{ fontWeight: 'bold' }}
                  >
                    {newLetterFile.uploaded ? '✅' : '⏳'} New Letter Uploaded
                  </Typography>
                  <Box
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: 'white',
                      backgroundColor: newLetterFile.uploaded ? 'success.main' : 'warning.main'
                    }}
                  >
                    {newLetterFile.uploaded ? 'COMPLETED' : 'PENDING'}
                  </Box>
                </Box>
                
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  📄 {newLetterFile.name}
                </Typography>
                
                <Typography variant="caption" color="textSecondary" display="block">
                  📏 Size: {formatFileSize(newLetterFile.size)}
                </Typography>
                
                <Typography variant="caption" color="textSecondary" display="block">
                  📋 Type: {getFileTypeIcon(newLetterFile.type)} {newLetterFile.type}
                </Typography>

                {/* Upload Progress for Pending Files */}
                {!newLetterFile.uploaded && uploadProgress[newLetterFile.name] && (
                  <Box sx={{ mt: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" color="textSecondary">
                        Upload Progress: {uploadProgress[newLetterFile.name]}%
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 6,
                        bgcolor: 'grey.300',
                        borderRadius: 3,
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          width: `${uploadProgress[newLetterFile.name]}%`,
                          height: '100%',
                          bgcolor: 'warning.main',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Action Buttons */}
              <Box display="flex" flexDirection="column" gap={1}>
                <Button 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  onClick={() => handlePreviewLetter(newLetterFile)}
                  sx={{ minWidth: 'auto', px: 1 }}
                  title="Preview Letter"
                >
                  👁️ Preview
                </Button>
                <Button 
                  size="small" 
                  color="error" 
                  variant="outlined"
                  onClick={handleRemoveNewLetter}
                  sx={{ minWidth: 'auto', px: 1 }}
                  title="Remove Letter"
                >
                  🗑️ Remove
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {/* Letter Upload Progress */}
        {isUploading && uploadProgress[newLetterFile?.name] && (
          <Box mb={2} p={2} bgcolor="info.light" borderRadius={1}>
            <Typography variant="body2" color="info.contrastText" gutterBottom>
              📤 Uploading letter: {newLetterFile?.name}
            </Typography>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption" color="info.contrastText">
                Progress
              </Typography>
              <Typography variant="caption" color="info.contrastText">
                {uploadProgress[newLetterFile?.name]}%
              </Typography>
            </Box>
            <Box 
              sx={{ 
                width: '100%', 
                height: 8, 
                bgcolor: 'info.main', 
                borderRadius: 4,
                overflow: 'hidden'
              }}
            >
              <Box 
                sx={{ 
                  width: `${uploadProgress[newLetterFile?.name]}%`, 
                  height: '100%', 
                  bgcolor: 'white',
                  transition: 'width 0.3s ease'
                }}
              />
            </Box>
          </Box>
        )}

        {/* Enhanced Letter Upload Errors with Recovery Options */}
        {uploadErrors[newLetterFile?.name] && (
          <Box mb={2} p={2} bgcolor="error.light" borderRadius={1}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="error.contrastText" gutterBottom>
                  ❌ Upload error: {uploadErrors[newLetterFile?.name]}
                </Typography>
                <Typography variant="caption" color="error.contrastText" display="block">
                  📄 File: {newLetterFile?.name}
                </Typography>
              </Box>
              
              {/* Action Buttons */}
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  color="primary"
                  variant="contained"
                  onClick={() => handleRetryUpload(newLetterFile?.name, 'letter')}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1,
                    backgroundColor: 'white',
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'grey.100'
                    }
                  }}
                  title="Retry Upload"
                >
                  🔄 Retry
                </Button>
                <Button
                  size="small"
                  color="secondary"
                  variant="contained"
                  onClick={() => handleFileOptimization(newLetterFile?.name, 'letter')}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1,
                    backgroundColor: 'white',
                    color: 'secondary.main',
                    '&:hover': {
                      backgroundColor: 'grey.100'
                    }
                  }}
                  title="Get Optimization Tips"
                >
                  🛠️ Optimize
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  onClick={() => clearUploadError(newLetterFile?.name)}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1,
                    backgroundColor: 'white',
                    color: 'error.main',
                    '&:hover': {
                      backgroundColor: 'grey.100'
                    }
                  }}
                  title="Clear Error"
                >
                  ✕ Clear
                </Button>
              </Box>
            </Box>
            
            {/* Recovery Steps */}
            <Box mt={2} p={2} bgcolor="rgba(255,255,255,0.1)" borderRadius={1}>
              <Typography variant="caption" color="error.contrastText" gutterBottom display="block">
                💡 Recovery Steps:
              </Typography>
              <Box component="ul" sx={{ margin: 0, paddingLeft: 2, color: 'error.contrastText' }}>
                {getErrorRecoverySteps('unknown', newLetterFile?.name).slice(0, 2).map((step, index) => (
                  <Box component="li" key={index} sx={{ fontSize: '0.75rem', marginBottom: 0.5 }}>
                    {step}
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" color="error.contrastText" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                Click "Optimize" for more detailed tips and "Retry" to attempt upload again.
              </Typography>
            </Box>
          </Box>
        )}
        
        {/* File Upload Input */}
        <input 
          type="file" 
          name="govtApprovalLetter"
          accept="image/*,application/pdf" 
          onChange={handleLetterChange}
          style={{ marginTop: '8px' }}
        />
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          Upload a new government approval letter. You can remove it before proceeding if needed.
        </Typography>
      </Box>

      <TimeSlotBuilder
        timeSlotsEnabled={formData.timeSlotsEnabled || false}
        setTimeSlotsEnabled={(enabled) => setFormData(prev => ({ ...prev, timeSlotsEnabled: enabled }))}
        timeSlots={formData.timeSlots || []}
        setTimeSlots={(slots) => setFormData(prev => ({ ...prev, timeSlots: slots }))}
        remainingVolunteers={remainingVolunteers}
        unlimitedVolunteers={formData.unlimitedVolunteers}
        allocationError={allocationError}
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        readOnly={readOnly}
      />

      <Button 
        type="submit" 
        variant="contained" 
        color="primary" 
        fullWidth 
        sx={{ mt: 3 }}
        disabled={
          (formData.timeSlotsEnabled && !formData.unlimitedVolunteers && remainingVolunteers < 0) ||
          isUploading ||
          Object.keys(uploadErrors).length > 0
        }
      >
        {isUploading ? '⏳ Uploading files...' : 'Proceed to Questionnaire →'}
      </Button>
      
      {/* Helper text for disabled button */}
      {formData.timeSlotsEnabled && !formData.unlimitedVolunteers && remainingVolunteers < 0 && (
        <Typography variant="body2" color="error" sx={{ mt: 1, textAlign: 'center' }}>
          ⚠️ Cannot proceed: You have over-allocated {Math.abs(remainingVolunteers)} volunteers. 
          Please adjust your category limits above before continuing.
        </Typography>
      )}

      {/* Helper text for upload issues */}
      {isUploading && (
        <Typography variant="body2" color="info" sx={{ mt: 1, textAlign: 'center' }}>
          ⏳ Please wait for file uploads to complete before proceeding
        </Typography>
      )}

      {Object.keys(uploadErrors).length > 0 && (
        <Typography variant="body2" color="error" sx={{ mt: 1, textAlign: 'center' }}>
          ❌ Please resolve file upload errors before proceeding
        </Typography>
      )}
    </Box>
  );
}
