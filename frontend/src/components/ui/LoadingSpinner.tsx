import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className={`${className} flex items-center justify-center`}>
      <div
        className={`${sizeClasses[size]} border-t-orange-500 rounded-full animate-spin border-stone-300`}
        role="status"
        aria-label="loading"
      />
    </div>
  );
};

export default LoadingSpinner; 