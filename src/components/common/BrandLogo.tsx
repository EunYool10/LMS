import React, { useState, useEffect } from 'react';
import tdsOfficialLogo from '../../assets/branding/tds-official-logo.png';

interface BrandLogoProps {
  onClick?: () => void;
  className?: string;
}

/**
 * Dedicated BrandLogo Component for TDSNTLMS
 * Strict validation and multi-layer fallback handling:
 * 1. Checks if image source URL is present and valid string.
 * 2. Pre-validates image loading using browser Image constructor.
 * 3. Shows subtle pulsing loading skeleton placeholder during verification.
 * 4. In case of broken image URL, 404, or rendering error, displays a clean,
 *    high-fidelity branded SVG/text-based emblem ("TDS") that complies with
 *    brand design guidelines, completely eliminating broken image icons.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ onClick, className = '' }) => {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  // Candidate image sources in priority order
  const imageSource = tdsOfficialLogo || '/assets/branding/tds-official-logo.png';

  useEffect(() => {
    if (!imageSource || typeof imageSource !== 'string' || imageSource.trim() === '') {
      setImageStatus('error');
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.src = imageSource;

    img.onload = () => {
      if (isMounted) {
        setImageStatus('loaded');
      }
    };

    img.onerror = () => {
      if (isMounted) {
        setImageStatus('error');
      }
    };

    return () => {
      isMounted = false;
    };
  }, [imageSource]);

  const content = (
    <div className={`tds-brand flex items-center shrink-0 min-w-0 ${className}`}>
      {/* Official TDS Logo Container with placeholder / fallback support */}
      <div
        className="tds-brand-logo relative flex items-center justify-center shrink-0 overflow-hidden rounded-lg w-8 h-8 sm:w-9 sm:h-9"
      >
        {/* State 1: Loading Skeleton Placeholder */}
        {imageStatus === 'loading' && (
          <div
            className="absolute inset-0 bg-slate-200/90 animate-pulse rounded-lg flex items-center justify-center border border-slate-200"
            aria-label="로고 로딩 중"
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-indigo-200/70" />
          </div>
        )}

        {/* State 2: High-Fidelity Text/Emblem Fallback on Error */}
        {imageStatus === 'error' && (
          <div
            className="w-full h-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 rounded-lg flex flex-col items-center justify-center text-white shadow-2xs border border-indigo-500/40 select-none"
            aria-label="TDS 로고"
          >
            <span className="text-[10.5px] sm:text-[12px] font-black tracking-tighter leading-none text-white drop-shadow-xs">
              TDS
            </span>
            <span className="text-[6.5px] sm:text-[7.5px] font-bold text-indigo-200 tracking-wider leading-none mt-0.5">
              LMS
            </span>
          </div>
        )}

        {/* State 3: Validated Official Image */}
        {imageStatus === 'loaded' && (
          <img
            src={imageSource}
            alt="TDS Official Logo"
            className="block h-8 sm:h-9 w-auto object-contain shrink-0 select-none max-h-8 sm:max-h-9"
            referrerPolicy="no-referrer"
            onError={() => setImageStatus('error')}
          />
        )}
      </div>

      {/* TDS Brand Typography (clean corporate styling) */}
      <div className="tds-brand-text flex flex-col justify-center leading-none text-left select-none ml-2 sm:ml-2.5 min-w-0">
        <div className="tds-service-name text-sm sm:text-[16px] md:text-[17px] font-bold text-slate-900 tracking-[-0.3px] whitespace-nowrap leading-tight">
          TDSNTLMS
        </div>
        <div className="tds-service-subtitle text-[9px] sm:text-[10px] font-semibold text-slate-400 whitespace-nowrap leading-tight mt-0.5 hidden min-[360px]:block">
          <span className="hidden sm:inline">Enterprise Learning Platform</span>
          <span className="sm:hidden">Enterprise LMS</span>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        id="btn-nav-brand-home"
        onClick={onClick}
        className="flex items-center shrink-0 cursor-pointer group focus:outline-none select-none text-left p-0 border-0 bg-transparent"
        aria-label="TDSNTLMS 홈으로 이동"
      >
        {content}
      </button>
    );
  }

  return content;
};
