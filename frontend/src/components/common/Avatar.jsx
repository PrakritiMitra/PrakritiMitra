import React from 'react';
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from '../../utils/avatarUtils';

const Avatar = ({ 
  user, 
  size = 'md', 
  className = '', 
  showBorder = true,
  onClick = null,
  role = 'user' // 'user', 'volunteer', 'organizer', 'sponsor'
}) => {
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

  const profileImageUrl = getProfileImageUrl(user);
  const firstLetter = getAvatarInitial(user);
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const roleColor = getRoleColors(role);
  const borderClass = showBorder ? 'border-2' : '';

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
            alt={user?.username || user?.name || 'User'}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-bold">{firstLetter}</span>
        )}
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {profileImageUrl ? (
        <img
          src={profileImageUrl}
          alt={user?.username || user?.name || 'User'}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-bold">{firstLetter}</span>
      )}
    </div>
  );
};

export default Avatar;
