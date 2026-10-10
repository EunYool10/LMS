import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import officialFallback from '../../assets/branding/tds-official-logo.png';

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

  // If no source provided initially, use fallback directly
  const imageSource = hasPrimaryError || !hasValidSrc ? officialFallback : src!;

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

  const isFallbackActive = hasPrimaryError || !hasValidSrc;

  return (
    <div className={`relative ${containerClassName}`}>
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center z-10" />
      )}

      <img
        src={imageSource}
        alt={alt || '강의 썸네일'}
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} ${
          isFallbackActive ? 'object-contain p-1.5 bg-slate-900' : 'object-cover'
        } ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-150`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
