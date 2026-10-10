import React, { useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-8">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 space-y-4">
          <div className="h-6 w-24 bg-slate-800 rounded-full" />
          <div className="h-10 w-3/4 bg-slate-800 rounded" />
          <div className="h-5 w-1/2 bg-slate-800 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl h-48 border border-slate-200 p-6" />
            <div className="bg-white rounded-2xl h-64 border border-slate-200 p-6" />
          </div>
          <div className="bg-white rounded-2xl h-80 border border-slate-200 p-6" />
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

  const hasValidThumbnail =
    course.thumbnail &&
    !thumbError &&
    !course.thumbnail.includes('unsplash.com') &&
    course.thumbnail.trim() !== '';

  return (
    <div className="lms-container py-6 sm:py-8 space-y-6 sm:space-y-8 min-w-0">
      {/* Back Button & Action Toolbar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>전체 강의 목록으로</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Wishlist Heart */}
          <button
            type="button"
            onClick={handleWishlistToggle}
            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isWishlisted
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{isWishlisted ? '관심 해제' : '관심 담기'}</span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? '링크 복사됨' : '공유하기'}</span>
          </button>
        </div>
      </div>

      {/* Main Course Header Hero Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Info Column */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {course.categoryName && <Badge variant="primary">{course.categoryName}</Badge>}
              <Badge variant="neutral">난이도: {course.level}</Badge>
              <span className="text-xs text-slate-400 font-medium">
                등록일: {new Date(course.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {course.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {course.shortDescription || course.description || '등록된 상세 강의 소개가 없습니다.'}
            </p>

            {/* Metrics */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600 pt-2 border-t border-slate-100">
              {reviewsCount > 0 && avgRating > 0 ? (
                <div className="flex items-center gap-1 font-bold text-slate-900">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{avgRating.toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({reviewsCount}개 수강평)</span>
                </div>
              ) : (
                <span className="text-slate-400">평가 없음</span>
              )}
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span>{enrollmentsCount.toLocaleString()}명 수강 중</span>
              </div>
              {(course.totalDurationSeconds && course.totalDurationSeconds > 0) || course.durationMinutes > 0 ? (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>총 {formatCourseTotalDuration(course.totalDurationSeconds, course.durationMinutes)}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span>{lessons.length}개 강의</span>
              </div>
            </div>
          </div>

          {/* Instructor profile snippet */}
          <button
            type="button"
            onClick={() => {
              if (course.instructorId) {
                setPreviewUser({
                  userId: course.instructorId,
                  fallbackData: {
                    name: course.instructorName || '강의 관리자',
                    avatar: course.instructorAvatar,
                    role: 'INSTRUCTOR',
                  },
                });
              }
            }}
            className="flex items-center gap-3 pt-4 border-t border-slate-100 text-left w-full group cursor-pointer rounded-xl hover:bg-slate-50/80 -mx-1 px-1 transition-colors"
            aria-label={`${course.instructorName || '강의 관리자'} 강사 프로필 미리보기`}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-2xs">
              {course.instructorName ? course.instructorName.slice(0, 1) : '강'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                  {course.instructorName || '강의 관리자'}
                </span>
                <VerifiedBadge role="INSTRUCTOR" size="xs" showLabel className="shrink-0" />
              </div>
              <div className="text-[11px] text-slate-500">TDSNTLMS 공식 인증 전문 강사진 · 프로필 보기</div>
            </div>
          </button>
        </div>

        {/* Right Thumbnail & Action Box */}
        <div className="lg:col-span-5 bg-slate-50 p-6 sm:p-8 border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col justify-between space-y-6">
          <div
            onClick={handleEnrollOrContinue}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleEnrollOrContinue();
              }
            }}
            title={isEnrolled ? '이어서 학습 영상 시청하기' : '강의 영상 시청 시작하기'}
            className="group relative aspect-video w-full rounded-2xl overflow-hidden shadow-sm bg-slate-900 cursor-pointer hover:shadow-xl transition-all border border-slate-800"
          >
            {hasValidThumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setThumbError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center group-hover:scale-105 transition-transform duration-300">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 mb-2">
                  <BookOpen className="w-7 h-7 stroke-[1.5]" />
                </div>
                <span className="text-sm font-bold text-slate-200 line-clamp-1 max-w-[85%]">
                  {course.title || '강의 콘텐츠'}
                </span>
              </div>
            )}

            {/* Play Button Center Overlay on Hover / Always Interactive */}
            <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/55 transition-colors flex flex-col items-center justify-center gap-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:bg-indigo-600 transition-all">
                <Play className="w-7 h-7 sm:w-8 sm:h-8 translate-x-0.5 fill-current" />
              </div>
              <span className="text-xs font-bold text-white bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-xs border border-white/10 shadow-xs">
                {isEnrolled ? '이어서 시청하기' : '영상 시청 시작하기'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-indigo-600">
                {course.price > 0 ? `₩${course.price.toLocaleString()}` : '무료 수강'}
              </span>
              <span className="text-xs text-slate-500 font-medium">평생 무제한 수강</span>
            </div>

            {isEnrolled && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">내 학습 진도율</span>
                  <span className="font-bold text-indigo-600 tabular-nums">{progress}%</span>
                </div>
                <ProgressBar progress={progress} size="md" variant={progress >= 100 ? 'emerald' : 'indigo'} />
              </div>
            )}

            <button
              type="button"
              onClick={handleEnrollOrContinue}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              <span>{isEnrolled ? '학습 이어서 하기' : '지금 수강 신청하기'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Curriculum & Reviews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (8 cols): Curriculum List */}
        <div className="lg:col-span-8 space-y-6">
          {/* Official Course Announcements & Notices Section */}
          {announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  onClick={() => setSelectedAnnouncementForDetail(ann)}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-start gap-3 sm:gap-4 ${
                    ann.isPinned
                      ? 'border-amber-200/90 bg-gradient-to-r from-amber-50/40 via-white to-white'
                      : 'border-slate-200/80 hover:border-indigo-200'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${
                      ann.isPinned ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {ann.isPinned ? <Pin className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {ann.isPinned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] shrink-0">
                          <Pin className="w-2.5 h-2.5" />
                          <span>중요 공지</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] shrink-0 border border-indigo-100">
                          <span>강의 공지</span>
                        </span>
                      )}

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {ann.title}
                      </h4>

                      <span aria-hidden="true" className="text-slate-300">·</span>

                      <span className="text-[11px] text-slate-400">
                        {new Date(ann.createdAt).toLocaleDateString('ko-KR')}
                      </span>

                      <VerifiedBadge role={ann.authorRole} size="xs" showLabel className="shrink-0" />
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {ann.content}
                    </p>

                    <div className="pt-1 flex items-center justify-end">
                      <span className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
                        <span>공지 전문 보기</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : course.notice && course.notice.trim() !== '' ? (
            <div
              onClick={() =>
                setSelectedAnnouncementForDetail({
                  id: 'notice_fallback',
                  courseId: course.id,
                  title: `${course.title} 강의 공지사항`,
                  content: course.notice,
                  authorName: course.instructorName || 'TDSN 아카데미 교육운영팀',
                  authorRole: 'CONTENT_MANAGER',
                  createdAt: new Date().toISOString(),
                })
              }
              className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-start gap-3.5"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100 shrink-0">
                    강의 공식 공지
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {course.instructorName || 'TDSN 아카데미 교육운영팀'}
                  </h4>
                  <VerifiedBadge role="INSTRUCTOR" size="xs" showLabel className="shrink-0" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {course.notice}
                </p>
              </div>
            </div>
          ) : null}

          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                강의 커리큘럼 ({lessons.length}개 차시)
              </h2>
              <span className="text-xs text-slate-500">
                {sections.length}개 섹션 • 총 {course.durationMinutes}분
              </span>
            </div>

            {sections.length === 0 && lessons.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>등록된 차시가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((sec) => {
                  const secLessons = lessons.filter((l) => l.sectionId === sec.id);
                  const isExpanded = !!expandedSections[sec.id];

                  return (
                    <div key={sec.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleSection(sec.id)}
                        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{sec.title}</span>
                          <span className="text-[11px] text-slate-400">({secLessons.length}강)</span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>

                      {isExpanded && (
                        <div className="divide-y divide-slate-100 bg-white">
                          {secLessons.map((l, lIdx) => {
                            const isFree = l.isFreePreview;
                            return (
                              <div
                                key={l.id}
                                onClick={() => handleLessonClick(l.id, isFree)}
                                className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                                    {lIdx + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-800 truncate">{l.title}</div>
                                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                      <span>{formatDuration(l.durationSeconds, l.durationStatus)}</span>
                                      {isFree && (
                                        <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded text-[10px]">
                                          무료 체험
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  <PlayCircle className="w-4.5 h-4.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Course Reviews & Feedback Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            {/* Review Section Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">수강평 및 리뷰</h3>
                  <p className="text-[11px] text-slate-500">실제 수강생 분들의 생생한 평가</p>
                </div>
              </div>
              <div className="text-right">
                {reviewsCount > 0 && avgRating > 0 ? (
                  <div className="flex items-center gap-1 font-black text-amber-500 text-sm">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{avgRating.toFixed(1)}</span>
                    <span className="text-[11px] text-slate-400 font-normal">/ 5.0</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">평가 없음</span>
                )}
              </div>
            </div>

            {/* Accurate Rating Summary & Breakdown Scorecard */}
            {reviewsCount > 0 && (
              <div className="p-4 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-slate-900 tracking-tight">
                        {avgRating.toFixed(1)}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">/ 5.0</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const filled = star <= Math.round(avgRating);
                        return (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              filled ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      총 {reviewsCount}개의 솔직한 수강평 반영
                    </p>
                  </div>

                  {/* Distribution Bars */}
                  <div className="w-36 space-y-1 text-[10px]">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviews.filter((r) => Math.round(r.rating) === star).length;
                      const pct = reviewsCount > 0 ? Math.round((count / reviewsCount) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-1.5 text-slate-600">
                          <span className="w-4 font-semibold text-right">{star}점</span>
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-5 text-right text-slate-400">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Review Interaction Area: Duplicate-proof submission, Edit, or Login prompt */}
            {!isAuthenticated || !user ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">수강평을 남겨보세요</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    로그인하시면 강의에 대한 솔직한 평점과 후기를 등록할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  로그인하고 수강평 남기기
                </button>
              </div>
            ) : myReview && !isEditingMyReview ? (
              /* User already reviewed: Show My Review Card to PREVENT DUPLICATES (중복 등록 원천 방지) */
              <div className="p-4 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 rounded-2xl border-2 border-indigo-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                      <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                      내가 작성한 수강평 (등록 완료)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleStartEditReview}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/70 rounded-lg transition-colors cursor-pointer"
                      title="수강평 수정"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>수정</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteReview}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-100/70 rounded-lg transition-colors cursor-pointer"
                      title="수강평 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>삭제</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {renderAccurateStars(myReview.rating, 'w-3.5 h-3.5')}
                    <span className="text-xs font-black text-slate-800">
                      {myReview.rating.toFixed(1)}점
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {getRatingDesc(myReview.rating)?.title.split(' ')[1] || ''}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-slate-100">
                    {myReview.comment}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>
                      작성일: {new Date(myReview.createdAt).toLocaleDateString('ko-KR')}
                      {myReview.updatedAt && (
                        <span className="text-indigo-600 font-medium ml-1.5">
                          (수정됨: {new Date(myReview.updatedAt).toLocaleDateString('ko-KR')})
                        </span>
                      )}
                    </span>
                    <span className="text-slate-400">강좌당 1건 제한</span>
                  </div>
                </div>
              </div>
            ) : (
              /* New Review Form OR Edit Review Form */
              <form
                onSubmit={handleSaveReview}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      {isEditingMyReview ? (
                        <>
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>내 수강평 수정</span>
                        </>
                      ) : (
                        <>
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>수강평 남기기</span>
                        </>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {isEditingMyReview
                        ? '수정한 내용은 강의 전체 평점에 즉시 반영됩니다.'
                        : '강좌당 1회만 등록 가능하며, 언제든 수정 및 삭제할 수 있습니다.'}
                    </p>
                  </div>
                  {isEditingMyReview && (
                    <button
                      type="button"
                      onClick={handleCancelEditReview}
                      className="text-[11px] text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                    >
                      취소
                    </button>
                  )}
                </div>

                {/* Accurate Interactive Star Selector with 0.5 Step & Quick Preset Chips */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">별점 선택 (0.5 단위 지원)</span>
                    <span className="text-xs font-black text-amber-600">
                      {(hoverRating || reviewRating).toFixed(1)}점 / 5.0
                    </span>
                  </div>

                  {/* Half-Star Clickable & Hoverable Stars */}
                  <div className="flex items-center gap-1 py-1">
                    {[1, 2, 3, 4, 5].map((starIndex) => {
                      const currentVal = hoverRating || reviewRating;
                      const isFull = currentVal >= starIndex;
                      const isHalf = !isFull && currentVal >= starIndex - 0.5;

                      return (
                        <div
                          key={`selector-star-${starIndex}`}
                          className="relative inline-block select-none"
                        >
                          {/* Left-half touch/click target (0.5) */}
                          <button
                            type="button"
                            onMouseEnter={() => setHoverRating(starIndex - 0.5)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setReviewRating(starIndex - 0.5)}
                            className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer focus:outline-none"
                            title={`${starIndex - 0.5}점 선택`}
                          />
                          {/* Right-half touch/click target (1.0) */}
                          <button
                            type="button"
                            onMouseEnter={() => setHoverRating(starIndex)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setReviewRating(starIndex)}
                            className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer focus:outline-none"
                            title={`${starIndex}점 선택`}
                          />

                          {/* Visual Star */}
                          <div className="p-1 pointer-events-none">
                            {isFull ? (
                              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                            ) : isHalf ? (
                              <div className="relative w-6 h-6">
                                <Star className="w-6 h-6 text-slate-200" />
                                <div className="absolute inset-0 overflow-hidden w-1/2">
                                  <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                                </div>
                              </div>
                            ) : (
                              <Star className="w-6 h-6 text-slate-200" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Preset Rating Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.0].map((score) => {
                      const isSelected = (hoverRating || reviewRating) === score;
                      return (
                        <button
                          key={`rating-preset-${score}`}
                          type="button"
                          onClick={() => setReviewRating(score)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-white shadow-xs scale-105'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {score.toFixed(1)}점
                        </button>
                      );
                    })}
                  </div>

                  {/* Rating Description Banner */}
                  <p className="text-[11px] text-indigo-700 font-semibold bg-indigo-50/70 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                    {getRatingDesc(hoverRating || reviewRating)?.title} —{' '}
                    <span className="font-normal text-slate-600">
                      {getRatingDesc(hoverRating || reviewRating)?.desc}
                    </span>
                  </p>
                </div>

                {/* Comment Textarea with Character Counter */}
                <div className="space-y-1">
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="강의 내용, 구성, 실습 유익함 등 솔직한 수강평을 남겨주세요 (최소 5자 이상)..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <span>최소 5자 이상 작성 필수</span>
                    <span
                      className={
                        reviewComment.trim().length >= 5 ? 'text-indigo-600 font-bold' : 'text-slate-400'
                      }
                    >
                      {reviewComment.trim().length} / 1,000자
                    </span>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {isEditingMyReview && (
                    <button
                      type="button"
                      onClick={handleCancelEditReview}
                      className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      취소
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={reviewComment.trim().length < 5 || isSubmittingReview}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isSubmittingReview
                        ? '저장 중...'
                        : isEditingMyReview
                        ? '수정 내용 저장'
                        : '수강평 등록'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* Reviews List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-0.5">
                <span>전체 수강평 ({reviews.length})</span>
                <span className="text-[11px] text-slate-400 font-normal">최신순 정렬</span>
              </div>

              {reviews.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-600">아직 등록된 수강평이 없습니다.</p>
                  <p className="text-[11px] text-slate-400">첫 번째 수강평의 주인공이 되어보세요!</p>
                </div>
              ) : (
                reviews.map((rev) => {
                  const authorUser = rev.userId ? storage.getUser(rev.userId) : null;
                  const isMe = user && rev.userId === user.id;
                  const role =
                    rev.userRole ||
                    authorUser?.role ||
                    (rev.userName.includes('운영') ||
                    rev.userName.includes('관리자') ||
                    rev.userName.includes('TDSN')
                      ? 'SUPER_ADMIN'
                      : rev.userName.includes('강사')
                      ? 'INSTRUCTOR'
                      : undefined);
                  const isVerified =
                    role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'INSTRUCTOR';

                  return (
                    <div
                      key={rev.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                        isMe
                          ? 'bg-indigo-50/40 border-indigo-200'
                          : isVerified
                          ? 'bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-slate-50 border-indigo-200/80 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewUser({
                              userId: rev.userId || '',
                              fallbackData: {
                                name: rev.userName,
                                avatar: rev.userAvatar,
                                role: role as UserRole,
                                nickname: authorUser?.nickname,
                              },
                            });
                          }}
                          className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap group text-left cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-0.5 -m-0.5 transition-colors"
                          aria-label={`${rev.userName} 프로필 요약 보기`}
                        >
                          <div className="transition-transform duration-200 group-hover:scale-105 shrink-0">
                            <Avatar
                              user={authorUser}
                              name={rev.userName}
                              src={rev.userAvatar}
                              size="xs"
                              showVerifiedBadge
                            />
                          </div>
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[120px] sm:max-w-[160px]">
                            {rev.userName}
                          </span>
                          {authorUser?.nickname && (
                            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline group-hover:text-indigo-500 transition-colors">
                              {authorUser.nickname}
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/90 px-1.5 py-0.5 rounded">
                              내 수강평
                            </span>
                          )}
                          {isVerified && (
                            <VerifiedBadge role={role} size="xs" showLabel className="shrink-0" />
                          )}
                        </button>
                        <div className="flex items-center gap-1.5 text-amber-500 shrink-0">
                          <span className="text-[11px] font-black text-amber-600 mr-0.5">
                            {rev.rating.toFixed(1)}
                          </span>
                          {renderAccurateStars(rev.rating, 'w-3 h-3')}
                        </div>
                      </div>

                      <p className="text-slate-700 leading-relaxed pl-8 whitespace-pre-line">
                        {rev.comment}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pl-8">
                        <span>
                          {new Date(rev.createdAt).toLocaleDateString('ko-KR')}
                          {rev.updatedAt && (
                            <span className="text-slate-500 ml-1.5">(수정됨)</span>
                          )}
                        </span>
                        {isMe && !isEditingMyReview && (
                          <button
                            type="button"
                            onClick={handleStartEditReview}
                            className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                          >
                            수정하기
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Preview Modal */}
      <UserProfilePreviewModal
        userId={previewUser?.userId || null}
        fallbackData={previewUser?.fallbackData}
        isOpen={Boolean(previewUser)}
        onClose={() => setPreviewUser(null)}
        onNavigate={onNavigate}
      />

      {/* Course Announcement Detail Modal */}
      <AnnouncementDetailModal
        isOpen={Boolean(selectedAnnouncementForDetail)}
        onClose={() => setSelectedAnnouncementForDetail(null)}
        announcement={selectedAnnouncementForDetail}
        courseTitle={course?.title}
      />
    </div>
  );
};
