import React, { useEffect, useState, useMemo, useRef } from 'react';
import { X, ExternalLink, Award, BookOpen, CheckCircle2, Shield, Sparkles, User as UserIcon } from 'lucide-react';
import { User, UserRole } from '../../types';
import { storage } from '../../services/storage';
import { Avatar } from '../common/Avatar';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { getRoleMetadata, getRoleLabel, isServiceOwner, isAdminRole } from '../../utils/rbac';

export interface UserProfilePreviewModalProps {
  userId: string | null;
  fallbackData?: {
    name?: string;
    avatar?: string;
    role?: UserRole | string;
    nickname?: string;
  };
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  onNavigate?: (view: string, param?: string) => void;
}

interface UserProfileStats {
  enrolledCount: number;
  completedCount: number;
  earnedBadgesCount: number;
}

// In-memory cache to prevent redundant API/storage queries on frequent hovers/clicks
const profileMemoryCache = new Map<string, { user: User; stats: UserProfileStats; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export const UserProfilePreviewModal: React.FC<UserProfilePreviewModalProps> = ({
  userId,
  fallbackData,
  isOpen,
  open,
  onClose,
  onNavigate,
}) => {
  const isModalOpen = Boolean(isOpen ?? open);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Load user data whenever modal is opened with a userId
  useEffect(() => {
    if (!isModalOpen || !userId) {
      setProfileUser(null);
      setStats(null);
      setIsError(false);
      return;
    }

    let isSubscribed = true;

    const loadProfile = async () => {
      // 1. Check in-memory cache first
      const cached = profileMemoryCache.get(userId);
      const now = Date.now();
      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        setProfileUser(cached.user);
        setStats(cached.stats);
        setIsLoading(false);
        setIsError(false);
        return;
      }

      setIsLoading(true);
      setIsError(false);

      try {
        // 2. Fetch local client store first for instant UI response
        let userObj = storage.getUser(userId);

        // Calculate real stats from genuine student enrollments and badges
        const enrollments = storage.getEnrollmentsByUser(userId);
        const enrolledCount = enrollments.length;
        const completedCount = enrollments.filter((e) => (e.progressPercentage || 0) >= 100).length;
        const badges = storage.getUserBadges(userId);
        const earnedBadgesCount = badges.filter((b) => b.unlocked || b.earned).length;

        const calculatedStats: UserProfileStats = {
          enrolledCount,
          completedCount,
          earnedBadgesCount,
        };

        // Check if target is one of the 3 protected admin accounts
        const isProtectedAdmin =
          userId === 'TDSNTLMS' ||
          userId === 'admin_EunYool' ||
          userId === 'admin_ayun24song' ||
          userId === 'teamdevstudiont@gmail.com' ||
          userId === 'eunyool100208@gmail.com' ||
          userId === 'deer123424@gmail.com' ||
          userId === 'ayun24song@gmail.com' ||
          userObj?.email?.toLowerCase() === 'teamdevstudiont@gmail.com' ||
          userObj?.email?.toLowerCase() === 'eunyool100208@gmail.com' ||
          userObj?.email?.toLowerCase() === 'deer123424@gmail.com' ||
          userObj?.email?.toLowerCase() === 'ayun24song@gmail.com';

        if (userObj && isProtectedAdmin && (!userObj.role || userObj.role === 'USER')) {
          userObj.role = 'SUPER_ADMIN';
        }

        // 3. Query server endpoint for remote profile sync (fallback if missing locally)
        if (!userObj) {
          try {
            const res = await fetch(`/api/users/${encodeURIComponent(userId)}/public-profile`);
            if (res.ok) {
              const data = await res.json();
              if (data?.success && data.user) {
                userObj = {
                  id: data.user.id,
                  name: data.user.name,
                  nickname: data.user.nickname,
                  email: '', // Never expose email in public preview
                  role: (isProtectedAdmin && (!data.user.role || data.user.role === 'USER')) ? 'SUPER_ADMIN' : (data.user.role || 'USER'),
                  avatar: data.user.avatar,
                  bio: data.user.bio,
                  status: 'ACTIVE',
                  createdAt: data.user.createdAt || new Date().toISOString(),
                  equippedAchievementId: data.user.equippedAchievementId,
                };
              }
            }
          } catch {
            // Silently swallow fetch network error if offline
          }
        }

        // 4. If still not found, construct fallback user representation using fallbackData if provided
        if (!userObj && fallbackData?.name) {
          userObj = {
            id: userId,
            name: fallbackData.name,
            nickname: fallbackData.nickname || `@${fallbackData.name.toLowerCase().replace(/\s+/g, '')}`,
            email: '',
            role: (fallbackData.role && isAdminRole(fallbackData.role)
              ? fallbackData.role
              : isProtectedAdmin
              ? 'SUPER_ADMIN'
              : 'USER') as UserRole,
            avatar: fallbackData.avatar,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          };
        }

        if (userObj && isProtectedAdmin && (!userObj.role || userObj.role === 'USER')) {
          userObj.role = 'SUPER_ADMIN';
        }

        if (isSubscribed) {
          if (userObj) {
            setProfileUser(userObj);
            setStats(calculatedStats);
            setIsError(false);
            // Cache successful result
            profileMemoryCache.set(userId, {
              user: userObj,
              stats: calculatedStats,
              timestamp: Date.now(),
            });
          } else {
            setIsError(true);
          }
        }
      } catch (err) {
        console.error('Failed to load profile preview:', err);
        if (isSubscribed) {
          setIsError(true);
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isSubscribed = false;
    };
  }, [isModalOpen, userId, fallbackData]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, onClose]);

  // Touch gesture handler for mobile swipe-down-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartYRef.current = null;
    // If swiped down more than 60px, close the modal
    if (deltaY > 60) {
      onClose();
    }
  };

  const isSuperAdmin = isServiceOwner(profileUser?.role);
  const isAdmin = isAdminRole(profileUser?.role);
  const isInstructor = (profileUser?.role as string) === 'INSTRUCTOR' || (profileUser?.role as string) === 'instructor';


  if (!isModalOpen) return null;

  const handleNavigateToFullProfile = () => {
    if (!profileUser?.id) return;
    onClose();
    if (onNavigate) {
      onNavigate('user-profile', profileUser.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet Container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-user-name"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative z-10 w-full sm:max-w-sm bg-white/98 backdrop-blur-md border border-slate-200/90 shadow-2xl transition-all duration-200 overflow-visible
          /* Mobile: Bottom Sheet */
          rounded-t-3xl max-h-[90vh] sm:max-h-none sm:rounded-3xl
          /* Animation */
          animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 ease-out
        `}
      >
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Modal Top Header Bar with Close Button */}
        <div className="flex items-center justify-between px-5 pt-3.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>프로필 요약</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 pt-3 pb-6 space-y-4 overflow-visible">
          {isLoading ? (
            /* Loading State */
            <div className="py-10 text-center space-y-3">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 animate-pulse mx-auto" />
              <div className="h-4 bg-slate-100 rounded w-28 mx-auto animate-pulse" />
              <div className="h-3 bg-slate-100 rounded w-20 mx-auto animate-pulse" />
              <p className="text-xs text-slate-400 mt-2">프로필 정보를 불러오는 중...</p>
            </div>
          ) : isError || !profileUser ? (
            /* Error State */
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <X className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">프로필 정보를 불러올 수 없습니다</h3>
              <p className="text-xs text-slate-500">존재하지 않거나 삭제된 사용자입니다.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                닫기
              </button>
            </div>
          ) : (
            /* Genuine User Profile Content */
            <>
              {/* Profile Header Area (Requirement 2, 5, 6, 7, 8) */}
              <div className="text-center pt-2 pb-1 overflow-visible">
                {/* ProfileFrame wrapping Avatar (Requirement 2 & 13) */}
                <div className="relative inline-flex items-center justify-center p-5 mb-1 overflow-visible">
                    <Avatar
                      user={profileUser}
                      name={profileUser.name}
                      src={profileUser.avatar}
                      size="xl"
                      showRoleBadge={false}
                      showVerifiedBadge={false}
                    />
                </div>

                {/* User Name & Official Verification Badge (Requirement 7) */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap px-2 mt-1">
                  <h3 id="preview-user-name" className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    <span>{profileUser.name}</span>
                    {isAdmin && (
                      <span className="inline-flex items-center shrink-0">
                        <VerifiedBadge role={profileUser.role} size="sm" showLabel={false} />
                      </span>
                    )}
                  </h3>
                </div>

                {/* Nickname */}
                <p className="text-xs text-slate-400 font-mono font-medium mt-1">
                  {profileUser.nickname || `@${profileUser.name.toLowerCase().replace(/\s+/g, '')}`}
                </p>

                {/* Role / Rank / Admin TAG (Requirement 8) */}
                <div className="mt-3 flex justify-center">
                  {(() => {
                    const roleMeta = getRoleMetadata(profileUser.role);
                    if (roleMeta) {
                      if (roleMeta.tag === 'SERVICE_OWNER') {
                        return (
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-300 shadow-xs shadow-amber-500/20 text-slate-900 tracking-tight">
                            <span className="text-amber-500 text-sm">✦</span>
                            <span className="bg-gradient-to-r from-amber-700 via-rose-700 to-purple-800 bg-clip-text text-transparent font-black">
                              서비스 총괄
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div
                          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-xs tracking-tight ${roleMeta.badgeClass}`}
                        >
                          <span className="text-sm">{roleMeta.icon}</span>
                          <span>{roleMeta.label}</span>
                        </div>
                      );
                    }
                    if (isInstructor) {
                      return (
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200/90 shadow-xs text-emerald-800 tracking-tight">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>공인 전문 강사</span>
                        </div>
                      );
                    }
                    return (
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200/90 text-slate-700 tracking-tight">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>정규 수강생</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Bio (Optional - only displayed if real non-empty bio exists) */}
                {profileUser.bio && profileUser.bio.trim() && (
                  <div className="mt-3.5 px-3.5 py-2 bg-slate-50/80 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed italic text-center max-w-xs mx-auto">
                    "{profileUser.bio.trim()}"
                  </div>
                )}
              </div>

              {/* Learning Activity Statistics (Requirement 9 & 10) */}
              {stats && (stats.enrolledCount > 0 || stats.completedCount > 0) && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between px-1 mb-2.5">
                    <span className="text-xs font-bold text-slate-600">학습 활동</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* 1. 수강 강의 */}
                    <div className="bg-slate-50/90 hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-200 rounded-2xl p-3 text-center transition-all duration-200 group shadow-2xs">
                      <div className="flex items-center justify-center mb-1">
                        <BookOpen className="w-4 h-4 text-indigo-500 opacity-80 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-indigo-600 tracking-tight leading-none my-1">
                        {stats.enrolledCount}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        수강 강의
                      </div>
                    </div>

                    {/* 2. 완료 강의 */}
                    <div className="bg-slate-50/90 hover:bg-emerald-50/40 border border-slate-200/80 hover:border-emerald-200 rounded-2xl p-3 text-center transition-all duration-200 group shadow-2xs">
                      <div className="flex items-center justify-center mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-80 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight leading-none my-1">
                        {stats.completedCount}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        완료 강의
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Primary Action Button: 전체 프로필 보기 (Requirement 9 & 10) */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleNavigateToFullProfile}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-black rounded-xl shadow-xs shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  <span>전체 프로필 보기</span>
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Re-export alias for unified component naming (Requirement 13)
export const UserProfilePreview = UserProfilePreviewModal;
