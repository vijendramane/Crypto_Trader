import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`
          ${sizeClasses[size]}
          border-2 border-primary-200 border-t-primary-600
          rounded-full spinner
        `}
      />
    </div>
  );
};

export default LoadingSpinner;