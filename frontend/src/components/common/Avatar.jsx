import React from 'react';
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from '../../utils/avatarUtils';
import { getSafeUserData, getSafeUserName } from '../../utils/safeUserUtils';

const Avatar = ({ 
  user, 
  size = 'md', 
  className = '', 
  showBorder = true,
  onClick = null,
  role = 'user' // 'user', 'volunteer', 'organizer', 'sponsor'
}) => {
  // Get safe user data to handle deleted users
  const safeUser = getSafeUserData(user);
  
  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
    '3xl': 'w-24 h-24 text-3xl'
  };

  const profileImageUrl = getProfileImageUrl(safeUser);
  const firstLetter = getAvatarInitial(safeUser);
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const roleColor = getRoleColors(role);
  const borderClass = showBorder ? 'border-2' : '';

  // Debug logging in development
  if (process.env.NODE_ENV === 'development' && profileImageUrl) {
    console.log('Avatar profile image URL:', profileImageUrl, 'for user:', user?.username || user?.name);
  }

  const baseClasses = `rounded-full flex items-center justify-center overflow-hidden ${sizeClass} ${roleColor} ${borderClass} ${className}`;

  if (onClick) {
    return (
      <div 
        className={`${baseClasses} cursor-pointer transition-transform hover:scale-105`}
        onClick={onClick}
      >
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={getSafeUserName(safeUser)}
            className="w-full h-full object-cover"

          />
        ) : null}
        <span className={`font-bold ${profileImageUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
          {firstLetter}
        </span>
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {profileImageUrl ? (
        <img
          src={profileImageUrl}
          alt={getSafeUserName(safeUser)}
          className="w-full h-full object-cover"

        />
      ) : null}
      <span className={`font-bold ${profileImageUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
        {firstLetter}
      </span>
    </div>
  );
};

export default Avatar;
