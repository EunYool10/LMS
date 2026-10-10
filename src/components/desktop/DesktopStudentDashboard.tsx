import React from 'react';
import { Avatar } from '../common/Avatar';
import { CourseCard } from '../student/CourseCard';
import { LearningProgressWidget } from '../student/LearningProgressWidget';
import { CertificateCard } from '../student/CertificateCard';
import { AchievementCompactWidget } from '../student/AchievementCompactWidget';
import { EmptyState } from '../common/EmptyState';
import {
  BookOpen,
  CheckCircle2,
  Award,
  PlayCircle,
  FileQuestion,
  Heart,
  Calendar,
  Flame,
  Bookmark,
  StickyNote,
  Target,
  Edit3,
  Check,
  X,
  Trash2,
  Settings,
  Trophy,
} from 'lucide-react';
import { User, UserLearningGoal, AchievementBadge, LessonBookmark, StudentNote } from '../../types';
import { isAdminRole, getRoleLabel, getRoleMetadata } from '../../utils/rbac';
import { VerifiedBadge } from '../common/VerifiedBadge';

export interface StudentDashboardViewProps {
  user: User;
  userBadgeRank: { title: string; badge: string; color: string; tier: string };
  overallProgressPercentage: number;
  totalCoursesCount: number;
  inProgressList: any[];
  completedList: any[];
  wishlistItems: any[];
  wishlistedCoursesList: any[];
  enrichedEnrollments: any[];
  allAttempts: any[];
  totalMinutesWatched: number;
  averageScore: number;
  streakDays: number;
  studentNotes: StudentNote[];
  bookmarks: LessonBookmark[];
  recentItem: any;
  currentWeekDays: Array<{ day: string; dateStr: string; isLearned: boolean; isToday: boolean }>;
  daysOfWeek: string[];
  todayDayIndex: number;
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
  tab: 'in_progress' | 'completed' | 'wishlist' | 'bookmarks_notes' | 'quizzes';
  setTab: (tab: 'in_progress' | 'completed' | 'wishlist' | 'bookmarks_notes' | 'quizzes') => void;
  completedViewMode: 'certificates' | 'courses';
  setCompletedViewMode: (mode: 'certificates' | 'courses') => void;
  badges: AchievementBadge[];
  enrollments: any[];
}

export const DesktopStudentDashboard: React.FC<StudentDashboardViewProps> = ({
  user,
  userBadgeRank,
  overallProgressPercentage,
  totalCoursesCount,
  inProgressList,
  completedList,
  wishlistItems,
  wishlistedCoursesList,
  enrichedEnrollments,
  allAttempts,
  totalMinutesWatched,
  averageScore,
  streakDays,
  studentNotes,
  bookmarks,
  recentItem,
  currentWeekDays,
  daysOfWeek,
  todayDayIndex,
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
  completedViewMode,
  setCompletedViewMode,
  badges,
  enrollments,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="lms-container py-6 sm:py-8 space-y-6 sm:space-y-8 min-w-0">
      {/* Student Welcome Banner with Deep Navy + Purple Brand Aesthetic */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-[#0B132B] to-[#1C2541] text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-indigo-600/20 to-transparent pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          <Avatar user={user} size="lg" showRoleBadge={false} showOrnaments={false} />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                <span>안녕하세요, {user.name}님!</span>
                {isAdminRole(user.role) && (
                  <VerifiedBadge role={user.role} size="sm" className="shrink-0" />
                )}
              </h1>
              {isAdminRole(user.role) ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-400/25 via-rose-400/25 to-purple-400/25 text-amber-200 border border-amber-300/40 shadow-xs">
                  <span>✦</span>
                  <span>{getRoleLabel(user.role)}</span>
                </span>
              ) : (
                <span className="bg-amber-400/20 text-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300/30 flex items-center gap-1.5">
                  <span>{userBadgeRank.badge}</span>
                  <span>{userBadgeRank.title}</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-indigo-200">
              오늘도 학습을 시작해보세요. 전체 학습률 {overallProgressPercentage}%, 진행 중 {inProgressList.length}개, 완료 {completedList.length}개
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            id="btn-dashboard-open-achievements-hero"
            onClick={() => onOpenAchievements(null)}
            className="py-2.5 px-3.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-xs font-bold rounded-xl border border-amber-300/30 backdrop-blur-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>업적 도감 열기</span>
          </button>
          <button
            type="button"
            id="btn-dashboard-profile-settings"
            onClick={() => onNavigate('account-settings')}
            className="py-2.5 px-3.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 backdrop-blur-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>내 프로필 수정</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>강의 탐색하기</span>
          </button>
        </div>
      </div>

      {/* 4-Stat Core Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Overall Progress */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-base shrink-0 tabular-nums">
            {overallProgressPercentage}%
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">전체 평균 진도율</div>
            <div className="text-[11px] text-slate-500">{totalCoursesCount}개 수강 코스</div>
          </div>
        </div>

        {/* 2. In-Progress Courses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-black text-base shrink-0 tabular-nums">
            {inProgressList.length}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">학습 중인 강의</div>
            <div className="text-[11px] text-slate-500">진행 중</div>
          </div>
        </div>

        {/* 3. Completed Courses */}
        <div
          onClick={() => setTab('completed')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all group"
          title="완료한 강의 수료증 확인 및 다운로드"
        >
          <div className="w-12 h-12 bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black text-base shrink-0 tabular-nums transition-colors">
            {completedList.length}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>수료 완료 강의</span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-[11px] text-slate-500">수료증 확인 및 다운로드</div>
          </div>
        </div>

        {/* 4. Wishlist Items */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-black text-base shrink-0 tabular-nums">
            {wishlistItems.length}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">관심 강의 (찜)</div>
            <div className="text-[11px] text-slate-500">저장된 강의</div>
          </div>
        </div>
      </div>

      {/* Course Learning Progress Dashboard Visualization Widget */}
      <LearningProgressWidget
        items={enrichedEnrollments}
        onContinue={handleContinue}
        onNavigate={onNavigate}
        onPreviewCertificate={handlePreviewCertificate}
      />

      {/* Grid for: Recent Learning Banner + Weekly Goal & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 cols): Recent Learning + Streak */}
        <div className="lg:col-span-8 space-y-6">
          {/* Recent Learning Box */}
          {recentItem ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">최근 학습한 강의</h3>
                </div>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {recentItem.enrollment.progressPercentage}% 완료
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                    {recentItem.course?.categoryName || '강의'}
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {recentItem.course?.title}
                  </h4>
                  <p className="text-xs text-slate-500">
                    최근 학습 차시: <span className="font-semibold text-slate-700">{recentItem.lastLessonTitle}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleContinue(recentItem.enrollment.courseId, recentItem.enrollment.lastLessonId)}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>이어보기</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-xs">
              <PlayCircle className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="font-medium">현재 진행 중인 최근 학습 강의가 없습니다.</p>
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="mt-3 py-1.5 px-3 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                강의 둘러보기
              </button>
            </div>
          )}

          {/* Learning Streak & Stats Graph Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">학습 연속 기록 & 통계</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{streakDays}일 연속 학습 중</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                <div className="text-[11px] text-slate-500">총 누적 시청</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{totalMinutesWatched}분</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                <div className="text-[11px] text-slate-500">평균 퀴즈 성적</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{averageScore}점</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                <div className="text-[11px] text-slate-500">작성 메모 / 북마크</div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {studentNotes.length + bookmarks.length}개
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right (4 cols): Learning Goal & Calendar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Weekly Learning Goal Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">이번 주 학습 목표</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingGoal(!isEditingGoal)}
                className="text-[11px] text-slate-400 hover:text-indigo-600 font-bold cursor-pointer"
              >
                {isEditingGoal ? '닫기' : '목표 수정'}
              </button>
            </div>

            {isEditingGoal ? (
              <form onSubmit={handleSaveGoal} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">주간 목표 학습 시간 (시간)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={80}
                      value={goalHoursInput}
                      onChange={(e) => setGoalHoursInput(Number(e.target.value))}
                      className="w-20 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-500">시간 / 주</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="py-1 px-3 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>저장</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingGoal(false)}
                    className="py-1 px-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200 cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>취소</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">달성 현황</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {(totalMinutesWatched / 60).toFixed(1)}h / {learningGoal?.targetHoursWeekly || 10}h
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((totalMinutesWatched / 60) / (learningGoal?.targetHoursWeekly || 10)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Weekly Calendar Grid */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-bold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-500" />
                  주간 학습 캘린더
                </span>
                <span>오늘: {daysOfWeek[todayDayIndex]}요일</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {currentWeekDays.map(({ day, isToday, isLearned }) => {
                  return (
                    <div
                      key={day}
                      className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        isToday
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isLearned
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <span className="text-[10px]">{day}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isToday ? 'bg-white' : isLearned ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Achievement Summary Widget in Sidebar */}
          <AchievementCompactWidget
            badges={badges}
            userBadgeRank={userBadgeRank}
            onOpenBook={() => onOpenAchievements(null)}
            onSelectBadge={(badge) => onOpenAchievements(badge)}
          />
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setTab('in_progress')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              tab === 'in_progress'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            <span>수강 중인 강의 ({inProgressList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('completed')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              tab === 'completed'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>완료한 강의 ({completedList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('wishlist')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              tab === 'wishlist'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>관심 강의 ({wishlistItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('bookmarks_notes')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              tab === 'bookmarks_notes'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <StickyNote className="w-4 h-4" />
            <span>북마크 & 메모 ({studentNotes.length + bookmarks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('quizzes')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              tab === 'quizzes'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            <span>시험 및 퀴즈 기록 ({allAttempts.length})</span>
          </button>
        </div>

        {/* Tab 1: In Progress */}
        {tab === 'in_progress' && (
          <div>
            {inProgressList.length === 0 ? (
              <EmptyState
                title="수강 중인 강의가 없습니다"
                description="원하는 강의를 신청하고 학습을 시작해보세요."
                showAction
                actionLabel="강의 둘러보기"
                onAction={() => onNavigate('home')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {inProgressList.map((item) => {
                  if (!item.course) return null;
                  return (
                    <CourseCard
                      key={item.course.id}
                      course={item.course}
                      enrollment={item.enrollment}
                      onSelect={(cId) => onNavigate('course-detail', cId)}
                      onContinue={(cId) => handleContinue(cId, item.enrollment.lastLessonId)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Completed Courses & Certificates */}
        {tab === 'completed' && (
          <div className="space-y-6">
            {completedList.length === 0 ? (
              <EmptyState
                title="완료한 강의가 없습니다"
                description="진행 중인 강의를 100% 완강하면 공식 수료증이 자동 발급됩니다."
                showAction
                actionLabel="수강 중인 강의 이어보기"
                onAction={() => setTab('in_progress')}
              />
            ) : (
              <>
                {/* Official Certificates Header Banner & View Mode Toggle */}
                <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-sm border border-amber-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-white font-serif">
                          TDSN 공식 수료증 보관함
                        </h3>
                        <span className="bg-amber-400/20 text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30">
                          {completedList.length}건 발급됨
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        완강한 교육과정의 수료증을 실시간으로 미리보고, PDF 저장 및 인쇄를 진행할 수 있습니다.
                      </p>
                    </div>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="inline-flex p-1 bg-slate-800/80 rounded-xl border border-slate-700 text-xs shrink-0 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => setCompletedViewMode('certificates')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        completedViewMode === 'certificates'
                          ? 'bg-amber-500 text-slate-950 shadow-2xs font-extrabold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>수료증 카드</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompletedViewMode('courses')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        completedViewMode === 'courses'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>일반 강의 카드</span>
                    </button>
                  </div>
                </div>

                {/* Content Grid based on selected view mode */}
                {completedViewMode === 'certificates' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedList.map((item) => {
                      if (!item.course) return null;
                      return (
                        <CertificateCard
                          key={item.course.id}
                          course={item.course}
                          enrollment={item.enrollment}
                          totalLessons={item.totalLessons}
                          user={user}
                          onPreview={handlePreviewCertificate}
                          onDownload={handleDownloadCertificate}
                          onReviewCourse={(cId) => handleContinue(cId)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {completedList.map((item) => {
                      if (!item.course) return null;
                      return (
                        <CourseCard
                          key={item.course.id}
                          course={item.course}
                          enrollment={item.enrollment}
                          onSelect={(cId) => onNavigate('course-detail', cId)}
                          onContinue={(cId) => handleContinue(cId)}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 3: Wishlist */}
        {tab === 'wishlist' && (
          <div>
            {wishlistedCoursesList.length === 0 ? (
              <EmptyState
                title="관심 등록한 강의가 없습니다"
                description="강의 카드의 하트(♡)를 눌러 관심 강의를 추가해보세요."
                showAction
                actionLabel="강의 탐색하기"
                onAction={() => onNavigate('home')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {wishlistedCoursesList.map((course) => {
                  if (!course) return null;
                  const enr = enrollments.find((e) => e.courseId === course.id);
                  return (
                    <CourseCard
                      key={course.id}
                      course={course}
                      enrollment={enr}
                      isWishlisted={true}
                      onSelect={(cId) => onNavigate('course-detail', cId)}
                      onContinue={(cId) => handleContinue(cId, enr?.lastLessonId)}
                      onWishlistToggle={() => onWishlistToggle(course.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Bookmarks & Student Notes */}
        {tab === 'bookmarks_notes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-indigo-600" />
                <span>내가 작성한 전체 학습 메모 ({studentNotes.length})</span>
              </h4>

              {studentNotes.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">등록된 학습 메모가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {studentNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                          <span className="bg-indigo-100 text-indigo-800 font-mono px-1.5 py-0.5 rounded">
                            {formatTime(note.timestampSeconds)}
                          </span>
                          <span>{new Date(note.createdAt).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-slate-300 hover:text-rose-600 p-1 cursor-pointer transition-colors shrink-0"
                        title="메모 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-600" />
                <span>저장한 차시 북마크 ({bookmarks.length})</span>
              </h4>

              {bookmarks.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">저장된 북마크가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-800 font-mono px-2 py-0.5 rounded font-bold">
                          {formatTime(bm.timestampSeconds)}
                        </span>
                        <span className="font-semibold text-slate-800">{bm.title || '북마크된 시점'}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteBookmark(bm.id)}
                        className="text-slate-300 hover:text-rose-600 p-1 cursor-pointer transition-colors shrink-0"
                        title="북마크 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Quizzes History */}
        {tab === 'quizzes' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileQuestion className="w-4 h-4 text-indigo-600" />
              <span>평가 시험 및 퀴즈 응시 내역 ({allAttempts.length}회)</span>
            </h4>

            {allAttempts.length === 0 ? (
              <EmptyState
                title="퀴즈 응시 기록이 없습니다"
                description="수강 중인 강의의 차시별 퀴즈를 풀고 실력을 점검해보세요."
                showAction
                actionLabel="수강 중인 강의로 이동"
                onAction={() => setTab('in_progress')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">응시 일시</th>
                      <th className="py-2.5 px-3 font-semibold">점수</th>
                      <th className="py-2.5 px-3 font-semibold">결과</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {allAttempts.map((attempt) => {
                      const pct = Math.round((attempt.score / (attempt.maxScore || 100)) * 100);
                      return (
                        <tr key={attempt.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3 text-slate-500">
                            {new Date(attempt.completedAt).toLocaleString('ko-KR')}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900 tabular-nums">
                            {attempt.score}점 / {attempt.maxScore || 100}점 ({pct}%)
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                attempt.isPassed
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {attempt.isPassed ? '합격' : '불합격'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
