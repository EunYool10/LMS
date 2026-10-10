import React, { useState } from 'react';
import tdsOfficialLogo from '../../assets/branding/tds-official-logo.png';

interface BrandLogoProps {
  onClick?: () => void;
  className?: string;
  /** Use on dark backgrounds (footer, admin sidebar). */
  inverted?: boolean;
}

/** TDS logo mark + TDSNTLMS wordmark. Falls back to a text emblem if the image fails. */
export const BrandLogo: React.FC<BrandLogoProps> = ({ onClick, className = '', inverted = false }) => {
  const [failed, setFailed] = useState(false);

  const content = (
    <span className={`flex shrink-0 items-center gap-2 ${className}`}>
      {failed ? (
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-800 text-[11px] font-black tracking-tight text-white">
          TDS
        </span>
      ) : (
        <img src={tdsOfficialLogo} alt="" className="h-8 w-8 object-contain" onError={() => setFailed(true)} />
      )}
      <span className={`text-[17px] font-bold tracking-tight ${inverted ? 'text-white' : 'text-navy-900'}`}>
        TDSNT<span className={inverted ? 'text-brand-300' : 'text-brand-600'}>LMS</span>
      </span>
    </span>
  );

  if (!onClick) return content;

  return (
    <button type="button" onClick={onClick} aria-label="TDSNTLMS 홈" className="cursor-pointer rounded-md">
      {content}
    </button>
  );
};
