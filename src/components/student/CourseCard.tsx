import React, { useState } from 'react';
import { Course, Enrollment } from '../../types';
import { PlayCircle, Play, CheckCircle2, Star, Clock, BookOpen, Heart, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { storage } from '../../services/storage';
import { formatCourseTotalDuration } from '../../utils/duration';

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
  const [imageError, setImageError] = useState(false);

  const isEnrolled = !!enrollment;
  const progress = enrollment?.progressPercentage ?? 0;
  const isCompleted = progress >= 100;

  const hasValidThumbnail =
    course.thumbnail &&
    !imageError &&
    !course.thumbnail.includes('unsplash.com') &&
    course.thumbnail.trim() !== '';

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

  return (
    <div
      onClick={() => onSelect(course.id)}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col cursor-pointer hover:-translate-y-1"
    >
      {/* Thumbnail Container */}
      <div
        className="relative aspect-video w-full overflow-hidden bg-slate-900 cursor-pointer"
        onClick={(e) => {
          if (onContinue) {
            e.stopPropagation();
            onContinue(course.id);
          }
        }}
        title="영상 바로 시청하기"
      >
        {hasValidThumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 text-center group-hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 mb-2">
              <BookOpen className="w-6 h-6 stroke-[1.5]" />
            </div>
            <span className="text-xs font-bold text-slate-200 line-clamp-1 max-w-[85%]">
              {course.title || '강의 콘텐츠'}
            </span>
          </div>
        )}

        {/* Hover Center Play Button Overlay */}
        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-4 h-4 translate-x-0.5 fill-current" />
          </div>
        </div>

        {/* Badges on Thumbnail */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className="bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs">
            {course.level}
          </span>
          {course.categoryName && (
            <span className="bg-indigo-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs">
              {course.categoryName}
            </span>
          )}
        </div>

        {/* Wishlist Heart Button */}
        <button
          type="button"
          onClick={handleHeartClick}
          className="absolute top-2.5 right-2.5 z-10 w-7.5 h-7.5 rounded-full bg-slate-900/70 hover:bg-slate-900/90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs shadow-xs hover:scale-105 active:scale-95"
          title={isWishlisted ? '관심 강의 해제' : '관심 강의 담기'}
          aria-label="관심 강의 토글"
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-white/90 hover:text-rose-400'
            }`}
          />
        </button>

        {/* Completion status floating pill */}
        {isEnrolled && (
          <div className="absolute bottom-2.5 right-2.5 bg-slate-950/85 backdrop-blur-xs text-white text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1.5 font-bold shadow-xs z-10">
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">학습 완료</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>{progress}% 학습 중</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug min-h-[40px]">
            {course.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed min-h-[34px]">
            {course.shortDescription || course.description || '등록된 상세 소개가 없습니다.'}
          </p>
        </div>

        <div className="space-y-3 pt-2.5 border-t border-slate-100">
          {/* Instructor & Meta */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="truncate max-w-[130px] font-medium text-slate-600">
              {course.instructorName || '강의 관리자'}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {(course.totalDurationSeconds && course.totalDurationSeconds > 0) || course.durationMinutes > 0 ? (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  {formatCourseTotalDuration(course.totalDurationSeconds, course.durationMinutes)}
                </span>
              ) : null}
              {course.reviewsCount > 0 && course.rating > 0 ? (
                <div className="flex items-center gap-1 font-semibold text-amber-500 shrink-0">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-slate-700 text-[11px] font-bold">{course.rating.toFixed(1)}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Enrolled Progress Bar OR Lesson Count */}
          {isEnrolled ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">진도율</span>
                <span className={`font-bold tabular-nums ${isCompleted ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  {progress}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onContinue) onContinue(course.id);
                  else onSelect(course.id);
                }}
                className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  isCompleted
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isCompleted ? '다시 학습하기' : '이어보기'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1 gap-2">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md w-fit">
                  {course.price > 0 ? `₩${course.price.toLocaleString()}` : '무료 수강'}
                </span>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1">
                  <BookOpen className="w-3 h-3" />총 {course.totalLessons}강
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onContinue) onContinue(course.id);
                  else onSelect(course.id);
                }}
                className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>영상 시청</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
