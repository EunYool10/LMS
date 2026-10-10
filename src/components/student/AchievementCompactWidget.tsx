import React, { useMemo } from 'react';
import { Award, Trophy, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
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
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">학습 성취 및 랭크</h3>
            <p className="text-[11px] text-slate-400">성취 뱃지와 진행도 요약</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenBook}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer transition-colors"
        >
          <span>도감 열기</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Honorary Rank Card */}
      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl shrink-0">{userBadgeRank.badge}</span>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-slate-400">현재 학습자 등급</div>
            <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
              {userBadgeRank.title}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 shrink-0">
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
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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
          className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 hover:bg-indigo-50 transition-colors cursor-pointer flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AchievementInsignia
              badgeId={nextTargetBadge.id}
              icon={nextTargetBadge.icon}
              size="xs"
            />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>다음 목표: {nextTargetBadge.title}</span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">{nextTargetBadge.conditionText}</p>
            </div>
          </div>
          <span className="text-xs font-black text-indigo-600 tabular-nums shrink-0">
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
                className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
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
        className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
      >
        <Trophy className="w-3.5 h-3.5 text-amber-400" />
        <span>업적 도감 전체 보기 ({totalCount}개)</span>
      </button>
    </div>
  );
};
