import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CourseCompletionModal } from '../components/student/CourseCompletionModal';
import { AchievementBookModal } from '../components/student/AchievementBookModal';
import { StudentDashboard, DashboardTab } from '../components/student/StudentDashboard';
import { UserLearningGoal, AchievementBadge, LessonBookmark, StudentNote } from '../types';

interface DashboardPageProps {
  onNavigate: (view: string, param?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<DashboardTab>('in_progress');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalHoursInput, setGoalHoursInput] = useState<number>(10);
  const [streakDays, setStreakDays] = useState<number>(1);
  const [learningGoal, setLearningGoal] = useState<UserLearningGoal | undefined>(undefined);
  const [badges, setBadges] = useState<AchievementBadge[]>([]);
  const [bookmarks, setBookmarks] = useState<LessonBookmark[]>([]);
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([]);
  const [wishlistCourses, setWishlistCourses] = useState<any[]>([]);

  // Certificate Modal & View States
  const [selectedCertCourse, setSelectedCertCourse] = useState<any>(null);
  const [selectedCertLessonsCount, setSelectedCertLessonsCount] = useState<number>(0);
  const [isCertModalOpen, setIsCertModalOpen] = useState<boolean>(false);
  const [certModalAutoPrint, setCertModalAutoPrint] = useState<boolean>(false);

  // Achievement Book Modal States
  const [isAchievementBookOpen, setIsAchievementBookOpen] = useState<boolean>(false);
  const [selectedAchievementBadge, setSelectedAchievementBadge] = useState<AchievementBadge | null>(null);

  if (!user) {
    return (
      <div className="lms-container max-w-md py-20 text-center">
        <h2 className="text-xl font-bold text-neutral-900">로그인이 필요합니다</h2>
        <p className="mt-2 text-sm text-neutral-500">내 학습 현황과 진도를 보려면 로그인하세요.</p>
        <button type="button" onClick={() => onNavigate('home')} className="lms-btn lms-btn-primary mt-6">
          홈으로 이동
        </button>
      </div>
    );
  }

  // Load all user data
  const enrollments = storage.getEnrollments(user.id);
  const allCourses = storage.getCourses(true);

  const enrichedEnrollments = enrollments.map((enr) => {
    const course = allCourses.find((c) => c.id === enr.courseId);
    const lessons = storage.getLessons(enr.courseId);
    const lastLesson = lessons.find((l) => l.id === enr.lastLessonId);
    const progressList = storage.getProgressList(user.id, enr.courseId);
    const completedLessonsCount = progressList.filter((p) => p.isCompleted).length;
    return {
      enrollment: enr,
      course,
      totalLessons: lessons.length,
      completedLessonsCount,
      lastLessonTitle: lastLesson?.title || '1강',
    };
  });

  const inProgressList = enrichedEnrollments.filter((item) => item.enrollment.progressPercentage < 100);
  const completedList = enrichedEnrollments.filter((item) => item.enrollment.progressPercentage === 100);

  // Load wishlist
  const wishlistItems = storage.getWishlist(user.id);
  const wishlistedCoursesList = wishlistItems
    .map((w) => allCourses.find((c) => c.id === w.courseId))
    .filter(Boolean);

  // Load all quiz attempts
  const allAttempts = enrollments.flatMap((enr) => {
    const lessons = storage.getLessons(enr.courseId);
    return lessons.flatMap((l) => storage.getQuizAttempts(user.id, l.id));
  });

  const averageScore =
    allAttempts.length > 0
      ? Math.round(allAttempts.reduce((acc, a) => acc + (a.score / (a.maxScore || 100)) * 100, 0) / allAttempts.length)
      : 0;

  const totalMinutesWatched = enrollments.reduce((acc, enr) => {
    const progressList = storage.getProgressList(user.id, enr.courseId);
    return acc + Math.round(progressList.reduce((s, p) => s + p.watchedSeconds, 0) / 60);
  }, 0);

  // Overall progress percentage
  const totalCoursesCount = enrollments.length;
  const overallProgressPercentage =
    totalCoursesCount > 0
      ? Math.round(enrollments.reduce((sum, e) => sum + e.progressPercentage, 0) / totalCoursesCount)
      : 0;

  // Load dynamic goal, streak, badges, bookmarks
  const refreshUserData = () => {
    const streak = storage.getUserStreak(user.id);
    setStreakDays(streak);
    const goal = storage.getLearningGoal(user.id);
    setLearningGoal(goal);
    if (goal) setGoalHoursInput(goal.targetHoursWeekly);
    const userBadges = storage.getBadges(user.id);
    setBadges(userBadges);
    const bmarks = storage.getBookmarks(user.id);
    setBookmarks(bmarks);
    const notes = storage.getStudentNotes(user.id);
    setStudentNotes(notes);
    setWishlistCourses(wishlistedCoursesList);
  };

  useEffect(() => {
    refreshUserData();
  }, [user.id]);

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = storage.updateLearningGoal(user.id, Math.max(1, goalHoursInput));
    setLearningGoal(updated);
    setIsEditingGoal(false);
    showToast(`주간 학습 목표가 ${goalHoursInput}시간으로 저장되었습니다.`, 'success');
  };

  const handleContinue = (courseId: string, lastLessonId?: string) => {
    const lessons = storage.getLessons(courseId);
    const target = lastLessonId || (lessons[0] ? lessons[0].id : undefined);
    if (target) {
      onNavigate('learn', `${courseId}/${target}`);
    } else {
      onNavigate('course-detail', courseId);
    }
  };

  const handlePreviewCertificate = (course: any) => {
    const lessons = storage.getLessons(course.id);
    setSelectedCertCourse(course);
    setSelectedCertLessonsCount(lessons.length || course.totalLessons || 1);
    setCertModalAutoPrint(false);
    setIsCertModalOpen(true);
  };

  const handleDownloadCertificate = (course: any) => {
    const lessons = storage.getLessons(course.id);
    setSelectedCertCourse(course);
    setSelectedCertLessonsCount(lessons.length || course.totalLessons || 1);
    setCertModalAutoPrint(true);
    setIsCertModalOpen(true);
  };

  const handleDeleteBookmark = (bmId: string) => {
    storage.deleteBookmark(bmId);
    refreshUserData();
    showToast('북마크가 삭제되었습니다.', 'info');
  };

  const handleDeleteNote = (noteId: string) => {
    storage.deleteStudentNote(noteId);
    refreshUserData();
    showToast('메모가 삭제되었습니다.', 'info');
  };

  const handleWishlistToggle = (courseId: string) => {
    storage.toggleWishlist(user.id, courseId);
    refreshUserData();
  };

  // Weekly calendar day map
  const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];
  const today = new Date();
  const todayDayIndex = (today.getDay() + 6) % 7; // 0 for Mon, 6 for Sun
  const activityHeatmap = storage.getUserActivityHeatmap(user.id);

  const userBadgeRank = storage.getUserBadgeTitle(user.id);

  // Compute date string (YYYY-MM-DD) for each day of current week (Mon-Sun)
  const currentWeekDays = daysOfWeek.map((day, idx) => {
    const diff = idx - todayDayIndex;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    const dateStr = targetDate.toISOString().split('T')[0];
    const isLearned = (activityHeatmap[dateStr] || 0) > 0;
    const isToday = idx === todayDayIndex;
    return { day, dateStr, isLearned, isToday };
  });

  const dashboardProps = {
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
    onOpenAchievements: (badge?: AchievementBadge | null) => {
      setSelectedAchievementBadge(badge || null);
      setIsAchievementBookOpen(true);
    },
    onWishlistToggle: handleWishlistToggle,
    tab,
    setTab,
    badges,
    enrollments,
  };

  return (
    <>
      <StudentDashboard {...dashboardProps} />

      {/* Official Course Certificate Full Preview & Download Modal */}
      {isCertModalOpen && selectedCertCourse && (
        <CourseCompletionModal
          isOpen={isCertModalOpen}
          onClose={() => {
            setIsCertModalOpen(false);
            setSelectedCertCourse(null);
            setCertModalAutoPrint(false);
          }}
          course={selectedCertCourse}
          lessonsCount={selectedCertLessonsCount}
          user={user}
          initialPrint={certModalAutoPrint}
          onReviewClick={() => {
            setIsCertModalOpen(false);
            onNavigate('course-detail', selectedCertCourse.id);
          }}
          onNavigateHome={() => {
            setIsCertModalOpen(false);
          }}
        />
      )}

      {/* Achievement Book Modal (Full Encyclopedia with Filters, Sorting, Detail View) */}
      <AchievementBookModal
        isOpen={isAchievementBookOpen}
        onClose={() => {
          setIsAchievementBookOpen(false);
          setSelectedAchievementBadge(null);
        }}
        badges={badges}
        userBadgeRank={userBadgeRank}
        initialBadge={selectedAchievementBadge}
      />
    </>
  );
};
