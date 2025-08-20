// Utility functions for avatar handling

// Get user's display name (prefer username, fallback to name)
export const getDisplayName = (user) => {
  if (!user || user.isDeleted) {
    return 'Deleted User';
  }
  return user?.username || user?.name || 'U';
};

// Get first letter of user's name for avatar
export const getAvatarInitial = (user) => {
  if (!user || user.isDeleted) {
    return 'D'; // D for Deleted
  }
  const displayName = getDisplayName(user);
  return displayName.charAt(0).toUpperCase();
};

// Get profile image URL
export const getProfileImageUrl = (user) => {
  // Handle deleted users
  if (!user || user.isDeleted) {
    return null;
  }
  
  // Check for uploaded profile image first (user's custom choice)
  if (user?.profileImage) {
    // If profileImage is already a URL (Cloudinary or OAuth), return it directly
    if (user.profileImage.startsWith('http')) {
      return user.profileImage;
    }
    // No legacy support - only Cloudinary URLs
    return null;
  }
  
  // Check for OAuth profile image
  if (user?.oauthProfileImage) {
    return user.oauthProfileImage;
  }
  
  return null;
};

// Get government ID proof URL
export const getGovtIdProofUrl = (user) => {
  if (!user || user.isDeleted) {
    return null;
  }
  
  if (user?.govtIdProofUrl) {
    // If it's already a URL (Cloudinary), return it directly
    if (user.govtIdProofUrl.startsWith('http')) {
      return user.govtIdProofUrl;
    }
    // No legacy support - only Cloudinary URLs
    return null;
  }
  
  return null;
};

// Check if URL is from Cloudinary
export const isCloudinaryUrl = (url) => {
  return url && url.includes('cloudinary.com');
};

// Check if URL is legacy local uploads
export const isLegacyUrl = (url) => {
  return url && url.includes('localhost:5000/uploads');
};

// Get organization logo URL
export const getOrganizationLogoUrl = (organization) => {
  if (!organization) return null;
  
  if (organization.logo) {
    // If logo is already a URL (Cloudinary), return it directly
    if (organization.logo.startsWith('http')) {
      return organization.logo;
    }
    // No legacy support - only Cloudinary URLs
    return null;
  }
  
  return null;
};

// Check if organization has a logo
export const hasOrganizationLogo = (organization) => {
  return !!getOrganizationLogoUrl(organization);
};

// Get organization document URL
export const getOrganizationDocumentUrl = (organization, documentType) => {
  if (!organization || !documentType) return null;
  
  const document = organization.documents?.[documentType];
  if (!document) return null;
  
  // If document is already a URL (Cloudinary), return it directly
  if (document.startsWith('http')) {
    return document;
  }
  
  // No legacy support - only Cloudinary URLs
  return null;
};

// Get role-based avatar colors
export const getRoleColors = (role) => {
  const colors = {
    volunteer: 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-200 text-green-600',
    organizer: 'bg-gradient-to-r from-blue-100 to-emerald-100 border-blue-200 text-blue-600',
    sponsor: 'bg-gradient-to-r from-purple-100 to-blue-100 border-purple-200 text-purple-600',
    admin: 'bg-gradient-to-r from-red-100 to-pink-100 border-red-200 text-red-600',
    user: 'bg-gradient-to-r from-gray-100 to-slate-100 border-gray-200 text-gray-600'
  };
  
  return colors[role] || colors.user;
};
