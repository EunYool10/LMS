import React from 'react';
import {
  X,
  Trophy,
  CheckCircle2,
  Clock,
  Flame,
  FileQuestion,
  GraduationCap,
  Sparkles,
  Calendar,
  Lock,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { AchievementBadge } from '../../types';
import { BaseModal } from '../common/BaseModal';
import { AchievementInsignia } from '../profile/AchievementInsignia';

interface AchievementDetailModalProps {
  badge: AchievementBadge | null;
  isOpen: boolean;
  onClose: () => void;
}

const getTierMeta = (badge: AchievementBadge) => {
  if (badge.isAdminOnly || badge.tier === 'admin') {
    return {
      label: '관리자 전용 (ADMIN SPECIAL)',
      rarityText: 'SPECIAL',
      badgeClass: 'bg-amber-100 text-amber-950 border-amber-300 font-black',
      ringClass: 'ring-amber-400/50',
      gradientClass: 'from-amber-500/15 via-orange-500/10 to-transparent',
    };
  }

  const rarity = badge.rarity || 'COMMON';

  switch (badge.tier) {
    case 'diamond':
      return {
        label: '다이아몬드 (LEGENDARY)',
        rarityText: rarity,
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300/80',
        ringClass: 'ring-purple-400/40',
        gradientClass: 'from-purple-500/15 via-indigo-500/10 to-transparent',
      };
    case 'platinum':
      return {
        label: '플래티넘 (LEGENDARY)',
        rarityText: rarity,
        badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300/80',
        ringClass: 'ring-cyan-400/40',
        gradientClass: 'from-cyan-500/15 via-blue-500/10 to-transparent',
      };
    case 'gold':
      return {
        label: '골드 (EPIC)',
        rarityText: rarity,
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300/80',
        ringClass: 'ring-amber-400/40',
        gradientClass: 'from-amber-500/15 via-yellow-500/10 to-transparent',
      };
    case 'silver':
      return {
        label: '실버 (RARE)',
        rarityText: rarity,
        badgeClass: 'bg-slate-200 text-slate-800 border-slate-300/80',
        ringClass: 'ring-slate-400/40',
        gradientClass: 'from-slate-400/15 via-slate-300/10 to-transparent',
      };
    case 'bronze':
    default:
      return {
        label: '브론즈 (COMMON)',
        rarityText: rarity,
        badgeClass: 'bg-amber-50 text-amber-900 border-amber-200/80',
        ringClass: 'ring-amber-300/40',
        gradientClass: 'from-amber-600/10 via-amber-500/5 to-transparent',
      };
  }
};

const getCategoryMeta = (category?: string) => {
  switch (category) {
    case 'admin':
      return { label: '관리자 특수', icon: Shield, color: 'text-amber-800 bg-amber-50 border-amber-300' };
    case 'completion':
      return { label: '강의 수료', icon: GraduationCap, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    case 'time':
      return { label: '학습 시간', icon: Clock, color: 'text-blue-700 bg-blue-50 border-blue-200' };
    case 'streak':
      return { label: '연속 학습', icon: Flame, color: 'text-rose-700 bg-rose-50 border-rose-200' };
    case 'quiz':
      return { label: '퀴즈 및 평가', icon: FileQuestion, color: 'text-purple-700 bg-purple-50 border-purple-200' };
    default:
      return { label: '학습 성취', icon: Trophy, color: 'text-slate-700 bg-slate-50 border-slate-200' };
  }
};

export const AchievementDetailModal: React.FC<AchievementDetailModalProps> = ({
  badge,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !badge) return null;

  const isAdminBadge = !!badge.isAdminOnly;
  const tierMeta = getTierMeta(badge);
  const categoryMeta = getCategoryMeta(badge.category);
  const CategoryIcon = categoryMeta.icon;

  const isUnlocked = !!(badge.unlocked || badge.earned);
  const safePercent = Math.min(100, Math.max(0, badge.progressPercent ?? 0));
  const isTimeBadge = badge.id === 'badge_10h';

  // Format current and target counts cleanly
  const formatValue = (val?: number) => {
    if (isAdminBadge) {
      return isUnlocked ? '관리자 권한 보유' : '권한 미보유';
    }
    if (val === undefined || val === null) return '0';
    if (isTimeBadge) {
      const hours = Math.floor((val / 3600) * 10) / 10;
      return `${hours}시간 (${val.toLocaleString()}초)`;
    }
    return `${val.toLocaleString()} ${badge.unit || ''}`.trim();
  };

  const formatTarget = (val?: number) => {
    if (isAdminBadge) {
      return 'LMS 시스템 관리자 권한';
    }
    if (val === undefined || val === null) return '-';
    if (isTimeBadge) {
      return '10시간 (36,000초)';
    }
    return `${val.toLocaleString()} ${badge.unit || ''}`.trim();
  };

  const formatEarnedDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    } catch {
      return dateStr;
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      showCloseButton={false}
      headerBorder={false}
      className="p-1"
      ariaLabel="업적 상세 정보"
    >
      <div className="space-y-4 sm:space-y-5">
        {/* Top Badges & Close Button */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {isAdminBadge ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border text-amber-800 bg-amber-50 border-amber-300">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>관리자 전용 특수 업적</span>
              </span>
            ) : (
              <>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${categoryMeta.color}`}>
                  <CategoryIcon className="w-3.5 h-3.5" />
                  <span>{categoryMeta.label}</span>
                </span>

                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${tierMeta.badgeClass}`}>
                  {tierMeta.label}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Section: Large Icon & Title (With Sleek Rainbow Border if Admin Unlocked) */}
        <div
          className={`relative rounded-2xl ${
            isAdminBadge && isUnlocked
              ? 'rainbow-wave-wrapper shadow-xs'
              : 'bg-gradient-to-br from-slate-50 to-slate-100/60 border border-slate-200/70'
          }`}
        >
          <div
            className={`w-full flex items-center gap-4.5 p-5 ${
              isAdminBadge && isUnlocked ? 'rainbow-wave-inner rounded-[calc(1rem-1.5px)] bg-white' : ''
            }`}
          >
            <div
              className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center p-2.5 shrink-0 shadow-2xs border transition-all ${
                isUnlocked
                  ? isAdminBadge
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50/40 border-amber-300 ring-2 ring-amber-100'
                    : 'bg-white border-indigo-200 shadow-indigo-100 ring-2 ring-indigo-50'
                  : 'bg-slate-100 border-slate-300/80 text-slate-400'
              }`}
            >
              <AchievementInsignia
                badgeId={badge.id}
                icon={badge.icon}
                size="lg"
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 id="achievement-modal-title" className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {badge.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {isUnlocked ? (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isAdminBadge
                      ? 'text-amber-800 bg-amber-50 border-amber-300'
                      : 'text-emerald-700 bg-emerald-50 border-emerald-200/80'
                  }`}>
                    {isAdminBadge ? <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{isAdminBadge ? '관리자 인증 완료' : '획득 완료'}</span>
                  </span>
                ) : safePercent > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/80">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>진행 중 ({safePercent}%)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>{isAdminBadge ? '관리자 권한 필요' : '미달성'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">업적 소개</h4>
          <p id="achievement-modal-description" className="text-sm text-slate-700 leading-relaxed">
            {badge.description}
          </p>
        </div>

        {/* Requirement Box */}
        <div className={`p-4 rounded-2xl space-y-1.5 border ${
          isAdminBadge
            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
            : 'bg-indigo-50/60 border-indigo-100 text-indigo-900'
        }`}>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            {isAdminBadge ? <Shield className="w-3.5 h-3.5 text-amber-700" /> : <Trophy className="w-3.5 h-3.5 text-indigo-600" />}
            <span>달성 조건</span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-800">
            {badge.conditionText || badge.description}
          </p>
        </div>

        {/* Real Progress Status Bar */}
        <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-bold text-slate-700">달성 진행률</span>
            <span className={`font-black tabular-nums ${isAdminBadge ? 'text-amber-600' : 'text-indigo-600'}`}>
              {safePercent}%
            </span>
          </div>

          {/* Bar */}
          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isUnlocked
                  ? isAdminBadge
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                    : 'bg-emerald-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${safePercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
            <span>현재 실적: <strong className="text-slate-800">{formatValue(badge.currentCount)}</strong></span>
            <span>목표 기준: <strong className="text-slate-800">{formatTarget(badge.requiredCount)}</strong></span>
          </div>
        </div>

        {/* Real Acquired Date (If unlocked) or Tip */}
        {isUnlocked && badge.earnedAt ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-800">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              획득 일시: <strong>{formatEarnedDate(badge.earnedAt)}</strong>
            </span>
          </div>
        ) : !isUnlocked ? (
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
            {isAdminBadge
              ? '💡 해당 업적은 TDSN 사내 LMS 운영 및 관리 권한이 공식 부여된 관리자에게만 활성화됩니다.'
              : '💡 지속적인 강의 완강과 실무 퀴즈 참여를 통해 TDSN LMS 명예 뱃지를 획득할 수 있습니다.'}
          </div>
        ) : null}

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            id="achievement-modal-close-btn"
            onClick={onClose}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer ${
              isAdminBadge
                ? 'bg-slate-900 hover:bg-slate-800 text-amber-300'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            확인
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
