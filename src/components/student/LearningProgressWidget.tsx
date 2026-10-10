import React, { useState, useMemo } from 'react';
import { Course, Enrollment } from '../../types';
import { Badge } from '../common/Badge';
import {
  TrendingUp,
  BarChart3,
  PlayCircle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  Award,
} from 'lucide-react';

export interface EnrichedEnrollmentItem {
  enrollment: Enrollment;
  course?: Course;
  totalLessons: number;
  completedLessonsCount: number;
  lastLessonTitle: string;
}

interface LearningProgressWidgetProps {
  items: EnrichedEnrollmentItem[];
  onContinue: (courseId: string, lastLessonId?: string) => void;
  onNavigate: (view: string, param?: string) => void;
  onPreviewCertificate?: (course: Course) => void;
  className?: string;
}

export const LearningProgressWidget: React.FC<LearningProgressWidgetProps> = ({
  items,
  onContinue,
  onNavigate,
  onPreviewCertificate,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'bars' | 'chart'>('bars');
  const [filterType, setFilterType] = useState<'all' | 'in_progress' | 'near_completion'>(() => {
    const hasActive = items.some((i) => i.enrollment.progressPercentage < 100);
    return hasActive || items.length === 0 ? 'in_progress' : 'all';
  });
  const [sortBy, setSortBy] = useState<'progress_desc' | 'progress_asc' | 'recent'>('progress_desc');

  // Filtered list
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (filterType === 'in_progress') {
      result = result.filter((item) => item.enrollment.progressPercentage < 100);
    } else if (filterType === 'near_completion') {
      result = result.filter(
        (item) => item.enrollment.progressPercentage >= 70 && item.enrollment.progressPercentage < 100
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'progress_desc') {
        return b.enrollment.progressPercentage - a.enrollment.progressPercentage;
      }
      if (sortBy === 'progress_asc') {
        return a.enrollment.progressPercentage - b.enrollment.progressPercentage;
      }
      // recent: enrollment date or enrolledAt
      const dateA = new Date(a.enrollment.enrolledAt).getTime();
      const dateB = new Date(b.enrollment.enrolledAt).getTime();
      return dateB - dateA;
    });

    return result;
  }, [items, filterType, sortBy]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalEnrolled = items.length;
    if (totalEnrolled === 0) {
      return { total: 0, inProgress: 0, avgProgress: 0, nearCompletion: 0, totalCompletedLessons: 0, totalLessonsAll: 0 };
    }

    const inProgressCount = items.filter((i) => i.enrollment.progressPercentage < 100).length;
    const nearCompletionCount = items.filter(
      (i) => i.enrollment.progressPercentage >= 70 && i.enrollment.progressPercentage < 100
    ).length;

    const totalPercentageSum = items.reduce((sum, i) => sum + i.enrollment.progressPercentage, 0);
    const avgProgress = Math.round(totalPercentageSum / totalEnrolled);

    const totalCompletedLessons = items.reduce((sum, i) => sum + i.completedLessonsCount, 0);
    const totalLessonsAll = items.reduce((sum, i) => sum + i.totalLessons, 0);

    return {
      total: totalEnrolled,
      inProgress: inProgressCount,
      avgProgress,
      nearCompletion: nearCompletionCount,
      totalCompletedLessons,
      totalLessonsAll,
    };
  }, [items]);

  // Color & status helper based on progress percentage
  const getProgressVisual = (pct: number) => {
    if (pct >= 100) {
      return {
        barBg: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        badgeVariant: 'success' as const,
        badgeText: '수료 완료',
        trackColor: 'bg-emerald-100',
      };
    }
    if (pct >= 70) {
      return {
        barBg: 'bg-teal-500',
        textColor: 'text-teal-700',
        badgeVariant: 'success' as const,
        badgeText: '완강 임박',
        trackColor: 'bg-teal-100',
      };
    }
    if (pct >= 30) {
      return {
        barBg: 'bg-indigo-600',
        textColor: 'text-indigo-700',
        badgeVariant: 'primary' as const,
        badgeText: '학습 진행 중',
        trackColor: 'bg-indigo-100',
      };
    }
    return {
      barBg: 'bg-amber-500',
      textColor: 'text-amber-700',
      badgeVariant: 'warning' as const,
      badgeText: '기초 수강 중',
      trackColor: 'bg-amber-100',
    };
  };

  return (
    <div
      id="section-student-learning-progress-widget"
      className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-6 ${className}`}
    >
      {/* Widget Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>과정별 학습 진행률 현황</span>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full">
                실시간 분석
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              수강 중인 각 과정의 실시간 진도율과 완료 차시를 한눈에 파악하고 바로 이어 학습하세요.
            </p>
          </div>
        </div>

        {/* View Switcher & Action */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* View mode toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-xs">
            <button
              type="button"
              id="btn-progress-view-bars"
              onClick={() => setViewMode('bars')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'bars'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>프로그레스 바</span>
            </button>
            <button
              type="button"
              id="btn-progress-view-chart"
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'chart'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>비교 차트</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70">
          <div className="text-[11px] font-semibold text-slate-500">진행 중인 과정</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 flex items-baseline gap-1">
            <span>{summaryMetrics.inProgress}</span>
            <span className="text-xs font-medium text-slate-500">/ {summaryMetrics.total}개</span>
          </div>
        </div>

        <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100">
          <div className="text-[11px] font-semibold text-indigo-700">전체 평균 수강률</div>
          <div className="text-lg sm:text-xl font-black text-indigo-600 mt-0.5 flex items-baseline gap-1">
            <span>{summaryMetrics.avgProgress}%</span>
            <span className="text-[10px] font-semibold text-indigo-500">달성</span>
          </div>
        </div>

        <div className="p-3.5 bg-teal-50/60 rounded-2xl border border-teal-100">
          <div className="text-[11px] font-semibold text-teal-700">완강 임박 (70%+)</div>
          <div className="text-lg sm:text-xl font-black text-teal-700 mt-0.5 flex items-baseline gap-1">
            <span>{summaryMetrics.nearCompletion}</span>
            <span className="text-xs font-medium text-teal-600">개 과정</span>
          </div>
        </div>

        <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100">
          <div className="text-[11px] font-semibold text-purple-700">총 완료 차시</div>
          <div className="text-lg sm:text-xl font-black text-purple-700 mt-0.5 flex items-baseline gap-1">
            <span>{summaryMetrics.totalCompletedLessons}</span>
            <span className="text-xs font-medium text-purple-600">/ {summaryMetrics.totalLessonsAll}강</span>
          </div>
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterType('in_progress')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'in_progress'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            진행 중인 과정 ({items.filter((i) => i.enrollment.progressPercentage < 100).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('near_completion')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'near_completion'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            완강 임박 ({summaryMetrics.nearCompletion})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            전체 수강 과정 ({items.length})
          </button>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="progress_desc">수강률 높은 순</option>
            <option value="progress_asc">수강률 낮은 순</option>
            <option value="recent">최근 신청 순</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredItems.length === 0 ? (
        /* Empty State */
        <div className="py-8 px-4 text-center rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {filterType === 'near_completion'
                ? '현재 완강 임박(70% 이상) 상태인 강의가 없습니다.'
                : filterType === 'in_progress'
                ? items.length > 0
                  ? '현재 수강 중인 모든 강의를 100% 완강하셨습니다! 🎉'
                  : '진행 중인 강의가 없습니다. 새 강의를 신청해보세요.'
                : '수강 등록된 강의가 없습니다.'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {filterType === 'in_progress' && items.length > 0
                ? '수료 완료된 강의 내역을 확인하거나 새로운 관심 강의를 탐색해보세요.'
                : '관심 있는 새로운 강의를 신청하고 나만의 학습 목표를 달성해보세요.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            {filterType === 'in_progress' && items.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>수료 완료 과정 보기 ({items.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>새로운 강의 탐색하기</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'bars' ? (
        /* Mode 1: Detailed Progress Bars View */
        <div className="space-y-3.5">
          {filteredItems.map((item) => {
            const course = item.course;
            if (!course) return null;

            const progress = item.enrollment.progressPercentage;
            const visual = getProgressVisual(progress);
            const isCompleted = progress >= 100;

            return (
              <div
                key={item.enrollment.id}
                className="group p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-200 hover:shadow-xs transition-all duration-150 space-y-3"
              >
                {/* Course Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                        {course.categoryName || '전체'}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        강사: {course.instructorName}
                      </span>
                      <Badge variant={visual.badgeVariant} size="sm">
                        {visual.badgeText}
                      </Badge>
                    </div>

                    <h3
                      onClick={() => onNavigate('course-detail', course.id)}
                      className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer truncate"
                      title={course.title}
                    >
                      {course.title}
                    </h3>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isCompleted && onPreviewCertificate && (
                      <button
                        type="button"
                        onClick={() => onPreviewCertificate(course)}
                        className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="공식 수료증 미리보기 및 다운로드"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>수료증</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onContinue(course.id, item.enrollment.lastLessonId)}
                      className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>{isCompleted ? '다시 보기' : '이어보기'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('course-detail', course.id)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="강의 상세 정보"
                      aria-label="강의 상세 정보"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Indicators */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                      <span>
                        완료 차시: <strong className="text-slate-800">{item.completedLessonsCount}</strong> / {item.totalLessons}강
                      </span>
                      {item.lastLessonTitle && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[200px] text-slate-600" title={item.lastLessonTitle}>
                            최근: {item.lastLessonTitle}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-black tabular-nums ${visual.textColor}`}>
                        {progress}%
                      </span>
                    </div>
                  </div>

                  {/* The Progress Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${visual.barBg}`}
                      style={{ width: `${Math.max(3, Math.min(100, progress))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Mode 2: Visual Comparison Chart View */
        <div className="p-5 sm:p-6 bg-slate-50/70 rounded-2xl border border-slate-200/90 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>과정별 수강률 수평 비교 차트 (전체 기준)</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              목표 달성 기준: 100% (완강)
            </span>
          </div>

          {/* Grid Scale Labels */}
          <div className="relative">
            {/* Guide Lines at 25%, 50%, 75%, 100% */}
            <div className="absolute inset-0 pointer-events-none flex justify-between text-[10px] text-slate-300">
              <div className="border-r border-slate-200 h-full pl-0.5">0%</div>
              <div className="border-r border-slate-200/80 h-full pl-0.5">25%</div>
              <div className="border-r border-slate-200/80 h-full pl-0.5">50%</div>
              <div className="border-r border-slate-200/80 h-full pl-0.5">75%</div>
              <div className="border-r border-emerald-300 h-full pl-0.5 text-emerald-600 font-bold">100%</div>
            </div>

            {/* Bars List */}
            <div className="space-y-4 pt-4 pb-2 relative z-10">
              {filteredItems.map((item) => {
                const course = item.course;
                if (!course) return null;

                const progress = item.enrollment.progressPercentage;
                const visual = getProgressVisual(progress);

                return (
                  <div key={item.enrollment.id} className="space-y-1 group">
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => onContinue(course.id, item.enrollment.lastLessonId)}
                        className="font-bold text-slate-800 hover:text-indigo-600 transition-colors text-left truncate max-w-xs sm:max-w-md cursor-pointer flex items-center gap-1.5"
                      >
                        <span className="truncate">{course.title}</span>
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 shrink-0" />
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400">
                          {item.completedLessonsCount}/{item.totalLessons}강
                        </span>
                        <span className={`font-black text-xs tabular-nums ${visual.textColor}`}>
                          {progress}%
                        </span>
                      </div>
                    </div>

                    {/* Chart Bar */}
                    <div
                      onClick={() => onContinue(course.id, item.enrollment.lastLessonId)}
                      className="w-full h-4 bg-slate-200/60 rounded-lg overflow-hidden cursor-pointer p-0.5 hover:bg-slate-200 transition-colors"
                      title={`${course.title}: ${progress}% 완료 (클릭하여 이어보기)`}
                    >
                      <div
                        className={`h-full rounded-md transition-all duration-500 shadow-2xs ${visual.barBg}`}
                        style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Average Guideline Note */}
          <div className="pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>
                현재 내 평균 수강률: <strong className="text-indigo-700 font-bold">{summaryMetrics.avgProgress}%</strong>
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              차트의 막대를 클릭하면 해당 강의의 마지막 학습 차시로 바로 연결됩니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
