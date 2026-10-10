import React from 'react';
import { CustomFrameConfig } from '../../types';
import {
  ProfileDecoration,
  getProfileDecoration,
  buildCustomGradientCss,
} from '../../utils/profileDecorations';

interface ProfileFrameProps {
  children: React.ReactNode;
  decorationId?: string | null;
  customConfig?: CustomFrameConfig | null;
  customFrames?: CustomFrameConfig[];
  userRole?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showOrnaments?: boolean;
}

export const ProfileFrame: React.FC<ProfileFrameProps> = ({
  children,
  decorationId,
  customConfig,
  customFrames,
  userRole,
  size = 'md',
  className = '',
  showOrnaments = true,
}) => {
  // If customConfig is directly provided (e.g. from editor preview), use it.
  // Otherwise resolve decoration from decorationId.
  const decoration: ProfileDecoration | null = React.useMemo(() => {
    if (customConfig) {
      return {
        id: customConfig.id,
        name: customConfig.name || '커스텀 관리자 프레임',
        badgeTitle: customConfig.name || '커스텀 프레임',
        icon: '🎨',
        description: `관리자가 직접 제작한 커스텀 프레임 (${customConfig.animationType})`,
        isAdminOnly: true,
        rarity: 'SPECIAL',
        tierName: 'CUSTOM ADMIN',
        frameClass: 'avatar-frame-custom',
        badgeClass: 'bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 text-slate-900 border-indigo-300 font-black',
        accentColor: customConfig.colors[0] || '#6366f1',
        shape: 'circle',
        ornament: customConfig.sparkleEnabled ? 'stars' : 'none',
        customConfig,
      };
    }
    return getProfileDecoration(decorationId, userRole, customFrames);
  }, [customConfig, decorationId, userRole, customFrames]);

  // If no decoration is equipped/selected, just render the child
  if (!decoration) {
    return <div className={`inline-flex items-center justify-center relative ${className}`}>{children}</div>;
  }

  const effectiveConfig = decoration.customConfig || customConfig;

  // Top ornaments (Crown/Shield badge pill, sparkles, sprout) should ONLY ever be displayed
  // on large profile display sizes (lg, xl, 2xl).
  // On compact avatar sizes (xs, sm, md) used in tables, lists, cards, and navbars,
  // ornaments must NOT be rendered because they overflow, overlap text, and distort layouts.
  const canShowOrnaments = showOrnaments && (size === 'lg' || size === 'xl' || size === '2xl');

  // Custom Frame Rendering with dynamic styles
  if (effectiveConfig) {
    const gradientCss = buildCustomGradientCss(effectiveConfig);
    const borderWidth = effectiveConfig.borderWidth || 3;
    const glowOpacity = (effectiveConfig.glowIntensity ?? 70) / 100;
    const duration = effectiveConfig.animationDuration || 3;

    // Animation mapping
    let animationStyle = '';
    switch (effectiveConfig.animationType) {
      case 'rainbow_wave':
      case 'gradient_flow':
      case 'border_flow':
        animationStyle = `borderFlow ${duration}s ease infinite`;
        break;
      case 'rotate':
        animationStyle = `conicRotate ${duration}s linear infinite`;
        break;
      case 'neon_pulse':
        animationStyle = `borderFlow ${duration}s ease infinite, neonPulse ${duration * 0.75}s ease-in-out infinite`;
        break;
      case 'glow_pulse':
        animationStyle = `glowPulse ${duration}s ease-in-out infinite`;
        break;
      case 'shine':
        animationStyle = `shineSweep ${duration}s ease-in-out infinite`;
        break;
      default:
        animationStyle = 'none';
    }

    // Blink effect
    const blinkStyle =
      effectiveConfig.blinkCount > 0
        ? `blinkEffect ${Math.max(1, duration / effectiveConfig.blinkCount)}s ease-in-out infinite`
        : 'none';

    return (
      <div className={`relative inline-flex items-center justify-center select-none group ${className}`}>
        {/* Glow Layer */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-all duration-300"
          style={{
            backgroundImage: gradientCss,
            filter: `blur(${Math.max(4, borderWidth * 2.5)}px)`,
            opacity: glowOpacity * 0.85,
            zIndex: 0,
            animation: animationStyle !== 'none' ? animationStyle : undefined,
          }}
        />

        {/* Outer Ring Border */}
        <div
          className="relative rounded-2xl overflow-hidden flex items-center justify-center z-10 transition-all duration-300"
          style={{
            padding: `${borderWidth}px`,
            backgroundImage: gradientCss,
            backgroundSize: '300% 300%',
            animation: [animationStyle !== 'none' ? animationStyle : '', blinkStyle !== 'none' ? blinkStyle : '']
              .filter(Boolean)
              .join(', ') || undefined,
          }}
        >
          {/* Inner crisp surface protecting Avatar image */}
          <div className="relative rounded-[calc(1rem-2px)] overflow-hidden bg-white z-10 flex items-center justify-center">
            {children}
          </div>
        </div>

        {/* Top / Corner Ornaments */}
        {canShowOrnaments && effectiveConfig.sparkleEnabled && (() => {
          const sColor = effectiveConfig.sparkleColor || '#FBBF24';
          const sSecondaryColor = effectiveConfig.sparkleColor ? effectiveConfig.sparkleColor : '#22D3EE';
          const sDuration = effectiveConfig.sparkleSpeed === 'fast' ? 1.2 : effectiveConfig.sparkleSpeed === 'slow' ? 3.2 : 2;
          const sSizeClassPrimary = effectiveConfig.sparkleSize === 'large' ? 'text-sm' : effectiveConfig.sparkleSize === 'small' ? 'text-[9px]' : 'text-xs';
          const sSizeClassSecondary = effectiveConfig.sparkleSize === 'large' ? 'text-xs' : effectiveConfig.sparkleSize === 'small' ? 'text-[7.5px]' : 'text-[10px]';
          const density = effectiveConfig.sparkleDensity || 'medium';

          return (
            <>
              {/* Particle 1: Top-Right */}
              <span
                className={`absolute -top-1.5 -right-1 ${sSizeClassPrimary} z-20 pointer-events-none drop-shadow-xs`}
                style={{
                  color: sColor,
                  animation: `sparkleFloat ${sDuration}s ease-in-out infinite`,
                }}
              >
                ✦
              </span>

              {/* Particle 2: Bottom-Left */}
              <span
                className={`absolute -bottom-1 -left-1 ${sSizeClassSecondary} z-20 pointer-events-none drop-shadow-xs`}
                style={{
                  color: sSecondaryColor,
                  animation: `sparkleFloat ${sDuration * 1.25}s ease-in-out infinite 0.4s`,
                }}
              >
                ✧
              </span>

              {/* Particle 3 & 4 for medium/high density */}
              {(density === 'medium' || density === 'high') && (
                <>
                  <span
                    className={`absolute -top-1 -left-1 ${sSizeClassSecondary} z-20 pointer-events-none drop-shadow-xs`}
                    style={{
                      color: sColor,
                      animation: `sparkleFloat ${sDuration * 1.1}s ease-in-out infinite 0.8s`,
                    }}
                  >
                    ✦
                  </span>
                  <span
                    className={`absolute -bottom-1.5 -right-1 ${sSizeClassPrimary} z-20 pointer-events-none drop-shadow-xs`}
                    style={{
                      color: sSecondaryColor,
                      animation: `sparkleFloat ${sDuration * 0.9}s ease-in-out infinite 0.2s`,
                    }}
                  >
                    ✧
                  </span>
                </>
              )}

              {/* Particle 5 & 6 for high density */}
              {density === 'high' && (
                <>
                  <span
                    className={`absolute top-1/2 -left-2 -translate-y-1/2 ${sSizeClassSecondary} z-20 pointer-events-none drop-shadow-xs`}
                    style={{
                      color: sColor,
                      animation: `sparkleFloat ${sDuration * 1.3}s ease-in-out infinite 0.6s`,
                    }}
                  >
                    ✦
                  </span>
                  <span
                    className={`absolute top-1/2 -right-2 -translate-y-1/2 ${sSizeClassSecondary} z-20 pointer-events-none drop-shadow-xs`}
                    style={{
                      color: sSecondaryColor,
                      animation: `sparkleFloat ${sDuration * 0.8}s ease-in-out infinite 1s`,
                    }}
                  >
                    ✧
                  </span>
                </>
              )}
            </>
          );
        })()}
      </div>
    );
  }

  // Built-in Static Achievement / Admin Frame Rendering
  const isSpecialAdmin = decoration.isAdminOnly;

  return (
    <div className={`relative inline-flex items-center justify-center select-none group overflow-visible ${className}`}>
      {/* Outer Glow wrapper */}
      <div
        className={`avatar-frame-wrapper ${decoration.frameClass} ${size ? `avatar-frame-${size}` : ''} relative z-10 overflow-visible`}
        style={{
          boxShadow: !isSpecialAdmin ? `0 0 14px ${decoration.accentColor}55` : undefined,
        }}
      >
        <div className="relative z-10 rounded-[inherit] overflow-hidden p-[2px] bg-white flex items-center justify-center">
          {children}
        </div>
      </div>

      {/* Top Ornaments based on decoration type */}
      {canShowOrnaments && (decoration.id === 'badge_admin_super' || decoration.id === 'badge_admin_rainbow_crest') && (
        <>
          <span
            className="absolute -top-1.5 -right-1.5 text-amber-400 text-xs z-20 pointer-events-none drop-shadow-xs"
            style={{ animation: 'sparkleFloat 2s ease-in-out infinite' }}
          >
            ✦
          </span>
          <span
            className="absolute -bottom-1 -left-1.5 text-cyan-400 text-[11px] z-20 pointer-events-none drop-shadow-xs"
            style={{ animation: 'sparkleFloat 2.5s ease-in-out infinite 0.5s' }}
          >
            ✧
          </span>
        </>
      )}

      {canShowOrnaments && decoration.ornament === 'sprout' && (
        <span className="absolute -top-1 -right-0.5 z-20 text-xs text-emerald-500 drop-shadow-xs pointer-events-none">
          🌱
        </span>
      )}
    </div>
  );
};
