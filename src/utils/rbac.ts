import { UserRole, AdminRoleTag } from '../types';

export const ADMIN_ROLE_TAGS: AdminRoleTag[] = [
  'SERVICE_OWNER',
  'SECURITY_MANAGER',
  'CONTENT_MANAGER',
  'LEARNING_MANAGER',
  'COMMUNITY_MANAGER',
  'USER_MANAGER',
  'OPERATIONS_MANAGER',
];

export type PermissionKey =
  | 'MANAGE_ADMIN_TAGS'
  | 'MANAGE_SYSTEM_SETTINGS'
  | 'MANAGE_SECURITY'
  | 'MANAGE_COURSES'
  | 'MANAGE_LESSONS'
  | 'MANAGE_ANNOUNCEMENTS'
  | 'MANAGE_QUESTIONS'
  | 'VIEW_ANALYTICS'
  | 'MANAGE_CERTIFICATES'
  | 'MANAGE_USERS'
  | 'MANAGE_COMMUNITY'
  | 'DIAGNOSTICS'
  | 'VIEW_DASHBOARD';

export interface RoleMetadata {
  tag: AdminRoleTag;
  label: string;
  shortLabel: string;
  icon: string; // Emoji / symbol for simple use
  lucideIconName: string;
  badgeClass: string;
  borderClass: string;
  textClass: string;
  description: string;
  responsibilities: string[];
  frameId: string;
  permissions: PermissionKey[];
}

export const ROLE_METADATA_MAP: Record<AdminRoleTag, RoleMetadata> = {
  SERVICE_OWNER: {
    tag: 'SERVICE_OWNER',
    label: '서비스 총괄',
    shortLabel: '서비스 총괄',
    icon: '✦',
    lucideIconName: 'Sparkles',
    badgeClass: 'bg-gradient-to-r from-amber-50 via-rose-50 to-purple-50 text-slate-900 border border-amber-300 shadow-2xs font-black',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-800',
    description: 'LMS 플랫폼 전권 총괄 및 관리자 직책(TAG) 임명/변경 권한 보유',
    responsibilities: [
      '전체 관리자 시스템 관리',
      '관리자 TAG 변경 (전속 권한)',
      '관리자 권한 관리',
      '관리자 역할 부여/회수',
      '전체 시스템 환경설정 관리',
    ],
    frameId: 'badge_admin_super',
    permissions: [
      'MANAGE_ADMIN_TAGS',
      'MANAGE_SYSTEM_SETTINGS',
      'MANAGE_SECURITY',
      'MANAGE_COURSES',
      'MANAGE_LESSONS',
      'MANAGE_ANNOUNCEMENTS',
      'MANAGE_QUESTIONS',
      'VIEW_ANALYTICS',
      'MANAGE_CERTIFICATES',
      'MANAGE_USERS',
      'MANAGE_COMMUNITY',
      'DIAGNOSTICS',
      'VIEW_DASHBOARD',
    ],
  },
  SECURITY_MANAGER: {
    tag: 'SECURITY_MANAGER',
    label: '보안 관리자',
    shortLabel: '보안 관리자',
    icon: '🛡️',
    lucideIconName: 'Shield',
    badgeClass: 'bg-blue-50 text-blue-800 border border-blue-200/90 shadow-2xs font-black',
    borderClass: 'border-blue-300',
    textClass: 'text-blue-800',
    description: '계정 보안, 접근 제어, 신고/부적절 콘텐츠 점검 및 보안 설정',
    responsibilities: [
      '사용자 계정 보안 및 접근 제어',
      '신고 및 악성 콘텐츠 처리',
      '권한 이상 및 세션 이상 여부 확인',
      '보안 관련 시스템 설정 감사',
    ],
    frameId: 'badge_admin_security',
    permissions: [
      'MANAGE_SECURITY',
      'MANAGE_USERS',
      'MANAGE_COMMUNITY',
      'DIAGNOSTICS',
      'VIEW_DASHBOARD',
    ],
  },
  CONTENT_MANAGER: {
    tag: 'CONTENT_MANAGER',
    label: '콘텐츠 관리자',
    shortLabel: '콘텐츠 관리자',
    icon: '📁',
    lucideIconName: 'FolderKanban',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs font-black',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-800',
    description: '강의 콘텐츠, 영상, 학습 교안 자료 및 공지사항 관리',
    responsibilities: [
      '강의 콘텐츠 및 챕터/레슨 관리',
      '영상 업로드 및 플레이어 자료 관리',
      '콘텐츠 검수 및 공개 상태 제어',
      '강의별 주요 공지사항 관리',
    ],
    frameId: 'badge_admin_ops',
    permissions: [
      'MANAGE_COURSES',
      'MANAGE_LESSONS',
      'MANAGE_ANNOUNCEMENTS',
      'VIEW_DASHBOARD',
    ],
  },
  LEARNING_MANAGER: {
    tag: 'LEARNING_MANAGER',
    label: '학습 관리자',
    shortLabel: '학습 관리자',
    icon: '📖',
    lucideIconName: 'BookOpen',
    badgeClass: 'bg-purple-50 text-purple-800 border border-purple-200/90 shadow-2xs font-black',
    borderClass: 'border-purple-300',
    textClass: 'text-purple-800',
    description: '강의 커리큘럼, 학습 진행, 평가 퀴즈 및 공식 수료증 발급 검증',
    responsibilities: [
      '학습 과정 및 커리큘럼 관리',
      '수강생 진도율 및 학습 데이터 관리',
      '평가 문제 및 퀴즈 출제/검증',
      '공식 수료증 발급 및 진위 확인',
    ],
    frameId: 'badge_admin_cert',
    permissions: [
      'MANAGE_COURSES',
      'MANAGE_QUESTIONS',
      'VIEW_ANALYTICS',
      'MANAGE_CERTIFICATES',
      'VIEW_DASHBOARD',
    ],
  },
  COMMUNITY_MANAGER: {
    tag: 'COMMUNITY_MANAGER',
    label: '커뮤니티 관리자',
    shortLabel: '커뮤니티 관리자',
    icon: '💬',
    lucideIconName: 'MessageSquare',
    badgeClass: 'bg-pink-50 text-pink-800 border border-pink-200/90 shadow-2xs font-black',
    borderClass: 'border-pink-300',
    textClass: 'text-pink-800',
    description: '댓글, 수강평, 학습 질문(Q&A) 및 커뮤니티 부적절 게시물 정화',
    responsibilities: [
      '수강평 및 댓글 모니터링',
      '학습 Q&A 질문 및 답변 관리',
      '커뮤니티 신고 접수 및 신속 처리',
      '부적절 게시물 블라인드/삭제',
    ],
    frameId: 'badge_admin_community',
    permissions: [
      'MANAGE_COMMUNITY',
      'VIEW_DASHBOARD',
    ],
  },
  USER_MANAGER: {
    tag: 'USER_MANAGER',
    label: '사용자 관리자',
    shortLabel: '사용자 관리자',
    icon: '👤',
    lucideIconName: 'Users',
    badgeClass: 'bg-cyan-50 text-cyan-800 border border-cyan-200/90 shadow-2xs font-black',
    borderClass: 'border-cyan-300',
    textClass: 'text-cyan-800',
    description: '수강생 정보 관리, 계정 상태(활성/정지) 제어 및 수강생 문의 지원',
    responsibilities: [
      '수강생 회원 정보 조회 및 수정',
      '계정 상태(정상/정지) 관리',
      '사용자 권한 상태 점검',
      '회원 관련 문의 접수 및 지원',
    ],
    frameId: 'badge_admin_system',
    permissions: [
      'MANAGE_USERS',
      'VIEW_DASHBOARD',
    ],
  },
  OPERATIONS_MANAGER: {
    tag: 'OPERATIONS_MANAGER',
    label: '운영 관리자',
    shortLabel: '운영 관리자',
    icon: '⚙️',
    lucideIconName: 'Activity',
    badgeClass: 'bg-indigo-50 text-indigo-800 border border-indigo-200/90 shadow-2xs font-black',
    borderClass: 'border-indigo-300',
    textClass: 'text-indigo-800',
    description: '서비스 운영 지표, 시스템 상태 진단 및 전사 공지 운영',
    responsibilities: [
      '서비스 운영 및 플랫폼 지표 모니터링',
      'DB 무결성 및 시스템 상태 점검',
      '전사 상단 배너 공지 관리',
      '일반 운영 및 행정 업무 지원',
    ],
    frameId: 'badge_admin_ops',
    permissions: [
      'VIEW_ANALYTICS',
      'MANAGE_ANNOUNCEMENTS',
      'DIAGNOSTICS',
      'VIEW_DASHBOARD',
    ],
  },
};

/**
 * Check if the given role is an administrator role (either new tag or legacy).
 */
export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  return (
    role === 'SERVICE_OWNER' ||
    role === 'SECURITY_MANAGER' ||
    role === 'CONTENT_MANAGER' ||
    role === 'LEARNING_MANAGER' ||
    role === 'COMMUNITY_MANAGER' ||
    role === 'USER_MANAGER' ||
    role === 'OPERATIONS_MANAGER' ||
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN'
  );
}

/**
 * Check if the user is a top-level Service Owner (서비스 총괄).
 */
export function isServiceOwner(role?: string | null): boolean {
  if (!role) return false;
  return role === 'SERVICE_OWNER' || role === 'SUPER_ADMIN';
}

/**
 * Get the standardized role metadata.
 */
export function getRoleMetadata(role?: string | null): RoleMetadata | null {
  if (!role) return null;
  if (role === 'SUPER_ADMIN') return ROLE_METADATA_MAP.SERVICE_OWNER;
  if (role === 'ADMIN') return ROLE_METADATA_MAP.OPERATIONS_MANAGER;
  if (ADMIN_ROLE_TAGS.includes(role as AdminRoleTag)) {
    return ROLE_METADATA_MAP[role as AdminRoleTag];
  }
  return null;
}

/**
 * Returns human-readable Korean label for any role.
 */
export function getRoleLabel(role?: string | null): string {
  if (!role || role === 'USER') return '수강생';
  const meta = getRoleMetadata(role);
  if (meta) return meta.label;
  return '수강생';
}

/**
 * Check if a role has permission for a specific feature.
 */
export function hasPermission(role: string | null | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  if (isServiceOwner(role)) return true;
  const meta = getRoleMetadata(role);
  if (!meta) return false;
  return meta.permissions.includes(permission);
}

/**
 * Check if the actor can modify the target user's Admin TAG.
 * Strict rules:
 * 1. Actor must be SERVICE_OWNER.
 * 2. Cannot modify own TAG (even SERVICE_OWNER cannot change their own tag to prevent lockout).
 */
export function canChangeAdminTag(
  actorRole?: string | null,
  actorId?: string,
  targetId?: string
): { allowed: boolean; reason?: string } {
  if (!isServiceOwner(actorRole)) {
    return {
      allowed: false,
      reason: '관리자 직책을 변경할 권한이 없습니다. (서비스 총괄 전용)',
    };
  }

  if (actorId && targetId && actorId === targetId) {
    return {
      allowed: false,
      reason: '본인의 관리자 직책은 직접 변경할 수 없습니다.',
    };
  }

  return { allowed: true };
}

/**
 * Map each role to its default profile frame ID.
 * General students return null (they only get frames they earned and equipped).
 */
export function getDefaultFrameForRole(role?: string | null): string | null {
  if (!role || role === 'USER') return null;
  const meta = getRoleMetadata(role);
  if (meta) return meta.frameId;
  return null;
}
