import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { storage } from '../services/storage';
import { progressApi } from '../services/progressApi';
import { videoApi } from '../services/videoApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { VideoPlayer } from '../components/student/VideoPlayer';
import { QuizViewer } from '../components/student/QuizViewer';
import { NotesTab } from '../components/student/NotesTab';
import { ProgressBar } from '../components/common/ProgressBar';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  StickyNote,
  Info,
  Send,
  Lock,
  AlertCircle,
  RefreshCw,
  Film,
  Sparkles,
  Trophy,
  FastForward,
  Megaphone,
} from 'lucide-react';
import { formatDuration, formatPlayerTime } from '../utils/duration';
import { isAdminRole } from '../utils/rbac';
import { Course, CourseSection, Lesson, CourseAnnouncement, UserRole } from '../types';
import { Avatar } from '../components/common/Avatar';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { CourseCompletionModal } from '../components/student/CourseCompletionModal';
import { UserProfilePreviewModal } from '../components/profile/UserProfilePreviewModal';

interface LearnPageProps {
  courseId: string;
  initialLessonId?: string;
  onNavigate: (view: string, param?: string) => void;
}

interface QAItem {
  id: string;
  author: string;
  userId?: string;
  userRole?: string;
  userAvatar?: string;
  text: string;
  time: string;
  isNotice?: boolean;
}

export const LearnPage: React.FC<LearnPageProps> = ({
  courseId,
  initialLessonId,
  onNavigate,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string>('');

  const [progressVersion, setProgressVersion] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'qa'>('overview');
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [currentVideoDuration, setCurrentVideoDuration] = useState(0);
  const [isMarkingCompleted, setIsMarkingCompleted] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);

  // Autoplay setting (persisted to localStorage)
  const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('learn_autoplay_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleAutoPlayChange = useCallback((enabled: boolean) => {
    setAutoPlayEnabled(enabled);
    try {
      localStorage.setItem('learn_autoplay_enabled', String(enabled));
    } catch {}
  }, []);

  const autoNavigatedLessonsRef = useRef<Set<string>>(new Set());
  const lastStorageSyncRef = useRef<number>(0);

  // Real Q&A messages in local state
  const [qaList, setQaList] = useState<QAItem[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [courseAnnouncements, setCourseAnnouncements] = useState<CourseAnnouncement[]>([]);
  const [previewUser, setPreviewUser] = useState<{
    userId: string;
    fallbackData?: {
      name?: string;
      avatar?: string;
      role?: UserRole | string;
      nickname?: string;
    };
  } | null>(null);

  // Strict Data Fetching with Loading, Empty, Error pattern
  const loadData = useCallback(() => {
    setIsLoading(true);
    setFetchError(null);
    try {
      if (!courseId) {
        setFetchError('유효하지 않은 강의 식별자입니다.');
        setIsLoading(false);
        return;
      }

      const fetchedCourse = storage.getCourseById(courseId);
      if (!fetchedCourse) {
        setCourse(null);
        setSections([]);
        setLessons([]);
        setIsLoading(false);
        return;
      }

      const fetchedSections = storage.getSections(courseId);
      const fetchedLessons = storage.getLessons(courseId);
      const fetchedAnnouncements = storage.getCourseAnnouncements(courseId);

      setCourse(fetchedCourse);
      setSections(fetchedSections);
      setLessons(fetchedLessons);
      setCourseAnnouncements(fetchedAnnouncements);

      // Auto expand all sections
      const initSections: Record<string, boolean> = {};
      fetchedSections.forEach((s) => (initSections[s.id] = true));
      setExpandedSections(initSections);

      // Determine initial active lesson
      let targetLessonId = initialLessonId || '';
      if (!targetLessonId) {
        const enr = user ? storage.getEnrollment(user.id, courseId) : undefined;
        if (enr?.lastLessonId && fetchedLessons.some((l) => l.id === enr.lastLessonId)) {
          targetLessonId = enr.lastLessonId;
        } else if (fetchedLessons.length > 0) {
          targetLessonId = fetchedLessons[0].id;
        }
      }
      setActiveLessonId(targetLessonId);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to load learn page data:', err);
      setFetchError(err?.message || '강의 정보를 불러오는 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  }, [courseId, initialLessonId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Enroll user automatically if not yet enrolled
  useEffect(() => {
    if (user && courseId && course) {
      storage.enrollUserInCourse(user.id, courseId);
      setProgressVersion((v) => v + 1);
    }
  }, [user, courseId, course]);

  const activeLesson = useMemo(() => {
    if (!lessons || lessons.length === 0) return null;
    return lessons.find((l) => l.id === activeLessonId) || lessons[0];
  }, [lessons, activeLessonId]);

  const activeQuestions = useMemo(() => {
    return activeLesson ? storage.getQuestions(activeLesson.id) : [];
  }, [activeLesson]);

  const activeExamConfig = useMemo(() => {
    return activeLesson ? storage.getExamConfig(activeLesson.id) : undefined;
  }, [activeLesson]);

  const progressList = useMemo(() => {
    return user ? storage.getProgressList(user.id, courseId) : [];
  }, [user?.id, courseId, progressVersion]);

  const activeLessonProgress = useMemo(() => {
    return user && activeLesson ? storage.getLessonProgress(user.id, activeLesson.id) : undefined;
  }, [user?.id, activeLesson?.id, progressVersion]);

  // Synchronize playback position and duration when active lesson changes
  useEffect(() => {
    if (activeLesson) {
      const existingProg = user ? storage.getLessonProgress(user.id, activeLesson.id) : undefined;
      setCurrentVideoTime(existingProg?.watchedSeconds || 0);
      setCurrentVideoDuration(
        activeLesson.durationSeconds && activeLesson.durationSeconds > 0
          ? activeLesson.durationSeconds
          : existingProg?.totalSeconds || 0
      );
    }
  }, [activeLesson?.id, user?.id]);

  // Derived effective lesson duration
  const effectiveLessonDuration = useMemo(() => {
    if (currentVideoDuration > 0) return currentVideoDuration;
    if (activeLesson?.durationSeconds && activeLesson.durationSeconds > 0) return activeLesson.durationSeconds;
    if (activeLessonProgress?.totalSeconds && activeLessonProgress.totalSeconds > 0) return activeLessonProgress.totalSeconds;
    return 0;
  }, [currentVideoDuration, activeLesson?.durationSeconds, activeLessonProgress?.totalSeconds]);

  // Current visual playback percentage (0 - 100)
  const playbackPercentage = useMemo(() => {
    if (activeLessonProgress?.isCompleted && currentVideoTime === 0) {
      return 100;
    }
    if (effectiveLessonDuration > 0) {
      return Math.min(100, Math.round((currentVideoTime / effectiveLessonDuration) * 100));
    }
    return activeLessonProgress?.isCompleted ? 100 : 0;
  }, [currentVideoTime, effectiveLessonDuration, activeLessonProgress?.isCompleted]);

  const enrollment = useMemo(() => {
    return user ? storage.getEnrollment(user.id, courseId) : undefined;
  }, [user?.id, courseId, progressVersion]);

  // Completion metrics
  const completedLessonsCount = useMemo(() => {
    return lessons.filter((l) => progressList.some((p) => p.lessonId === l.id && p.isCompleted)).length;
  }, [lessons, progressList]);

  const isAllLessonsCompleted = useMemo(() => {
    return lessons.length > 0 && completedLessonsCount === lessons.length;
  }, [lessons, completedLessonsCount]);

  // Track previous completion state to auto-trigger celebration modal on course completion
  const prevAllCompletedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!lessons || lessons.length === 0 || !user || !courseId) return;

    const allDone = isAllLessonsCompleted;
    const sessionKey = `tdsn_celebrated_${user.id}_${courseId}`;
    const alreadyCelebrated = sessionStorage.getItem(sessionKey) === 'true';

    if (allDone) {
      // Auto-trigger when user finishes the final remaining lesson or on first load of completed course in this session
      if (prevAllCompletedRef.current === false || (!alreadyCelebrated && prevAllCompletedRef.current === null)) {
        setShowCompletionModal(true);
        sessionStorage.setItem(sessionKey, 'true');
        showToast('축하합니다! 강의 내 모든 레슨을 성공적으로 이수하셨습니다.', 'success', '전 과정 수료 달성');
      }
    }

    prevAllCompletedRef.current = allDone;
  }, [isAllLessonsCompleted, lessons, user, courseId, showToast]);

  // Lesson Index for Prev / Next
  const currentIndex = lessons.findIndex((l) => l.id === activeLesson?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < lessons.length - 1;

  // Check if a lesson is unlocked
  const isLessonUnlocked = (targetLesson: typeof lessons[0]) => {
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') return true;
    if (!user) return true; // Allow guest preview
    if (targetLesson.isFreePreview) return true;
    const targetIdx = lessons.findIndex((l) => l.id === targetLesson.id);
    if (targetIdx <= 0) return true;

    // Only enforce sequential lock if explicitly configured on the previous lesson
    for (let i = 0; i < targetIdx; i++) {
      const prev = lessons[i];
      if (prev.sequentialLock === true) {
        const isPrevDone = progressList.some((p) => p.lessonId === prev.id && p.isCompleted);
        if (!isPrevDone) {
          return false;
        }
      }
    }
    return true;
  };

  const handleSelectLesson = (targetLesson: typeof lessons[0]) => {
    if (!isLessonUnlocked(targetLesson)) {
      showToast('이전 강의를 90% 이상 시청하여 완료해야 다음 강의를 학습할 수 있습니다.', 'warning', '학습 순서 잠금');
      return;
    }
    setActiveLessonId(targetLesson.id);
  };

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      setActiveLessonId(lessons[currentIndex - 1].id);
    }
  }, [hasPrev, lessons, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      const nextLesson = lessons[currentIndex + 1];
      if (!isLessonUnlocked(nextLesson)) {
        showToast('현재 강의를 먼저 완료해야 다음 강의로 이동할 수 있습니다.', 'warning', '학습 완료 필요');
        return;
      }
      setActiveLessonId(nextLesson.id);
    }
  }, [hasNext, lessons, currentIndex, isLessonUnlocked, showToast]);

  const maxWatchedSecRef = useRef<number>(0);

  useEffect(() => {
    maxWatchedSecRef.current = activeLessonProgress?.watchedSeconds || 0;
  }, [activeLesson?.id]);

  const handleProgressUpdate = useCallback(
    (watchedSeconds: number, totalSeconds: number, isCompleted: boolean) => {
      if (!activeLesson) return;

      const isPrivileged = isAdminRole(user?.role);
      const isAlreadyCompleted = isCompleted || (activeLessonProgress?.isCompleted ?? false);

      // Guard: Regular students cannot jump ahead of their verified watched position
      let safeWatchedSec = watchedSeconds;
      if (!isPrivileged && !isAlreadyCompleted) {
        const maxAllowed = maxWatchedSecRef.current;
        if (watchedSeconds > maxAllowed + 2.5) {
          safeWatchedSec = maxAllowed;
        } else if (watchedSeconds > maxAllowed) {
          maxWatchedSecRef.current = watchedSeconds;
        }
      } else {
        maxWatchedSecRef.current = Math.max(maxWatchedSecRef.current, watchedSeconds);
      }

      setCurrentVideoTime((prev) => {
        if (Math.abs(prev - safeWatchedSec) >= 0.8 || isCompleted) {
          return safeWatchedSec;
        }
        return prev;
      });
      if (totalSeconds > 0) {
        setCurrentVideoDuration((prev) => (prev !== totalSeconds ? totalSeconds : prev));
      }

      const effectiveTotal =
        totalSeconds > 0
          ? totalSeconds
          : activeLesson.durationSeconds && activeLesson.durationSeconds > 0
          ? activeLesson.durationSeconds
          : currentVideoDuration;

      const now = Date.now();
      if (user && (isCompleted || now - lastStorageSyncRef.current > 3000)) {
        lastStorageSyncRef.current = now;
        storage.updateLessonPlayback(
          user.id,
          courseId,
          activeLesson.id,
          safeWatchedSec,
          effectiveTotal,
          isCompleted
        );
        setProgressVersion((v) => v + 1);
      }
    },
    [activeLesson, currentVideoDuration, user, courseId, activeLessonProgress?.isCompleted]
  );

  // Requirement 1: Automatically navigate to next available lesson once video reaches 95% completion
  useEffect(() => {
    if (!activeLesson || activeLesson.type !== 'video') return;

    const totalSec = effectiveLessonDuration;
    if (totalSec <= 0) return;

    const currentPercent = (currentVideoTime / totalSec) * 100;

    if (currentPercent >= 95 && hasNext) {
      if (!autoNavigatedLessonsRef.current.has(activeLesson.id)) {
        autoNavigatedLessonsRef.current.add(activeLesson.id);

        if (user) {
          storage.updateLessonPlayback(
            user.id,
            courseId,
            activeLesson.id,
            currentVideoTime,
            totalSec,
            true
          );
          progressApi
            .updateProgress(
              user.id,
              courseId,
              activeLesson.id,
              Math.round(currentVideoTime),
              Math.round(totalSec),
              true
            )
            .catch(() => {});
          setProgressVersion((v) => v + 1);
        }

        const nextLesson = lessons[currentIndex + 1];
        showToast(
          autoPlayEnabled
            ? `'${activeLesson.title}' 영상 95% 시청 완료! 다음 강의('${nextLesson.title}')로 이동하여 자동 재생합니다.`
            : `'${activeLesson.title}' 영상 95% 시청 완료! 다음 강의('${nextLesson.title}')로 자동 이동합니다.`,
          'info',
          autoPlayEnabled ? '다음 강의 자동 이동 및 재생' : '다음 강의 자동 이동'
        );

        const navTimer = setTimeout(() => {
          setActiveLessonId(nextLesson.id);
        }, 750);

        return () => clearTimeout(navTimer);
      }
    } else if (currentPercent < 90) {
      autoNavigatedLessonsRef.current.delete(activeLesson.id);
    }
  }, [
    currentVideoTime,
    effectiveLessonDuration,
    activeLesson?.id,
    activeLesson?.type,
    activeLesson?.title,
    hasNext,
    currentIndex,
    lessons,
    user,
    courseId,
    autoPlayEnabled,
    showToast,
  ]);

  // Requirement 2: Manual 'Mark as Completed' button handler triggering API call
  const handleMarkAsCompleted = async () => {
    if (!activeLesson) return;
    if (!user) {
      showToast('학습 완료 상태를 저장하려면 로그인이 필요합니다.', 'warning', '로그인 필요');
      return;
    }

    // Check instructor configured threshold for video lessons
    const threshold =
      activeLesson.completionThresholdPercent ?? course?.completionThresholdPercent ?? 80;
    const isPrivileged = isAdminRole(user?.role);

    const totalSec = effectiveLessonDuration > 0 ? effectiveLessonDuration : 60;
    const currentWatchedPercent = Math.min(100, Math.round((currentVideoTime / totalSec) * 100));

    // 일반 사용자는 강사가 제한한 % 이상 시청해야만 완료 처리 가능
    if (
      activeLesson.type === 'video' &&
      !isPrivileged &&
      !activeLessonProgress?.isCompleted &&
      currentWatchedPercent < threshold
    ) {
      showToast(
        `강사가 설정한 최소 학습 기준(${threshold}%) 이상 시청해야 완료할 수 있습니다. (현재 시청률: ${currentWatchedPercent}%)`,
        'warning',
        '학습 완료 기준 미달'
      );
      return;
    }

    setIsMarkingCompleted(true);
    const watchedSec = Math.max(currentVideoTime, totalSec);

    try {
      // 1. Explicit API call to /api/progress/update
      await progressApi.updateProgress(
        user.id,
        courseId,
        activeLesson.id,
        Math.round(watchedSec),
        Math.round(totalSec),
        true
      );

      try {
        await videoApi.verifyCompletion({
          userId: user.id,
          courseId,
          lessonId: activeLesson.id,
          requiredThresholdPercent: threshold,
        });
      } catch {}

      // 2. Persist locally to storage to update enrollments & unlock next sequential lessons
      storage.updateLessonPlayback(
        user.id,
        courseId,
        activeLesson.id,
        watchedSec,
        totalSec,
        true
      );
      setProgressVersion((v) => v + 1);
      showToast(
        `'${activeLesson.title}' 강의가 성공적으로 완료 처리되었습니다.`,
        'success',
        '학습 완료'
      );
    } catch (err: any) {
      console.error('Failed to update progress via API:', err);
      storage.updateLessonPlayback(
        user.id,
        courseId,
        activeLesson.id,
        watchedSec,
        totalSec,
        true
      );
      setProgressVersion((v) => v + 1);
      showToast(
        `'${activeLesson.title}' 강의 완료 상태가 저장되었습니다.`,
        'success',
        '학습 완료'
      );
    } finally {
      setIsMarkingCompleted(false);
    }
  };

  // Keep latest progress and context synchronized in mutable refs for interval access
  const latestPlaybackRef = useRef({
    currentVideoTime,
    activeLesson,
    activeLessonProgress,
    user,
    courseId,
  });

  latestPlaybackRef.current = {
    currentVideoTime,
    activeLesson,
    activeLessonProgress,
    user,
    courseId,
  };

  // 30-second periodic auto-save interval for video progress synchronization
  useEffect(() => {
    // Only run interval when actively watching a video lesson
    if (!user || !activeLesson || activeLesson.type !== 'video') {
      return;
    }

    const intervalId = setInterval(() => {
      const {
        currentVideoTime: currentTime,
        activeLesson: currentLesson,
        activeLessonProgress: currentProgress,
        user: currentUser,
        courseId: currentCourseId,
      } = latestPlaybackRef.current;

      if (!currentUser || !currentLesson || currentLesson.type !== 'video') {
        return;
      }

      // If user has actively watched any part of the video
      if (currentTime > 0) {
        const totalSec = currentLesson.durationSeconds || currentProgress?.totalSeconds || 0;
        const alreadyCompleted = currentProgress?.isCompleted ?? false;
        const threshold = currentLesson.completionThresholdPercent || 90;
        const isNowCompleted =
          alreadyCompleted ||
          (totalSec > 0 && Math.round((currentTime / totalSec) * 100) >= threshold);

        storage.updateLessonPlayback(
          currentUser.id,
          currentCourseId,
          currentLesson.id,
          currentTime,
          totalSec,
          isNowCompleted
        );
        setProgressVersion((v) => v + 1);
      }
    }, 30000); // 30 seconds interval

    return () => {
      clearInterval(intervalId);
    };
  }, [user?.id, activeLesson?.id, activeLesson?.type]);

  const handleDurationDetected = useCallback(
    (detectedSeconds: number) => {
      if (activeLesson && detectedSeconds > 0 && activeLesson.durationSeconds !== detectedSeconds) {
        const updated = {
          ...activeLesson,
          durationSeconds: detectedSeconds,
          durationStatus: 'READY' as const,
        };
        storage.saveLesson(updated);
        setProgressVersion((v) => v + 1);
      }
    },
    [activeLesson]
  );

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    if (!user) {
      showToast('질문을 남기려면 로그인이 필요합니다.', 'warning');
      return;
    }

    setQaList([
      ...qaList,
      {
        id: `qa_${Date.now()}`,
        author: user.name,
        userId: user.id,
        userRole: user.role,
        userAvatar: user.avatar,
        text: newQuestionText.trim(),
        time: '방금 전',
        isNotice: user.role === 'SUPER_ADMIN' || user.role === 'ADMIN',
      },
    ]);
    setNewQuestionText('');
    showToast('질문이 등록되었습니다.', 'success');
  };

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const progressPercentage = enrollment?.progressPercentage ?? 0;

  // 1. Loading State Skeleton Loader
  if (isLoading) {
    return (
      <div className="min-h-screen-dvh animate-pulse bg-neutral-50">
        <div className="flex h-14 items-center gap-3 border-b border-neutral-200 bg-white px-5">
          <div className="h-5 w-5 rounded bg-neutral-200" />
          <div className="h-4 w-56 rounded bg-neutral-200" />
        </div>
        <div className="mx-auto grid max-w-[1440px] gap-6 px-0 sm:px-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-5">
          <div className="space-y-4">
            <div className="flex aspect-video items-center justify-center bg-neutral-900 sm:rounded-xl">
              <Film className="h-10 w-10 text-neutral-700" />
            </div>
            <div className="h-28 border-y border-neutral-200 bg-white sm:rounded-xl sm:border" />
          </div>
          <div className="h-96 border-y border-neutral-200 bg-white sm:rounded-xl sm:border" />
        </div>
      </div>
    );
  }

  // 2. Error State with Retry Button
  if (fetchError) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">데이터를 불러오지 못했습니다</h2>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">{fetchError}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={loadData}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>다시 시도 (Retry)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  // 3. Empty State (Course Not Found)
  if (!course) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">강의를 찾을 수 없습니다</h2>
        <p className="text-xs text-slate-500 mb-6">요청하신 강의가 삭제되었거나 비공개 상태입니다.</p>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          강의 목록으로 돌아가기
        </button>
      </div>
    );
  }

  const threshold = activeLesson?.completionThresholdPercent ?? course?.completionThresholdPercent ?? 80;
  const isPrivileged = isAdminRole(user?.role);
  const totalSecForGate = effectiveLessonDuration > 0 ? effectiveLessonDuration : 60;
  const currentWatchedPercent = Math.min(100, Math.round((currentVideoTime / totalSecForGate) * 100));
  const isLessonDone = !!activeLessonProgress?.isCompleted;
  const isEligible = isLessonDone || isPrivileged || (activeLesson?.type !== 'video' ? true : currentWatchedPercent >= threshold);

  const courseNotices: CourseAnnouncement[] =
    courseAnnouncements.length > 0
      ? courseAnnouncements
      : course?.notice && course.notice.trim() !== ''
      ? [
          {
            id: 'notice_fallback',
            courseId,
            title: '강의 공지',
            content: course.notice,
            authorName: course.instructorName || 'TDSN 아카데미',
            authorRole: 'CONTENT_MANAGER',
            createdAt: course.updatedAt || course.createdAt,
          } as CourseAnnouncement,
        ]
      : [];

  const tabs = [
    { id: 'overview' as const, label: '강의 개요', icon: Info },
    { id: 'notes' as const, label: '학습 메모', icon: StickyNote },
    { id: 'qa' as const, label: `질문 ${qaList.length > 0 ? qaList.length : ''}`.trim(), icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen-dvh bg-neutral-50 pb-16">
      {/* ── Classroom header (replaces the global navbar on this screen) ── */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
          <button
            type="button"
            onClick={() => onNavigate('course-detail', courseId)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 cursor-pointer"
            title="강의 상세로 돌아가기"
            aria-label="강의 상세로 돌아가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-neutral-900">{course.title}</h1>
            <p className="hidden truncate text-xs text-neutral-500 sm:block">{activeLesson?.title || '강의 콘텐츠 준비 중'}</p>
          </div>

          {isAllLessonsCompleted && (
            <button
              type="button"
              onClick={() => setShowCompletionModal(true)}
              className="lms-btn lms-btn-secondary lms-btn-sm shrink-0 border-amber-300 text-amber-700"
              title="수료증 확인"
            >
              <Trophy className="h-4 w-4" />
              <span className="hidden xs:inline">수료증</span>
            </button>
          )}

          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <span className="text-xs text-neutral-500">
              진도 <strong className="font-semibold tabular-nums text-neutral-900">{progressPercentage}%</strong>
            </span>
            <div className="w-28">
              <ProgressBar progress={progressPercentage} size="sm" variant={progressPercentage >= 100 ? 'emerald' : 'indigo'} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-0 sm:px-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-5">
        {/* ── Main column ── */}
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden bg-neutral-950 sm:rounded-xl">
            {!activeLesson ? (
              <div className="flex aspect-video items-center justify-center text-sm text-neutral-400">등록된 강의 콘텐츠가 없습니다.</div>
            ) : activeLesson.type === 'video' ? (
              <VideoPlayer
                key={activeLesson.id}
                lesson={activeLesson}
                courseId={courseId}
                lessonId={activeLesson.id}
                progress={activeLessonProgress}
                user={user}
                onProgressUpdate={handleProgressUpdate}
                onNextLesson={handleNext}
                onPrevLesson={handlePrev}
                hasNextLesson={hasNext}
                hasPrevLesson={hasPrev}
                onDurationDetected={handleDurationDetected}
                showBottomBar={false}
                autoPlay={autoPlayEnabled}
                onAutoPlayChange={handleAutoPlayChange}
              />
            ) : (
              <div className="bg-white">
                <QuizViewer
                  lesson={activeLesson}
                  questions={activeQuestions}
                  examConfig={activeExamConfig}
                  onCompleted={() => {
                    if (user) {
                      storage.updateLessonPlayback(user.id, courseId, activeLesson.id, 0, 0, true);
                      setProgressVersion((v) => v + 1);
                    }
                  }}
                  onNextLesson={handleNext}
                  hasNextLesson={hasNext}
                />
              </div>
            )}
          </div>

          {activeLesson && (
            <section id="lesson-playback-bar" className="border-y border-neutral-200 bg-white px-4 py-4 sm:rounded-xl sm:border sm:px-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-neutral-900">{activeLesson.title}</h2>
                    {isLessonDone && (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        완료
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {effectiveLessonDuration > 0 && (
                      <span className="font-mono tabular-nums">
                        {formatPlayerTime(currentVideoTime)} / {formatPlayerTime(effectiveLessonDuration)}
                      </span>
                    )}
                    {effectiveLessonDuration > 0 && <span className="mx-1.5 text-neutral-300">·</span>}
                    {activeLesson.type === 'video' ? `${threshold}% 이상 시청하면 완료할 수 있어요` : '문제를 풀고 제출하면 완료됩니다'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    id="autoplay-toggle-btn"
                    role="switch"
                    aria-checked={autoPlayEnabled}
                    onClick={() => {
                      const nextVal = !autoPlayEnabled;
                      handleAutoPlayChange(nextVal);
                      showToast(
                        nextVal ? '다음 강의로 이동 시 영상이 자동으로 재생됩니다.' : '다음 강의 자동 재생이 해제되었습니다.',
                        'info',
                        '자동 재생 설정'
                      );
                    }}
                    className="inline-flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                    title="다음 강의 자동 재생"
                  >
                    <span className={`relative h-4 w-7 rounded-full transition-colors ${autoPlayEnabled ? 'bg-brand-600' : 'bg-neutral-300'}`}>
                      <span
                        className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${autoPlayEnabled ? 'left-3.5' : 'left-0.5'}`}
                      />
                    </span>
                    자동재생
                  </button>

                  <button
                    type="button"
                    id="mark-as-completed-btn"
                    data-testid="mark-as-completed-btn"
                    aria-label="Mark as Completed"
                    onClick={handleMarkAsCompleted}
                    disabled={isMarkingCompleted || (!isEligible && !isLessonDone)}
                    className={`lms-btn lms-btn-sm ${
                      isLessonDone
                        ? 'lms-btn-secondary border-emerald-300 text-emerald-700'
                        : isEligible
                        ? 'lms-btn-primary'
                        : 'lms-btn-secondary text-neutral-400'
                    }`}
                    title={
                      isLessonDone
                        ? '학습이 완료된 강의입니다. (클릭 시 다시 저장)'
                        : !isEligible
                        ? `최소 학습 기준(${threshold}%) 이상 시청해야 완료할 수 있습니다. (현재 ${currentWatchedPercent}%)`
                        : '이 강의를 완료 상태로 저장합니다'
                    }
                  >
                    {isMarkingCompleted ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        저장 중…
                      </>
                    ) : isLessonDone ? (
                      <>
                        <CheckCheck className="h-3.5 w-3.5" />
                        학습 완료됨
                      </>
                    ) : isEligible ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        학습 완료
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        {threshold}% 시청 후 완료
                      </>
                    )}
                  </button>

                  <div className="flex overflow-hidden rounded-lg border border-neutral-300">
                    <button
                      type="button"
                      onClick={handlePrev}
                      disabled={!hasPrev}
                      className="flex h-8 items-center gap-1 px-2.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                      title="이전 강의"
                      aria-label="이전 강의"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">이전</span>
                    </button>
                    <span className="w-px bg-neutral-300" />
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!hasNext}
                      className="flex h-8 items-center gap-1 px-2.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                      title="다음 강의"
                      aria-label="다음 강의"
                    >
                      <span className="hidden sm:inline">다음</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div
                  id="video-playback-progress-track"
                  className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100"
                  role="progressbar"
                  aria-valuenow={playbackPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="영상 시청 진도율"
                >
                  <div
                    id="video-playback-progress-bar"
                    className={`h-full rounded-full transition-all duration-300 ${
                      playbackPercentage >= 95 || isLessonDone ? 'bg-emerald-500' : 'bg-brand-600'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, playbackPercentage))}%` }}
                  />
                  {activeLesson.type === 'video' && !isLessonDone && (
                    <div
                      className="absolute inset-y-0 w-0.5 bg-neutral-400"
                      style={{ left: `${threshold}%` }}
                      title={`완료 기준 ${threshold}%`}
                    />
                  )}
                </div>
                <span id="playback-percentage-val" className="w-10 text-right text-xs font-semibold tabular-nums text-neutral-700">
                  {playbackPercentage}%
                </span>
              </div>
              {hasNext && autoPlayEnabled && (
                <p className="mt-2 text-xs text-neutral-500">95%까지 시청하면 다음 강의로 자동 이동합니다.</p>
              )}
            </section>
          )}

          {/* Tabs */}
          <section className="border-y border-neutral-200 bg-white sm:rounded-xl sm:border">
            <div role="tablist" className="flex gap-1 border-b border-neutral-200 px-2 sm:px-3">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium cursor-pointer ${
                    activeTab === id ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {activeTab === id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-neutral-900" />}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-5">
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {courseNotices.map((ann) => (
                    <div key={ann.id} className="flex gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                      <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-neutral-900">{ann.title}</span>
                          {ann.isPinned && <span className="text-xs font-medium text-amber-700">중요</span>}
                          <span className="text-xs text-neutral-400">{new Date(ann.createdAt).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{ann.content}</p>
                      </div>
                    </div>
                  ))}

                  <div>
                    <h3 className="text-base font-semibold text-neutral-900">{activeLesson?.title || '강의'}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-neutral-600">
                      {activeLesson?.contentSummary || '이 강의에 등록된 설명이 없습니다.'}
                    </p>
                  </div>

                  {activeLesson && (
                    <dl className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-neutral-500">유형</dt>
                        <dd className="mt-0.5 font-medium text-neutral-900">
                          {activeLesson.type === 'video' ? '동영상 강의' : activeLesson.type === 'quiz' ? '이해도 점검 퀴즈' : '종합 평가'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-neutral-500">시간</dt>
                        <dd className="mt-0.5 font-medium text-neutral-900">
                          {formatDuration(activeLesson.durationSeconds, activeLesson.durationStatus)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-neutral-500">완료 기준</dt>
                        <dd className="mt-0.5 font-medium text-neutral-900">{threshold}% 시청</dd>
                      </div>
                    </dl>
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <NotesTab courseId={courseId} lessonId={activeLesson?.id || ''} currentVideoTime={currentVideoTime} />
              )}

              {activeTab === 'qa' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddQuestion} className="flex gap-2">
                    <input
                      type="text"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="강의 내용에 대해 궁금한 점을 남겨 주세요"
                      className="lms-input flex-1"
                    />
                    <button type="submit" className="lms-btn lms-btn-primary shrink-0">
                      <Send className="h-4 w-4" />
                      등록
                    </button>
                  </form>

                  {qaList.length === 0 ? (
                    <p className="py-8 text-center text-sm text-neutral-500">아직 등록된 질문이 없습니다.</p>
                  ) : (
                    <ul className="divide-y divide-neutral-100">
                      {qaList.map((qa) => {
                        const authorUser = qa.userId ? storage.getUser(qa.userId) : null;
                        const role =
                          qa.userRole ||
                          authorUser?.role ||
                          (qa.author.includes('운영') || qa.author.includes('관리자') || qa.author.includes('TDSN')
                            ? 'SUPER_ADMIN'
                            : qa.author.includes('강사')
                            ? 'INSTRUCTOR'
                            : undefined);
                        const isVerified = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'INSTRUCTOR';
                        return (
                          <li key={qa.id} className="py-3.5 first:pt-0 last:pb-0">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewUser({
                                    userId: qa.userId || '',
                                    fallbackData: { name: qa.author, avatar: qa.userAvatar, role: role as UserRole, nickname: authorUser?.nickname },
                                  })
                                }
                                className="flex min-w-0 items-center gap-2 rounded-md text-left cursor-pointer group"
                                aria-label={`${qa.author} 프로필 보기`}
                              >
                                <Avatar user={authorUser} name={qa.author} src={qa.userAvatar} size="xs" showVerifiedBadge={false} />
                                <span className="truncate text-sm font-medium text-neutral-900 group-hover:text-brand-700">{qa.author}</span>
                                {isVerified && <VerifiedBadge role={role} size="xs" className="shrink-0" />}
                                {qa.isNotice && <span className="text-xs font-medium text-brand-700">공지</span>}
                              </button>
                              <span className="shrink-0 text-xs text-neutral-400">{qa.time}</span>
                            </div>
                            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{qa.text}</p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Curriculum ── */}
        <aside className="self-start border-y border-neutral-200 bg-white sm:rounded-xl sm:border lg:sticky lg:top-[76px]">
          {isAllLessonsCompleted && (
            <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-emerald-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <Trophy className="h-4 w-4" />
                모든 강의를 완료했어요
              </span>
              <button type="button" onClick={() => setShowCompletionModal(true)} className="lms-btn lms-btn-secondary lms-btn-sm">
                수료 확인
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <BookOpen className="h-4 w-4 text-neutral-500" />
              커리큘럼
            </h3>
            <span className={`text-xs tabular-nums ${isAllLessonsCompleted ? 'font-semibold text-emerald-700' : 'text-neutral-500'}`}>
              {completedLessonsCount} / {lessons.length} 완료
            </span>
          </div>

          <div className="max-h-none overflow-y-auto lg:max-h-[calc(100dvh-160px)]">
            {sections.length === 0 ? (
              <p className="p-6 text-center text-sm text-neutral-400">등록된 섹션이 없습니다.</p>
            ) : (
              sections.map((section, secIdx) => {
                const secLessons = lessons.filter((l) => l.sectionId === section.id).sort((a, b) => a.order - b.order);
                const isExpanded = !!expandedSections[section.id];
                const doneInSection = secLessons.filter((l) => progressList.find((p) => p.lessonId === l.id)?.isCompleted).length;
                return (
                  <div key={section.id} className="border-b border-neutral-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-neutral-50 cursor-pointer"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-neutral-900">
                        {secIdx + 1}. {section.title}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                        {doneInSection}/{secLessons.length}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
                    </button>

                    {isExpanded && (
                      <ul className="pb-1">
                        {secLessons.length === 0 ? (
                          <li className="px-4 py-3 text-center text-xs text-neutral-400">등록된 강의가 없습니다.</li>
                        ) : (
                          secLessons.map((lesson) => {
                            const isActive = lesson.id === activeLesson?.id;
                            const isDone = progressList.find((p) => p.lessonId === lesson.id)?.isCompleted;
                            const isUnlocked = isLessonUnlocked(lesson);
                            return (
                              <li key={lesson.id}>
                                <button
                                  type="button"
                                  onClick={() => handleSelectLesson(lesson)}
                                  aria-current={isActive ? 'true' : undefined}
                                  className={`relative flex w-full items-center gap-3 px-4 py-2.5 text-left cursor-pointer ${
                                    isActive ? 'bg-brand-50' : !isUnlocked ? 'opacity-60 hover:bg-neutral-50' : 'hover:bg-neutral-50'
                                  }`}
                                >
                                  {isActive && <span className="absolute inset-y-0 left-0 w-0.5 bg-brand-600" />}
                                  <span className="shrink-0">
                                    {isDone ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    ) : !isUnlocked ? (
                                      <Lock className="h-4 w-4 text-neutral-400" />
                                    ) : (
                                      <span className={`block h-4 w-4 rounded-full border-[1.5px] ${isActive ? 'border-brand-600' : 'border-neutral-300'}`} />
                                    )}
                                  </span>
                                  <span className={`min-w-0 flex-1 truncate text-[13px] ${isActive ? 'font-semibold text-brand-800' : 'text-neutral-700'}`}>
                                    {lesson.title}
                                  </span>
                                  <span className="shrink-0 text-xs tabular-nums text-neutral-400">
                                    {lesson.type === 'video'
                                      ? formatDuration(lesson.durationSeconds, lesson.durationStatus)
                                      : lesson.type === 'exam'
                                      ? '시험'
                                      : '퀴즈'}
                                  </span>
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {course && (
        <CourseCompletionModal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          course={course}
          lessonsCount={lessons.length}
          user={user}
          onReviewClick={() => onNavigate('course-detail', courseId)}
          onNavigateHome={() => onNavigate('home')}
        />
      )}

      <UserProfilePreviewModal
        userId={previewUser?.userId || null}
        fallbackData={previewUser?.fallbackData}
        isOpen={Boolean(previewUser)}
        onClose={() => setPreviewUser(null)}
        onNavigate={onNavigate}
      />
    </div>
  );
};
