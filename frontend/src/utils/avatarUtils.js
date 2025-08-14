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
    // If profileImage looks like a URL (OAuth picture), return it directly
    if (user.profileImage.startsWith('http')) {
      return user.profileImage;
    }
    // Otherwise, it's an uploaded image
    const uploadedImageUrl = `http://localhost:5000/uploads/Profiles/${user.profileImage}`;
    return uploadedImageUrl;
  }
  
  // Check for OAuth picture as fallback (Google profile picture)
  if (user?.oauthPicture) {
    return user.oauthPicture;
  }
  
  // Additional fallback: check for profilePicture field (some APIs use this)
  if (user?.profilePicture) {
    return user.profilePicture;
  }
  
  return null;
};

// Check if user has a profile image
export const hasProfileImage = (user) => {
  if (!user || user.isDeleted) {
    return false;
  }
  return !!(user?.profileImage || user?.oauthPicture);
};

// Get role-based colors for avatar backgrounds
export const getRoleColors = (role) => {
  const colors = {
    volunteer: 'bg-green-100 text-green-600 border-green-200',
    organizer: 'bg-blue-100 text-blue-600 border-blue-200',
    sponsor: 'bg-purple-100 text-purple-600 border-purple-200',
    user: 'bg-blue-100 text-blue-600 border-blue-200',
    deleted: 'bg-gray-100 text-gray-600 border-gray-200' // Special color for deleted users
  };
  return colors[role] || colors.user;
};
