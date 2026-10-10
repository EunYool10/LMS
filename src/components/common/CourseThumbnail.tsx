import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { TDSNTWordmark } from './BrandLogo';

interface CourseThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: 'video' | 'square' | 'auto';
  fallbackText?: string;
}

/**
 * Enterprise CourseThumbnail component
 * 
 * Rules (Phase 6):
 * - LOADING: Skeleton
 * - SUCCESS: Real DB image
 * - ERROR: Official TDS fallback asset
 * - MISSING: Official TDS fallback asset
 * - Fallback error: CSS-based TDSNTLMS branded empty state (prevents infinite loops)
 * - Aspect ratio maintained, fixed sizing, object-fit, overflow hidden, border radius
 */
export const CourseThumbnail: React.FC<CourseThumbnailProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  containerClassName = 'w-14 h-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative',
  fallbackText,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasPrimaryError, setHasPrimaryError] = useState(false);
  const [hasFallbackError, setHasFallbackError] = useState(false);

  const hasValidSrc = Boolean(src && typeof src === 'string' && src.trim().length > 0 && !src.includes('placeholder') && !src.includes('unsplash.com'));

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    if (!hasPrimaryError && hasValidSrc) {
      // Primary image failed, try official TDS fallback
      setHasPrimaryError(true);
      setIsLoading(false);
    } else {
      // Even fallback failed or no source, stop attempting images and render CSS fallback
      setHasFallbackError(true);
      setIsLoading(false);
    }
  };

  // Final CSS-based Branded State (No broken image icons, no random images)
  if (hasFallbackError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-900 text-slate-300 p-1 select-none ${containerClassName}`}
        title={alt}
      >
        <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
        {fallbackText && (
          <span className="text-[9px] font-bold tracking-tight text-white line-clamp-1 mt-0.5">
            {fallbackText}
          </span>
        )}
      </div>
    );
  }

  if (hasPrimaryError || !hasValidSrc) {
    return (
      <div className={`flex items-center justify-center bg-navy-50 text-navy-700 ${containerClassName}`} title={alt}>
        <TDSNTWordmark className="w-[60%] h-auto" />
      </div>
    );
  }

  return (
    <div className={`relative ${containerClassName}`}>
      {isLoading && <div className="absolute inset-0 z-10 animate-pulse bg-neutral-200" />}
      <img
        src={src!}
        alt={alt || '강의 썸네일'}
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-150`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
