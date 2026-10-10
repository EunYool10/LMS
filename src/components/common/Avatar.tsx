import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { Check } from 'lucide-react';
import { isAdminRole } from '../../utils/rbac';

interface AvatarProps {
  user?: Partial<User> | null;
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  /** Small marker for staff accounts (blue check) or learners (dot). */
  showRoleBadge?: boolean;
  /** Blue check for staff accounts only. */
  showVerifiedBadge?: boolean;
}

const SIZES: Record<NonNullable<AvatarProps['size']>, { box: string; text: string; badge: string }> = {
  xs: { box: 'h-6 w-6', text: 'text-[10px]', badge: 'h-2.5 w-2.5' },
  sm: { box: 'h-8 w-8', text: 'text-xs', badge: 'h-3 w-3' },
  md: { box: 'h-10 w-10', text: 'text-sm', badge: 'h-3.5 w-3.5' },
  lg: { box: 'h-14 w-14', text: 'text-lg', badge: 'h-4 w-4' },
  xl: { box: 'h-20 w-20', text: 'text-2xl', badge: 'h-5 w-5' },
  '2xl': { box: 'h-28 w-28', text: 'text-4xl', badge: 'h-7 w-7' },
};

/** Round profile picture with an initial fallback. */
export const Avatar: React.FC<AvatarProps> = ({
  user,
  src,
  name,
  size = 'md',
  className = '',
  showRoleBadge = false,
  showVerifiedBadge = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const displayName = name ?? user?.name ?? '사용자';
  const email = user?.email?.toLowerCase();
  const fallbackPhoto =
    email === 'ayun24song@gmail.com' || user?.id === 'admin_ayun24song'
      ? '/송윤아.png'
      : email === 'teamdevstudiont@gmail.com' || displayName === 'TDSNTLMS' || user?.id === 'TDSNTLMS'
      ? '/images/tdsntlms_profile.png'
      : null;
  const rawSrc = src ?? user?.avatar ?? fallbackPhoto;
  const hasImage = !!rawSrc && !imageError && rawSrc.trim() !== '' && !rawSrc.includes('unsplash.com') && !rawSrc.includes('placeholder');

  const role = user?.role as UserRole | undefined;
  const isStaff = isAdminRole(role);
  const { box, text, badge } = SIZES[size] || SIZES.md;

  return (
    <span className={`relative inline-flex shrink-0 select-none ${className}`}>
      {hasImage ? (
        <img
          src={rawSrc!}
          alt={displayName}
          onError={() => setImageError(true)}
          className={`${box} rounded-full border border-neutral-200 object-cover`}
        />
      ) : (
        <span
          className={`${box} ${text} flex items-center justify-center rounded-full bg-navy-50 font-semibold text-navy-700`}
          title={displayName}
          aria-label={displayName}
        >
          {displayName.trim().slice(0, 1) || '?'}
        </span>
      )}

      {(showVerifiedBadge || showRoleBadge) && isStaff && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${badge} flex items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white`}
          title="공식 운영진"
        >
          <Check className="h-[70%] w-[70%]" strokeWidth={3.5} />
        </span>
      )}
      {showRoleBadge && !isStaff && role && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white" title="수강생" />
      )}
    </span>
  );
};
