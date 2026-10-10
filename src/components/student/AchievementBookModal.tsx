import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  Trophy,
  Filter,
  CheckCircle2,
  Sparkles,
  Lock,
  ArrowUpDown,
  GraduationCap,
  Clock,
  Flame,
  FileQuestion,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { AchievementBadge } from '../../types';
import { AchievementCard } from './AchievementCard';
import { AchievementDetailModal } from './AchievementDetailModal';
import { BaseModal } from '../common/BaseModal';
import { useAuth } from '../../context/AuthContext';

interface AchievementBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: AchievementBadge[];
  userBadgeRank?: { title: string; badge: string; color: string; tier: string };
  initialBadge?: AchievementBadge | null;
}

type CategoryFilter = 'all' | 'completion' | 'time' | 'streak' | 'quiz' | 'admin';
type StatusFilter = 'all' | 'unlocked' | 'in_progress' | 'locked';
type SortOption = 'default' | 'progress_desc' | 'progress_asc' | 'required_asc' | 'recent_earned';

export const AchievementBookModal: React.FC<AchievementBookModalProps> = ({
  isOpen,
  onClose,
  badges,
  userBadgeRank,
  initialBadge = null,
}) => {
  const { user } = useAuth();
  const isAdmin = !!(user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'));

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all');
  const [activeSort, setActiveSort] = useState<SortOption>('default');
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(initialBadge);

  // Sync initialBadge if passed when modal opens
  useEffect(() => {
    if (initialBadge) {
      setSelectedBadge(initialBadge);
    }
  }, [initialBadge]);

  // Handle ESC key and scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedBadge) {
          setSelectedBadge(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, selectedBadge, onClose]);

  // Filter visible badges strictly by role: normal users only see general learning achievements
  const visibleBadges = useMemo(() => {
    if (isAdmin) {
      return badges;
    }
    return badges.filter((b) => !b.isAdminOnly);
  }, [badges, isAdmin]);

  // Derived statistics based strictly on visible real badges
  const totalCount = visibleBadges.length;
  const unlockedCount = useMemo(
    () => visibleBadges.filter((b) => b.unlocked || b.earned).length,
    [visibleBadges]
  );
  const overallPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const inProgressCount = useMemo(
    () => visibleBadges.filter((b) => !(b.unlocked || b.earned) && (b.progressPercent ?? 0) > 0).length,
    [visibleBadges]
  );

  const lockedCount = useMemo(
    () => visibleBadges.filter((b) => !(b.unlocked || b.earned) && (b.progressPercent ?? 0) === 0).length,
    [visibleBadges]
  );

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      all: visibleBadges.length,
      completion: visibleBadges.filter((b) => b.category === 'completion').length,
      time: visibleBadges.filter((b) => b.category === 'time').length,
      streak: visibleBadges.filter((b) => b.category === 'streak').length,
      quiz: visibleBadges.filter((b) => b.category === 'quiz').length,
      admin: visibleBadges.filter((b) => b.category === 'admin').length,
    };
  }, [visibleBadges]);

  // Filtering & Sorting
  const filteredBadges = useMemo(() => {
    let list = [...visibleBadges];

    // 1. Category filter
    if (activeCategory !== 'all') {
      list = list.filter((b) => b.category === activeCategory);
    }

    // 2. Status filter
    if (activeStatus === 'unlocked') {
      list = list.filter((b) => b.unlocked || b.earned);
    } else if (activeStatus === 'in_progress') {
      list = list.filter((b) => !(b.unlocked || b.earned) && (b.progressPercent ?? 0) > 0);
    } else if (activeStatus === 'locked') {
      list = list.filter((b) => !(b.unlocked || b.earned) && (b.progressPercent ?? 0) === 0);
    }

    // 3. Sort
    switch (activeSort) {
      case 'progress_desc':
        list.sort((a, b) => (b.progressPercent ?? 0) - (a.progressPercent ?? 0));
        break;
      case 'progress_asc':
        list.sort((a, b) => (a.progressPercent ?? 0) - (b.progressPercent ?? 0));
        break;
      case 'required_asc':
        list.sort((a, b) => (a.requiredCount ?? 0) - (b.requiredCount ?? 0));
        break;
      case 'recent_earned':
        list.sort((a, b) => {
          if (a.earned && !b.earned) return -1;
          if (!a.earned && b.earned) return 1;
          return (b.earnedAt || '').localeCompare(a.earnedAt || '');
        });
        break;
      case 'default':
      default:
        break;
    }

    return list;
  }, [visibleBadges, activeCategory, activeStatus, activeSort]);

  // Separate standard vs admin badges for clear division when 'all' is selected by an admin
  const standardBadges = useMemo(
    () => filteredBadges.filter((b) => !b.isAdminOnly),
    [filteredBadges]
  );
  const adminBadges = useMemo(
    () => filteredBadges.filter((b) => !!b.isAdminOnly),
    [filteredBadges]
  );

  // Stabilized event handlers with useCallback
  const handleCategoryChange = useCallback((category: CategoryFilter) => {
    setActiveCategory(category);
  }, []);

  const handleStatusChange = useCallback((status: StatusFilter) => {
    setActiveStatus(status);
  }, []);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveSort(e.target.value as SortOption);
  }, []);

  const handleCardClick = useCallback((badge: AchievementBadge) => {
    setSelectedBadge(badge);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedBadge(null);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="5xl"
        showCloseButton={false}
        headerBorder={false}
        noPadding={true}
        className="rounded-3xl border-slate-200/90"
        ariaLabel="업적 도감"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-slate-50/70 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <h2 id="achievement-book-title" className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  업적 도감
                </h2>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {unlockedCount} / {totalCount} 획득
                </span>
                {userBadgeRank && (
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                    isAdmin
                      ? 'bg-slate-900 text-amber-300 border-amber-400/50'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}>
                    <span>{userBadgeRank.badge}</span>
                    <span>{userBadgeRank.title}</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                내가 획득한 성취와 앞으로 달성할 수 있는 업적을 확인하세요.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
              aria-label="업적 도감 닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Bar inside Modal Header */}
          <div className="mt-4 pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-slate-600 flex-wrap">
              <div>
                전체 진행률 <span className="font-bold text-indigo-600 ml-1">{overallPercent}%</span>
              </div>
              <div className="h-3 w-px bg-slate-300" />
              <div>
                획득 완료 <span className="font-bold text-emerald-600 ml-1">{unlockedCount}개</span>
              </div>
              <div className="h-3 w-px bg-slate-300" />
              <div>
                진행 중 <span className="font-bold text-indigo-600 ml-1">{inProgressCount}개</span>
              </div>
              <div className="h-3 w-px bg-slate-300" />
              <div>
                미획득 <span className="font-bold text-slate-500 ml-1">{lockedCount}개</span>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full sm:w-48 h-2 bg-slate-200 rounded-full overflow-hidden shrink-0">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter & Sort Toolbar */}
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-white space-y-3 shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>전체 카테고리</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'all' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'}`}>
                {categoryCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryChange('completion')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'completion'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>강의 수료</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'completion' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                {categoryCounts.completion}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryChange('time')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'time'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>학습 시간</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'time' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                {categoryCounts.time}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryChange('streak')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'streak'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>연속 출석</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'streak' ? 'bg-rose-700 text-rose-100' : 'bg-slate-100 text-slate-500'}`}>
                {categoryCounts.streak}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryChange('quiz')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'quiz'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>퀴즈 및 평가</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'quiz' ? 'bg-purple-700 text-purple-100' : 'bg-slate-100 text-slate-500'}`}>
                {categoryCounts.quiz}
              </span>
            </button>

            {/* Admin Exclusive Category Tab (Visible only to verified Admins) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleCategoryChange('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeCategory === 'admin'
                    ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white shadow-xs ring-2 ring-amber-300/60'
                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>관리자 전용</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'admin' ? 'bg-amber-800 text-amber-100' : 'bg-amber-100 text-amber-800'}`}>
                  {categoryCounts.admin}
                </span>
              </button>
            )}
          </div>

          {/* Status Filter & Sort Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleStatusChange('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeStatus === 'all'
                    ? 'bg-slate-100 text-slate-900 border border-slate-300'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                전체
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('unlocked')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeStatus === 'unlocked'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>획득 완료 ({unlockedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('in_progress')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeStatus === 'in_progress'
                    ? 'bg-indigo-50 text-indigo-800 border border-indigo-300'
                    : 'text-slate-500 hover:text-indigo-700'
                }`}
              >
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>진행 중 ({inProgressCount})</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('locked')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeStatus === 'locked'
                    ? 'bg-slate-200 text-slate-800 border border-slate-300'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>미획득 ({lockedCount})</span>
              </button>
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="achievement-modal-sort-select"
                value={activeSort}
                onChange={handleSortChange}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                aria-label="업적 정렬 기준"
              >
                <option value="default">기본 순서</option>
                <option value="progress_desc">진행률 높은 순</option>
                <option value="progress_asc">진행률 낮은 순</option>
                <option value="required_asc">달성하기 쉬운 순</option>
                <option value="recent_earned">최근 획득 순</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Badges List */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-[300px] space-y-6">
          {/* Admin User viewing 'All' category: Distinctly separate General vs Admin Achievements */}
          {isAdmin && activeCategory === 'all' ? (
            <>
              {/* General Learning Badges Section */}
              {standardBadges.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <h3 className="text-sm font-black text-slate-800">기본 학습 활동 업적</h3>
                      <span className="text-xs text-slate-400 font-semibold">({standardBadges.length}개)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {standardBadges.map((badge) => (
                      <AchievementCard
                        key={badge.id}
                        badge={badge}
                        onClick={() => handleCardClick(badge)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Exclusive Achievements Section */}
              {adminBadges.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1 border-b border-amber-200/80">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <span>관리자 전용 특수 업적</span>
                      </h3>
                      <span className="text-xs text-slate-400 font-semibold">({adminBadges.length}개)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminBadges.map((badge) => (
                      <AchievementCard
                        key={badge.id}
                        badge={badge}
                        onClick={() => handleCardClick(badge)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {standardBadges.length === 0 && adminBadges.length === 0 && (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                    <Filter className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">선택한 조건의 업적이 없습니다.</h3>
                  <p className="text-xs text-slate-500">
                    필터 또는 정렬 조건을 변경하여 다른 업적을 확인해보세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('all');
                      setActiveStatus('all');
                      setActiveSort('default');
                    }}
                    className="mt-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>전체 업적 보기</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Single Category / Standard View for Normal Users or Specific Filters */
            <>
              {filteredBadges.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBadges.map((badge) => (
                    <AchievementCard
                      key={badge.id}
                      badge={badge}
                      onClick={() => handleCardClick(badge)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                    <Filter className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">선택한 조건의 업적이 없습니다.</h3>
                  <p className="text-xs text-slate-500">
                    필터 또는 정렬 조건을 변경하여 다른 업적을 확인해보세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('all');
                      setActiveStatus('all');
                      setActiveSort('default');
                    }}
                    className="mt-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>전체 업적 보기</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </BaseModal>

      {/* Nested Achievement Detail Modal */}
      <AchievementDetailModal
        badge={selectedBadge}
        isOpen={selectedBadge !== null}
        onClose={handleCloseDetail}
      />
    </>
  );
};
