import React, { useState } from 'react';
import { User, UserRole, CustomFrameConfig } from '../../types';
import { User as UserIcon, Check } from 'lucide-react';
import { ProfileFrame } from '../profile/ProfileFrame';
import { isAdminRole, getDefaultFrameForRole } from '../../utils/rbac';

interface AvatarProps {
  user?: Partial<User> | null;
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showRoleBadge?: boolean;
  showVerifiedBadge?: boolean;
  equippedAchievementId?: string | null;
  customConfig?: CustomFrameConfig | null;
  customFrames?: CustomFrameConfig[];
  showFrame?: boolean;
  showOrnaments?: boolean;
}

const sizeClasses: Record<string, { container: string; icon: string; text: string; verifiedSize: string }> = {
  xs: { container: 'w-6 h-6 text-[10px]', icon: 'w-3.5 h-3.5', text: 'text-[10px]', verifiedSize: 'w-2.5 h-2.5' },
  sm: { container: 'w-8 h-8 text-xs', icon: 'w-4 h-4', text: 'text-xs', verifiedSize: 'w-3 h-3' },
  md: { container: 'w-10 h-10 text-sm', icon: 'w-5 h-5', text: 'text-sm', verifiedSize: 'w-3.5 h-3.5' },
  lg: { container: 'w-14 h-14 text-base', icon: 'w-7 h-7', text: 'text-base', verifiedSize: 'w-4.5 h-4.5' },
  xl: { container: 'w-20 h-20 text-xl', icon: 'w-10 h-10', text: 'text-xl', verifiedSize: 'w-5.5 h-5.5' },
  '2xl': { container: 'w-28 h-28 text-3xl', icon: 'w-14 h-14', text: 'text-3xl', verifiedSize: 'w-7 h-7' },
};

export const Avatar: React.FC<AvatarProps> = ({
  user,
  src,
  name,
  size = 'md',
  className = '',
  showRoleBadge = false,
  showVerifiedBadge = false,
  equippedAchievementId,
  customConfig,
  customFrames,
  showFrame = true,
  showOrnaments,
}) => {
  const [imageError, setImageError] = useState(false);

  const displayName = name ?? user?.name ?? '사용자';
  const userEmail = user?.email?.toLowerCase();
  const isYuna =
    userEmail === 'ayun24song@gmail.com' ||
    user?.id === 'admin_ayun24song';

  const isTDSNTLMS =
    userEmail === 'teamdevstudiont@gmail.com' ||
    displayName === 'TDSNTLMS' ||
    user?.id === 'TDSNTLMS';

  const defaultPhotoForUser = isYuna
    ? (user?.avatar || '/송윤아.png')
    : isTDSNTLMS
    ? '/images/tdsntlms_profile.png'
    : null;
  const rawSrc = src ?? user?.avatar ?? defaultPhotoForUser;
  const role = user?.role as UserRole | undefined;
  const isManagement = isAdminRole(role);

  const isInvalidOrTestImage =
    !rawSrc ||
    imageError ||
    rawSrc.includes('unsplash.com') ||
    rawSrc.includes('placeholder') ||
    rawSrc.trim() === '';

  const { container, icon, verifiedSize } = sizeClasses[size] || sizeClasses.md;

  const roleIndicatorColor =
    role === 'SERVICE_OWNER'
      ? 'bg-amber-500 ring-2 ring-white'
      : isManagement
      ? 'bg-indigo-600 ring-2 ring-white'
      : 'bg-indigo-500 ring-2 ring-white';

  const targetAchievementId =
    equippedAchievementId !== undefined
      ? (equippedAchievementId === 'none' ? null : equippedAchievementId)
      : (user?.equippedAchievementId === 'none'
          ? null
          : (user?.equippedAchievementId || getDefaultFrameForRole(role)));

  const innerAvatar = (
    <div className={`relative inline-flex shrink-0 select-none overflow-visible ${className}`}>
      {isInvalidOrTestImage ? (
        <div
          className={`${container} rounded-xl bg-slate-100 ${showFrame && (targetAchievementId || customConfig) ? '' : 'border border-slate-200/90'} text-slate-500 flex items-center justify-center font-semibold select-none shadow-2xs overflow-hidden`}
          title={displayName}
          aria-label={`${displayName} 기본 프로필`}
        >
          <div className="w-full h-full bg-linear-to-b from-slate-50 to-slate-200 flex items-center justify-center text-slate-400">
            <UserIcon className={`${icon} stroke-[2]`} />
          </div>
        </div>
      ) : (
        <img
          src={rawSrc}
          alt={displayName}
          onError={() => setImageError(true)}
          className={`${container} rounded-xl object-cover ${showFrame && (targetAchievementId || customConfig) ? '' : 'border border-slate-200'} shadow-2xs`}
        />
      )}

      {/* Official badge for management staff */}
      {(showVerifiedBadge || (showRoleBadge && isManagement)) && isManagement && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${verifiedSize} rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center shadow-xs ring-1.5 ring-white z-10 shrink-0 select-none overflow-visible`}
          title={role === 'SERVICE_OWNER' ? '서비스 총괄 (공식 인증)' : '공식 운영진'}
        >
          <Check className="w-[75%] h-[75%] stroke-[3.5] text-white shrink-0" />
        </span>
      )}

      {showRoleBadge && !isManagement && role && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${roleIndicatorColor} shrink-0`}
          title="수강생"
        />
      )}
    </div>
  );

  if (showFrame && (targetAchievementId || customConfig)) {
    return (
      <ProfileFrame
        decorationId={targetAchievementId}
        customConfig={customConfig}
        customFrames={customFrames || user?.customFrames}
        userRole={role}
        size={size}
        showOrnaments={showOrnaments}
      >
        {innerAvatar}
      </ProfileFrame>
    );
  }

  return innerAvatar;
};
