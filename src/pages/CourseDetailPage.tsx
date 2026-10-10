import React, { useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import {
  BarChart3,
  ChevronRight,
  Clock,
  BookOpen,
  Users,
  Star,
  CheckCircle2,
  PlayCircle,
  Play,
  FileQuestion,
  Award,
  ChevronDown,
  ChevronUp,
  Lock,
  ArrowLeft,
  Sparkles,
  Heart,
  Share2,
  Check,
  MessageSquare,
  Send,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  Megaphone,
  Edit3,
  Trash2,
  X,
  StarHalf,
  Info,
  Pin,
} from 'lucide-react';
import { Course, CourseSection, Lesson, CourseReview, Enrollment, CourseAnnouncement, UserRole } from '../types';
import { formatDuration, formatCourseTotalDuration } from '../utils/duration';
import { Avatar } from '../components/common/Avatar';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { UserProfilePreviewModal } from '../components/profile/UserProfilePreviewModal';
import { AnnouncementDetailModal } from '../components/common/AnnouncementDetailModal';
import { CourseCover } from '../components/common/CourseCover';
import { resolveCategory } from '../components/common/CategoryIcon';

interface CourseDetailPageProps {
  courseId: string;
  onNavigate: (view: string, param?: string) => void;
}

export const CourseDetailPage: React.FC<CourseDetailPageProps> = ({ courseId, onNavigate }) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | undefined>(undefined);
  const [enrollmentsCount, setEnrollmentsCount] = useState<number>(0);

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
  const [selectedAnnouncementForDetail, setSelectedAnnouncementForDetail] = useState<CourseAnnouncement | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [isEditingMyReview, setIsEditingMyReview] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [thumbError, setThumbError] = useState(false);
  const [previewUser, setPreviewUser] = useState<{
    userId: string;
    fallbackData?: {
      name?: string;
      avatar?: string;
      role?: UserRole | string;
      nickname?: string;
    };
  } | null>(null);

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
      const fetchedEnr = user ? storage.getEnrollment(user.id, courseId) : undefined;
      const count = storage.getEnrollments().filter((e) => e.courseId === courseId).length;
      const revs = storage.getCourseReviews(fetchedCourse.id);
      const isWish = user ? storage.isCourseInWishlist(user.id, fetchedCourse.id) : false;
      const anns = storage.getCourseAnnouncements(courseId);

      setCourse(fetchedCourse);
      setSections(fetchedSections);
      setLessons(fetchedLessons);
      setEnrollment(fetchedEnr);
      setEnrollmentsCount(count);
      setReviews(revs);
      setIsWishlisted(isWish);
      setAnnouncements(anns);

      const initSecs: Record<string, boolean> = {};
      fetchedSections.forEach((s) => (initSecs[s.id] = true));
      setExpandedSections(initSecs);

      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to load course details:', err);
      setFetchError(err?.message || '강의 세부 정보를 불러오는 데 실패했습니다.');
      setIsLoading(false);
    }
  }, [courseId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="border-b border-neutral-200 bg-white">
          <div className="lms-container space-y-4 py-10">
            <div className="h-4 w-32 rounded bg-neutral-200" />
            <div className="h-8 w-2/3 rounded bg-neutral-200" />
            <div className="h-4 w-1/2 rounded bg-neutral-100" />
          </div>
        </div>
        <div className="lms-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="h-40 rounded-xl border border-neutral-200 bg-white" />
            <div className="h-64 rounded-xl border border-neutral-200 bg-white" />
          </div>
          <div className="h-96 rounded-xl border border-neutral-200 bg-white" />
        </div>
      </div>
    );
  }

  // Error state with Retry button
  if (fetchError) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">강의 정보를 불러오지 못했습니다</h2>
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

  // Empty state (course not found)
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

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const handleEnrollOrContinue = () => {
    if (user && !enrollment) {
      storage.enrollUserInCourse(user.id, course.id);
      showToast(`'${course.title}' 수강 신청이 완료되었습니다.`, 'success', '수강 시작');
    }

    const firstLesson = lessons[0];
    const targetLessonId = enrollment?.lastLessonId || (firstLesson ? firstLesson.id : undefined);
    if (targetLessonId) {
      onNavigate('learn', `${course.id}/${targetLessonId}`);
    } else {
      showToast('아직 등록된 강의 영상 콘텐츠가 없습니다.', 'warning');
    }
  };

  const handleLessonClick = (lessonId: string, _isFree?: boolean) => {
    if (user && !enrollment) {
      storage.enrollUserInCourse(user.id, course.id);
    }
    onNavigate('learn', `${course.id}/${lessonId}`);
  };

  const handleWishlistToggle = () => {
    if (!isAuthenticated || !user) {
      showToast('관심 강의를 등록하려면 먼저 로그인하세요.', 'info');
      openAuthModal('login');
      return;
    }
    const added = storage.toggleWishlist(user.id, course.id);
    setIsWishlisted(added);
    showToast(
      added ? `'${course.title}'을(를) 관심 목록에 추가했습니다.` : `'${course.title}'을(를) 관심 목록에서 제거했습니다.`,
      added ? 'success' : 'info'
    );
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: course.title,
          text: course.shortDescription || course.description,
          url: url,
        });
        showToast('공유가 완료되었습니다.', 'success');
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('강의 링크가 클립보드에 복사되었습니다.', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const myReview = user ? reviews.find((r) => r.userId === user.id) : undefined;
  const reviewsCount = reviews.length;
  const avgRating =
    reviewsCount > 0
      ? Math.round(
          (reviews.reduce((acc, r) => acc + (typeof r.rating === 'number' ? r.rating : 5), 0) /
            reviewsCount) *
            10
        ) / 10
      : 0;

  const RATING_DESCRIPTIONS: Record<string, { title: string; desc: string }> = {
    '5.0': { title: '5.0점 (최고예요)', desc: '강의 구성과 설명이 완벽하고 실무에 큰 도움이 됩니다.' },
    '4.5': { title: '4.5점 (매우 훌륭해요)', desc: '전반적으로 완성도가 매우 높고 많은 도움이 됩니다.' },
    '4.0': { title: '4.0점 (좋아요)', desc: '전반적으로 유익하며 다른 수강생에게도 추천합니다.' },
    '3.5': { title: '3.5점 (유익해요)', desc: '실습과 설명이 충실하며 보완할 점도 조금 있습니다.' },
    '3.0': { title: '3.0점 (보통이에요)', desc: '무난하게 학습할 수 있는 내용입니다.' },
    '2.5': { title: '2.5점 (약간 아쉬워요)', desc: '기초 개념 전달에 아쉬운 점이 있습니다.' },
    '2.0': { title: '2.0점 (아쉬워요)', desc: '내용이나 전달력 일부에 보완이 필요해 보입니다.' },
    '1.5': { title: '1.5점 (많이 아쉬워요)', desc: '강의 설명 및 자료 준비가 부족해 보입니다.' },
    '1.0': { title: '1.0점 (실망스러워요)', desc: '기대했던 내용과 달라 아쉬움이 남습니다.' },
  };

  const getRatingDesc = (val: number) => {
    const key = val.toFixed(1);
    return RATING_DESCRIPTIONS[key] || RATING_DESCRIPTIONS['5.0'];
  };

  const renderAccurateStars = (rating: number, size = 'w-3.5 h-3.5') => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFull = star <= rating;
          const isHalf = !isFull && star - 0.5 <= rating;
          return (
            <div key={star} className="relative inline-block">
              {isFull ? (
                <Star className={`${size} fill-amber-400 text-amber-400`} />
              ) : isHalf ? (
                <div className={`relative ${size}`}>
                  <Star className={`${size} text-slate-200`} />
                  <div className="absolute inset-0 overflow-hidden w-1/2">
                    <Star className={`${size} fill-amber-400 text-amber-400`} />
                  </div>
                </div>
              ) : (
                <Star className={`${size} text-slate-200`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleStartEditReview = () => {
    if (!myReview) return;
    setReviewRating(myReview.rating);
    setReviewComment(myReview.comment);
    setIsEditingMyReview(true);
  };

  const handleCancelEditReview = () => {
    setIsEditingMyReview(false);
    setReviewRating(5);
    setReviewComment('');
  };

  const handleDeleteReview = () => {
    if (!myReview) return;
    if (
      !window.confirm(
        '작성하신 수강평을 정말 삭제하시겠습니까?\n삭제 시 강의 전체 평점 계산에서 즉시 제외됩니다.'
      )
    ) {
      return;
    }
    storage.deleteCourseReview(myReview.id);
    setIsEditingMyReview(false);
    setReviewComment('');
    setReviewRating(5);
    loadData();
    showToast('수강평이 삭제되었습니다.', 'info');
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingReview) return;

    if (!isAuthenticated || !user) {
      showToast('수강평을 남기려면 먼저 로그인하세요.', 'info');
      openAuthModal('login');
      return;
    }
    if (!course) return;

    // 중복 수강평 원천 차단: 이미 작성한 경우 수정 모드가 아니면 거부
    if (myReview && !isEditingMyReview) {
      showToast('이미 작성하신 수강평이 존재합니다. 기존 수강평을 수정하거나 삭제해주세요.', 'warning');
      return;
    }

    const trimmed = reviewComment.trim();
    if (!trimmed || trimmed.length < 5) {
      showToast('수강평을 최소 5자 이상 작성해주세요.', 'warning');
      return;
    }

    setIsSubmittingReview(true);
    storage.addCourseReview(
      course.id,
      user.id,
      user.name,
      reviewRating,
      trimmed,
      user.role,
      user.avatar
    );
    setReviewComment('');
    setIsEditingMyReview(false);
    loadData();
    setIsSubmittingReview(false);
    showToast(
      isEditingMyReview ? '수강평이 성공적으로 수정되었습니다.' : '수강평이 성공적으로 등록되었습니다.',
      'success'
    );
  };

  const isEnrolled = !!enrollment;
  const progress = enrollment?.progressPercentage ?? 0;
  const isCompleted = progress >= 100;
  const categoryName = course.categoryName || resolveCategory(course.categoryId)?.name;
  const hasDuration = (course.totalDurationSeconds && course.totalDurationSeconds > 0) || course.durationMinutes > 0;
  const threshold = course.completionThresholdPercent || 80;

  const openInstructor = () => {
    if (!course.instructorId) return;
    setPreviewUser({
      userId: course.instructorId,
      fallbackData: { name: course.instructorName || '강의 관리자', avatar: course.instructorAvatar, role: 'INSTRUCTOR' },
    });
  };

  const courseNotices: CourseAnnouncement[] =
    announcements.length > 0
      ? announcements
      : course.notice && course.notice.trim() !== ''
      ? [
          {
            id: 'notice_fallback',
            courseId: course.id,
            title: `${course.title} 강의 공지사항`,
            content: course.notice,
            authorName: course.instructorName || 'TDSN 아카데미 교육운영팀',
            authorRole: 'CONTENT_MANAGER',
            createdAt: course.updatedAt || course.createdAt,
          } as CourseAnnouncement,
        ]
      : [];

  const sectionCard = 'rounded-xl border border-neutral-200 bg-white p-5 sm:p-6';

  const enrollCard = (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={handleEnrollOrContinue}
        className="group relative block w-full cursor-pointer"
        aria-label={isEnrolled ? '이어서 학습하기' : '강의 시작하기'}
      >
        <CourseCover thumbnail={course.thumbnail} title={course.title} categoryId={course.categoryId} className="aspect-video w-full" />
        <span className="absolute inset-0 flex items-center justify-center bg-neutral-950/0 opacity-0 transition group-hover:bg-neutral-950/25 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-brand-600 shadow-md transition-transform group-hover:scale-105">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </span>
      </button>
      <div className="space-y-4 p-5">
        {isEnrolled ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-600">{isCompleted ? '수료 완료' : '내 진도율'}</span>
              <span className={`font-semibold tabular-nums ${isCompleted ? 'text-emerald-700' : 'text-brand-700'}`}>{progress}%</span>
            </div>
            <ProgressBar progress={progress} size="md" variant={isCompleted ? 'emerald' : 'indigo'} />
          </div>
        ) : (
          <p className="text-[15px] font-semibold text-neutral-900">
            {course.price > 0 ? `₩${course.price.toLocaleString()}` : '사내 임직원 무료 수강'}
          </p>
        )}
        <button type="button" onClick={handleEnrollOrContinue} className="lms-btn lms-btn-primary h-11 w-full text-[15px]">
          <PlayCircle className="h-5 w-5" />
          {isCompleted ? '다시 학습하기' : isEnrolled ? '이어서 학습하기' : '수강 시작하기'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleWishlistToggle}
            aria-pressed={isWishlisted}
            className={`lms-btn lms-btn-secondary lms-btn-sm ${isWishlisted ? 'border-rose-200 text-rose-600' : ''}`}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
            {isWishlisted ? '관심 해제' : '관심 강의'}
          </button>
          <button type="button" onClick={handleShare} className="lms-btn lms-btn-secondary lms-btn-sm">
            {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
            {copiedLink ? '복사됨' : '공유'}
          </button>
        </div>
        <ul className="space-y-2.5 border-t border-neutral-100 pt-4 text-[13px] text-neutral-600">
          <li className="flex items-center gap-2.5">
            <BookOpen className="h-4 w-4 text-neutral-400" />총 {lessons.length}개 강의
            {hasDuration && <span className="text-neutral-400">· {formatCourseTotalDuration(course.totalDurationSeconds, course.durationMinutes)}</span>}
          </li>
          <li className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-neutral-400" />
            영상 {threshold}% 이상 시청 시 학습 완료
          </li>
          <li className="flex items-center gap-2.5">
            <Award className="h-4 w-4 text-neutral-400" />
            과정 수료 시 수료증 발급
          </li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-w-0">
      {/* ── Header band ── */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="lms-container grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:py-10">
          <div className="min-w-0 space-y-5">
            <nav aria-label="경로" className="flex items-center gap-1 text-[13px] text-neutral-500">
              <button type="button" onClick={() => onNavigate('home')} className="hover:text-neutral-900 cursor-pointer">
                강의
              </button>
              {categoryName && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-neutral-300" />
                  <span>{categoryName}</span>
                </>
              )}
            </nav>

            <div className="space-y-3">
              <h1 className="text-2xl font-bold leading-tight text-neutral-900 sm:text-[30px]">{course.title}</h1>
              <p className="max-w-3xl text-[15px] leading-relaxed text-neutral-600">
                {course.shortDescription || course.description || '등록된 강의 소개가 없습니다.'}
              </p>
            </div>

            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600">
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">평점</dt>
                {reviewsCount > 0 && avgRating > 0 ? (
                  <dd className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-neutral-900">{avgRating.toFixed(1)}</span>
                    <span className="text-neutral-400">({reviewsCount})</span>
                  </dd>
                ) : (
                  <dd className="text-neutral-400">평가 없음</dd>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">난이도</dt>
                <BarChart3 className="h-4 w-4 text-neutral-400" />
                <dd>{course.level}</dd>
              </div>
              {hasDuration && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">총 학습 시간</dt>
                  <Clock className="h-4 w-4 text-neutral-400" />
                  <dd>{formatCourseTotalDuration(course.totalDurationSeconds, course.durationMinutes)}</dd>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">수강생</dt>
                <Users className="h-4 w-4 text-neutral-400" />
                <dd>{enrollmentsCount.toLocaleString()}명 수강</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={openInstructor}
              className="flex items-center gap-3 rounded-lg text-left cursor-pointer group"
              aria-label={`${course.instructorName || '강의 관리자'} 강사 프로필 보기`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-sm font-semibold text-navy-700">
                {course.instructorName ? course.instructorName.slice(0, 1) : '강'}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 group-hover:text-brand-700">
                  {course.instructorName || '강의 관리자'}
                  <VerifiedBadge role="INSTRUCTOR" size="xs" className="shrink-0" />
                </span>
                <span className="block text-[13px] text-neutral-500">{course.instructorRole || '사내 강사'}</span>
              </span>
            </button>
          </div>

          {/* Mobile/tablet: the enroll card sits under the header. Desktop: it lives in the sticky column below. */}
          <div className="lg:hidden">{enrollCard}</div>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="lms-container grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:py-10">
        <div className="min-w-0 space-y-6">
          {courseNotices.length > 0 && (
            <div className="space-y-2">
              {courseNotices.map((ann) => (
                <button
                  key={ann.id}
                  type="button"
                  onClick={() => setSelectedAnnouncementForDetail(ann)}
                  className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-colors hover:border-neutral-300 cursor-pointer"
                >
                  {ann.isPinned ? (
                    <Pin className="h-4 w-4 shrink-0 text-amber-600" />
                  ) : (
                    <Megaphone className="h-4 w-4 shrink-0 text-brand-600" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-900">{ann.title}</span>
                    <span className="block truncate text-[13px] text-neutral-500">{ann.content}</span>
                  </span>
                  <span className="shrink-0 text-xs text-neutral-400">{new Date(ann.createdAt).toLocaleDateString('ko-KR')}</span>
                </button>
              ))}
            </div>
          )}

          {course.learningObjectives && course.learningObjectives.filter(Boolean).length > 0 && (
            <section className={sectionCard}>
              <h2 className="lms-section-title">이 과정에서 배우는 것</h2>
              <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {course.learningObjectives.filter(Boolean).map((obj, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-neutral-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {obj}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.description && course.description !== course.shortDescription && (
            <section className={sectionCard}>
              <h2 className="lms-section-title">과정 소개</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-neutral-700">{course.description}</p>
              {course.requirements && course.requirements.filter(Boolean).length > 0 && (
                <div className="mt-5 border-t border-neutral-100 pt-5">
                  <h3 className="text-sm font-semibold text-neutral-900">수강 전 준비</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
                    {course.requirements.filter(Boolean).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Curriculum */}
          <section className={sectionCard}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="lms-section-title">커리큘럼</h2>
              <span className="text-[13px] text-neutral-500">
                {sections.length}개 섹션 · {lessons.length}개 강의
              </span>
            </div>

            {sections.length === 0 && lessons.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-400">
                <BookOpen className="mx-auto mb-2 h-7 w-7 opacity-50" />
                등록된 강의가 없습니다.
              </div>
            ) : (
              <div className="mt-4 divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
                {sections.map((sec, sIdx) => {
                  const secLessons = lessons.filter((l) => l.sectionId === sec.id);
                  const isExpanded = !!expandedSections[sec.id];
                  return (
                    <div key={sec.id}>
                      <button
                        type="button"
                        onClick={() => toggleSection(sec.id)}
                        aria-expanded={isExpanded}
                        className="flex w-full items-center gap-3 bg-neutral-50 px-4 py-3 text-left hover:bg-neutral-100 cursor-pointer"
                      >
                        <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                        <span className="flex-1 text-sm font-semibold text-neutral-900">
                          {sIdx + 1}. {sec.title}
                        </span>
                        <span className="text-xs text-neutral-500">{secLessons.length}강</span>
                      </button>
                      {isExpanded && (
                        <ul className="divide-y divide-neutral-100">
                          {secLessons.map((l) => (
                            <li key={l.id}>
                              <button
                                type="button"
                                onClick={() => handleLessonClick(l.id, l.isFreePreview)}
                                className="group flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 cursor-pointer"
                              >
                                {l.type === 'quiz' || l.type === 'exam' ? (
                                  <FileQuestion className="h-4 w-4 shrink-0 text-neutral-400" />
                                ) : (
                                  <PlayCircle className="h-4 w-4 shrink-0 text-neutral-400 group-hover:text-brand-600" />
                                )}
                                <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 group-hover:text-neutral-900">{l.title}</span>
                                {l.isFreePreview && !isEnrolled && (
                                  <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">미리보기</span>
                                )}
                                <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                                  {formatDuration(l.durationSeconds, l.durationStatus)}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Reviews */}
          <section className={sectionCard} id="course-reviews">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="lms-section-title">수강평</h2>
              <span className="text-[13px] text-neutral-500">{reviewsCount}개</span>
            </div>

            {reviewsCount > 0 && (
              <div className="mt-4 flex flex-col gap-5 rounded-lg bg-neutral-50 p-4 sm:flex-row sm:items-center">
                <div className="sm:w-36 sm:shrink-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tabular-nums text-neutral-900">{avgRating.toFixed(1)}</span>
                    <span className="text-sm text-neutral-400">/ 5</span>
                  </div>
                  <div className="mt-1">{renderAccurateStars(avgRating, 'w-4 h-4')}</div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviews.filter((r) => Math.round(r.rating) === star).length;
                    const pct = Math.round((count / reviewsCount) * 100);
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs text-neutral-500">
                        <span className="w-6 text-right tabular-nums">{star}점</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                          <span className="block h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="w-6 tabular-nums">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5">
              {!isAuthenticated || !user ? (
                <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-neutral-300 p-4 sm:flex-row sm:items-center">
                  <p className="flex-1 text-sm text-neutral-600">로그인하면 이 강의에 대한 수강평을 남길 수 있어요.</p>
                  <button type="button" onClick={() => openAuthModal('login')} className="lms-btn lms-btn-secondary lms-btn-sm">
                    로그인
                  </button>
                </div>
              ) : myReview && !isEditingMyReview ? (
                <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-brand-700">내 수강평</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={handleStartEditReview} className="lms-btn lms-btn-ghost lms-btn-sm">
                        <Edit3 className="h-3.5 w-3.5" />
                        수정
                      </button>
                      <button type="button" onClick={handleDeleteReview} className="lms-btn lms-btn-ghost lms-btn-sm text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {renderAccurateStars(myReview.rating)}
                    <span className="text-sm font-semibold text-neutral-900">{myReview.rating.toFixed(1)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{myReview.comment}</p>
                </div>
              ) : (
                <form onSubmit={handleSaveReview} className="space-y-3 rounded-lg border border-neutral-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-900">{isEditingMyReview ? '수강평 수정' : '수강평 남기기'}</span>
                    <span className="text-xs text-neutral-500">{getRatingDesc(hoverRating || reviewRating)?.title}</span>
                  </div>
                  <div className="flex items-center gap-0.5" role="radiogroup" aria-label="별점">
                    {[1, 2, 3, 4, 5].map((starIndex) => {
                      const currentVal = hoverRating || reviewRating;
                      const isFull = currentVal >= starIndex;
                      const isHalf = !isFull && currentVal >= starIndex - 0.5;
                      return (
                        <div key={starIndex} className="relative inline-block select-none">
                          <button
                            type="button"
                            onMouseEnter={() => setHoverRating(starIndex - 0.5)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setReviewRating(starIndex - 0.5)}
                            className="absolute left-0 top-0 z-10 h-full w-1/2 cursor-pointer"
                            aria-label={`${starIndex - 0.5}점`}
                          />
                          <button
                            type="button"
                            onMouseEnter={() => setHoverRating(starIndex)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setReviewRating(starIndex)}
                            className="absolute right-0 top-0 z-10 h-full w-1/2 cursor-pointer"
                            aria-label={`${starIndex}점`}
                          />
                          <div className="pointer-events-none p-0.5">
                            {isFull ? (
                              <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                            ) : isHalf ? (
                              <div className="relative h-6 w-6">
                                <Star className="h-6 w-6 text-neutral-200" />
                                <div className="absolute inset-0 w-1/2 overflow-hidden">
                                  <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                                </div>
                              </div>
                            ) : (
                              <Star className="h-6 w-6 text-neutral-200" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    maxLength={1000}
                    placeholder="강의 내용과 구성, 실무 도움 정도를 알려주세요. (5자 이상)"
                    className="lms-input h-auto resize-none py-2.5 leading-relaxed"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs tabular-nums text-neutral-400">{reviewComment.trim().length} / 1,000</span>
                    <div className="flex gap-2">
                      {isEditingMyReview && (
                        <button type="button" onClick={handleCancelEditReview} className="lms-btn lms-btn-secondary lms-btn-sm">
                          취소
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={reviewComment.trim().length < 5 || isSubmittingReview}
                        className="lms-btn lms-btn-primary lms-btn-sm"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {isSubmittingReview ? '저장 중…' : isEditingMyReview ? '수정 저장' : '등록'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <ul className="mt-5 divide-y divide-neutral-100">
              {reviews.length === 0 ? (
                <li className="py-8 text-center text-sm text-neutral-500">아직 수강평이 없습니다. 첫 수강평을 남겨 주세요.</li>
              ) : (
                reviews.map((rev) => {
                  const authorUser = rev.userId ? storage.getUser(rev.userId) : null;
                  const isMe = user && rev.userId === user.id;
                  const role =
                    rev.userRole ||
                    authorUser?.role ||
                    (rev.userName.includes('운영') || rev.userName.includes('관리자') || rev.userName.includes('TDSN')
                      ? 'SUPER_ADMIN'
                      : rev.userName.includes('강사')
                      ? 'INSTRUCTOR'
                      : undefined);
                  const isVerified = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'INSTRUCTOR';
                  return (
                    <li key={rev.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewUser({
                              userId: rev.userId || '',
                              fallbackData: { name: rev.userName, avatar: rev.userAvatar, role: role as UserRole, nickname: authorUser?.nickname },
                            })
                          }
                          className="flex min-w-0 items-center gap-2 rounded-md text-left cursor-pointer group"
                          aria-label={`${rev.userName} 프로필 보기`}
                        >
                          <Avatar user={authorUser} name={rev.userName} src={rev.userAvatar} size="xs" showVerifiedBadge={false} />
                          <span className="truncate text-sm font-medium text-neutral-900 group-hover:text-brand-700">{rev.userName}</span>
                          {isVerified && <VerifiedBadge role={role} size="xs" className="shrink-0" />}
                          {isMe && <span className="text-xs text-brand-700">나</span>}
                        </button>
                        <span className="text-xs text-neutral-400">
                          {new Date(rev.createdAt).toLocaleDateString('ko-KR')}
                          {rev.updatedAt && ' (수정됨)'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {renderAccurateStars(rev.rating, 'w-3.5 h-3.5')}
                        <span className="text-xs font-semibold tabular-nums text-neutral-700">{rev.rating.toFixed(1)}</span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{rev.comment}</p>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-height)+24px)]">{enrollCard}</div>
        </aside>
      </div>

      <UserProfilePreviewModal
        userId={previewUser?.userId || null}
        fallbackData={previewUser?.fallbackData}
        isOpen={Boolean(previewUser)}
        onClose={() => setPreviewUser(null)}
        onNavigate={onNavigate}
      />

      <AnnouncementDetailModal
        isOpen={Boolean(selectedAnnouncementForDetail)}
        onClose={() => setSelectedAnnouncementForDetail(null)}
        announcement={selectedAnnouncementForDetail}
        courseTitle={course?.title}
      />
    </div>
  );
};
