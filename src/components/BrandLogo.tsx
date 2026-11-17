import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md';
  showText?: boolean;
  lightText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  lightText = false,
}) => {
  const iconSize = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconSize} shrink-0`}
        aria-hidden="true"
      >
        {/* Trust shield base */}
        <path
          d="M18 3L5 8.2V17.4C5 25.1 10.5 31.8 18 33.5C25.5 31.8 31 25.1 31 17.4V8.2L18 3Z"
          fill="#1B4332"
          stroke="#2D6A4F"
          strokeWidth="1.5"
        />
        {/* Botanical leaf contour */}
        <path
          d="M11.5 23C11.5 16.5 16.2 11.8 23.5 11.2C23.8 18.2 19.6 23.2 13 23.2"
          fill="#40916C"
          fillOpacity="0.35"
          stroke="#D8F3DC"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Leaf stem & AI circuit node */}
        <path
          d="M11 24.5L19.5 16"
          stroke="#FAF9F6"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="20.5" cy="15" r="2" fill="#95D5B2" />
        <circle cx="15" cy="17" r="1.3" fill="#D8F3DC" />
      </svg>
      {showText && (
        <span
          className={`font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0 ${
            lightText ? 'text-white' : 'text-[#1B4332]'
          }`}
        >
          AgriTrust AI
        </span>
      )}
    </span>
  );
};
