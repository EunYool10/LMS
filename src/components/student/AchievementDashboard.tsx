import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  Filter,
  CheckCircle2,
  Clock,
  Flame,
  FileQuestion,
  GraduationCap,
  Sparkles,
  ArrowUpDown,
  X,
  Lock,
  Shield,
} from 'lucide-react';
import { AchievementBadge } from '../../types';
import { AchievementCard } from './AchievementCard';
import { AchievementDetailModal } from './AchievementDetailModal';
import { AchievementInsignia } from '../profile/AchievementInsignia';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';

interface AchievementDashboardProps {
  badges: AchievementBadge[];
  userId: string;
}

type CategoryFilter = 'all' | 'completion' | 'time' | 'streak' | 'quiz' | 'admin';
type StatusFilter = 'all' | 'unlocked' | 'in_progress' | 'locked';
type SortOption = 'default' | 'progress_desc' | 'progress_asc' | 'required_asc' | 'recent_earned';

export const AchievementDashboard: React.FC<AchievementDashboardProps> = ({ badges, userId }) => {
  const { user } = useAuth();
  const isAdmin = !!(user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'));

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all');
  const [activeSort, setActiveSort] = useState<SortOption>('default');
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<AchievementBadge[]>([]);

  // Compute real user badge title & rank
  const userBadgeRank = useMemo(() => {
    return storage.getUserBadgeTitle(userId);
  }, [userId]);

  // Filter visible badges strictly by role
  const visibleBadges = useMemo(() => {
    if (isAdmin) {
      return badges;
    }
    return badges.filter((b) => !b.isAdminOnly);
  }, [badges, isAdmin]);

  // Total summary calculations
  const totalCount = visibleBadges.length;
  const unlockedCount = useMemo(() => visibleBadges.filter((b) => b.unlocked || b.earned).length, [visibleBadges]);
  const overallPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Average progress across visible badges
  const averageProgressPercent = useMemo(() => {
    if (visibleBadges.length === 0) return 0;
    const sum = visibleBadges.reduce((acc, b) => acc + Math.min(100, Math.max(0, b.progressPercent ?? 0)), 0);
    return Math.round(sum / visibleBadges.length);
  }, [visibleBadges]);

  // Track newly unlocked badges using localStorage
  useEffect(() => {
    if (!userId || visibleBadges.length === 0) return;

    try {
      const storageKey = `tdsn_seen_badges_${userId}`;
      const stored = localStorage.getItem(storageKey);
      const seenBadgeIds: string[] = stored ? JSON.parse(stored) : [];

      const currentUnlocked = visibleBadges.filter((b) => b.unlocked || b.earned);
      const newlyEarned = currentUnlocked.filter((b) => !seenBadgeIds.includes(b.id));

      if (stored !== null && newlyEarned.length > 0) {
        setNewlyUnlockedBadges(newlyEarned);
      }

      // Update seen cache with all currently unlocked badges
      const updatedSeenIds = Array.from(new Set([...seenBadgeIds, ...currentUnlocked.map((b) => b.id)]));
      localStorage.setItem(storageKey, JSON.stringify(updatedSeenIds));
    } catch {
      // Ignore local storage errors safely
    }
  }, [userId, visibleBadges]);

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

  // Filtered & Sorted list
  const filteredBadges = useMemo(() => {
    let list = [...visibleBadges];

    // 1. Filter by category
    if (activeCategory !== 'all') {
      list = list.filter((b) => b.category === activeCategory);
    }

    // 2. Filter by status
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

  // Next target recommendation
  const nextTargetBadge = useMemo(() => {
    const remaining = visibleBadges.filter((b) => !(b.unlocked || b.earned));
    if (remaining.length === 0) return null;
    return remaining.sort((a, b) => (b.progressPercent ?? 0) - (a.progressPercent ?? 0))[0];
  }, [visibleBadges]);

  // Separation for Admin viewing 'all'
  const standardBadges = useMemo(
    () => filteredBadges.filter((b) => !b.isAdminOnly),
    [filteredBadges]
  );
  const adminBadges = useMemo(
    () => filteredBadges.filter((b) => !!b.isAdminOnly),
    [filteredBadges]
  );

  return (
    <section className="space-y-6" aria-label="학습 성취 및 업적 센터">
      {/* Top Banner & Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Award className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                학습 성취 및 업적 센터
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              교육과정 완강, 시청 시간 누적, 퀴즈 만점 및 출석을 통해 성취 배지를 획득하세요.
            </p>
          </div>

          {/* Current Rank Badge */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/70 self-start md:self-auto">
            <span className="text-3xl">{userBadgeRank.badge}</span>
            <div>
              <div className="text-[11px] font-semibold text-slate-400">현재 학습자 랭크</div>
              <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>{userBadgeRank.title}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${userBadgeRank.color}`}>
                  {userBadgeRank.tier}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Summary Metric Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Unlocked count */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500">획득한 업적 배지</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                <span className="text-emerald-600">{unlockedCount}</span>
                <span className="text-sm font-bold text-slate-400"> / {totalCount}개</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* 2. Overall Progress Rate */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>전체 달성률</span>
              <span className="text-indigo-600 font-black text-sm">{overallPercent}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 text-right">
              평균 진행도 {averageProgressPercent}%
            </div>
          </div>

          {/* 3. Next Target Preview */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <div className="text-xs font-semibold text-slate-500">다음 목표 업적</div>
              {nextTargetBadge ? (
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate pt-0.5 flex items-center gap-1.5">
                    <AchievementInsignia
                      badgeId={nextTargetBadge.id}
                      icon={nextTargetBadge.icon}
                      size="xs"
                    />
                    <span>{nextTargetBadge.title}</span>
                  </div>
                  <div className="text-[11px] text-indigo-600 font-semibold">
                    현재 {nextTargetBadge.progressPercent}% 진행 중
                  </div>
                </div>
              ) : (
                <div className="text-xs font-bold text-emerald-600 pt-0.5">
                  모든 업적 달성 완료! 🎉
                </div>
              )}
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Newly Earned Achievement Celebration Banner */}
        {newlyUnlockedBadges.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">🎉</span>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-indigo-950">
                  새로운 성취 업적을 달성했습니다!
                </div>
                <div className="text-xs text-indigo-800 truncate">
                  {newlyUnlockedBadges.map((b) => b.title).join(', ')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewlyUnlockedBadges([])}
              className="p-1 rounded-lg text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
              aria-label="알림 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Category Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeCategory === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <span>전체</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {categoryCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('completion')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeCategory === 'completion'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>강의 수료</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              activeCategory === 'completion' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {categoryCounts.completion}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('time')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeCategory === 'time'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>학습 시간</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              activeCategory === 'time' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {categoryCounts.time}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('streak')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeCategory === 'streak'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>연속 학습</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              activeCategory === 'streak' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {categoryCounts.streak}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('quiz')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeCategory === 'quiz'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <FileQuestion className="w-3.5 h-3.5" />
          <span>퀴즈 및 평가</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              activeCategory === 'quiz' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {categoryCounts.quiz}
          </span>
        </button>

        {/* Admin Exclusive Category Tab for Admins */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveCategory('admin')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeCategory === 'admin'
                ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white shadow-xs ring-2 ring-amber-300/60'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>관리자 전용</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                activeCategory === 'admin' ? 'bg-amber-800 text-amber-100' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {categoryCounts.admin}
            </span>
          </button>
        )}
      </div>

      {/* Sub-Filters: Status Buttons & Sort Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeStatus === 'all'
                ? 'bg-slate-100 text-slate-900 border border-slate-300'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            전체 상태
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('unlocked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeStatus === 'unlocked'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>획득 완료 ({visibleBadges.filter((b) => b.unlocked || b.earned).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeStatus === 'in_progress'
                ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <span>진행 중 ({visibleBadges.filter((b) => !(b.unlocked || b.earned) && (b.progressPercent ?? 0) > 0).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('locked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeStatus === 'locked'
                ? 'bg-slate-200/80 text-slate-800 border border-slate-300'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Lock className="w-2.5 h-2.5 text-slate-400" />
            <span>미획득 ({visibleBadges.filter((b) => !(b.unlocked || b.earned) && (b.progressPercent ?? 0) === 0).length})</span>
          </button>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            id="achievement-sort-select"
            value={activeSort}
            onChange={(e) => setActiveSort(e.target.value as SortOption)}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            aria-label="업적 정렬 기준"
          >
            <option value="default">기본 순서</option>
            <option value="progress_desc">진행률 높은 순 (달성 임박)</option>
            <option value="progress_asc">진행률 낮은 순</option>
            <option value="required_asc">달성하기 쉬운 순</option>
            <option value="recent_earned">최근 획득 순</option>
          </select>
        </div>
      </div>

      {/* When Admin is viewing 'all': Show clearly separated sections */}
      {isAdmin && activeCategory === 'all' ? (
        <div className="space-y-8">
          {/* General Achievements Section */}
          {standardBadges.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-600" />
                  <h3 className="text-base font-black text-slate-900">기본 학습 활동 업적</h3>
                  <span className="text-xs text-slate-400 font-semibold">({standardBadges.length}개)</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {standardBadges.map((badge) => (
                  <AchievementCard
                    key={badge.id}
                    badge={badge}
                    onClick={() => setSelectedBadge(badge)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Admin Exclusive Achievements Section */}
          {adminBadges.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-300">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>관리자 전용 특수 업적</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">({adminBadges.length}개)</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {adminBadges.map((badge) => (
                  <AchievementCard
                    key={badge.id}
                    badge={badge}
                    onClick={() => setSelectedBadge(badge)}
                  />
                ))}
              </div>
            </div>
          )}

          {standardBadges.length === 0 && adminBadges.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">해당 조건의 업적이 없습니다.</h3>
              <p className="text-xs text-slate-500">
                필터 또는 카테고리를 변경하여 다른 성취 업적을 확인해보세요.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Standard Grid View */
        <>
          {filteredBadges.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {filteredBadges.map((badge) => (
                <AchievementCard
                  key={badge.id}
                  badge={badge}
                  onClick={() => setSelectedBadge(badge)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">해당 조건의 업적이 없습니다.</h3>
              <p className="text-xs text-slate-500">
                필터 또는 카테고리를 변경하여 다른 성취 업적을 확인해보세요.
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

      {/* Interactive Detail Modal */}
      <AchievementDetailModal
        badge={selectedBadge}
        isOpen={selectedBadge !== null}
        onClose={() => setSelectedBadge(null)}
      />
    </section>
  );
};
