import React from 'react';

interface WordmarkProps {
  className?: string;
  title?: string;
}

/**
 * TDSNT wordmark (geometric monoline letters). Drawn with strokes in currentColor,
 * so it takes the text color of its container: navy on light surfaces, white on dark.
 */
export const TDSNTWordmark: React.FC<WordmarkProps> = ({ className = 'h-5 w-auto', title = 'TDSNT' }) => (
  <svg viewBox="0 0 592 115" className={className} role="img" aria-label={title} fill="none">
    <title>{title}</title>
    <g stroke="currentColor" strokeWidth="22" strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="2">
      {/* T */}
      <path d="M0 11H130M65 11V115" />
      {/* D (open bowl) */}
      <path d="M145 11H172A46.5 46.5 0 0 1 172 104H145" />
      {/* S */}
      <path d="M335 11H281A23.25 23.25 0 0 0 281 57.5H307A23.25 23.25 0 0 1 307 104H250" />
      {/* N */}
      <path d="M371 115V11L429 104V0" />
      {/* T */}
      <path d="M462 11H592M527 11V115" />
    </g>
  </svg>
);

interface BrandLogoProps {
  onClick?: () => void;
  className?: string;
  /** Use on dark backgrounds. */
  inverted?: boolean;
}

/** TDSNT wordmark + "LMS" product label. */
export const BrandLogo: React.FC<BrandLogoProps> = ({ onClick, className = '', inverted = false }) => {
  const content = (
    <span className={`flex shrink-0 items-center gap-2 ${className}`}>
      <TDSNTWordmark className={`h-[18px] w-auto ${inverted ? 'text-white' : 'text-navy-900'}`} />
      <span
        className={`border-l pl-2 text-[13px] font-semibold tracking-wide ${
          inverted ? 'border-white/30 text-white/80' : 'border-neutral-300 text-neutral-500'
        }`}
      >
        LMS
      </span>
    </span>
  );

  if (!onClick) return content;

  return (
    <button type="button" onClick={onClick} aria-label="TDSNT LMS 홈" className="cursor-pointer rounded-md">
      {content}
    </button>
  );
};
