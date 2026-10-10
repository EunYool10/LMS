import React from 'react';
import { Course, Enrollment } from '../../types';
import { CheckCircle2, Clock, Heart, PlayCircle, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { storage } from '../../services/storage';
import { formatCourseTotalDuration } from '../../utils/duration';
import { CourseCover } from '../common/CourseCover';
import { resolveCategory } from '../common/CategoryIcon';

interface CourseCardProps {
  course: Course;
  enrollment?: Enrollment;
  isWishlisted?: boolean;
  onSelect: (courseId: string) => void;
  onContinue?: (courseId: string) => void;
  onWishlistToggle?: (courseId: string) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  enrollment,
  isWishlisted = false,
  onSelect,
  onContinue,
  onWishlistToggle,
}) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const isEnrolled = !!enrollment;
  const progress = enrollment?.progressPercentage ?? 0;
  const isCompleted = progress >= 100;
  const categoryName = course.categoryName || resolveCategory(course.categoryId)?.name;
  const hasDuration = (course.totalDurationSeconds && course.totalDurationSeconds > 0) || course.durationMinutes > 0;

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated || !user) {
      showToast('관심 강의를 등록하려면 먼저 로그인하세요.', 'info');
      openAuthModal('login');
      return;
    }

    if (onWishlistToggle) {
      onWishlistToggle(course.id);
    } else {
      const added = storage.toggleWishlist(user.id, course.id);
      showToast(
        added ? `'${course.title}'을(를) 관심 강의에 담았습니다.` : `'${course.title}'을(를) 관심 강의에서 해제했습니다.`,
        added ? 'success' : 'info'
      );
    }
  };

  // Enrolled learners jump straight back into the player; everyone else sees the course page first.
  const handleOpen = () => {
    if (isEnrolled && !isCompleted && onContinue) onContinue(course.id);
    else onSelect(course.id);
  };

  return (
    <article
      onClick={handleOpen}
      className="group flex flex-row sm:flex-col bg-white rounded-xl border border-neutral-200 overflow-hidden cursor-pointer transition-[border-color,box-shadow] duration-150 hover:border-neutral-300 hover:shadow-md"
    >
      <div className="relative w-32 shrink-0 self-stretch sm:w-auto sm:self-auto">
        <CourseCover
          thumbnail={course.thumbnail}
          title={course.title}
          categoryId={course.categoryId}
          className="h-full min-h-[96px] w-full sm:h-auto sm:aspect-video"
        />

        <button
          type="button"
          onClick={handleHeartClick}
          className="absolute top-2.5 right-2.5 hidden sm:flex w-8 h-8 rounded-full bg-white/95 border border-neutral-200 items-center justify-center text-neutral-500 hover:text-rose-500 transition-colors cursor-pointer"
          title={isWishlisted ? '관심 강의 해제' : '관심 강의 담기'}
          aria-label={isWishlisted ? '관심 강의 해제' : '관심 강의 담기'}
          aria-pressed={isWishlisted}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {isCompleted && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-white/95 border border-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            수료
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[12px] text-neutral-500">
            {categoryName && <span className="font-medium text-brand-700">{categoryName}</span>}
            {categoryName && <span className="text-neutral-300">·</span>}
            <span>{course.level}</span>
          </div>
          <h3 className="text-[15px] font-semibold leading-snug text-neutral-900 line-clamp-2 sm:min-h-[2.6em] group-hover:text-brand-700 transition-colors">
            {course.title}
          </h3>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-3 text-[12px] text-neutral-500">
            <span className="truncate font-medium text-neutral-700">{course.instructorName || '사내 강사'}</span>
            <span className="ml-auto flex shrink-0 items-center gap-3">
              {hasDuration && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatCourseTotalDuration(course.totalDurationSeconds, course.durationMinutes)}
                </span>
              )}
              {course.reviewsCount > 0 && course.rating > 0 && (
                <span className="inline-flex items-center gap-1 text-neutral-700">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {course.rating.toFixed(1)}
                </span>
              )}
            </span>
          </div>

          {isEnrolled && (
            <div className="space-y-1.5 sm:border-t sm:border-neutral-100 sm:pt-3">
              <div className="flex items-center justify-between text-[12px]">
                <span className={`inline-flex items-center gap-1 font-medium ${isCompleted ? 'text-emerald-700' : 'text-brand-700'}`}>
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                  {isCompleted ? '학습 완료' : '이어서 학습'}
                </span>
                <span className="font-semibold tabular-nums text-neutral-700">{progress}%</span>
              </div>
              <div className="h-1 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-brand-600'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
