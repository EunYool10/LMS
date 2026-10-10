import { CustomFrameConfig } from '../types';
import { isAdminRole, getDefaultFrameForRole } from './rbac';

export interface ProfileDecoration {
  id: string; // achievementId or custom_frame_${id}
  name: string;
  badgeTitle: string;
  icon: string;
  description: string;
  isAdminOnly: boolean;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'SPECIAL';
  tierName: string;
  frameClass: string;
  badgeClass: string;
  accentColor: string;
  shape?: 'circle' | 'square' | 'shield' | 'hexagon';
  ornament?: 'sprout' | 'book' | 'shield' | 'crown' | 'stars' | 'target' | 'trophy' | 'none';
  customConfig?: CustomFrameConfig;
}

export const PROFILE_DECORATIONS: Record<string, ProfileDecoration> = {
  // 1. 첫 학습 시작 (COMMON) - Green Sprout Theme
  badge_first_course: {
    id: 'badge_first_course',
    name: '새싹 러너 프레임',
    badgeTitle: '첫 학습 시작',
    icon: '🌱',
    description: '첫 번째 학습 콘텐츠를 완료하여 새로운 성장의 첫걸음을 기념하는 산뜻한 에메랄드 테두리',
    isAdminOnly: false,
    rarity: 'COMMON',
    tierName: '일반 (COMMON)',
    frameClass: 'avatar-frame-emerald',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentColor: '#10b981',
    shape: 'circle',
    ornament: 'sprout',
  },
  // Backward compatibility alias
  badge_first_step: {
    id: 'badge_first_step',
    name: '새싹 러너 프레임',
    badgeTitle: '첫 학습 시작',
    icon: '🌱',
    description: '첫 번째 학습 콘텐츠를 완료하여 새로운 성장의 첫걸음을 기념하는 산뜻한 에메랄드 테두리',
    isAdminOnly: false,
    rarity: 'COMMON',
    tierName: '일반 (COMMON)',
    frameClass: 'avatar-frame-emerald',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentColor: '#10b981',
    shape: 'circle',
    ornament: 'sprout',
  },

  // 2. 꾸준한 학습 (RARE) - Blue Knowledge Theme
  badge_passionate_learner: {
    id: 'badge_passionate_learner',
    name: '지식 서재 프레임',
    badgeTitle: '꾸준한 학습',
    icon: '📖',
    description: '일정 기간 동안 꾸준한 학구열을 지속하며 지식의 깊이를 더한 학습자 전용 사파이어 블루 테두리',
    isAdminOnly: false,
    rarity: 'RARE',
    tierName: '희귀 (RARE)',
    frameClass: 'avatar-frame-blue',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    accentColor: '#3b82f6',
    shape: 'circle',
    ornament: 'book',
  },
  badge_consistent_learner: {
    id: 'badge_consistent_learner',
    name: '지식 서재 프레임',
    badgeTitle: '꾸준한 학습',
    icon: '📖',
    description: '일정 기간 동안 꾸준한 학구열을 지속하며 지식의 깊이를 더한 학습자 전용 사파이어 블루 테두리',
    isAdminOnly: false,
    rarity: 'RARE',
    tierName: '희귀 (RARE)',
    frameClass: 'avatar-frame-blue',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    accentColor: '#3b82f6',
    shape: 'circle',
    ornament: 'book',
  },

  // 3. 성실한 출석 (EPIC) - Purple Amethyst Theme
  badge_streak_7: {
    id: 'badge_streak_7',
    name: '성실의 수호자 프레임',
    badgeTitle: '성실한 출석',
    icon: '📅',
    description: '출석률 기준을 성실히 달성하고 연속 출석을 지켜낸 끈기의 아메시스트 바이올렛 테두리',
    isAdminOnly: false,
    rarity: 'EPIC',
    tierName: '영웅 (EPIC)',
    frameClass: 'avatar-frame-purple',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    accentColor: '#a855f7',
    shape: 'shield',
    ornament: 'shield',
  },
  badge_perfect_attendance: {
    id: 'badge_perfect_attendance',
    name: '성실의 수호자 프레임',
    badgeTitle: '성실한 출석',
    icon: '📅',
    description: '출석률 기준을 성실히 달성하고 연속 출석을 지켜낸 끈기의 아메시스트 바이올렛 테두리',
    isAdminOnly: false,
    rarity: 'EPIC',
    tierName: '영웅 (EPIC)',
    frameClass: 'avatar-frame-purple',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    accentColor: '#a855f7',
    shape: 'shield',
    ornament: 'shield',
  },

  // 4. 과제 완주 (EPIC) - Warm Gold/Orange Theme
  badge_assignment_complete: {
    id: 'badge_assignment_complete',
    name: '골든 미션 프레임',
    badgeTitle: '과제 완주',
    icon: '📋',
    description: '지정된 정규 과제 및 실무 미션을 100% 제출 완수한 성실성을 입증하는 웜 골드 테두리',
    isAdminOnly: false,
    rarity: 'EPIC',
    tierName: '영웅 (EPIC)',
    frameClass: 'avatar-frame-orange',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    accentColor: '#f97316',
    shape: 'circle',
    ornament: 'shield',
  },

  // 5. 우수한 성취 (LEGENDARY) - Pink / Ruby Trophy Theme
  badge_perfect_quiz: {
    id: 'badge_perfect_quiz',
    name: '승리의 트로피 프레임',
    badgeTitle: '우수한 성취',
    icon: '🏆',
    description: '학습 성적 및 종합 평가에서 만점을 기록한 탁월함을 빛내는 황금 루비 트로피 테두리',
    isAdminOnly: false,
    rarity: 'LEGENDARY',
    tierName: '전설 (LEGENDARY)',
    frameClass: 'avatar-frame-gold',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    accentColor: '#f59e0b',
    shape: 'circle',
    ornament: 'trophy',
  },
  badge_quiz_master: {
    id: 'badge_quiz_master',
    name: '승리의 트로피 프레임',
    badgeTitle: '우수한 성취',
    icon: '🏆',
    description: '학습 성적 및 종합 평가에서 만점을 기록한 탁월함을 빛내는 황금 루비 트로피 테두리',
    isAdminOnly: false,
    rarity: 'LEGENDARY',
    tierName: '전설 (LEGENDARY)',
    frameClass: 'avatar-frame-gold',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    accentColor: '#f59e0b',
    shape: 'circle',
    ornament: 'trophy',
  },

  // 6. 목표 달성 (LEGENDARY) - Teal / Cyan Target Theme
  badge_goal_reached: {
    id: 'badge_goal_reached',
    name: '포커스 타겟 프레임',
    badgeTitle: '목표 달성',
    icon: '🎯',
    description: '설정한 주간 및 월간 자기주도 학습 목표를 완벽히 달성한 집중의 시안 테두리',
    isAdminOnly: false,
    rarity: 'LEGENDARY',
    tierName: '전설 (LEGENDARY)',
    frameClass: 'avatar-frame-cyan',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-300',
    accentColor: '#06b6d4',
    shape: 'circle',
    ornament: 'target',
  },

  // 7. 학습 마스터 (LEGENDARY) - Platinum Academic Theme
  badge_grand_master: {
    id: 'badge_grand_master',
    name: '그랜드 마스터 크라운 프레임',
    badgeTitle: '학습 마스터',
    icon: '🎓',
    description: '모든 교육과정을 정복하고 플랫폼 최고 등급에 도달한 전설적인 플래티넘 크라운 테두리',
    isAdminOnly: false,
    rarity: 'LEGENDARY',
    tierName: '전설 (LEGENDARY)',
    frameClass: 'avatar-frame-indigo',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentColor: '#6366f1',
    shape: 'circle',
    ornament: 'crown',
  },

  // 8. 지식 탐험가 (RARE) - Sky Blue Compass Theme
  badge_knowledge_explorer: {
    id: 'badge_knowledge_explorer',
    name: '지식 탐험가 프레임',
    badgeTitle: '지식 탐험가',
    icon: '🧭',
    description: '다양한 직무 분야의 강의를 두루 섭렵하며 학습 시야를 넓힌 학습자 전용 스카이블루 테두리',
    isAdminOnly: false,
    rarity: 'RARE',
    tierName: '희귀 (RARE)',
    frameClass: 'avatar-frame-sky',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    accentColor: '#0ea5e9',
    shape: 'circle',
    ornament: 'none',
  },

  // 9. 스터디 리더 (EPIC) - Violet / Indigo People Theme
  badge_study_leader: {
    id: 'badge_study_leader',
    name: '스터디 캡틴 프레임',
    badgeTitle: '스터디 리더',
    icon: '👥',
    description: '사내 스터디 그룹을 주도하고 집단 지성을 리드한 리더를 위한 로열 인디고 테두리',
    isAdminOnly: false,
    rarity: 'EPIC',
    tierName: '영웅 (EPIC)',
    frameClass: 'avatar-frame-indigo',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentColor: '#6366f1',
    shape: 'circle',
    ornament: 'shield',
  },

  // 10. 커뮤니티 활동가 (COMMON) - Teal / Green Chat Theme
  badge_community_active: {
    id: 'badge_community_active',
    name: '지식 나눔 프레임',
    badgeTitle: '커뮤니티 활동가',
    icon: '💬',
    description: '강의 Q&A 및 커뮤니티 토론에서 적극적으로 지식을 공유한 참여형 틸 그린 테두리',
    isAdminOnly: false,
    rarity: 'COMMON',
    tierName: '일반 (COMMON)',
    frameClass: 'avatar-frame-teal',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    accentColor: '#14b8a6',
    shape: 'circle',
    ornament: 'none',
  },

  // 11. 학습 시간 누적 (RARE) - Sky Blue Timer Theme
  badge_10h: {
    id: 'badge_10h',
    name: '크로노스 타임 프레임',
    badgeTitle: '학습 시간 누적',
    icon: '⏱️',
    description: '10시간 이상의 깊이 있는 몰입 학습 시간을 기리는 정밀 크로노미터 스카이블루 테두리',
    isAdminOnly: false,
    rarity: 'RARE',
    tierName: '희귀 (RARE)',
    frameClass: 'avatar-frame-sky',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    accentColor: '#0ea5e9',
    shape: 'circle',
    ornament: 'none',
  },

  // 12. 평가 기준 통과 (COMMON) - Rose / Emerald Pass Theme
  badge_quiz_pass_3: {
    id: 'badge_quiz_pass_3',
    name: '베리파이드 패스 프레임',
    badgeTitle: '평가 기준 통과',
    icon: '✅',
    description: '엄격한 퀴즈 기준을 3회 이상 통과한 성실성을 입증하는 틸 그린 테두리',
    isAdminOnly: false,
    rarity: 'COMMON',
    tierName: '일반 (COMMON)',
    frameClass: 'avatar-frame-teal',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    accentColor: '#14b8a6',
    shape: 'circle',
    ornament: 'none',
  },

  // =========================================================================
  // ADMIN EXCLUSIVE SPECIAL ACHIEVEMENTS (Rainbow Wave & Special Animations)
  // =========================================================================

  // Admin 1: 시스템 관리자 (Cyan -> Blue -> Purple -> Pink) + Shield
  badge_admin_system: {
    id: 'badge_admin_system',
    name: '시스템 가디언 레인보우',
    badgeTitle: '시스템 관리자',
    icon: '🛡️',
    description: 'LMS 플랫폼의 시스템 운영 및 보안 관리 전권을 상징하는 Cyan-Blue-Purple 레인보우 프레임',
    isAdminOnly: true,
    rarity: 'SPECIAL',
    tierName: 'ADMIN SPECIAL',
    frameClass: 'avatar-frame-admin-system',
    badgeClass: 'bg-gradient-to-r from-cyan-100 via-blue-100 to-purple-100 text-slate-900 border-blue-300 font-black',
    accentColor: '#3b82f6',
    shape: 'shield',
    ornament: 'shield',
  },

  // Admin 2: 운영 관리자 (Orange -> Yellow -> Pink -> Purple) + Crown
  badge_admin_ops: {
    id: 'badge_admin_ops',
    name: '운영 디렉터 레인보우',
    badgeTitle: '운영 관리자',
    icon: '👑',
    description: '서비스 운영 정책 및 교육 플랫폼 설정을 총괄하는 Flame Rainbow Wave 프레임',
    isAdminOnly: true,
    rarity: 'SPECIAL',
    tierName: 'ADMIN SPECIAL',
    frameClass: 'avatar-frame-admin-ops',
    badgeClass: 'bg-gradient-to-r from-orange-100 via-yellow-100 to-rose-100 text-slate-900 border-amber-300 font-black',
    accentColor: '#f97316',
    shape: 'circle',
    ornament: 'crown',
  },

  // Admin 3: 데이터 관리자 (Green -> Cyan -> Blue)
  badge_admin_data: {
    id: 'badge_admin_data',
    name: '데이터 플로우 레인보우',
    badgeTitle: '데이터 관리자',
    icon: '📊',
    description: '전사 수강생의 진도율 및 학습 분석 통계 빅데이터를 총괄 분석하는 Data Stream 프레임',
    isAdminOnly: true,
    rarity: 'SPECIAL',
    tierName: 'ADMIN SPECIAL',
    frameClass: 'avatar-frame-admin-data',
    badgeClass: 'bg-gradient-to-r from-emerald-100 via-cyan-100 to-blue-100 text-slate-900 border-cyan-300 font-black',
    accentColor: '#06b6d4',
    shape: 'circle',
    ornament: 'none',
  },

  // Admin 4: 보안 관리자 (Blue -> Cyan -> Purple Neon) + Crest
  badge_admin_security: {
    id: 'badge_admin_security',
    name: '네온 펄스 시큐리티',
    badgeTitle: '보안 관리자',
    icon: '🔒',
    description: '계정 보안, 접근 제어 및 권한 체계를 감독하는 Neon Pulse 애니메이션 프레임',
    isAdminOnly: true,
    rarity: 'SPECIAL',
    tierName: 'ADMIN SPECIAL',
    frameClass: 'avatar-frame-admin-security',
    badgeClass: 'bg-gradient-to-r from-blue-100 via-cyan-100 to-purple-100 text-slate-900 border-purple-300 font-black',
    accentColor: '#8b5cf6',
    shape: 'shield',
    ornament: 'shield',
  },

  // Admin 5: 서비스 총괄 (Full 360 Spectrum Rainbow Wave) + Crown & Stars
  badge_admin_super: {
    id: 'badge_admin_super',
    name: '스펙트럼 임페리얼 레인보우',
    badgeTitle: '서비스 총괄',
    icon: '🌟',
    description: 'LMS 플랫폼 전권을 총괄하는 서비스 총괄 전용 Full Spectrum 360 무지개 테두리 프레임',
    isAdminOnly: true,
    rarity: 'SPECIAL',
    tierName: 'ADMIN SPECIAL',
    frameClass: 'avatar-frame-admin-super',
    badgeClass: 'bg-gradient-to-r from-red-100 via-yellow-100 via-green-100 via-blue-100 to-purple-100 text-slate-900 border-purple-400 font-black',
    accentColor: '#ec4899',
    shape: 'circle',
    ornament: 'crown',
  },
  badge_admin_rainbow_crest: {
    id: 'badge_admin_rainbow_crest',
    name: '스펙트럼 임페리얼 레인보우',
    badgeTitle: '서비스 총괄',
    icon: '🌟',
    description: 'LMS 플랫폼 전권을 총괄하는 서비스 총괄 전용 Full Spectrum 360 무지개 테두리 프레임',
    isAdminOnly: true,
    rarity: 'SPECIAL',
    tierName: 'ADMIN SPECIAL',
    frameClass: 'avatar-frame-admin-super',
    badgeClass: 'bg-gradient-to-r from-red-100 via-yellow-100 via-green-100 via-blue-100 to-purple-100 text-slate-900 border-purple-400 font-black',
    accentColor: '#ec4899',
    shape: 'circle',
    ornament: 'crown',
  },

  // Admin 6: 수료 인증관 / 학습 관리자 (Purple -> Pink -> Gold Seal)
  badge_admin_cert: {
    id: 'badge_admin_cert',
    name: '오피셜 마스터 시일',
    badgeTitle: '학습 관리자',
    icon: '📜',
    description: '공식 수료증 발급 및 커리큘럼 이수를 관장하는 학습 관리자 프레임',
    isAdminOnly: true,
    rarity: 'SPECIAL',
    tierName: 'ADMIN SPECIAL',
    frameClass: 'avatar-frame-admin-cert',
    badgeClass: 'bg-gradient-to-r from-purple-100 via-rose-100 to-amber-100 text-slate-900 border-amber-300 font-black',
    accentColor: '#8b5cf6',
    shape: 'circle',
    ornament: 'shield',
  },

  // Admin 7: 커뮤니티 관리자 (Pink -> Rose -> Violet -> Cyan Pulse)
  badge_admin_community: {
    id: 'badge_admin_community',
    name: '커뮤니티 가디언 펄스',
    badgeTitle: '커뮤니티 관리자',
    icon: '💬',
    description: '수강평, 댓글, 질문 및 커뮤니티 건전성을 감독하는 커뮤니티 관리자 프레임',
    isAdminOnly: true,
    rarity: 'SPECIAL',
    tierName: 'ADMIN SPECIAL',
    frameClass: 'avatar-frame-admin-community',
    badgeClass: 'bg-gradient-to-r from-pink-100 via-rose-100 to-indigo-100 text-slate-900 border-pink-300 font-black',
    accentColor: '#ec4899',
    shape: 'circle',
    ornament: 'none',
  },
};

/**
 * Returns the decoration object for a given achievementId or custom frame ID.
 * Resolves both static badge decorations and dynamic custom frames.
 * Role-gated: non-admins cannot access admin badges or custom frames.
 */
export function getProfileDecoration(
  achievementId?: string | null,
  userRole?: string,
  customFrames?: CustomFrameConfig[]
): ProfileDecoration | null {
  if (achievementId === 'none') {
    return null;
  }

  const targetId = achievementId || getDefaultFrameForRole(userRole);
  if (!targetId || targetId === 'none') return null;

  const isAdmin = isAdminRole(userRole);

  // Check if it is a custom frame
  if (targetId.startsWith('custom_frame_')) {
    if (!isAdmin) return null;
    const frameId = targetId.replace('custom_frame_', '');
    let configs = customFrames;
    if (!configs || configs.length === 0) {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('tdsnt_custom_frames_v2') : null;
        if (raw) configs = JSON.parse(raw);
      } catch {}
    }
    const foundConfig = configs?.find((f) => f.id === frameId || f.id === targetId);
    if (!foundConfig) return null;

    return {
      id: targetId,
      name: foundConfig.name || '커스텀 관리자 프레임',
      badgeTitle: foundConfig.name || '커스텀 프레임',
      icon: '🎨',
      description: `관리자가 직접 제작한 커스텀 프레임 (${foundConfig.animationType})`,
      isAdminOnly: true,
      rarity: 'SPECIAL',
      tierName: 'CUSTOM ADMIN',
      frameClass: 'avatar-frame-custom',
      badgeClass: 'bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 text-slate-900 border-indigo-300 font-black',
      accentColor: foundConfig.colors[0] || '#6366f1',
      shape: 'circle',
      ornament: foundConfig.sparkleEnabled ? 'stars' : 'none',
      customConfig: foundConfig,
    };
  }

  const dec = PROFILE_DECORATIONS[targetId];
  if (!dec) return null;

  if (dec.isAdminOnly && !isAdmin) {
    return null;
  }

  return dec;
}

/**
 * Helper to generate inline CSS gradient strings based on CustomFrameConfig
 */
export function buildCustomGradientCss(config: CustomFrameConfig): string {
  const colors = config.colors.length >= 2 ? config.colors : ['#6366f1', '#a855f7'];
  const colorStr = [...colors, colors[0]].join(', ');

  switch (config.gradientType) {
    case 'conic':
      return `conic-gradient(from 0deg, ${colorStr})`;
    case 'radial':
      return `radial-gradient(circle, ${colors.join(', ')})`;
    case 'linear':
    default: {
      let angle = '90deg';
      switch (config.gradientDirection) {
        case 'horizontal':
          angle = '90deg';
          break;
        case 'reverse_horizontal':
          angle = '270deg';
          break;
        case 'vertical':
          angle = '180deg';
          break;
        case 'reverse_vertical':
          angle = '0deg';
          break;
        case 'diagonal':
          angle = '135deg';
          break;
        case 'reverse_diagonal':
          angle = '315deg';
          break;
        default:
          angle = '90deg';
      }
      return `linear-gradient(${angle}, ${colorStr})`;
    }
  }
}
