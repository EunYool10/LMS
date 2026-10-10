export type AdminRoleTag =
  | 'SERVICE_OWNER'
  | 'SECURITY_MANAGER'
  | 'CONTENT_MANAGER'
  | 'LEARNING_MANAGER'
  | 'COMMUNITY_MANAGER'
  | 'USER_MANAGER'
  | 'OPERATIONS_MANAGER';

export type UserRole = AdminRoleTag | 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED' | 'active' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  status: UserStatus;
  bio?: string;
  phone?: string;
  nickname?: string;
  lastLoginAt?: string;
  totalLearningTimeSeconds?: number;
  emailChangePending?: string;
  equippedAchievementId?: string | null;
  customFrames?: CustomFrameConfig[];
  kakaoId?: string;
  naverId?: string;
  googleId?: string;
  provider?: 'email' | 'kakao' | 'naver' | 'google' | string;
  /** When the user agreed to the terms and the privacy notice (ISO timestamps). */
  agreements?: UserAgreements;
}

export interface UserAgreements {
  terms: string;
  privacy: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  targetUserId?: string;
  targetUserName?: string;
  targetCourseId?: string;
  targetCourseTitle?: string;
  targetAnnouncementId?: string;
  targetAnnouncementTitle?: string;
  action:
    | 'UPDATE_NAME'
    | 'UPDATE_ROLE'
    | 'UPDATE_STATUS'
    | 'DELETE_USER'
    | 'UPDATE_AVATAR'
    | 'PASSWORD_CHANGE'
    | 'COURSE_CREATE'
    | 'COURSE_UPDATE'
    | 'COURSE_DELETE'
    | 'ANNOUNCEMENT_CREATE'
    | 'ANNOUNCEMENT_UPDATE'
    | 'ANNOUNCEMENT_DELETE'
    | 'BULK_UPDATE'
    | 'BULK_DELETE'
    | 'QUESTION_CREATE'
    | 'QUESTION_DELETE'
    | string;
  details: string;
  timestamp: string;
}

export interface Subcategory {
  id: string;
  name: string;
  subfields: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  color: string;
  isHidden?: boolean;
  subcategories?: Subcategory[];
}

export type CourseLevel = '초급' | '중급' | '고급';

export type DurationAccuracyStatus = 'ALL_VERIFIED' | 'PARTIAL_UNVERIFIED' | 'UNVERIFIED';

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  instructorId: string;
  instructorName: string;
  instructorRole?: string;
  instructorAvatar?: string;
  categoryId: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  subfieldName?: string;
  level: CourseLevel;
  price: number;
  isPublished: boolean;
  thumbnail: string;
  durationMinutes: number;
  totalDurationSeconds?: number;
  durationAccuracyStatus?: DurationAccuracyStatus;
  totalLessons: number;
  rating: number;
  reviewsCount: number;
  enrolledCount: number;
  learningObjectives: string[];
  requirements: string[];
  tags?: string[];
  notice?: string; // 관리자/강사 직접 등록 강의 공지사항
  completionThresholdPercent?: number; // 강사 지정 학습 완료 인정 기준 % (기본: 80)
  createdAt: string;
  updatedAt: string;
}

export interface CourseAnnouncement {
  id: string;
  courseId: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
  updatedAt?: string;
  isPinned?: boolean;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  priority?: 'normal' | 'important' | 'urgent';
  createdAt: string;
  updatedAt?: string;
  authorName: string;
  authorRole: UserRole;
}

export interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  order: number;
  description?: string;
}

export type LessonType = 'video' | 'quiz' | 'exam' | 'doc';
export type DurationStatus = 'PENDING' | 'READY' | 'FAILED' | 'UNAVAILABLE';
export type VideoSourceType = 'UPLOAD' | 'YOUTUBE' | 'URL';

export interface VideoMetadata {
  video_id: string;
  file_name: string;
  video_url: string;
  thumbnail_url?: string;
  file_size: number;
  mime_type: string;
  duration_seconds?: number;
  uploaded_at: string;
  uploaded_by?: string;
  status: 'ready' | 'processing' | 'uploading' | 'failed';
}

export interface Lesson {
  id: string;
  sectionId: string;
  courseId: string;
  title: string;
  type: LessonType;
  order: number;
  durationSeconds: number | null;
  durationStatus?: DurationStatus;
  sourceType?: VideoSourceType;
  youtubeVideoId?: string | null;
  durationUpdatedAt?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  videoStatus?: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
  videoOriginalName?: string;
  videoFileSize?: number;
  videoType?: 'file' | 'url' | 'youtube';
  completionThresholdPercent?: number; // default 90%
  sequentialLock?: boolean; // default true
  contentSummary?: string;
  isFreePreview: boolean;
  docContent?: string;
}

export type QuestionType = 'SINGLE' | 'MULTIPLE' | 'OX' | 'SHORT';

export interface Question {
  id: string;
  lessonId: string;
  courseId: string;
  type: QuestionType;
  title: string;
  description?: string;
  options: string[]; // For SINGLE, MULTIPLE, OX (['O', 'X'])
  correctAnswers: string[]; // Stores indices ('0', '1') or text for SHORT
  explanation: string;
  points: number;
  order: number;
}

export interface ExamConfig {
  id: string;
  lessonId: string;
  courseId: string;
  passingScore: number;
  totalPoints: number;
  retakeAllowed: boolean;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  timeLimitMinutes?: number;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  completedAt?: string;
  progressPercentage: number;
  lastLessonId?: string;
  lastPlaybackTimeSeconds?: number;
}

export interface LessonProgress {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  isCompleted: boolean;
  watchedSeconds: number;
  totalSeconds: number;
  uniqueWatchedSeconds?: number;
  uniquePercent?: number;
  lastPositionSeconds?: number;
  completedAt?: string;
  lastWatchedAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  score: number;
  maxScore: number;
  passed: boolean;
  answers: Record<string, string[]>; // questionId -> array of selected answers or text
  submittedAt: string;
  attemptedAt?: string;
  attemptNumber: number;
}

export interface StudentNote {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  timestampSeconds: number;
  content: string;
  createdAt: string;
}

export interface SystemSettings {
  platformName: string;
  platformDescription: string;
  allowRegistration: boolean;
  defaultUserRole: UserRole;
  maintenanceMode: boolean;
  videoUploadLimitMB: number;
  contactEmail: string;
  announcement?: string;
  showAnnouncement?: boolean;
  announcementUpdatedAt?: string;
  termsUrl?: string;
  privacyUrl?: string;
  kakaoClientId?: string;
  kakaoClientSecret?: string;
  kakaoRedirectUri?: string;
  kakaoLoginEnabled?: boolean;
  naverClientId?: string;
  naverClientSecret?: string;
  naverRedirectUri?: string;
  naverLoginEnabled?: boolean;
  googleLoginEnabled?: boolean;
  googleClientId?: string;
  /** Set when an admin wipes all enrollments/progress; clients clear their local caches once. */
  learningDataResetAt?: string;
  /** Which events are posted to the Discord webhook (the URL itself is a server env var). Missing means on. */
  discordNotify?: {
    enrollment?: boolean;
    completion?: boolean;
    inquiry?: boolean;
    security?: boolean;
  };
  /** Admin-edited policy text. Missing or null means the built-in default text is used. */
  policies?: {
    terms?: PolicyOverride | null;
    privacy?: PolicyOverride | null;
  };
}

export interface PolicyOverride {
  effectiveDate: string;
  overview: string;
  /** Plain text: lines starting with "## " are article headings, every other non-empty line is a paragraph. */
  body: string;
  updatedAt: string;
  updatedByName?: string;
}

export type InquiryCategory = 'learning' | 'account' | 'certificate' | 'bug' | 'other';
export type InquiryStatus = 'open' | 'answered';

export interface Inquiry {
  id: string;
  category: InquiryCategory;
  title: string;
  content: string;
  status: InquiryStatus;
  /** Missing for inquiries sent from the sign-in page by someone who is not logged in. */
  userId?: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  answer?: string;
  answeredAt?: string;
  answeredById?: string;
  answeredByName?: string;
  /** Set when the author opened the latest answer. */
  answerSeenAt?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

export interface WishlistItem {
  id: string;
  userId: string;
  courseId: string;
  createdAt: string;
}

export interface LessonBookmark {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  timestampSeconds: number;
  title: string;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'course' | 'quiz' | 'notice' | 'system';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface CourseReview {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: UserRole | string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserLearningGoal {
  userId: string;
  weeklyTargetHours: number;
  targetHoursWeekly?: number;
  completedHoursThisWeek?: number;
  updatedAt: string;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category?: 'completion' | 'time' | 'streak' | 'quiz' | 'mastery' | 'admin';
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'admin';
  rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'SPECIAL';
  isAdminOnly?: boolean;
  requiredRole?: UserRole[];
  requiredCount?: number;
  currentCount?: number;
  progressPercent?: number;
  unlocked?: boolean;
  earned: boolean;
  earnedAt?: string;
  badgeType?: 'PASSIONATE' | 'MASTER' | 'STARTER' | 'EXPLORER' | 'GRAND_MASTER' | 'CUSTOM' | 'ADMIN';
  conditionText?: string;
  unit?: string;
}

export type GradientDirectionType =
  | 'horizontal'
  | 'reverse_horizontal'
  | 'vertical'
  | 'reverse_vertical'
  | 'diagonal'
  | 'reverse_diagonal'
  | 'radial'
  | 'conic';

export type FrameAnimationType =
  | 'none'
  | 'gradient_flow'
  | 'rainbow_wave'
  | 'neon_pulse'
  | 'glow_pulse'
  | 'shine'
  | 'border_flow'
  | 'rotate'
  | 'sparkle';

export interface CustomFrameConfig {
  id: string;
  name: string;
  colors: string[]; // 2 to 8 colors (e.g. ['#FF3B81', '#6C5CE7', '#00D4FF'])
  gradientType: 'linear' | 'radial' | 'conic';
  gradientDirection: GradientDirectionType;
  animationType: FrameAnimationType;
  animationDuration: number; // in seconds (e.g. 0.5 to 10)
  colorChangeInterval: number; // in seconds
  blinkCount: number; // 0, 1, 2, 3, 5, 10
  blinkIntensity: 'low' | 'medium' | 'high';
  glowIntensity: number; // 0 to 100 (%)
  borderWidth: number; // 1 to 8 (px)
  sparkleEnabled: boolean;
  sparkleDensity: 'low' | 'medium' | 'high';
  sparkleSpeed: 'slow' | 'normal' | 'fast';
  sparkleColor?: string;
  sparkleSize?: 'small' | 'medium' | 'large';
  createdAt: string;
  updatedAt?: string;
}

