import React from 'react';
import { Avatar } from '../common/Avatar';
import { CourseCard } from './CourseCard';
import { AchievementCompactWidget } from './AchievementCompactWidget';
import { EmptyState } from '../common/EmptyState';
import { CourseCover } from '../common/CourseCover';
import { resolveCategory } from '../common/CategoryIcon';
import { Award, Check, Download, Flame, PlayCircle, Settings, Trash2, Trophy, X } from 'lucide-react';
import { User, UserLearningGoal, AchievementBadge, LessonBookmark, StudentNote } from '../../types';
import { getRoleLabel, isAdminRole } from '../../utils/rbac';

export type DashboardTab = 'in_progress' | 'completed' | 'wishlist' | 'bookmarks_notes' | 'quizzes';

export interface StudentDashboardViewProps {
  user: User;
  userBadgeRank: { title: string; badge: string; color: string; tier: string };
  overallProgressPercentage: number;
  totalCoursesCount: number;
  inProgressList: any[];
  completedList: any[];
  wishlistItems: any[];
  wishlistedCoursesList: any[];
  allAttempts: any[];
  totalMinutesWatched: number;
  averageScore: number;
  streakDays: number;
  studentNotes: StudentNote[];
  bookmarks: LessonBookmark[];
  currentWeekDays: Array<{ day: string; dateStr: string; isLearned: boolean; isToday: boolean }>;
  learningGoal?: UserLearningGoal;
  goalHoursInput: number;
  isEditingGoal: boolean;
  setIsEditingGoal: (val: boolean) => void;
  setGoalHoursInput: (val: number) => void;
  handleSaveGoal: (e: React.FormEvent) => void;
  handleContinue: (courseId: string, lastLessonId?: string) => void;
  handlePreviewCertificate: (course: any) => void;
  handleDownloadCertificate: (course: any) => void;
  handleDeleteBookmark: (bmId: string) => void;
  handleDeleteNote: (noteId: string) => void;
  onNavigate: (view: string, param?: string) => void;
  onOpenAchievements: (badge?: AchievementBadge | null) => void;
  onWishlistToggle: (courseId: string) => void;
  tab: DashboardTab;
  setTab: (tab: DashboardTab) => void;
  badges: AchievementBadge[];
  enrollments: any[];
}

const formatClock = (secs: number) =>
  `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

const formatMinutes = (mins: number) => {
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
};

export const StudentDashboard: React.FC<StudentDashboardViewProps> = ({
  user,
  userBadgeRank,
  overallProgressPercentage,
  totalCoursesCount,
  inProgressList,
  completedList,
  wishlistItems,
  wishlistedCoursesList,
  allAttempts,
  totalMinutesWatched,
  averageScore,
  streakDays,
  studentNotes,
  bookmarks,
  currentWeekDays,
  learningGoal,
  goalHoursInput,
  isEditingGoal,
  setIsEditingGoal,
  setGoalHoursInput,
  handleSaveGoal,
  handleContinue,
  handlePreviewCertificate,
  handleDownloadCertificate,
  handleDeleteBookmark,
  handleDeleteNote,
  onNavigate,
  onOpenAchievements,
  onWishlistToggle,
  tab,
  setTab,
  badges,
  enrollments,
}) => {
  const goalHours = learningGoal?.targetHoursWeekly || 10;
  const goalPercent = Math.min(100, Math.round((totalMinutesWatched / 60 / goalHours) * 100));

  const stats = [
    { label: '수강 중', value: `${inProgressList.length}`, unit: '개' },
    { label: '수료', value: `${completedList.length}`, unit: '개', onClick: () => setTab('completed') },
    { label: '평균 진도율', value: `${overallProgressPercentage}`, unit: '%', hint: `${totalCoursesCount}개 과정 기준` },
    { label: '누적 학습', value: formatMinutes(totalMinutesWatched), unit: '' },
  ];

  const tabs: { id: DashboardTab; label: string; count: number }[] = [
    { id: 'in_progress', label: '수강 중', count: inProgressList.length },
    { id: 'completed', label: '수료', count: completedList.length },
    { id: 'wishlist', label: '관심 강의', count: wishlistItems.length },
    { id: 'bookmarks_notes', label: '메모 · 북마크', count: studentNotes.length + bookmarks.length },
    { id: 'quizzes', label: '평가 기록', count: allAttempts.length },
  ];

  const rowClass = 'flex flex-col gap-4 p-4 sm:flex-row sm:items-center';

  return (
    <div className="min-w-0">
      {/* ── Header band ── */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="lms-container space-y-6 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar user={user} size="md" showRoleBadge={false} showOrnaments={false} />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-neutral-900">내 학습</h1>
                <p className="mt-0.5 truncate text-sm text-neutral-500">
                  {user.name}님 ·{' '}
                  {isAdminRole(user.role) ? getRoleLabel(user.role) : `${userBadgeRank.badge} ${userBadgeRank.title}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                id="btn-dashboard-open-achievements-hero"
                onClick={() => onOpenAchievements(null)}
                className="lms-btn lms-btn-secondary lms-btn-sm"
              >
                <Trophy className="h-4 w-4 text-amber-500" />
                업적 도감
              </button>
              <button
                type="button"
                id="btn-dashboard-profile-settings"
                onClick={() => onNavigate('account-settings')}
                className="lms-btn lms-btn-secondary lms-btn-sm"
              >
                <Settings className="h-4 w-4" />
                프로필 설정
              </button>
            </div>
          </div>

          <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200 sm:grid-cols-4">
            {stats.map((s, i) => {
              const content = (
                <>
                  <dt className="text-[13px] text-neutral-500">{s.label}</dt>
                  <dd className="mt-1 flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold tabular-nums text-neutral-900">{s.value}</span>
                    {s.unit && <span className="text-sm text-neutral-500">{s.unit}</span>}
                  </dd>
                </>
              );
              const cls = `px-5 py-4 text-left ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t sm:border-t-0' : ''} ${
                i === 2 ? 'sm:border-l' : ''
              } border-neutral-200`;
              return s.onClick ? (
                <button key={s.label} type="button" onClick={s.onClick} className={`${cls} hover:bg-neutral-50 cursor-pointer`}>
                  {content}
                </button>
              ) : (
                <div key={s.label} className={cls}>
                  {content}
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      <div className="lms-container grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Main: tabs ── */}
        <div className="min-w-0 space-y-5">
          <div role="tablist" className="-mx-4 flex gap-1 overflow-x-auto border-b border-neutral-200 px-4 scrollbar-none sm:mx-0 sm:px-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 pb-3 pt-2 text-sm font-medium cursor-pointer ${
                  tab === t.id ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {t.label}
                <span className="text-xs tabular-nums text-neutral-400">{t.count}</span>
                {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-neutral-900" />}
              </button>
            ))}
          </div>

          {tab === 'in_progress' &&
            (inProgressList.length === 0 ? (
              <EmptyState
                title="수강 중인 강의가 없습니다"
                description="관심 있는 강의를 찾아 학습을 시작해 보세요."
                showAction
                actionLabel="강의 둘러보기"
                onAction={() => onNavigate('home')}
              />
            ) : (
              <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                {inProgressList.map((item) => {
                  if (!item.course) return null;
                  const pct = item.enrollment.progressPercentage;
                  return (
                    <li key={item.course.id} className={rowClass}>
                      <button
                        type="button"
                        onClick={() => onNavigate('course-detail', item.course.id)}
                        className="flex min-w-0 flex-1 items-center gap-4 text-left cursor-pointer group"
                      >
                        <CourseCover
                          thumbnail={item.course.thumbnail}
                          title={item.course.title}
                          categoryId={item.course.categoryId}
                          compact
                          className="aspect-video w-28 shrink-0 rounded-lg"
                        />
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="block text-xs text-neutral-500">
                            {item.course.categoryName || resolveCategory(item.course.categoryId)?.name || '강의'}
                          </span>
                          <span className="block truncate text-[15px] font-semibold text-neutral-900 group-hover:text-brand-700">
                            {item.course.title}
                          </span>
                          <span className="block truncate text-xs text-neutral-500">
                            {item.completedLessonsCount}/{item.totalLessons}강 완료 · 최근: {item.lastLessonTitle}
                          </span>
                        </span>
                      </button>
                      <div className="flex items-center gap-4 sm:w-64 sm:shrink-0">
                        <div className="flex flex-1 items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                            <span className="block h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="w-9 text-right text-xs font-semibold tabular-nums text-neutral-700">{pct}%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleContinue(item.course.id, item.enrollment.lastLessonId)}
                          className="lms-btn lms-btn-primary lms-btn-sm"
                        >
                          <PlayCircle className="h-4 w-4" />
                          이어보기
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ))}

          {tab === 'completed' &&
            (completedList.length === 0 ? (
              <EmptyState
                title="수료한 강의가 없습니다"
                description="강의를 모두 완료하면 수료증이 자동으로 발급됩니다."
                showAction
                actionLabel="수강 중인 강의 보기"
                onAction={() => setTab('in_progress')}
              />
            ) : (
              <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                {completedList.map((item) => {
                  if (!item.course) return null;
                  const completedAt = item.enrollment.completedAt;
                  return (
                    <li key={item.course.id} className={rowClass}>
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <Award className="h-6 w-6" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold text-neutral-900">{item.course.title}</span>
                          <span className="block text-xs text-neutral-500">
                            {completedAt ? `${new Date(completedAt).toLocaleDateString('ko-KR')} 수료` : '수료 완료'} · {item.totalLessons}강
                          </span>
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handlePreviewCertificate(item.course)} className="lms-btn lms-btn-secondary lms-btn-sm">
                          <Award className="h-4 w-4" />
                          수료증 보기
                        </button>
                        <button type="button" onClick={() => handleDownloadCertificate(item.course)} className="lms-btn lms-btn-secondary lms-btn-sm">
                          <Download className="h-4 w-4" />
                          PDF
                        </button>
                        <button type="button" onClick={() => handleContinue(item.course.id)} className="lms-btn lms-btn-ghost lms-btn-sm">
                          복습
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ))}

          {tab === 'wishlist' &&
            (wishlistedCoursesList.length === 0 ? (
              <EmptyState
                title="관심 강의가 없습니다"
                description="강의 카드의 하트를 눌러 관심 강의로 저장해 보세요."
                showAction
                actionLabel="강의 둘러보기"
                onAction={() => onNavigate('home')}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {wishlistedCoursesList.map((course) => {
                  if (!course) return null;
                  const enr = enrollments.find((e) => e.courseId === course.id);
                  return (
                    <CourseCard
                      key={course.id}
                      course={course}
                      enrollment={enr}
                      isWishlisted
                      onSelect={(cId) => onNavigate('course-detail', cId)}
                      onContinue={(cId) => handleContinue(cId, enr?.lastLessonId)}
                      onWishlistToggle={() => onWishlistToggle(course.id)}
                    />
                  );
                })}
              </div>
            ))}

          {tab === 'bookmarks_notes' && (
            <div className="space-y-6">
              {[
                {
                  title: '학습 메모',
                  empty: '작성한 메모가 없습니다.',
                  items: studentNotes.map((n) => ({
                    id: n.id,
                    time: n.timestampSeconds,
                    text: n.content,
                    meta: new Date(n.createdAt).toLocaleDateString('ko-KR'),
                    onDelete: () => handleDeleteNote(n.id),
                  })),
                },
                {
                  title: '북마크',
                  empty: '저장한 북마크가 없습니다.',
                  items: bookmarks.map((b) => ({
                    id: b.id,
                    time: b.timestampSeconds,
                    text: b.title || '북마크한 시점',
                    meta: '',
                    onDelete: () => handleDeleteBookmark(b.id),
                  })),
                },
              ].map((group) => (
                <section key={group.title}>
                  <h3 className="mb-2 text-sm font-semibold text-neutral-900">
                    {group.title} <span className="font-normal text-neutral-400">{group.items.length}</span>
                  </h3>
                  {group.items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-neutral-300 py-6 text-center text-sm text-neutral-500">{group.empty}</p>
                  ) : (
                    <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                      {group.items.map((it) => (
                        <li key={it.id} className="flex items-start gap-3 px-4 py-3">
                          <span className="mt-0.5 shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-600">
                            {formatClock(it.time)}
                          </span>
                          <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{it.text}</p>
                          {it.meta && <span className="shrink-0 text-xs text-neutral-400">{it.meta}</span>}
                          <button
                            type="button"
                            onClick={it.onDelete}
                            className="shrink-0 rounded p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                            aria-label="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}

          {tab === 'quizzes' &&
            (allAttempts.length === 0 ? (
              <EmptyState
                title="평가 응시 기록이 없습니다"
                description="강의 중간의 퀴즈와 평가를 풀면 이곳에 기록됩니다."
                showAction
                actionLabel="수강 중인 강의 보기"
                onAction={() => setTab('in_progress')}
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">응시 일시</th>
                      <th className="px-4 py-2.5 font-medium">점수</th>
                      <th className="px-4 py-2.5 font-medium">결과</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    {allAttempts.map((a) => {
                      const pct = Math.round((a.score / (a.maxScore || 100)) * 100);
                      return (
                        <tr key={a.id}>
                          <td className="px-4 py-3 text-neutral-500">{new Date(a.completedAt).toLocaleString('ko-KR')}</td>
                          <td className="px-4 py-3 font-medium tabular-nums text-neutral-900">
                            {a.score} / {a.maxScore || 100} <span className="text-neutral-400">({pct}%)</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${a.isPassed ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {a.isPassed ? '합격' : '불합격'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
        </div>

        {/* ── Side ── */}
        <aside className="space-y-5">
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">이번 주 학습</h2>
              <button
                type="button"
                onClick={() => setIsEditingGoal(!isEditingGoal)}
                className="text-[13px] font-medium text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                {isEditingGoal ? '닫기' : '목표 수정'}
              </button>
            </div>

            {isEditingGoal ? (
              <form onSubmit={handleSaveGoal} className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={goalHoursInput}
                  onChange={(e) => setGoalHoursInput(Number(e.target.value))}
                  aria-label="주간 목표 학습 시간"
                  className="lms-input h-9 w-20 text-center"
                />
                <span className="text-sm text-neutral-500">시간 / 주</span>
                <button type="submit" className="lms-btn lms-btn-primary lms-btn-sm ml-auto" aria-label="저장">
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setIsEditingGoal(false)} className="lms-btn lms-btn-ghost lms-btn-sm" aria-label="취소">
                  <X className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold tabular-nums text-neutral-900">
                    {(totalMinutesWatched / 60).toFixed(1)}
                    <span className="text-sm font-normal text-neutral-500"> / {goalHours}시간</span>
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-brand-700">{goalPercent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${goalPercent}%` }} />
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-7 gap-1 text-center">
              {currentWeekDays.map(({ day, isToday, isLearned }) => (
                <div key={day} className="space-y-1.5">
                  <span className={`block text-[11px] ${isToday ? 'font-semibold text-neutral-900' : 'text-neutral-400'}`}>{day}</span>
                  <span
                    className={`mx-auto block h-7 w-7 rounded-full ${
                      isLearned ? 'bg-brand-600' : isToday ? 'border-2 border-brand-600' : 'bg-neutral-100'
                    }`}
                    title={isLearned ? '학습함' : '학습 기록 없음'}
                  />
                </div>
              ))}
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4 text-sm">
              <div>
                <dt className="text-xs text-neutral-500">연속 학습</dt>
                <dd className="mt-0.5 flex items-center gap-1 font-semibold text-neutral-900">
                  <Flame className="h-4 w-4 text-amber-500" />
                  {streakDays}일
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">평균 평가 점수</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-neutral-900">{averageScore}점</dd>
              </div>
            </dl>
          </section>

          <AchievementCompactWidget
            badges={badges}
            userBadgeRank={userBadgeRank}
            onOpenBook={() => onOpenAchievements(null)}
            onSelectBadge={(badge) => onOpenAchievements(badge)}
          />
        </aside>
      </div>
    </div>
  );
};
