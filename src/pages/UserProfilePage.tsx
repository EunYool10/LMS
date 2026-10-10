import React, { useMemo } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, GraduationCap, Settings } from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/common/Avatar';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { CourseCover } from '../components/common/CourseCover';
import { isAdminRole, getRoleLabel } from '../utils/rbac';

interface UserProfilePageProps {
  userId: string;
  onNavigate?: (view: string, param?: string) => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ userId, onNavigate }) => {
  const { user: currentUser } = useAuth();

  const targetUser = useMemo(() => storage.getUser(userId), [userId]);
  const isMe = currentUser?.id === userId;

  const enrollments = useMemo(() => storage.getEnrollmentsByUser(userId), [userId]);
  const allCourses = useMemo(() => storage.getCourses(), []);

  const enrolledCourses = useMemo(
    () =>
      enrollments
        .map((enr) => {
          const course = allCourses.find((c) => c.id === enr.courseId);
          return course ? { ...course, enrollment: enr } : null;
        })
        .filter((c): c is NonNullable<typeof c> => !!c),
    [enrollments, allCourses]
  );

  const completedCount = enrolledCourses.filter((c) => (c.enrollment.progressPercentage || 0) >= 100).length;
  const isAdmin = isAdminRole(targetUser?.role);

  if (!targetUser) {
    return (
      <div className="lms-container max-w-md space-y-4 py-20 text-center">
        <GraduationCap className="mx-auto h-10 w-10 text-neutral-300" />
        <h2 className="text-xl font-bold text-neutral-900">사용자를 찾을 수 없습니다</h2>
        <p className="text-sm text-neutral-500">존재하지 않거나 탈퇴한 회원입니다.</p>
        <button type="button" onClick={() => onNavigate?.('home')} className="lms-btn lms-btn-primary">
          <ArrowLeft className="h-4 w-4" />
          홈으로
        </button>
      </div>
    );
  }

  const joinDate = targetUser.createdAt
    ? new Date(targetUser.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';

  const stats = [
    { label: '수강 강의', value: enrolledCourses.length },
    { label: '수료', value: completedCount },
    {
      label: '완강률',
      value: `${enrolledCourses.length > 0 ? Math.round((completedCount / enrolledCourses.length) * 100) : 0}%`,
    },
  ];

  return (
    <div className="min-w-0">
      <section className="border-b border-neutral-200 bg-white">
        <div className="lms-container max-w-5xl space-y-6 py-8">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? window.history.back() : onNavigate?.('home'))}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 hover:text-neutral-900 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              뒤로
            </button>
            {isMe && (
              <button type="button" onClick={() => onNavigate?.('account-settings')} className="lms-btn lms-btn-secondary lms-btn-sm">
                <Settings className="h-4 w-4" />
                계정 설정
              </button>
            )}
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <Avatar user={targetUser} name={targetUser.name} src={targetUser.avatar} size="xl" showVerifiedBadge={isAdmin} />
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-neutral-900">{targetUser.name}</h1>
                  {isAdmin && <VerifiedBadge role={targetUser.role} size="sm" />}
                </div>
                <p className="text-sm text-neutral-500">
                  {getRoleLabel(targetUser.role)}
                  {targetUser.nickname && <span> · {targetUser.nickname}</span>}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {joinDate} 가입
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-3 divide-x divide-neutral-200 rounded-xl border border-neutral-200">
              {stats.map((s) => (
                <div key={s.label} className="px-5 py-3 text-center">
                  <dd className="text-xl font-bold tabular-nums text-neutral-900">{s.value}</dd>
                  <dt className="mt-0.5 text-xs text-neutral-500">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {targetUser.bio && targetUser.bio.trim() && (
            <p className="max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-neutral-700">{targetUser.bio.trim()}</p>
          )}
        </div>
      </section>

      <div className="lms-container max-w-5xl py-8">
        <h2 className="lms-section-title">
          수강 과정 <span className="text-sm font-normal text-neutral-400">{enrolledCourses.length}</span>
        </h2>

        {enrolledCourses.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-neutral-300 py-10 text-center text-sm text-neutral-500">
            수강 중인 과정이 없습니다.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {enrolledCourses.map((c) => {
              const pct = c.enrollment.progressPercentage || 0;
              const isDone = pct >= 100;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('course-detail', c.id)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-neutral-200 bg-white p-3 text-left transition-[border-color,box-shadow] hover:border-neutral-300 hover:shadow-md cursor-pointer"
                  >
                    <CourseCover thumbnail={c.thumbnail} title={c.title} categoryId={c.categoryId} compact className="aspect-video w-24 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1 space-y-2">
                      <span className="block truncate text-sm font-semibold text-neutral-900 group-hover:text-brand-700">{c.title}</span>
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          수료
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-100">
                            <span className="block h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="text-xs tabular-nums text-neutral-500">{pct}%</span>
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
