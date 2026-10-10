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
      <div className="bg-slate-100 min-h-[calc(100vh-4rem)] pb-16 animate-pulse">
        {/* Top bar skeleton */}
        <div className="bg-slate-900 h-14 w-full flex items-center justify-between px-6">
          <div className="h-5 w-48 bg-slate-800 rounded" />
          <div className="h-5 w-24 bg-slate-800 rounded" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              {/* 16:9 Video skeleton */}
              <div className="aspect-video w-full bg-slate-800 rounded-2xl flex items-center justify-center">
                <Film className="w-12 h-12 text-slate-700 animate-pulse" />
              </div>
              <div className="bg-white rounded-2xl h-48 p-6 space-y-3">
                <div className="h-6 w-1/3 bg-slate-200 rounded" />
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
                <div className="h-4 w-1/2 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="lg:col-span-4 bg-white rounded-2xl h-96 p-4 space-y-3">
              <div className="h-5 w-1/2 bg-slate-200 rounded" />
              <div className="space-y-2 pt-4">
                <div className="h-10 bg-slate-100 rounded-xl" />
                <div className="h-10 bg-slate-100 rounded-xl" />
                <div className="h-10 bg-slate-100 rounded-xl" />
              </div>
            </div>
          </div>
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

  return (
    <div className="bg-slate-100 min-h-[calc(100vh-4rem)] pb-16">
      {/* Top Classroom Bar */}
      <div className="bg-slate-900 text-white border-b border-slate-800 sticky top-16 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('course-detail', courseId)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
              title="강의 상세로 돌아가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-white truncate">{course.title}</h1>
              <div className="text-[11px] text-slate-400 truncate hidden sm:block">
                현재 학습 중: {activeLesson?.title || '강의 콘텐츠 준비 중'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isAllLessonsCompleted && (
              <button
                type="button"
                onClick={() => setShowCompletionModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400/20 via-yellow-400/20 to-indigo-400/20 border border-amber-400/50 text-amber-300 hover:text-white text-xs font-bold hover:bg-amber-400/30 transition-all cursor-pointer shadow-xs animate-pulse-subtle"
                title="수료증 및 완주 축하 확인"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="hidden xs:inline">수료증 확인</span>
                <span className="xs:hidden">수료증</span>
              </button>
            )}

            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] text-slate-400">전체 학습 진도율</div>
                <div className="text-xs font-bold text-indigo-400 tabular-nums">{progressPercentage}%</div>
              </div>
              <div className="w-24">
                <ProgressBar progress={progressPercentage} size="sm" variant="indigo" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Classroom Split Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Main Content Column (Video or Quiz) */}
          <div className="lg:col-span-8 space-y-6">
            {!activeLesson ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
                등록된 강의 콘텐츠가 없습니다.
              </div>
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
            )}

            {/* Requirement 3: Visual Progress Bar beneath Video Player & Requirement 2: Mark as Completed Action Bar */}
            {activeLesson && (
              <div
                id="lesson-playback-bar"
                className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4"
              >
                {/* Top Info & Action Buttons Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-sm sm:max-w-md">
                        {activeLesson.title}
                      </span>
                      {activeLessonProgress?.isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>학습 완료됨</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <span>학습 진행 중</span>
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span>
                        재생 진도:{' '}
                        <strong className="text-indigo-600 font-bold tabular-nums">
                          {playbackPercentage}%
                        </strong>
                      </span>
                      {effectiveLessonDuration > 0 && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-slate-600">
                            {formatPlayerTime(currentVideoTime)} / {formatPlayerTime(effectiveLessonDuration)}
                          </span>
                        </>
                      )}
                      {hasNext && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] text-amber-600 font-medium">
                            95% 도달 시 다음 강의 자동 이동
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions: Autoplay setting, Mark as Completed & Prev/Next Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      id="autoplay-toggle-btn"
                      onClick={() => {
                        const nextVal = !autoPlayEnabled;
                        handleAutoPlayChange(nextVal);
                        showToast(
                          nextVal
                            ? '다음 강의로 이동 시 영상이 자동으로 재생됩니다.'
                            : '다음 강의 자동 재생이 해제되었습니다.',
                          'info',
                          '자동 재생 설정'
                        );
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        autoPlayEnabled
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs hover:bg-indigo-100'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                      title={autoPlayEnabled ? '다음 강의 자동 재생 켜짐 (클릭하여 끄기)' : '다음 강의 자동 재생 꺼짐 (클릭하여 켜기)'}
                    >
                      <FastForward className={`w-3.5 h-3.5 ${autoPlayEnabled ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="hidden sm:inline">다음 강의 자동재생</span>
                      <span className="font-bold">{autoPlayEnabled ? 'ON' : 'OFF'}</span>
                    </button>

                    {(() => {
                      const threshold =
                        activeLesson?.completionThresholdPercent ?? course?.completionThresholdPercent ?? 80;
                      const isPrivileged = isAdminRole(user?.role);
                      const totalSec = effectiveLessonDuration > 0 ? effectiveLessonDuration : 60;
                      const currentWatchedPercent = Math.min(100, Math.round((currentVideoTime / totalSec) * 100));
                      const isEligible =
                        activeLessonProgress?.isCompleted ||
                        isPrivileged ||
                        (activeLesson?.type !== 'video' ? true : currentWatchedPercent >= threshold);

                      return (
                        <button
                          type="button"
                          id="mark-as-completed-btn"
                          data-testid="mark-as-completed-btn"
                          aria-label="Mark as Completed"
                          onClick={handleMarkAsCompleted}
                          disabled={isMarkingCompleted || (!isEligible && !activeLessonProgress?.isCompleted)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            activeLessonProgress?.isCompleted
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 cursor-pointer'
                              : isEligible
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 cursor-pointer'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-90'
                          }`}
                          title={
                            activeLessonProgress?.isCompleted
                              ? '학습이 완료된 강의입니다. (클릭 시 다시 저장)'
                              : !isEligible
                              ? `강사가 설정한 최소 학습 기준(${threshold}%) 이상 수강해야 완료 처리할 수 있습니다. (현재 시청률: ${currentWatchedPercent}%)`
                              : '이 강의를 완료 상태로 변경하고 서버에 저장합니다'
                          }
                        >
                          {isMarkingCompleted ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>저장 중...</span>
                            </>
                          ) : activeLessonProgress?.isCompleted ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>학습 완료됨</span>
                            </>
                          ) : isEligible ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>학습 완료로 표시</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>학습 완료 ({threshold}% 이상 시청 필요)</span>
                            </>
                          )}
                        </button>
                      );
                    })()}

                    {/* Navigation Prev & Next */}
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <button
                        type="button"
                        onClick={handlePrev}
                        disabled={!hasPrev}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                        title="이전 강의"
                        aria-label="이전 강의"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="w-px h-4 bg-slate-200" />
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={!hasNext}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                        title="다음 강의"
                        aria-label="다음 강의"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Visual Progress Bar beneath Video Player */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span>영상 시청 진도율</span>
                      {hasNext && (
                        <span className="text-[10px] text-amber-600 font-normal">
                          (95% 이상 시 다음 강의 자동 이동)
                        </span>
                      )}
                    </span>
                    <span id="playback-percentage-val" className="font-bold text-indigo-600 tabular-nums text-sm">
                      {playbackPercentage}%
                    </span>
                  </div>

                  <div
                    id="video-playback-progress-track"
                    className="relative w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/80 shadow-inner"
                  >
                    <div
                      id="video-playback-progress-bar"
                      className={`h-full transition-all duration-300 ease-out rounded-full ${
                        playbackPercentage >= 95 || activeLessonProgress?.isCompleted
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, playbackPercentage))}%` }}
                    />
                    {/* 95% Auto-advance indicator tick */}
                    {hasNext && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                        style={{ left: '95%' }}
                        title="95% 자동 이동 지점"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-0.5">
                    <span>0%</span>
                    {hasNext && (
                      <span className="text-amber-600 font-bold">
                        ▲ 95% 도달 시 다음 강의 자동 이동
                      </span>
                    )}
                    <span>100%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Tabs: Overview, Notes, Q&A */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'overview'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  <span>강의 개요</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'notes'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <StickyNote className="w-4 h-4" />
                  <span>학습 메모</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('qa')}
                  className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'qa'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>질문 & 토론 ({qaList.length})</span>
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-4 text-xs sm:text-sm text-slate-700">
                    {/* Course Official Announcement Banner - Only rendered if registered by admin/instructor */}
                    {courseAnnouncements.length > 0 ? (
                      <div className="space-y-3">
                        {courseAnnouncements.map((ann) => (
                          <div
                            key={ann.id}
                            className="bg-gradient-to-r from-indigo-50/95 via-sky-50/70 to-slate-50 border border-indigo-200/90 rounded-2xl p-4 flex items-start gap-3 shadow-2xs"
                          >
                            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0 mt-0.5">
                              <Megaphone className="w-4 h-4" />
                            </div>
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-md text-[10px] shrink-0">
                                  강의 공식 공지
                                </span>
                                {ann.isPinned && (
                                  <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md text-[10px] shrink-0">
                                    중요
                                  </span>
                                )}
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {ann.title}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {new Date(ann.createdAt).toLocaleDateString('ko-KR')}
                                </span>
                                <VerifiedBadge role={ann.authorRole} size="xs" showLabel className="shrink-0" />
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                {ann.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : course?.notice && course.notice.trim() !== '' ? (
                      <div className="bg-gradient-to-r from-indigo-50/95 via-sky-50/70 to-slate-50 border border-indigo-200/90 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
                        <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0 mt-0.5">
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-md text-[10px] shrink-0">
                              강의 공지
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {course.instructorName || 'TDSN 아카데미 공식 강사진'}
                            </span>
                            <VerifiedBadge role="INSTRUCTOR" size="xs" showLabel className="shrink-0" />
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            {course.notice}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-200 text-slate-500 shrink-0">
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-700">등록된 강의 공지사항이 없습니다.</h4>
                          <p className="text-[11px] text-slate-500">
                            관리자 또는 강사가 등록한 공지사항이 있을 경우 이곳에 표시됩니다.
                          </p>
                        </div>
                      </div>
                    )}

                    <h3 className="text-base font-bold text-slate-900">{activeLesson?.title || '강의'}</h3>
                    <p className="leading-relaxed text-slate-600">
                      {activeLesson?.contentSummary ||
                        '이 강의의 상세 안내 및 설명이 등록되어 있지 않습니다.'}
                    </p>

                    {activeLesson && (
                      <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-semibold text-slate-500">강의 유형: </span>
                          <span className="text-slate-900 font-bold">
                            {activeLesson.type === 'video'
                              ? '동영상 강의'
                              : activeLesson.type === 'quiz'
                              ? '이해도 점검 퀴즈'
                              : '종합 역량 평가'}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-500">시간: </span>
                          <span className="text-slate-900 font-bold">
                            {formatDuration(activeLesson.durationSeconds, activeLesson.durationStatus)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <NotesTab
                    courseId={courseId}
                    lessonId={activeLesson?.id || ''}
                    currentVideoTime={currentVideoTime}
                  />
                )}

                {activeTab === 'qa' && (
                  <div className="space-y-4">
                    {/* Q&A Form */}
                    <form onSubmit={handleAddQuestion} className="flex gap-2">
                      <input
                        type="text"
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="강의 내용이나 궁금한 점을 질문해보세요..."
                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        className="py-2 px-4 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>등록</span>
                      </button>
                    </form>

                    {/* Q&A list */}
                    {qaList.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        아직 등록된 질문이 없습니다. 첫 질문을 남겨보세요.
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
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
                            <div
                              key={qa.id}
                              className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                                qa.isNotice
                                  ? 'bg-gradient-to-r from-indigo-50/95 via-sky-50/70 to-slate-50 border-indigo-200/90 shadow-2xs'
                                  : 'bg-slate-50/80 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewUser({
                                      userId: qa.userId || '',
                                      fallbackData: {
                                        name: qa.author,
                                        avatar: qa.userAvatar,
                                        role: role as UserRole,
                                        nickname: authorUser?.nickname,
                                      },
                                    });
                                  }}
                                  className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap group text-left cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-0.5 -m-0.5 transition-colors"
                                  aria-label={`${qa.author} 프로필 요약 보기`}
                                >
                                  <div className="transition-transform duration-200 group-hover:scale-105 shrink-0">
                                    <Avatar
                                      user={authorUser}
                                      name={qa.author}
                                      src={qa.userAvatar}
                                      size="xs"
                                      showVerifiedBadge
                                    />
                                  </div>
                                  <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[130px] sm:max-w-[180px]">
                                    {qa.author}
                                  </span>
                                  {authorUser?.nickname && (
                                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline group-hover:text-indigo-500 transition-colors">
                                      {authorUser.nickname}
                                    </span>
                                  )}
                                  {isVerified && (
                                    <VerifiedBadge role={role} size="xs" showLabel className="shrink-0" />
                                  )}
                                  {qa.isNotice && (
                                    <span className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0">
                                      공지
                                    </span>
                                  )}
                                </button>
                                <span className="text-[11px] text-slate-400 font-medium shrink-0">{qa.time}</span>
                              </div>
                              <p className="text-slate-700 leading-relaxed pl-8 whitespace-pre-wrap">{qa.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Curriculum Drawer Column */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden sticky top-36">
            {/* Celebratory Banner when all lessons are completed */}
            {isAllLessonsCompleted && (
              <div className="p-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 text-white flex items-center justify-between gap-2 shadow-xs border-b border-amber-400/30">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-lg bg-white/20 shrink-0">
                    <Trophy className="w-4 h-4 text-amber-200 animate-trophy-bounce" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black leading-tight">100% 전 과정 완주 달성!</div>
                    <div className="text-[10px] text-amber-100 truncate">모든 레슨을 성공적으로 완료했습니다</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompletionModal(true)}
                  className="px-2.5 py-1 bg-white text-slate-900 hover:bg-amber-50 rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer shadow-xs"
                >
                  축하 메시지
                </button>
              </div>
            )}

            <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>커리큘럼</span>
              </h3>
              <span className={`text-[11px] font-medium ${isAllLessonsCompleted ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                {completedLessonsCount} / {lessons.length} 완료
              </span>
            </div>

            <div className="max-h-[calc(100vh-16rem)] overflow-y-auto divide-y divide-slate-100">
              {sections.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">등록된 섹션이 없습니다.</div>
              ) : (
                sections.map((section, secIdx) => {
                  const secLessons = lessons.filter((l) => l.sectionId === section.id).sort((a, b) => a.order - b.order);
                  const isExpanded = !!expandedSections[section.id];

                  return (
                    <div key={section.id}>
                      {/* Section Header */}
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="w-full p-3.5 bg-slate-50/50 hover:bg-slate-100/60 flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-bold text-indigo-600 shrink-0">섹션 {secIdx + 1}</span>
                          <span className="text-xs font-bold text-slate-900 truncate">{section.title}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {/* Lessons list */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-50 bg-white">
                          {secLessons.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400">등록된 강의가 없습니다.</div>
                          ) : (
                            secLessons.map((lesson) => {
                              const isActive = lesson.id === activeLesson?.id;
                              const progressItem = progressList.find((p) => p.lessonId === lesson.id);
                              const isDone = progressItem?.isCompleted;
                              const isUnlocked = isLessonUnlocked(lesson);

                              return (
                                <button
                                  key={lesson.id}
                                  type="button"
                                  onClick={() => handleSelectLesson(lesson)}
                                  className={`w-full p-3 px-4 flex items-center justify-between gap-2.5 text-left transition-all cursor-pointer ${
                                    isActive
                                      ? 'bg-indigo-50/90 text-indigo-950 font-bold border-l-4 border-indigo-600'
                                      : !isUnlocked
                                      ? 'opacity-60 bg-slate-50/50 hover:bg-slate-100/50 text-slate-500'
                                      : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="shrink-0">
                                      {isDone ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                      ) : !isUnlocked ? (
                                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                                      ) : (
                                        <div
                                          className={`w-4 h-4 rounded-full border-2 ${
                                            isActive ? 'border-indigo-600 bg-indigo-600/20' : 'border-slate-300'
                                          }`}
                                        />
                                      )}
                                    </div>
                                    <span className="text-xs truncate">{lesson.title}</span>
                                  </div>

                                  <div className="shrink-0 text-[11px] text-slate-400">
                                    {lesson.type === 'video' && (
                                      <span className="font-mono">
                                        {formatDuration(lesson.durationSeconds, lesson.durationStatus)}
                                      </span>
                                    )}
                                    {(lesson.type === 'quiz' || lesson.type === 'exam') && (
                                      <span className="text-indigo-600 font-semibold text-[10px]">
                                        {lesson.type === 'exam' ? '시험' : '퀴즈'}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course All Lessons Completed Celebration Modal with Pure CSS Confetti & Animation */}
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

      {/* User Profile Preview Modal */}
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
