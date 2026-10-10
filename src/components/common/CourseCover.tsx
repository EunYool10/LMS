import React, { useState } from 'react';
import { CategoryIcon, resolveCategory } from './CategoryIcon';

interface CourseCoverProps {
  thumbnail?: string | null;
  title: string;
  categoryId?: string;
  className?: string;
  /** Compact covers (list rows, mini cards) hide the category caption. */
  compact?: boolean;
}

// Soft, on-brand tints rotated by category so the catalog doesn't look uniform.
const TINTS = [
  'bg-brand-50 text-brand-600',
  'bg-navy-50 text-navy-600',
  'bg-neutral-100 text-neutral-600',
  'bg-brand-100/70 text-brand-700',
];

function tintFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

function isUsableImage(src?: string | null) {
  return !!src && src.trim() !== '' && !src.includes('unsplash.com') && !src.includes('placeholder');
}

/**
 * 16:9 course cover. Shows the course thumbnail when there is one,
 * otherwise a light category-tinted cover with the category icon.
 */
export const CourseCover: React.FC<CourseCoverProps> = ({ thumbnail, title, categoryId, className = '', compact }) => {
  const [failed, setFailed] = useState(false);
  const category = resolveCategory(categoryId);

  if (isUsableImage(thumbnail) && !failed) {
    return (
      <div className={`relative overflow-hidden bg-neutral-100 ${className}`}>
        <img
          src={thumbnail!}
          alt={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center gap-2 ${tintFor(categoryId || title)} ${className}`}
      aria-label={title}
    >
      <svg className="absolute inset-0 w-full h-full opacity-[0.35]" aria-hidden="true">
        <defs>
          <pattern id="cover-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cover-grid)" />
      </svg>
      <div className={`relative rounded-xl bg-white shadow-xs flex items-center justify-center ${compact ? 'w-8 h-8' : 'w-12 h-12'}`}>
        <CategoryIcon categoryId={categoryId} className={compact ? 'w-4 h-4' : 'w-6 h-6'} strokeWidth={1.75} />
      </div>
      {!compact && category && (
        <span className="relative text-[11px] font-semibold opacity-80">{category.name}</span>
      )}
    </div>
  );
};
