import React from 'react';

interface AchievementInsigniaProps {
  badgeId?: string;
  icon?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

/**
 * Modern SVG Insignia component replacing raw OS emojis with sleek,
 * game-like / modern LMS accomplishment emblems.
 */
export const AchievementInsignia: React.FC<AchievementInsigniaProps> = ({
  badgeId = '',
  icon = '',
  size = 'md',
  className = '',
}) => {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  // Determine badge type based on badgeId or fallback icon
  const id = badgeId.toLowerCase();

  // 1. Sprout / First Learning (badge_first_course, badge_first_step, 🌱)
  if (id.includes('first_course') || id.includes('first_step') || icon === '🌱') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <defs>
          <linearGradient id="sprout_leaf_1" x1="6" y1="30" x2="30" y2="8" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10B981" />
            <stop offset="1" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="sprout_stem" x1="18" y1="32" x2="18" y2="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#059669" />
            <stop offset="1" stopColor="#10B981" />
          </linearGradient>
        </defs>
        {/* Glow halo */}
        <circle cx="18" cy="18" r="14" fill="#10B981" fillOpacity="0.15" />
        {/* Curved Stem */}
        <path
          d="M18 31C18 24 16 19 22 14"
          stroke="url(#sprout_stem)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Right Main Leaf */}
        <path
          d="M21 15C21 15 28 13 30 7C24 7 21 11 21 15Z"
          fill="url(#sprout_leaf_1)"
        />
        {/* Left Sprout Leaf */}
        <path
          d="M17 19C17 19 10 18 7 12C12 11 16 15 17 19Z"
          fill="#059669"
        />
        {/* Tiny Dew Spark */}
        <circle cx="27" cy="8.5" r="1.5" fill="#E0F2FE" />
      </svg>
    );
  }

  // 2. Book / Knowledge (badge_passionate_learner, badge_consistent_learner, 📖)
  if (id.includes('passionate_learner') || id.includes('consistent_learner') || icon === '📖') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <defs>
          <linearGradient id="book_cover" x1="4" y1="8" x2="32" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2563EB" />
            <stop offset="1" stopColor="#4F46E5" />
          </linearGradient>
          <linearGradient id="book_page" x1="18" y1="8" x2="18" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F8FAFC" />
            <stop offset="1" stopColor="#E2E8F0" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="14" fill="#3B82F6" fillOpacity="0.15" />
        {/* Back Cover */}
        <path
          d="M6 10C11 9 16 11 18 13C20 11 25 9 30 10V26C25 25 20 27 18 29C16 27 11 25 6 26V10Z"
          fill="url(#book_cover)"
        />
        {/* Left Page */}
        <path
          d="M7 11C11.5 10 15.5 12 17.5 13.5V27C15.5 25.5 11.5 24 7 25V11Z"
          fill="url(#book_page)"
        />
        {/* Right Page */}
        <path
          d="M29 11C24.5 10 20.5 12 18.5 13.5V27C20.5 25.5 24.5 24 29 25V11Z"
          fill="#FFFFFF"
        />
        {/* Ribbon Bookmark */}
        <path
          d="M17.5 12V22L19.5 20L21.5 22V12"
          fill="#F59E0B"
        />
      </svg>
    );
  }

  // 3. Calendar / Attendance Streak (badge_streak_7, badge_perfect_attendance, 📅)
  if (id.includes('streak') || id.includes('attendance') || icon === '📅') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <defs>
          <linearGradient id="cal_header" x1="7" y1="8" x2="29" y2="8" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9333EA" />
            <stop offset="1" stopColor="#C084FC" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="14" fill="#A855F7" fillOpacity="0.15" />
        {/* Calendar Body */}
        <rect x="7" y="10" width="22" height="19" rx="4" fill="#FFFFFF" stroke="#E9D5FF" strokeWidth="1.5" />
        {/* Calendar Top Banner */}
        <path d="M7 14C7 11.7909 8.79086 10 11 10H25C27.2091 10 29 11.7909 29 14V15H7V14Z" fill="url(#cal_header)" />
        {/* Rings */}
        <rect x="11" y="7" width="2.5" height="5" rx="1.2" fill="#7E22CE" />
        <rect x="22.5" y="7" width="2.5" height="5" rx="1.2" fill="#7E22CE" />
        {/* Golden Star in center for perfect attendance */}
        <path
          d="M18 18L19.2 21.2H22.5L19.8 23.2L20.8 26.5L18 24.5L15.2 26.5L16.2 23.2L13.5 21.2H16.8L18 18Z"
          fill="#F59E0B"
        />
      </svg>
    );
  }

  // 4. Mission / Assignment Complete (badge_assignment_complete, 📋)
  if (id.includes('assignment') || icon === '📋') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="14" fill="#EA580C" fillOpacity="0.15" />
        {/* Clipboard board */}
        <rect x="8" y="9" width="20" height="21" rx="3.5" fill="#F97316" />
        <rect x="10" y="12" width="16" height="16" rx="2" fill="#FFFFFF" />
        {/* Metal Clip */}
        <rect x="13.5" y="7" width="9" height="4.5" rx="1.8" fill="#CBD5E1" stroke="#64748B" strokeWidth="1.2" />
        {/* Checkmark task lines */}
        <path d="M13 16.5L15 18.5L19 14.5" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 22L15 24L19 20" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="21" y="16" width="3.5" height="1.5" rx="0.75" fill="#CBD5E1" />
        <rect x="21" y="21.5" width="3.5" height="1.5" rx="0.75" fill="#CBD5E1" />
      </svg>
    );
  }

  // 5. Trophy / Perfect Quiz / Supreme Achievement (badge_perfect_quiz, badge_quiz_master, 🏆)
  if (id.includes('quiz') && (id.includes('perfect') || id.includes('master')) || icon === '🏆') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <defs>
          <linearGradient id="gold_grad" x1="10" y1="8" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE047" />
            <stop offset="0.5" stopColor="#EAB308" />
            <stop offset="1" stopColor="#CA8A04" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="14" fill="#F59E0B" fillOpacity="0.18" />
        {/* Cup Handles */}
        <path
          d="M8 12C8 17 12 18 14 18M28 12C28 17 24 18 22 18"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Cup Chalice */}
        <path
          d="M11 9H25V17C25 21 21.8 23.5 18 23.5C14.2 23.5 11 21 11 17V9Z"
          fill="url(#gold_grad)"
        />
        {/* Trophy Stem & Base */}
        <path d="M16 23.5H20V27H16V23.5Z" fill="#CA8A04" />
        <rect x="12" y="27" width="12" height="3" rx="1.5" fill="#A16207" />
        {/* Ruby Star Gem */}
        <circle cx="18" cy="14" r="2.2" fill="#E11D48" />
      </svg>
    );
  }

  // 6. Target / Goal Reached (badge_goal_reached, 🎯)
  if (id.includes('goal') || icon === '🎯') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="14" fill="#06B6D4" fillOpacity="0.15" />
        {/* Outer Ring */}
        <circle cx="18" cy="18" r="13" fill="#EF4444" />
        <circle cx="18" cy="18" r="9.5" fill="#FFFFFF" />
        <circle cx="18" cy="18" r="6" fill="#EF4444" />
        {/* Bullseye Gold Center */}
        <circle cx="18" cy="18" r="2.8" fill="#FBBF24" />
        {/* Laser Arrow Shaft */}
        <path d="M28 8L20 16" stroke="#0284C7" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M27 6L30 9L29 11L26 8L27 6Z" fill="#38BDF8" />
      </svg>
    );
  }

  // 7. Academic Crown / Grand Master (badge_grand_master, 🎓)
  if (id.includes('grand_master') || icon === '🎓') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="14" fill="#6366F1" fillOpacity="0.15" />
        {/* Cap Top Rhombus */}
        <path
          d="M18 9L31 16L18 23L5 16L18 9Z"
          fill="#4F46E5"
          stroke="#818CF8"
          strokeWidth="1.2"
        />
        {/* Skull Cap Base */}
        <path
          d="M11 19.5V25C11 27.5 14 29 18 29C22 29 25 27.5 25 25V19.5L18 23.2L11 19.5Z"
          fill="#3730A3"
        />
        {/* Golden Tassel Button & String */}
        <circle cx="18" cy="16" r="1.8" fill="#FBBF24" />
        <path d="M18 16L27 20V25" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="27" cy="25" r="1.5" fill="#F59E0B" />
      </svg>
    );
  }

  // 8. Compass / Knowledge Explorer (badge_knowledge_explorer, 🧭)
  if (id.includes('knowledge') || id.includes('explorer') || icon === '🧭') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="14" fill="#0EA5E9" fillOpacity="0.15" />
        {/* Compass Outer Rim */}
        <circle cx="18" cy="18" r="13" fill="#0284C7" stroke="#38BDF8" strokeWidth="1.5" />
        <circle cx="18" cy="18" r="10.5" fill="#F0F9FF" />
        {/* Degree notches */}
        <circle cx="18" cy="9.5" r="0.8" fill="#0369A1" />
        <circle cx="26.5" cy="18" r="0.8" fill="#0369A1" />
        <circle cx="18" cy="26.5" r="0.8" fill="#0369A1" />
        <circle cx="9.5" cy="18" r="0.8" fill="#0369A1" />
        {/* North/South Needles */}
        <path d="M18 18L15.5 16.5L18 9.5L20.5 16.5L18 18Z" fill="#EF4444" />
        <path d="M18 18L15.5 19.5L18 26.5L20.5 19.5L18 18Z" fill="#64748B" />
        <circle cx="18" cy="18" r="1.8" fill="#FBBF24" />
      </svg>
    );
  }

  // 9. Study Leader / Vanguard (badge_study_leader, 👥)
  if (id.includes('study_leader') || icon === '👥') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="14" fill="#8B5CF6" fillOpacity="0.15" />
        {/* Back Figure Left */}
        <circle cx="11.5" cy="13.5" r="3" fill="#A78BFA" />
        <path d="M6.5 25C6.5 21.5 9 19.5 11.5 19.5C13.5 19.5 15.5 21 16 23" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" />
        {/* Back Figure Right */}
        <circle cx="24.5" cy="13.5" r="3" fill="#A78BFA" />
        <path d="M29.5 25C29.5 21.5 27 19.5 24.5 19.5C22.5 19.5 20.5 21 20 23" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" />
        {/* Center Leader Figure */}
        <circle cx="18" cy="11.5" r="3.8" fill="#6D28D9" />
        <path d="M11 26C11 21.5 14 19 18 19C22 19 25 21.5 25 26" fill="#7C3AED" />
        {/* Gold Leader Crown Pin */}
        <path d="M16 8L18 9L20 8L19.5 10H16.5L16 8Z" fill="#F59E0B" />
      </svg>
    );
  }

  // 10. Community Active (badge_community_active, 💬)
  if (id.includes('community_active') || icon === '💬') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="14" fill="#14B8A6" fillOpacity="0.15" />
        {/* Primary Dialogue Bubble */}
        <path
          d="M8 15C8 10.5 12 7 17 7C22 7 26 10.5 26 15C26 19.5 22 23 17 23C15.2 23 13.5 22.5 12 21.6L8 23L9.2 19.2C8.4 18 8 16.5 8 15Z"
          fill="#0D9488"
        />
        {/* Overlapping Heart / Spark */}
        <path
          d="M17 11C15 11 13.5 12.5 13.5 14.5C13.5 17 17 19.5 17 19.5C17 19.5 20.5 17 20.5 14.5C20.5 12.5 19 11 17 11Z"
          fill="#5EEAD4"
        />
      </svg>
    );
  }

  // 11. Time Accumulation (badge_10h, ⏱️)
  if (id.includes('10h') || icon === '⏱️') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="14" fill="#0EA5E9" fillOpacity="0.15" />
        {/* Stopwatch Top Buttons */}
        <rect x="16" y="5.5" width="4" height="3" rx="1.2" fill="#0284C7" />
        <rect x="24" y="8" width="3" height="2" rx="1" transform="rotate(45 24 8)" fill="#0284C7" />
        {/* Main Stopwatch Dial */}
        <circle cx="18" cy="20" r="11.5" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.2" />
        {/* Hour / Minute Hand pointing at 10 */}
        <path d="M18 20L14 15" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M18 20L21 20" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="18" cy="20" r="1.8" fill="#0284C7" />
      </svg>
    );
  }

  // 12. Verified Quiz Pass (badge_quiz_pass_3, ✅)
  if (id.includes('pass') || icon === '✅') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="14" fill="#10B981" fillOpacity="0.15" />
        {/* Shield / Seal Shape */}
        <path
          d="M18 6L28 10V18C28 24.5 23.5 29 18 31C12.5 29 8 24.5 8 18V10L18 6Z"
          fill="#10B981"
        />
        {/* Crisp White Checkmark */}
        <path
          d="M13.5 17.5L16.5 20.5L23 14"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // 13. Admin: 운영 관리자 (badge_admin_ops, 👑)
  if (id.includes('admin_ops') || icon === '👑') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="14" fill="#F97316" fillOpacity="0.2" />
        {/* Regal Imperial Crown */}
        <path
          d="M7 25H29L31 13L24 18L18 9L12 18L5 13L7 25Z"
          fill="url(#crown_gold)"
        />
        {/* Crown Base Band with Rubies */}
        <rect x="7" y="25" width="22" height="3" rx="1.2" fill="#C2410C" />
        <circle cx="11" cy="26.5" r="1" fill="#FEF08A" />
        <circle cx="18" cy="26.5" r="1" fill="#FEF08A" />
        <circle cx="25" cy="26.5" r="1" fill="#FEF08A" />
        <defs>
          <linearGradient id="crown_gold" x1="5" y1="9" x2="31" y2="25" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" />
            <stop offset="0.5" stopColor="#F97316" />
            <stop offset="1" stopColor="#EA580C" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 14. Admin: 데이터 관리자 (badge_admin_data, 📊)
  if (id.includes('admin_data') || icon === '📊') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="14" fill="#06B6D4" fillOpacity="0.2" />
        {/* Bar 1 */}
        <rect x="8" y="19" width="4.5" height="10" rx="1.5" fill="#10B981" />
        {/* Bar 2 */}
        <rect x="15.5" y="13" width="4.5" height="16" rx="1.5" fill="#06B6D4" />
        {/* Bar 3 */}
        <rect x="23" y="8" width="4.5" height="21" rx="1.5" fill="#3B82F6" />
        {/* Upward Trend Laser Vector */}
        <path d="M7 21L15 14L22 9L29 7" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M26 6H30V10" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 15. Admin: 서비스 총괄 (badge_admin_super, badge_admin_rainbow_crest, 🌟)
  if (id.includes('admin_super') || id.includes('rainbow_crest') || icon === '🌟') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="15" fill="#EC4899" fillOpacity="0.2" />
        {/* 8-Pointed Imperial Star */}
        <path
          d="M18 4L21.5 12L29.5 8.5L26 16.5L34 18L26 19.5L29.5 27.5L21.5 24L18 32L14.5 24L6.5 27.5L10 19.5L2 18L10 16.5L6.5 8.5L14.5 12L18 4Z"
          fill="url(#rainbow_star)"
        />
        <circle cx="18" cy="18" r="4.5" fill="#FFFFFF" />
        <circle cx="18" cy="18" r="2.8" fill="#F59E0B" />
        <defs>
          <linearGradient id="rainbow_star" x1="2" y1="4" x2="34" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F43F5E" />
            <stop offset="0.3" stopColor="#F59E0B" />
            <stop offset="0.6" stopColor="#10B981" />
            <stop offset="0.8" stopColor="#3B82F6" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 16. Admin: 수료 인증관 (badge_admin_cert, 📜)
  if (id.includes('admin_cert') || icon === '📜') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="14" fill="#8B5CF6" fillOpacity="0.2" />
        {/* Diploma Parchment */}
        <rect x="9" y="8" width="18" height="21" rx="2.5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
        {/* Writing Lines */}
        <line x1="13" y1="13" x2="23" y2="13" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="13" y1="17" x2="23" y2="17" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="13" y1="21" x2="19" y2="21" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
        {/* Red Wax Seal */}
        <circle cx="23" cy="24" r="3.5" fill="#DC2626" />
        <circle cx="23" cy="24" r="1.8" fill="#FCA5A5" />
      </svg>
    );
  }

  // 17. Custom Frame (custom_frame_*, 🎨)
  if (id.includes('custom_frame') || icon === '🎨') {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
      >
        <circle cx="18" cy="18" r="14" fill="#6366F1" fillOpacity="0.18" />
        {/* Artist Palette */}
        <path
          d="M18 7C11.5 7 6 12 6 18.5C6 24 10.5 28.5 16 28.5C18 28.5 19.5 27 19.5 25C19.5 24 19 23.2 18.5 22.5C18 21.8 17.5 21 17.5 20C17.5 18.5 19 17 20.5 17H22.5C26.5 17 30 13.5 30 9.5C27 8 22.5 7 18 7Z"
          fill="url(#palette_grad)"
        />
        {/* Color Dots */}
        <circle cx="11.5" cy="13.5" r="1.8" fill="#EF4444" />
        <circle cx="15.5" cy="10.5" r="1.8" fill="#F59E0B" />
        <circle cx="21.5" cy="10.5" r="1.8" fill="#10B981" />
        <circle cx="25.5" cy="13.5" r="1.8" fill="#3B82F6" />
        <defs>
          <linearGradient id="palette_grad" x1="6" y1="7" x2="30" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F8FAFC" />
            <stop offset="1" stopColor="#E2E8F0" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Default fallback badge insignia
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} shrink-0 drop-shadow-sm ${className}`}
    >
      <circle cx="18" cy="18" r="14" fill="#6366F1" fillOpacity="0.15" />
      <polygon
        points="18,6 22,14 31,15 24,21 26,30 18,25 10,30 12,21 5,15 14,14"
        fill="#6366F1"
      />
    </svg>
  );
};
