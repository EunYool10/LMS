import React, { useMemo } from 'react';
import { Trophy, ChevronRight, CheckCircle2 } from 'lucide-react';
import { AchievementBadge } from '../../types';
import { AchievementInsignia } from '../profile/AchievementInsignia';

interface AchievementCompactWidgetProps {
  badges: AchievementBadge[];
  userBadgeRank: { title: string; badge: string; color: string; tier: string };
  onOpenBook: () => void;
  onSelectBadge?: (badge: AchievementBadge) => void;
}

export const AchievementCompactWidget: React.FC<AchievementCompactWidgetProps> = ({
  badges,
  userBadgeRank,
  onOpenBook,
  onSelectBadge,
}) => {
  const totalCount = badges.length;
  const unlockedBadges = useMemo(() => badges.filter((b) => b.unlocked || b.earned), [badges]);
  const unlockedCount = unlockedBadges.length;
  const overallPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Next target: highest progress among not yet unlocked badges
  const nextTargetBadge = useMemo(() => {
    const remaining = badges.filter((b) => !(b.unlocked || b.earned));
    if (remaining.length === 0) return null;
    return remaining.sort((a, b) => (b.progressPercent ?? 0) - (a.progressPercent ?? 0))[0];
  }, [badges]);

  // Recent 3 unlocked badges to showcase
  const recentUnlocked = useMemo(() => {
    const list = [...unlockedBadges];
    list.sort((a, b) => (b.earnedAt || '').localeCompare(a.earnedAt || ''));
    return list.slice(0, 4);
  }, [unlockedBadges]);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">업적</h3>

        <button
          type="button"
          onClick={onOpenBook}
          className="text-[13px] font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-0.5 cursor-pointer transition-colors"
        >
          <span>도감</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Honorary Rank Card */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl shrink-0">{userBadgeRank.badge}</span>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-slate-400">현재 학습자 등급</div>
            <div className="text-sm font-semibold text-neutral-900 truncate">
              {userBadgeRank.title}
            </div>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md shrink-0">
          {userBadgeRank.tier}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">업적 달성률</span>
          <span className="font-bold text-slate-900">
            <span className="text-indigo-600">{unlockedCount}</span> / {totalCount}개 ({overallPercent}%)
          </span>
        </div>
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>

      {/* Next Target or Recent Earned Badges Showcase */}
      {nextTargetBadge && (
        <div
          onClick={() => onSelectBadge && onSelectBadge(nextTargetBadge)}
          className="p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AchievementInsignia
              badgeId={nextTargetBadge.id}
              icon={nextTargetBadge.icon}
              size="xs"
            />
            <div className="min-w-0">
              <div className="text-xs font-medium text-neutral-800 flex items-center gap-1">
                <span>다음 목표: {nextTargetBadge.title}</span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">{nextTargetBadge.conditionText}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-brand-700 tabular-nums shrink-0">
            {nextTargetBadge.progressPercent}%
          </span>
        </div>
      )}

      {/* Earned Badges Preview Pills */}
      {recentUnlocked.length > 0 && (
        <div className="pt-1">
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5">최근 획득한 배지</div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {recentUnlocked.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBadge && onSelectBadge(b)}
                title={`${b.title} (${b.conditionText})`}
                className="px-2 py-1 rounded-md bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-700 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <AchievementInsignia badgeId={b.id} icon={b.icon} size="xs" />
                <span className="truncate max-w-[80px] text-[11px]">{b.title}</span>
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Open Book Button */}
      <button
        type="button"
        id="btn-open-achievement-book-widget"
        onClick={onOpenBook}
        className="lms-btn lms-btn-secondary lms-btn-sm w-full"
      >
        <Trophy className="w-3.5 h-3.5 text-amber-500" />
        <span>업적 도감 전체 보기 ({totalCount})</span>
      </button>
    </div>
  );
};
