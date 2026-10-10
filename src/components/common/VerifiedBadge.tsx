import React from 'react';
import { UserRole } from '../../types';
import { isAdminRole, isServiceOwner } from '../../utils/rbac';

interface VerifiedBadgeProps {
  role?: UserRole | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  customLabel?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  role = 'ADMIN',
  size = 'sm',
  showLabel = false,
  className = '',
  customLabel,
}) => {
  // Show badge for all official admin roles and instructors
  const isAuthorizedRole = isAdminRole(role as any) || role === 'INSTRUCTOR';
  if (!isAuthorizedRole) return null;

  const isSuper = isServiceOwner(role as any);
  const isInstructor = role === 'INSTRUCTOR';

  // Size styling configuration
  const sizeStyles = {
    xs: {
      badgeSize: 'w-3.5 h-3.5',
      fontSize: 'text-[10px]',
      gap: 'gap-1',
      padding: 'px-1.5 py-0.5',
    },
    sm: {
      badgeSize: 'w-4 h-4',
      fontSize: 'text-[11px]',
      gap: 'gap-1',
      padding: 'px-2 py-0.5',
    },
    md: {
      badgeSize: 'w-5 h-5',
      fontSize: 'text-xs',
      gap: 'gap-1.5',
      padding: 'px-2 py-0.5',
    },
    lg: {
      badgeSize: 'w-6 h-6',
      fontSize: 'text-sm',
      gap: 'gap-2',
      padding: 'px-2.5 py-1',
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.sm;
  const labelText =
    customLabel || (isSuper ? '서비스 총괄' : isInstructor ? '공식 강사' : '공식 운영진');

  const tooltipText = isSuper
    ? 'TDSN 아카데미 서비스 총괄 (공식 인증됨)'
    : isInstructor
    ? 'TDSN 공식 인증 강사진'
    : 'TDSN LMS 공식 운영진 (공식 인증됨)';

  const gradientId = `vbadge-grad-${isSuper ? 'super' : isInstructor ? 'inst' : 'admin'}`;

  return (
    <span
      className={`inline-flex items-center shrink-0 flex-none select-none overflow-visible whitespace-nowrap ${currentSize.gap} align-middle group/vbadge ${className}`}
      title={tooltipText}
    >
      {/* Official 12-point scalloped decagram with crisp white center checkmark */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${currentSize.badgeSize} shrink-0 select-none overflow-visible transition-transform duration-200 group-hover/vbadge:scale-110 drop-shadow-xs`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            {isSuper ? (
              <>
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#0EA5E9" />
              </>
            ) : isInstructor ? (
              <>
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#10B981" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#38BDF8" />
              </>
            )}
          </linearGradient>
        </defs>
        {/* Scalloped rosette base */}
        <path
          d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
          fill={`url(#${gradientId})`}
        />
        {/* Integrated white checkmark */}
        <path
          d="M10.25 16.5l-3.75-3.75 1.41-1.41 2.34 2.34 5.84-5.84 1.41 1.41-7.25 7.25z"
          fill="#FFFFFF"
        />
      </svg>

      {/* Optional Text Label with official role badge pill */}
      {showLabel && (
        <span
          className={`inline-flex items-center font-bold tracking-tight rounded-md whitespace-nowrap shrink-0 select-none ${currentSize.fontSize} ${currentSize.padding} ${
            isSuper
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs'
              : isInstructor
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs'
              : 'bg-sky-50 text-sky-800 border border-sky-200/80 shadow-2xs'
          }`}
        >
          {labelText}
        </span>
      )}
    </span>
  );
};
