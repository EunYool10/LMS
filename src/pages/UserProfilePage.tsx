import React, { useMemo } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Award,
  CheckCircle2,
  Calendar,
  Sparkles,
  Shield,
  ExternalLink,
  Settings,
  GraduationCap,
  Clock,
} from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/common/Avatar';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { MedallionBadge } from '../components/profile/MedallionBadge';
import { getProfileDecoration } from '../utils/profileDecorations';
import { isAdminRole, isServiceOwner } from '../utils/rbac';

interface UserProfilePageProps {
  userId: string;
  onNavigate?: (view: string, param?: string) => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ userId, onNavigate }) => {
  const { user: currentUser } = useAuth();

  // Load genuine user profile
  const targetUser = useMemo(() => {
    return storage.getUser(userId);
  }, [userId]);

  const isMe = currentUser?.id === userId;

  // Genuine learning enrollments and courses
  const enrollments = useMemo(() => {
    return storage.getEnrollmentsByUser(userId);
  }, [userId]);

  const allCourses = useMemo(() => {
    return storage.getCourses();
  }, []);

  const enrolledCourses = useMemo(() => {
    return enrollments
      .map((enr) => {
        const course = allCourses.find((c) => c.id === enr.courseId);
        if (!course) return null;
        return {
          ...course,
          enrollment: enr,
        };
      })
      .filter(Boolean);
  }, [enrollments, allCourses]);

  const completedCourses = useMemo(() => {
    return enrolledCourses.filter((item) => (item?.enrollment.progressPercentage || 0) >= 100);
  }, [enrolledCourses]);

  // Genuine achievements
  const allBadges = useMemo(() => {
    return storage.getUserBadges(userId);
  }, [userId]);

  const unlockedBadges = useMemo(() => {
    return allBadges.filter((b) => b.unlocked || b.earned);
  }, [allBadges]);

  const isSuperAdmin = isServiceOwner(targetUser?.role);
  const isAdmin = isAdminRole(targetUser?.role);

  // Equipped decoration
  const equippedDecoration = useMemo(() => {
    if (!targetUser) return null;
    if (targetUser.equippedAchievementId === 'none') return null;
    const decId = targetUser.equippedAchievementId || (isAdmin ? 'badge_admin_rainbow_crest' : null);
    return getProfileDecoration(decId, targetUser.role, targetUser.customFrames);
  }, [targetUser, isAdmin]);

  if (!targetUser) {
    return (
      <div className="lms-container py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">사용자를 찾을 수 없습니다</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          요청하신 사용자 프로필 정보가 존재하지 않거나 탈퇴한 회원입니다.
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.('home')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>홈으로 돌아가기</span>
        </button>
      </div>
    );
  }

  const joinDate = targetUser.createdAt
    ? new Date(targetUser.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '2026년 1월';

  return (
    <div className="lms-container py-6 sm:py-8 space-y-8 max-w-5xl mx-auto">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              onNavigate?.('home');
            }
          }}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>뒤로 가기</span>
        </button>

        {isMe && (
          <button
            type="button"
            onClick={() => onNavigate?.('account-settings')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>내 계정 및 장식 설정</span>
          </button>
        )}
      </div>

      {/* Hero Profile Showcase Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Decorative Top Banner */}
        <div className="h-32 sm:h-40 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.2),transparent_70%)]" />
          {equippedDecoration && (
            <div className="absolute top-4 right-4 sm:top-5 sm:right-6">
              <span className={`px-3 py-1 text-xs font-bold rounded-full border shadow-xs backdrop-blur-md ${equippedDecoration.badgeClass}`}>
                {equippedDecoration.name}
              </span>
            </div>
          )}
        </div>

        {/* Profile Content Details */}
        <div className="px-6 sm:px-8 pb-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
            <div className="flex items-end gap-4">
              <div className="relative">
                <Avatar
                  user={targetUser}
                  name={targetUser.name}
                  src={targetUser.avatar}
                  size="2xl"
                  showFrame={true}
                  showVerifiedBadge={isAdmin}
                  className="shadow-xl ring-4 ring-white"
                />
              </div>

              <div className="mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{targetUser.name}</h1>
                  {isAdmin && <VerifiedBadge role={targetUser.role} size="sm" showLabel />}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  {targetUser.nickname || `@${targetUser.name.toLowerCase().replace(/\s+/g, '')}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>가입일: {joinDate}</span>
            </div>
          </div>

          {/* User Bio */}
          {targetUser.bio && targetUser.bio.trim() && (
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed max-w-3xl">
              "{targetUser.bio.trim()}"
            </div>
          )}

          {/* Real Learning Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/70 text-center">
              <div className="flex items-center justify-center gap-1.5 text-indigo-600 mb-1">
                <BookOpen className="w-4 h-4" />
                <span className="text-xs font-bold">수강 강의</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{enrolledCourses.length}</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/70 text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold">완료 강의</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{completedCourses.length}</div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/70 text-center">
              <div className="flex items-center justify-center gap-1.5 text-amber-600 mb-1">
                <Award className="w-4 h-4" />
                <span className="text-xs font-bold">획득 업적</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{unlockedBadges.length}</div>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-100/70 text-center">
              <div className="flex items-center justify-center gap-1.5 text-cyan-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold">완강률</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {enrolledCourses.length > 0
                  ? `${Math.round((completedCourses.length / enrolledCourses.length) * 100)}%`
                  : '0%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Earned Achievements Showcase */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">달성한 업적 및 메달</h2>
              <p className="text-xs text-slate-400">학습 활동을 통해 공식 수여된 메달리온 업적 목록입니다</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500">
            총 {unlockedBadges.length}개 달성
          </span>
        </div>

        {unlockedBadges.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            아직 획득한 업적이 없습니다. 강의를 완강하거나 퀴즈를 통과하여 업적을 달성해보세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlockedBadges.map((badge) => {
              const isEquipped = targetUser.equippedAchievementId === badge.id;
              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                    isEquipped
                      ? 'bg-gradient-to-r from-amber-50/60 to-indigo-50/40 border-amber-300 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <MedallionBadge
                    badge={badge}
                    size="md"
                    isEarned={true}
                    isEquipped={isEquipped}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900 truncate">{badge.title}</span>
                      {isEquipped && (
                        <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full shrink-0">
                          장착 중
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enrolled Courses Showcase */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">수강 중인 정규 과정</h2>
              <p className="text-xs text-slate-400">현재 학습 중이거나 수료 완료한 정규 교육과정입니다</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500">
            총 {enrolledCourses.length}개 과정
          </span>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            수강 중인 교육과정이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {enrolledCourses.map((c) => {
              if (!c) return null;
              const isDone = (c.enrollment.progressPercentage || 0) >= 100;
              return (
                <div
                  key={c.id}
                  onClick={() => onNavigate?.('course-detail', c.id)}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all bg-white cursor-pointer group flex items-start gap-3.5"
                >
                  <img
                    src={c.thumbnail}
                    alt={c.title}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {c.categoryName || c.categoryId}
                      </span>
                      {isDone ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          수료 완료
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">
                          {c.enrollment.progressPercentage || 0}% 진행
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {c.title}
                    </h3>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isDone ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${c.enrollment.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
