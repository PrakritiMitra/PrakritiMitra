// Utility functions for avatar handling

// Get user's display name (prefer username, fallback to name)
export const getDisplayName = (user) => {
  return user?.username || user?.name || 'U';
};

// Get first letter of user's name for avatar
export const getAvatarInitial = (user) => {
  const displayName = getDisplayName(user);
  return displayName.charAt(0).toUpperCase();
};

// Get profile image URL
export const getProfileImageUrl = (user) => {
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
  
  return null;
};

// Check if user has a profile image
export const hasProfileImage = (user) => {
  return !!(user?.profileImage || user?.oauthPicture);
};

// Get role-based colors for avatar backgrounds
export const getRoleColors = (role) => {
  const colors = {
    volunteer: 'bg-green-100 text-green-600 border-green-200',
    organizer: 'bg-blue-100 text-blue-600 border-blue-200',
    sponsor: 'bg-purple-100 text-purple-600 border-purple-200',
    user: 'bg-blue-100 text-blue-600 border-blue-200'
  };
  return colors[role] || colors.user;
};
