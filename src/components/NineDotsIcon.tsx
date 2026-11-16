import React from 'react';

interface NineDotsIconProps {
  className?: string;
}

export const NineDotsIcon: React.FC<NineDotsIconProps> = ({ className = 'w-5 h-5' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="5" cy="5" r="1.8" />
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="19" cy="5" r="1.8" />
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
      <circle cx="5" cy="19" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
      <circle cx="19" cy="19" r="1.8" />
    </svg>
  );
};
