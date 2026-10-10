import React from 'react';
import {
  CheckCircle2,
  Clock,
  Flame,
  FileQuestion,
  GraduationCap,
  Sparkles,
  Lock,
  ChevronRight,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { AchievementBadge } from '../../types';
import { AchievementInsignia } from '../profile/AchievementInsignia';

interface AchievementCardProps {
  badge: AchievementBadge;
  onClick: () => void;
}

const getTierBadge = (badge: AchievementBadge) => {
  if (badge.isAdminOnly || badge.tier === 'admin') {
    return {
      label: '관리자 전용',
      rarity: 'SPECIAL',
      className: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    };
  }

  const rarity = badge.rarity || 'COMMON';

  switch (badge.tier) {
    case 'diamond':
      return {
        label: '다이아몬드',
        rarity,
        className: 'bg-purple-100 text-purple-900 border-purple-200 font-bold',
      };
    case 'platinum':
      return {
        label: '플래티넘',
        rarity,
        className: 'bg-cyan-100 text-cyan-900 border-cyan-200 font-bold',
      };
    case 'gold':
      return {
        label: '골드',
        rarity,
        className: 'bg-amber-100 text-amber-900 border-amber-200 font-bold',
      };
    case 'silver':
      return {
        label: '실버',
        rarity,
        className: 'bg-slate-200 text-slate-800 border-slate-300 font-bold',
      };
    case 'bronze':
    default:
      return {
        label: '브론즈',
        rarity,
        className: 'bg-amber-50 text-amber-900 border-amber-200 font-bold',
      };
  }
};

const getCategoryBadge = (category?: string) => {
  switch (category) {
    case 'admin':
      return { label: '관리자 특수', icon: Shield, color: 'text-amber-800 bg-amber-50 border-amber-200' };
    case 'completion':
      return { label: '강의 수료', icon: GraduationCap, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' };
    case 'time':
      return { label: '학습 시간', icon: Clock, color: 'text-blue-700 bg-blue-50 border-blue-100' };
    case 'streak':
      return { label: '연속 학습', icon: Flame, color: 'text-rose-700 bg-rose-50 border-rose-100' };
    case 'quiz':
      return { label: '퀴즈/평가', icon: FileQuestion, color: 'text-purple-700 bg-purple-50 border-purple-100' };
    default:
      return { label: '학습 성취', icon: GraduationCap, color: 'text-slate-700 bg-slate-50 border-slate-200' };
  }
};

export const AchievementCard: React.FC<AchievementCardProps> = ({ badge, onClick }) => {
  const isUnlocked = !!(badge.unlocked || badge.earned);
  const safePercent = Math.min(100, Math.max(0, badge.progressPercent ?? 0));
  const isInProgress = !isUnlocked && safePercent > 0;
  const isTimeBadge = badge.id === 'badge_10h';
  const isAdminBadge = !!badge.isAdminOnly;

  const tier = getTierBadge(badge);
  const category = getCategoryBadge(badge.category);
  const CategoryIcon = category.icon;

  const formatCurrentCount = () => {
    if (isAdminBadge) {
      return isUnlocked ? '보유 완료' : '미보유';
    }
    if (isTimeBadge) {
      const hours = Math.round(((badge.currentCount || 0) / 3600) * 10) / 10;
      return `${hours}시간`;
    }
    return `${(badge.currentCount || 0).toLocaleString()}`;
  };

  const formatTargetCount = () => {
    if (isAdminBadge) {
      return '관리자 권한';
    }
    if (isTimeBadge) {
      return '10시간';
    }
    return `${(badge.requiredCount || 0).toLocaleString()}${badge.unit ? ` ${badge.unit}` : ''}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const cardInner = (
    <div className={`p-5 flex flex-col justify-between h-full select-none ${isAdminBadge && isUnlocked ? 'rainbow-wave-inner' : ''}`}>
      <div className="space-y-3.5">
        {/* Top Badges & Status (Hidden for Admin Special Achievements) */}
        {!isAdminBadge && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${category.color}`}>
                <CategoryIcon className="w-3 h-3" />
                <span>{category.label}</span>
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${tier.className}`}>
                {tier.label}
              </span>
              {tier.rarity && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {tier.rarity}
                </span>
              )}
            </div>

            {/* Status Tag */}
            <div>
              {isUnlocked ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border text-emerald-700 bg-emerald-50 border-emerald-200/80">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>획득 완료</span>
                </span>
              ) : isInProgress ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/80">
                  <Sparkles className="w-3 h-3" />
                  <span>진행 중 {safePercent}%</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                  <span>미획득</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Middle: Icon + Title & Description */}
        <div className="flex items-start gap-3.5 pt-1">
          <div
            className={`w-13 h-13 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-105 border ${
              isUnlocked
                ? isAdminBadge
                  ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-300 text-amber-900 shadow-xs'
                  : 'bg-gradient-to-br from-indigo-50 to-purple-50/60 border-indigo-200 text-indigo-900 shadow-xs'
                : isInProgress
                ? 'bg-indigo-50/40 border-indigo-100 text-indigo-800'
                : 'bg-white border-slate-200 text-slate-400'
            }`}
          >
            <AchievementInsignia
              badgeId={badge.id}
              icon={badge.icon}
              size="md"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                {badge.title}
              </h4>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {badge.description}
            </p>
          </div>
        </div>

        {/* Condition Box */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-[11px] text-slate-600 flex items-center gap-2">
          <span className="font-bold text-slate-700 shrink-0">달성 조건</span>
          <span className="truncate text-slate-500">{badge.conditionText || badge.description}</span>
        </div>
      </div>

      {/* Bottom Progress Bar & Details */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            진행 현황: <strong className="text-slate-800 font-bold">{formatCurrentCount()}</strong> / {formatTargetCount()}
          </span>
          <span className={`font-black tabular-nums ${
            isUnlocked
              ? isAdminBadge ? 'text-amber-600' : 'text-emerald-600'
              : 'text-indigo-600'
          }`}>
            {safePercent}%
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isUnlocked
                ? isAdminBadge
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-emerald-500'
                : isInProgress
                ? 'bg-indigo-600'
                : 'bg-slate-300'
            }`}
            style={{ width: `${safePercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span>{isUnlocked ? (isAdminBadge ? '' : '목표 달성 완료') : `${100 - safePercent}% 남음`}</span>
          <span className="text-indigo-600 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5 font-semibold">
            상세 보기
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );

  // If this is an Admin Badge that is unlocked, wrap with Rainbow Wave Animated Border
  if (isAdminBadge && isUnlocked) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        aria-label={`관리자 특수 업적: ${badge.title}. 관리자 인증 완료. 상세 보기`}
        className="group rainbow-wave-wrapper text-left rounded-2xl cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-transform duration-200 hover:-translate-y-0.5 shadow-sm"
      >
        {cardInner}
      </div>
    );
  }

  // Standard or Locked Card
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`성취 업적: ${badge.title}. ${isUnlocked ? '획득 완료' : `진행률 ${safePercent}%`}. 상세 보기`}
      className={`group relative text-left rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
        isUnlocked
          ? 'bg-white border-indigo-200/90 shadow-xs hover:shadow-md hover:border-indigo-400'
          : isInProgress
          ? 'bg-white border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300'
          : isAdminBadge
          ? 'bg-slate-50/80 border-slate-300/80 hover:bg-white hover:border-amber-300 hover:shadow-xs'
          : 'bg-slate-50/70 border-slate-200/90 hover:bg-white hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      {cardInner}
    </div>
  );
};
