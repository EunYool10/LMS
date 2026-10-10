import React from 'react';
import { Avatar } from '../common/Avatar';
import { ProgressBar } from '../common/ProgressBar';
import { EmptyState } from '../common/EmptyState';
import {
  PlayCircle,
  Award,
  BookOpen,
  CheckCircle2,
  Heart,
  Flame,
  Bookmark,
  StickyNote,
  FileQuestion,
  Trophy,
  Settings,
  ChevronRight,
  ExternalLink,
  Trash2,
  Clock,
  Target,
} from 'lucide-react';
import { StudentDashboardViewProps } from '../desktop/DesktopStudentDashboard';
import { isAdminRole, getRoleLabel } from '../../utils/rbac';

export const MobileStudentDashboard: React.FC<StudentDashboardViewProps> = ({
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
  recentItem,
  learningGoal,
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
  completedViewMode,
  setCompletedViewMode,
  enrollments,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="w-full px-4 py-4 space-y-5 pb-safe-nav">
      {/* 1. Mobile Greeting & User Identity Card */}
      <div className="bg-gradient-to-br from-slate-950 via-[#0B132B] to-[#1C2541] rounded-2xl p-4 text-white shadow-sm border border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar user={user} size="md" showRoleBadge={false} showOrnaments={false} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-base text-white truncate">
                  {user.name}님
                </span>
                {isAdminRole(user.role) ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400/25 via-rose-400/25 to-purple-400/25 text-amber-200 border border-amber-300/40">
                    ✦ {getRoleLabel(user.role)}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {userBadgeRank.badge} {userBadgeRank.title}
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200 truncate mt-0.5">
                오늘도 목표를 향해 한 걸음 더!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAchievements(null)}
              className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 active:bg-amber-400/30 transition-colors"
              title="업적 도감"
              aria-label="업적 도감"
            >
              <Trophy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('account-settings')}
              className="p-2 rounded-xl bg-white/10 text-white border border-white/20 active:bg-white/20 transition-colors"
              title="내 설정"
              aria-label="내 설정"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Priority: "오늘 이어서 학습하기" (오늘의 수업) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <PlayCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>오늘 이어서 학습하기</span>
          </h2>
          {recentItem && (
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {recentItem.enrollment.progressPercentage}% 수강
            </span>
          )}
        </div>

        {recentItem ? (
          <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              {recentItem.course?.thumbnail && (
                <img
                  src={recentItem.course.thumbnail}
                  alt={recentItem.course.title}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                  {recentItem.course?.categoryName || '사내 교육'}
                </span>
                <h3 className="font-bold text-sm text-slate-900 line-clamp-1">
                  {recentItem.course?.title}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  차시: <span className="font-semibold text-slate-700">{recentItem.lastLessonTitle}</span>
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <ProgressBar
                progress={recentItem.enrollment.progressPercentage}
                size="sm"
                variant={recentItem.enrollment.progressPercentage === 100 ? 'emerald' : 'indigo'}
              />
            </div>

            {/* Big Action Button (min-h-[46px] for touch) */}
            <button
              type="button"
              onClick={() => handleContinue(recentItem.enrollment.courseId, recentItem.enrollment.lastLessonId)}
              className="w-full min-h-[46px] py-2.5 px-4 bg-indigo-600 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              <span>학습 계속하기</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 text-center space-y-2">
            <p className="text-xs text-slate-500 font-medium">수강 중인 강의가 없습니다.</p>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="min-h-[42px] py-2 px-4 bg-indigo-600 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>새로운 강의 둘러보기</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Top Priority: "오늘의 할 일 & 학습 현황" */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-slate-500" />
          <span>오늘의 학습 현황</span>
        </h2>

        {/* 4-Stat Metric Pills (2x2 Grid) */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-xl p-3 border border-slate-200 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-sm flex items-center justify-center shrink-0">
              {overallProgressPercentage}%
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium truncate">평균 진도율</div>
              <div className="text-xs font-bold text-slate-800">{totalCoursesCount}개 코스</div>
            </div>
          </div>

          <div
            onClick={() => setTab('in_progress')}
            className="bg-white rounded-xl p-3 border border-slate-200 flex items-center gap-2.5 cursor-pointer active:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 font-bold text-sm flex items-center justify-center shrink-0">
              {inProgressList.length}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium truncate">수강 중</div>
              <div className="text-xs font-bold text-slate-800">진행 코스</div>
            </div>
          </div>

          <div
            onClick={() => setTab('completed')}
            className="bg-white rounded-xl p-3 border border-slate-200 flex items-center gap-2.5 cursor-pointer active:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-sm flex items-center justify-center shrink-0">
              {completedList.length}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium truncate">수료 완료</div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>수료증</span>
                <Award className="w-3 h-3 text-amber-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-200 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center shrink-0">
              {streakDays}일
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium truncate">연속 출석</div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>열공 중</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Mobile Tabs Navigation */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setTab('in_progress')}
            className={`min-h-[38px] px-3 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              tab === 'in_progress'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>수강 중 ({inProgressList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('completed')}
            className={`min-h-[38px] px-3 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              tab === 'completed'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>수료증 ({completedList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('wishlist')}
            className={`min-h-[38px] px-3 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              tab === 'wishlist'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>찜 ({wishlistItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('bookmarks_notes')}
            className={`min-h-[38px] px-3 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              tab === 'bookmarks_notes'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>노트/북마크 ({studentNotes.length + bookmarks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('quizzes')}
            className={`min-h-[38px] px-3 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              tab === 'quizzes'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileQuestion className="w-3.5 h-3.5" />
            <span>퀴즈 ({allAttempts.length})</span>
          </button>
        </div>

        {/* 5. Mobile Tab Content */}
        {/* Tab 1: In Progress Courses (Mobile Card List) */}
        {tab === 'in_progress' && (
          <div className="space-y-3">
            {inProgressList.length === 0 ? (
              <EmptyState
                title="수강 중인 강의가 없습니다"
                description="새로운 강의를 신청하고 학습을 시작해보세요."
                showAction
                actionLabel="강의 둘러보기"
                onAction={() => onNavigate('home')}
              />
            ) : (
              inProgressList.map((item) => {
                if (!item.course) return null;
                return (
                  <div
                    key={`mobile-course-${item.course.id}`}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      {item.course.thumbnail && (
                        <img
                          src={item.course.thumbnail}
                          alt={item.course.title}
                          className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-100"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {item.course.categoryName || '강의'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                            {item.enrollment.progressPercentage}%
                          </span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 mt-1">
                          {item.course.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.course.instructorName || 'TDS 사내강사'}
                        </p>
                      </div>
                    </div>

                    <ProgressBar
                      progress={item.enrollment.progressPercentage}
                      size="sm"
                      variant={item.enrollment.progressPercentage === 100 ? 'emerald' : 'indigo'}
                    />

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onNavigate('course-detail', item.course.id)}
                        className="min-h-[40px] py-2 px-3 bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors text-center"
                      >
                        강의 정보
                      </button>
                      <button
                        type="button"
                        onClick={() => handleContinue(item.course.id, item.enrollment.lastLessonId)}
                        className="min-h-[40px] py-2 px-3 bg-indigo-600 active:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors text-center flex items-center justify-center gap-1.5"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>학습하기</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Completed Courses & Certificates */}
        {tab === 'completed' && (
          <div className="space-y-3">
            {completedList.length === 0 ? (
              <EmptyState
                title="수료한 강의가 없습니다"
                description="수강 중인 강의를 100% 완강하면 수료증이 발급됩니다."
                showAction
                actionLabel="수강 중인 강의 보기"
                onAction={() => setTab('in_progress')}
              />
            ) : (
              completedList.map((item) => {
                if (!item.course) return null;
                return (
                  <div
                    key={`mobile-cert-${item.course.id}`}
                    className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                        <Award className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            이수 완료
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.enrollment.completedAt || item.enrollment.enrolledAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 mt-1 line-clamp-2">
                          {item.course.title}
                        </h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handlePreviewCertificate(item.course)}
                        className="min-h-[40px] py-2 px-3 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-300/80 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        <span>수료증 미리보기</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleContinue(item.course.id)}
                        className="min-h-[40px] py-2 px-3 bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PlayCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>강의 복습</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 3: Wishlist */}
        {tab === 'wishlist' && (
          <div className="space-y-3">
            {wishlistedCoursesList.length === 0 ? (
              <EmptyState
                title="관심 강의가 없습니다"
                description="마음에 드는 강의의 하트(♡)를 눌러 보관해보세요."
                showAction
                actionLabel="강의 둘러보기"
                onAction={() => onNavigate('home')}
              />
            ) : (
              wishlistedCoursesList.map((course) => {
                if (!course) return null;
                const enr = enrollments.find((e) => e.courseId === course.id);
                return (
                  <div
                    key={`mobile-wish-${course.id}`}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {course.thumbnail && (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {course.categoryName || '강의'}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 mt-1 line-clamp-2">
                            {course.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {course.instructorName}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onWishlistToggle(course.id)}
                        className="p-2 text-rose-500 hover:text-rose-600 cursor-pointer shrink-0"
                        title="찜 해제"
                      >
                        <Heart className="w-5 h-5 fill-rose-500" />
                      </button>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => onNavigate('course-detail', course.id)}
                        className="w-full min-h-[40px] py-2 px-3 bg-indigo-600 active:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>강의 상세 및 수강 신청</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 4: Bookmarks & Student Notes */}
        {tab === 'bookmarks_notes' && (
          <div className="space-y-4">
            {/* Notes */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-indigo-600" />
                <span>작성한 학습 메모 ({studentNotes.length})</span>
              </h4>

              {studentNotes.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">등록된 메모가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {studentNotes.map((note) => (
                    <div
                      key={`mobile-note-${note.id}`}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {formatTime(note.timestampSeconds)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span>{new Date(note.createdAt).toLocaleDateString('ko-KR')}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            aria-label="메모 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bookmarks */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-indigo-600" />
                <span>저장한 차시 북마크 ({bookmarks.length})</span>
              </h4>

              {bookmarks.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">저장된 북마크가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((bm) => (
                    <div
                      key={`mobile-bm-${bm.id}`}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
                          {formatTime(bm.timestampSeconds)}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {bm.title || '북마크 차시'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteBookmark(bm.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer shrink-0"
                        aria-label="북마크 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Quizzes */}
        {tab === 'quizzes' && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileQuestion className="w-4 h-4 text-indigo-600" />
              <span>퀴즈 및 평가 시험 응시 내역 ({allAttempts.length}회)</span>
            </h4>

            {allAttempts.length === 0 ? (
              <EmptyState
                title="응시 기록이 없습니다"
                description="수강 중인 강의의 퀴즈를 풀고 실력을 점검해보세요."
                showAction
                actionLabel="강의실로 이동"
                onAction={() => setTab('in_progress')}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {allAttempts.map((attempt) => {
                  const pct = Math.round((attempt.score / (attempt.maxScore || 100)) * 100);
                  return (
                    <div key={`mobile-quiz-${attempt.id}`} className="py-3 space-y-1.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500">
                          {new Date(attempt.completedAt).toLocaleString('ko-KR')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            attempt.isPassed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {attempt.isPassed ? '합격' : '불합격'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">취득 점수</span>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {attempt.score}점 / {attempt.maxScore || 100}점 ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
