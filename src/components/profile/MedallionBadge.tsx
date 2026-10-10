import React from 'react';
import { Check, Lock, Sparkles, Shield, Crown } from 'lucide-react';
import { AchievementBadge } from '../../types';
import { AchievementInsignia } from './AchievementInsignia';

interface MedallionBadgeProps {
  badge: AchievementBadge;
  isEarned: boolean;
  isEquipped?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  showSparkle?: boolean;
}

export const MedallionBadge: React.FC<MedallionBadgeProps> = ({
  badge,
  isEarned,
  isEquipped = false,
  size = 'md',
  className = '',
  onClick,
  showSparkle = true,
}) => {
  // Sizing dimensions
  const dims = {
    sm: {
      wrapper: 'w-12 h-12',
      outerRing: 48,
      insigniaSize: 'sm' as const,
      badgeOffset: '-bottom-0.5 -right-0.5',
      badgeSize: 'w-4 h-4 text-[9px]',
    },
    md: {
      wrapper: 'w-20 h-20',
      outerRing: 80,
      insigniaSize: 'md' as const,
      badgeOffset: '-bottom-1 -right-1',
      badgeSize: 'w-6 h-6 text-xs',
    },
    lg: {
      wrapper: 'w-28 h-28',
      outerRing: 112,
      insigniaSize: 'lg' as const,
      badgeOffset: '-bottom-1.5 -right-1.5',
      badgeSize: 'w-8 h-8 text-sm',
    },
  }[size];

  // Accent styling based on tier and admin status
  const getTierColors = () => {
    if (badge.isAdminOnly) {
      return {
        outerGlow: 'rgba(139, 92, 246, 0.45)',
        ringGradient: 'from-amber-400 via-rose-500 to-indigo-600',
        innerGradient: 'from-purple-900/10 via-indigo-50/70 to-white',
        borderAccent: 'border-purple-300',
        statusBg: 'bg-gradient-to-r from-amber-500 to-rose-500 text-white',
      };
    }

    switch (badge.rarity) {
      case 'LEGENDARY':
        return {
          outerGlow: 'rgba(245, 158, 11, 0.4)',
          ringGradient: 'from-amber-300 via-orange-500 to-rose-500',
          innerGradient: 'from-amber-100/60 via-yellow-50/40 to-white',
          borderAccent: 'border-amber-300',
          statusBg: 'bg-emerald-500 text-white',
        };
      case 'EPIC':
        return {
          outerGlow: 'rgba(168, 85, 247, 0.35)',
          ringGradient: 'from-purple-400 via-indigo-500 to-pink-500',
          innerGradient: 'from-purple-100/50 via-indigo-50/30 to-white',
          borderAccent: 'border-purple-300',
          statusBg: 'bg-emerald-500 text-white',
        };
      case 'RARE':
        return {
          outerGlow: 'rgba(59, 130, 246, 0.35)',
          ringGradient: 'from-blue-300 via-sky-400 to-indigo-500',
          innerGradient: 'from-blue-100/50 via-sky-50/30 to-white',
          borderAccent: 'border-blue-300',
          statusBg: 'bg-emerald-500 text-white',
        };
      case 'COMMON':
      default:
        return {
          outerGlow: 'rgba(16, 185, 129, 0.35)',
          ringGradient: 'from-emerald-300 via-teal-400 to-green-500',
          innerGradient: 'from-emerald-100/50 via-teal-50/30 to-white',
          borderAccent: 'border-emerald-300',
          statusBg: 'bg-emerald-500 text-white',
        };
    }
  };

  const colors = getTierColors();

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none group ${dims.wrapper} ${
        !isEarned ? 'grayscale opacity-60' : ''
      } ${className}`}
      style={{
        filter: isEarned ? `drop-shadow(0 4px 10px ${colors.outerGlow})` : undefined,
      }}
    >
      {/* Layer 1: Outer Glow & Floating Sparkles */}
      {isEarned && showSparkle && size !== 'sm' && (
        <>
          <span className="absolute -top-1.5 -left-1 text-amber-400 text-xs animate-pulse opacity-80 pointer-events-none">
            ✦
          </span>
          <span className="absolute -bottom-1 -right-1 text-indigo-400 text-[10px] animate-pulse opacity-70 pointer-events-none">
            ✧
          </span>
        </>
      )}

      {/* Layer 2: Outer Ring (Metallic / Multi-Gradient Notch Ring) */}
      <div
        className={`absolute inset-0 rounded-full p-[2.5px] bg-gradient-to-tr ${
          isEarned ? colors.ringGradient : 'from-slate-300 via-slate-400 to-slate-300'
        } transition-all duration-300 ${isEarned ? 'group-hover:scale-105' : ''}`}
      >
        {/* Layer 3: Secondary Ring (Inner Notch/Border) */}
        <div className="w-full h-full rounded-full border border-white/60 p-[2px] flex items-center justify-center shadow-inner">
          {/* Layer 4: Badge Surface (Radial metallic surface / Frosted glass) */}
          <div
            className={`w-full h-full rounded-full flex items-center justify-center relative overflow-hidden bg-gradient-to-b ${
              isEarned ? colors.innerGradient : 'from-slate-100 to-slate-200'
            } shadow-inner`}
          >
            {/* Subtle Metallic Highlight Arc */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent rounded-t-full pointer-events-none" />

            {/* Layer 5: Center Icon (Modern Vector Insignia) */}
            <div
              className={`relative z-10 transform transition-transform duration-300 flex items-center justify-center ${
                isEarned ? 'group-hover:scale-110 drop-shadow-sm' : 'opacity-70'
              }`}
            >
              <AchievementInsignia
                badgeId={badge.id}
                icon={badge.icon}
                size={dims.insigniaSize}
              />
            </div>

            {/* Layer 6: Dynamic Admin Rainbow Shimmer if applicable */}
            {isEarned && badge.isAdminOnly && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {/* Admin Top Ornament (Crown or Shield for Admin Badges) */}
      {isEarned && badge.isAdminOnly && size !== 'sm' && (
        <div className="absolute -top-2.5 z-20 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-xs flex items-center gap-0.5 text-[9px] font-black tracking-tighter">
          <Crown className="w-2.5 h-2.5" />
          <span>ADMIN</span>
        </div>
      )}

      {/* Bottom Status Emblem (Checkmark / Lock / Equipped Tag) */}
      <div className={`absolute ${dims.badgeOffset} z-20`}>
        {isEquipped ? (
          <div className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold shadow-sm border border-white flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
            <span>장착</span>
          </div>
        ) : isEarned ? (
          <div
            className={`rounded-full flex items-center justify-center shadow-xs border border-white ${dims.badgeSize} ${colors.statusBg}`}
          >
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
        ) : (
          <div
            className={`rounded-full flex items-center justify-center shadow-xs border border-slate-300 bg-slate-400 text-white ${dims.badgeSize}`}
          >
            <Lock className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );
};
