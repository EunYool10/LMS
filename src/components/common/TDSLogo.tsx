import React from 'react';
import tdsOfficialLogo from '../../assets/branding/tds-official-logo.png';

interface TDSLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'navbar' | 'custom';
  alt?: string;
}

/**
 * Shared TDS Logo Component
 * Direct reference to the official source asset: /assets/branding/tds-official-logo.png
 */
export const TDSLogo: React.FC<TDSLogoProps> = ({
  className = '',
  size = 'navbar',
  alt = 'TDS Official Logo',
}) => {
  const heightMap: Record<string, string> = {
    navbar: '38px',
    sm: '28px',
    md: '34px',
    lg: '40px',
    custom: '',
  };

  const selectedHeight = heightMap[size] || '38px';

  return (
    <div className={`tds-brand-logo flex items-center justify-center shrink-0 overflow-visible ${className}`}>
      <img
        src={tdsOfficialLogo || '/assets/branding/tds-official-logo.png'}
        alt={alt}
        className="tds-official-logo block w-auto object-contain shrink-0 select-none"
        style={{
          display: 'block',
          height: selectedHeight || undefined,
          width: 'auto',
          objectFit: 'contain',
          flexShrink: 0,
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
