import {
  User,
  UserAgreements,
  UserStatus,
  UserRole,
  AuditLog,
  Category,
  Course,
  CourseSection,
  Lesson,
  Question,
  ExamConfig,
  Enrollment,
  LessonProgress,
  QuizAttempt,
  StudentNote,
  SystemSettings,
  WishlistItem,
  LessonBookmark,
  SystemNotification,
  CourseReview,
  UserLearningGoal,
  AchievementBadge,
  CustomFrameConfig,
  CourseAnnouncement,
  SystemAnnouncement,
} from '../types';

import { progressApi } from './progressApi';
import { firestoreService } from './firebase';
import { calculateCourseStats, extractYouTubeVideoId } from '../utils/duration';
import { CATEGORIES_DATA, LEGACY_CATEGORY_MAP, getCategoryById } from '../data/categoriesData';
import { isAdminRole, isServiceOwner } from '../utils/rbac';
import { notifyDiscord } from './discordNotify';

/** Audit actions that are also posted to the operators' Discord channel as security notices. */
const DISCORD_ADMIN_ACTIONS = new Set(['UPDATE_ROLE', 'UPDATE_STATUS', 'DELETE_USER', 'COURSE_DELETE', 'BULK_DELETE', 'LEARNING_DATA_RESET']);

const STORAGE_KEYS = {
  USERS: 'tdsnt_users_v2',
  CATEGORIES: 'tdsnt_categories_v2',
  COURSES: 'tdsnt_courses_v2',
  SECTIONS: 'tdsnt_sections_v2',
  LESSONS: 'tdsnt_lessons_v2',
  QUESTIONS: 'tdsnt_questions_v2',
  EXAM_CONFIGS: 'tdsnt_exam_configs_v2',
  ENROLLMENTS: 'tdsnt_enrollments_v2',
  PROGRESS: 'tdsnt_progress_v2',
  QUIZ_ATTEMPTS: 'tdsnt_quiz_attempts_v2',
  NOTES: 'tdsnt_notes_v2',
  SETTINGS: 'tdsnt_settings_v2',
  CURRENT_USER: 'tdsnt_current_user_v2',
  WISHLIST: 'tdsnt_wishlist_v2',
  BOOKMARKS: 'tdsnt_bookmarks_v2',
  NOTIFICATIONS: 'tdsnt_notifications_v2',
  REVIEWS: 'tdsnt_reviews_v2',
  SEARCH_HISTORY: 'tdsnt_search_history_v2',
  GOALS: 'tdsnt_goals_v2',
  AUDIT_LOGS: 'tdsnt_audit_logs_v2',
  COURSE_ANNOUNCEMENTS: 'tdsnt_course_announcements_v2',
  SYSTEM_ANNOUNCEMENTS: 'tdsnt_system_announcements_v2',
  BADGE_NAME_OVERRIDES: 'tdsnt_badge_name_overrides_v2',
  CUSTOM_FRAMES: 'tdsnt_custom_frames_v2',
  DELETED_COURSE_IDS: 'tdsnt_deleted_course_ids_v2',
};

// Default platform categories taxonomy (10 standard job-oriented categories)
const DEFAULT_CATEGORIES: Category[] = CATEGORIES_DATA;

// Default System Settings
const DEFAULT_SETTINGS: SystemSettings = {
  platformName: 'TDSNTLMS',
  platformDescription: 'TDSNTLMS 온라인 강의 및 학습 관리 플랫폼',
  allowRegistration: true,
  defaultUserRole: 'USER',
  maintenanceMode: false,
  videoUploadLimitMB: 500,
  contactEmail: 'teamdevstudiont@gmail.com',
  announcement: '2026년 TDSN LMS 아카데미 온라인 실무 역량 강화 교육과정이 공식 오픈되었습니다.',
  showAnnouncement: true,
  termsUrl: 'https://radial-fountain-d32.notion.site/TDSNTLMS-3ceb14babbb28029a472c28df462e57e',
  privacyUrl: 'https://radial-fountain-d32.notion.site/TDSNTLMS-3ceb14babbb280748ae9f28349550219',
  kakaoLoginEnabled: true,
  kakaoClientId: '',
  kakaoClientSecret: '',
  kakaoRedirectUri: '',
  naverLoginEnabled: true,
  naverClientId: '',
  naverClientSecret: '',
  naverRedirectUri: '',
  googleLoginEnabled: true,
  googleClientId: '',
};

export class TDSNTLMSStorage {
  private memoryFallback: Map<string, string> = new Map();

  private sanitizeForStorage<T>(val: T): T {
    if (!val) return val;

    try {
      // If it's an array of lessons or contains lessons, clean oversized data URIs
      if (Array.isArray(val)) {
        return val.map((item) => {
          if (item && typeof item === 'object') {
            const copy = { ...item };
            if (typeof copy.videoUrl === 'string' && copy.videoUrl.startsWith('data:') && copy.videoUrl.length > 500) {
              copy.videoUrl = '';
            }
            if (typeof copy.videoThumbnail === 'string' && copy.videoThumbnail.startsWith('data:') && copy.videoThumbnail.length > 1000) {
              delete copy.videoThumbnail;
            }
            return copy;
          }
          return item;
        }) as unknown as T;
      }

      if (typeof val === 'object') {
        const copy: any = { ...val };
        if (typeof copy.videoUrl === 'string' && copy.videoUrl.startsWith('data:') && copy.videoUrl.length > 500) {
          copy.videoUrl = '';
        }
        if (typeof copy.videoThumbnail === 'string' && copy.videoThumbnail.startsWith('data:') && copy.videoThumbnail.length > 1000) {
          delete copy.videoThumbnail;
        }
        return copy as T;
      }
    } catch {
      return val;
    }

    return val;
  }

  private get<T>(key: string, defaultVal: T): T {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data) as T;
      }
    } catch {
      // Ignore localStorage read errors and check memory fallback
    }

    if (this.memoryFallback.has(key)) {
      try {
        return JSON.parse(this.memoryFallback.get(key)!) as T;
      } catch {
        return defaultVal;
      }
    }

    return defaultVal;
  }

  private set<T>(key: string, val: T): void {
    const sanitized = this.sanitizeForStorage(val);
    const jsonStr = JSON.stringify(sanitized);

    try {
      localStorage.setItem(key, jsonStr);
      // Synchronize in-memory fallback
      this.memoryFallback.set(key, jsonStr);
    } catch (e: any) {
      console.warn(`[TDSNTLMS Storage] Quota or write limit reached for key '${key}'. Activating quota mitigation...`, e?.message);
      
      // Keep in memory fallback so application state never breaks
      this.memoryFallback.set(key, jsonStr);

      try {
        // Purge non-essential caches
        const purgeKeys = [
          'tdsnt_search_history_v2',
          'tdsnt_notifications_v2',
          'tdsnt_bookmarks_v2',
        ];
        purgeKeys.forEach((k) => {
          if (k !== key) {
            try { localStorage.removeItem(k); } catch {}
          }
        });

        // Scrub all existing lessons in localStorage of any oversized strings
        const rawLessons = localStorage.getItem(STORAGE_KEYS.LESSONS);
        if (rawLessons && rawLessons.includes('data:')) {
          try {
            const parsed = JSON.parse(rawLessons);
            const cleaned = this.sanitizeForStorage(parsed);
            localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(cleaned));
          } catch {}
        }

        // Retry writing key
        localStorage.setItem(key, jsonStr);
      } catch (retryErr) {
        console.warn(`[TDSNTLMS Storage] Saved to resilient memory session for key '${key}'.`);
      }
    }
  }

  public initialize(): void {
    // Purge old legacy test keys
    const oldKeys = [
      'eduverse_users_v1',
      'eduverse_courses_v1',
      'eduverse_sections_v1',
      'eduverse_lessons_v1',
      'eduverse_questions_v1',
      'eduverse_exam_configs_v1',
      'eduverse_enrollments_v1',
      'eduverse_progress_v1',
      'eduverse_quiz_attempts_v1',
      'eduverse_current_user_v1',
      'eduverse_users_v2',
      'eduverse_courses_v2',
      'eduverse_sections_v2',
      'eduverse_lessons_v2',
      'eduverse_questions_v2',
      'eduverse_exam_configs_v2',
      'eduverse_enrollments_v2',
      'eduverse_progress_v2',
      'eduverse_quiz_attempts_v2',
      'eduverse_notes_v2',
      'eduverse_settings_v2',
      'eduverse_current_user_v2',
      'eduverse_categories_v2',
    ];
    oldKeys.forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
    });

    // Sanitize any existing lessons in localStorage on initial startup to release quota
    try {
      const rawLessons = localStorage.getItem(STORAGE_KEYS.LESSONS);
      if (rawLessons && (rawLessons.includes('data:video') || rawLessons.length > 500000)) {
        const parsed = JSON.parse(rawLessons);
        const sanitized = this.sanitizeForStorage(parsed);
        localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(sanitized));
      }
    } catch {}

    // Initialize & migrate categories taxonomy
    const storedCategories = this.get<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    const needsCategoryMigration =
      storedCategories.length < DEFAULT_CATEGORIES.length ||
      storedCategories.some((c) => c.id.startsWith('cat_') || !c.subcategories) ||
      !storedCategories.some((c) => c.id === 'company-academy' || c.id === 'video-media');

    if (needsCategoryMigration) {
      this.set(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    } else {
      try {
        const savedSettings = this.get<SystemSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        let updated = false;
        if (!savedSettings.contactEmail || savedSettings.contactEmail.includes('support@tdsnt')) {
          savedSettings.contactEmail = 'teamdevstudiont@gmail.com';
          updated = true;
        }
        if (!savedSettings.termsUrl || savedSettings.termsUrl.length < 5) {
          savedSettings.termsUrl = DEFAULT_SETTINGS.termsUrl;
          updated = true;
        }
        if (!savedSettings.privacyUrl || savedSettings.privacyUrl.length < 5) {
          savedSettings.privacyUrl = DEFAULT_SETTINGS.privacyUrl;
          updated = true;
        }
        if (updated) {
          this.set(STORAGE_KEYS.SETTINGS, savedSettings);
        }
      } catch {}
    }
    
    // Seed initial users with the 3 authorized admin accounts with verified SUPER_ADMIN (총괄) role
    const initialAdmins: User[] = [
      {
        id: 'TDSNTLMS',
        name: 'TDSNTLMS',
        email: 'teamdevstudiont@gmail.com',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        avatar: '/images/tdsntlms_profile.png',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'admin_EunYool',
        name: '은율',
        email: 'eunyool100208@gmail.com',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'admin_ayun24song',
        name: '윤아',
        email: 'ayun24song@gmail.com',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        avatar: '/송윤아.png',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    let currentUsers = this.get<User[]>(STORAGE_KEYS.USERS, []);
    // Remove any accidental duplicate yun24song account created previously
    currentUsers = currentUsers.filter(
      (u) => u.email?.toLowerCase() !== 'yun24song@gmail.com' && u.id !== 'admin_yun24song'
    );

    // Purge any legacy unsplash/dummy avatars from existing users & migrate ids
    currentUsers.forEach((u) => {
      if (u.avatar && (u.avatar.includes('unsplash.com') || u.avatar.includes('placeholder') || u.avatar.includes('yuna_profile_'))) {
        delete u.avatar;
      }
      if (u.status === 'active') u.status = 'ACTIVE';
      if (u.status === 'suspended') u.status = 'SUSPENDED';

      if (u.email.toLowerCase() === 'teamdevstudiont@gmail.com' || u.id === 'admin_teamdevstudiont' || u.id === 'TDSNTLMS' || u.name === 'TDSNTLMS') {
        u.id = 'TDSNTLMS';
        u.name = 'TDSNTLMS';
        u.avatar = '/images/tdsntlms_profile.png';
        if (!u.role || u.role === 'USER') u.role = 'SUPER_ADMIN';
      }
      if (u.email.toLowerCase() === 'deer123424@gmail.com' || u.email.toLowerCase() === 'eunyool100208@gmail.com' || u.id === 'admin_EunYool') {
        u.id = 'admin_EunYool';
        u.email = 'eunyool100208@gmail.com';
        if (!u.name || u.name.includes('Deer') || u.name.includes('총괄관리자')) {
          u.name = '은율';
        }
        if (!u.role || u.role === 'USER') u.role = 'SUPER_ADMIN';
      }
      if (u.email.toLowerCase() === 'ayun24song@gmail.com' || u.id === 'admin_ayun24song') {
        u.id = 'admin_ayun24song';
        u.name = '윤아';
        if (!u.avatar || u.avatar.includes('yuna_profile')) {
          u.avatar = '/송윤아.png';
        }
        if (!u.role || u.role === 'USER') u.role = 'SUPER_ADMIN';
      }
    });

    initialAdmins.forEach((admin) => {
      const idx = currentUsers.findIndex((u) => u.email.toLowerCase() === admin.email.toLowerCase());
      if (idx === -1) {
        currentUsers.push(admin);
        firestoreService.saveUser(admin).catch(() => {});
      } else {
        // Enforce ID, ensure default name/avatar only if not customized
        currentUsers[idx].id = admin.id;
        // Strictly restore admin role if corrupted to USER or empty
        if (!currentUsers[idx].role || currentUsers[idx].role === 'USER') {
          currentUsers[idx].role = admin.role;
        }
        if (!currentUsers[idx].name) {
          currentUsers[idx].name = admin.name;
        }
        if (!currentUsers[idx].avatar && admin.avatar) {
          currentUsers[idx].avatar = admin.avatar;
        } else if (currentUsers[idx].avatar && (currentUsers[idx].avatar?.includes('unsplash.com') || currentUsers[idx].avatar?.includes('placeholder'))) {
          delete currentUsers[idx].avatar;
        }
      }
    });
    this.set(STORAGE_KEYS.USERS, currentUsers);

    // Also sanitize current user in storage without destroying user-edited names or avatars
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      if (currentUser.avatar && (currentUser.avatar.includes('unsplash.com') || currentUser.avatar.includes('placeholder') || currentUser.avatar.includes('yuna_profile_'))) {
        delete currentUser.avatar;
      }
      if (currentUser.email?.toLowerCase() === 'teamdevstudiont@gmail.com' || currentUser.id === 'admin_teamdevstudiont' || currentUser.id === 'TDSNTLMS') {
        currentUser.id = 'TDSNTLMS';
        if (!currentUser.name) currentUser.name = 'TDSNTLMS';
        if (!currentUser.avatar) currentUser.avatar = '/images/tdsntlms_profile.png';
        if (!currentUser.role || currentUser.role === 'USER') currentUser.role = 'SUPER_ADMIN';
      }
      if (currentUser.email?.toLowerCase() === 'deer123424@gmail.com' || currentUser.email?.toLowerCase() === 'eunyool100208@gmail.com' || currentUser.id === 'admin_EunYool') {
        currentUser.id = 'admin_EunYool';
        currentUser.email = 'eunyool100208@gmail.com';
        if (!currentUser.name) currentUser.name = '은율';
        if (!currentUser.role || currentUser.role === 'USER') currentUser.role = 'SUPER_ADMIN';
      }
      if (currentUser.email?.toLowerCase() === 'ayun24song@gmail.com' || currentUser.id === 'admin_ayun24song') {
        currentUser.id = 'admin_ayun24song';
        if (!currentUser.name) currentUser.name = '윤아';
        if (!currentUser.avatar) currentUser.avatar = '/송윤아.png';
        if (!currentUser.role || currentUser.role === 'USER') currentUser.role = 'SUPER_ADMIN';
      }
      this.setCurrentUser(currentUser);
    }

    // Asynchronously synchronize users and records with Firestore in the background
    if (typeof window !== 'undefined') {
      this.syncFromFirestore().catch(() => {});
      this.setupFirestoreListeners();
    }
    // Initialize courses, sections, lessons, questions with pure real data only (no dummy/mock data)
    const mockCourseIds = [
      "crs_acad_onboarding",
      "crs_acad_mandatory",
      "crs_comp_business",
      "crs_ai_work",
      "crs_vid_premiere",
      "crs_job_bizwriting",
      "crs_ai_chatgpt",
      "crs_dev_frontend",
      "crs_ts_mastery",
    ];

    const currentCourses = this.get<Course[]>(STORAGE_KEYS.COURSES, []);
    const filteredCourses = currentCourses.filter((c) => !mockCourseIds.includes(c.id));
    if (filteredCourses.length !== currentCourses.length) {
      this.set(STORAGE_KEYS.COURSES, filteredCourses);
    } else if (!localStorage.getItem(STORAGE_KEYS.COURSES)) {
      this.set(STORAGE_KEYS.COURSES, []);
    }

    const currentSections = this.get<CourseSection[]>(STORAGE_KEYS.SECTIONS, []);
    const filteredSections = currentSections.filter((s) => !mockCourseIds.includes(s.courseId));
    if (filteredSections.length !== currentSections.length) {
      this.set(STORAGE_KEYS.SECTIONS, filteredSections);
    } else if (!localStorage.getItem(STORAGE_KEYS.SECTIONS)) {
      this.set(STORAGE_KEYS.SECTIONS, []);
    }

    const currentLessons = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, []);
    const filteredLessons = currentLessons.filter((l) => !mockCourseIds.includes(l.courseId));
    let lessonsModified = filteredLessons.length !== currentLessons.length;

    filteredLessons.forEach((les) => {
      if (les.type === "video") {
        if (!les.sourceType) {
          les.sourceType = les.videoUrl?.includes("youtube") || les.videoUrl?.includes("youtu.be")
            ? "YOUTUBE"
            : les.videoUrl?.includes("/api/videos/stream") || les.videoUrl?.includes("firebasestorage.googleapis.com")
            ? "UPLOAD"
            : "URL";
        }
        if (les.sourceType === "YOUTUBE" && !les.youtubeVideoId) {
          les.youtubeVideoId = extractYouTubeVideoId(les.videoUrl);
        }
        if (!les.durationStatus) {
          les.durationStatus =
            typeof les.durationSeconds === "number" && les.durationSeconds > 0 ? "READY" : "PENDING";
          lessonsModified = true;
        }
      }
    });

    if (lessonsModified || !localStorage.getItem(STORAGE_KEYS.LESSONS)) {
      this.set(STORAGE_KEYS.LESSONS, filteredLessons);
    }

    const currentQuestions = this.get<Question[]>(STORAGE_KEYS.QUESTIONS, []);
    const filteredQuestions = currentQuestions.filter((q) => !mockCourseIds.includes(q.courseId));
    if (filteredQuestions.length !== currentQuestions.length) {
      this.set(STORAGE_KEYS.QUESTIONS, filteredQuestions);
    } else if (!localStorage.getItem(STORAGE_KEYS.QUESTIONS)) {
      this.set(STORAGE_KEYS.QUESTIONS, []);
    }

    if (filteredCourses.length > 0) {
      // Clean up legacy duplicate reviews per (courseId, userId) and filter out auto-injected placeholder reviews
      const storedReviews = this.get<CourseReview[]>(STORAGE_KEYS.REVIEWS, []);
      const reviewMap = new Map<string, CourseReview>();
      storedReviews.forEach((rev) => {
        if (!rev || !rev.courseId || !rev.userId) return;
        // Skip legacy fake placeholder reviews that corrupted genuine ratings
        if (rev.id?.startsWith('rev_admin_') || rev.id?.startsWith('rev_inst_')) return;
        const key = `${rev.courseId}_${rev.userId}`;
        const existing = reviewMap.get(key);
        if (!existing || new Date(rev.createdAt || 0) > new Date(existing.createdAt || 0)) {
          reviewMap.set(key, rev);
        }
      });
      const cleanReviews = Array.from(reviewMap.values());
      this.set(STORAGE_KEYS.REVIEWS, cleanReviews);

      const updatedCourses = filteredCourses.map((crs) => {
        const stats = calculateCourseStats(filteredLessons.filter((l) => l.courseId === crs.id));
        const mappedCatId = LEGACY_CATEGORY_MAP[crs.categoryId] || crs.categoryId;
        const matchedCategory = getCategoryById(mappedCatId);

        // Calculate accurate rating & reviews count from genuine student reviews
        const courseReviews = cleanReviews.filter((r) => r.courseId === crs.id);
        const count = courseReviews.length;
        const sum = courseReviews.reduce((acc, r) => acc + (typeof r.rating === 'number' ? r.rating : 5), 0);
        const accurateRating = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

        return {
          ...crs,
          categoryId: mappedCatId,
          categoryName: matchedCategory?.name || crs.categoryName,
          totalLessons: stats.totalLessons,
          totalDurationSeconds: stats.totalDurationSeconds,
          durationMinutes: stats.durationMinutes,
          durationAccuracyStatus: stats.accuracyStatus,
          rating: accurateRating,
          reviewsCount: count,
        };
      });
      this.set(STORAGE_KEYS.COURSES, updatedCourses);
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXAM_CONFIGS)) {
      this.set(STORAGE_KEYS.EXAM_CONFIGS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ENROLLMENTS)) {
      this.set(STORAGE_KEYS.ENROLLMENTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROGRESS)) {
      this.set(STORAGE_KEYS.PROGRESS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.QUIZ_ATTEMPTS)) {
      this.set(STORAGE_KEYS.QUIZ_ATTEMPTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTES)) {
      this.set(STORAGE_KEYS.NOTES, []);
    }
  }

  // Auth & Users
  public getCurrentUser(): User | null {
    const user = this.get<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (!user) return null;
    return user;
  }

  public static readonly PROTECTED_ADMIN_EMAILS = [
    'teamdevstudiont@gmail.com',
    'eunyool100208@gmail.com',
    'deer123424@gmail.com',
    'ayun24song@gmail.com',
  ];

  public setCurrentUser(user: User | null): void {
    this.set(STORAGE_KEYS.CURRENT_USER, user);
  }

  public getUsers(): User[] {
    return this.get<User[]>(STORAGE_KEYS.USERS, []);
  }

  public getUserById(id: string): User | undefined {
    const targetId = id === 'admin_teamdevstudiont' ? 'TDSNTLMS' : id;
    return this.getUsers().find((u) => u.id === targetId || (id === 'admin_teamdevstudiont' && u.id === 'TDSNTLMS'));
  }

  public getUser(id: string): User | undefined {
    return this.getUserById(id);
  }

  public getUserByEmail(email: string): User | undefined {
    const clean = email.trim().toLowerCase();
    if (clean === 'tdsntlms' || clean === 'admin_teamdevstudiont') {
      return this.getUsers().find((u) => u.email.toLowerCase() === 'teamdevstudiont@gmail.com' || u.id === 'TDSNTLMS');
    }
    return this.getUsers().find((u) => u.email.toLowerCase() === clean);
  }

  public getUserByKakaoId(kakaoId: string): User | undefined {
    if (!kakaoId) return undefined;
    const clean = String(kakaoId).trim();
    return this.getUsers().find((u) => u.kakaoId === clean || u.id === `kakao_${clean}`);
  }

  public getUserByNaverId(naverId: string): User | undefined {
    if (!naverId) return undefined;
    const clean = String(naverId).trim();
    return this.getUsers().find((u) => u.naverId === clean || u.id === `naver_${clean}`);
  }

  public getUserByGoogleId(googleId: string): User | undefined {
    if (!googleId) return undefined;
    const clean = String(googleId).trim();
    return this.getUsers().find((u) => u.googleId === clean || u.id === `google_${clean}`);
  }

  public async syncFromFirestore(): Promise<void> {
    try {
      // 1. Sync Users
      const remoteUsers = await firestoreService.getAllUsers();
      if (remoteUsers && remoteUsers.length > 0) {
        const localUsers = this.getUsers();
        const userMap = new Map<string, User>();
        localUsers.forEach((u) => userMap.set(u.id, u));

        remoteUsers.forEach((ru) => {
          if (!ru || !ru.id) return;
          const cleanEmail = (ru.email || '').toLowerCase().trim();
          const isProtected =
            TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(cleanEmail) ||
            ru.id === 'TDSNTLMS' ||
            ru.id === 'admin_EunYool' ||
            ru.id === 'admin_ayun24song';

          // Ensure protected admin accounts cannot be demoted to USER via remote sync
          let finalRole = ru.role;
          if (isProtected && (!finalRole || finalRole === 'USER')) {
            finalRole = 'SUPER_ADMIN';
          }

          const existing = userMap.get(ru.id);
          if (existing) {
            userMap.set(ru.id, {
              ...existing,
              ...ru,
              name: ru.name || existing.name,
              role: finalRole || existing.role,
              status: ru.status || existing.status,
              avatar: ru.avatar !== undefined ? ru.avatar : existing.avatar,
            });
          } else {
            userMap.set(ru.id, {
              ...ru,
              role: finalRole || ru.role || 'USER',
            });
          }
        });

        const merged = Array.from(userMap.values());
        this.set(STORAGE_KEYS.USERS, merged);

        const cur = this.getCurrentUser();
        if (cur && userMap.has(cur.id)) {
          this.setCurrentUser(userMap.get(cur.id)!);
        }
      }

      // 2. Sync Courses across devices, mobile, and incognito sessions
      const remoteCourses = await firestoreService.getAllCourses();
      const deletedCourseIds = this.get<string[]>(STORAGE_KEYS.DELETED_COURSE_IDS, []);
      if (remoteCourses && remoteCourses.length > 0) {
        const localCourses = this.get<Course[]>(STORAGE_KEYS.COURSES, []);
        const courseMap = new Map<string, Course>();
        localCourses.forEach((c) => {
          if (!deletedCourseIds.includes(c.id)) {
            courseMap.set(c.id, c);
          }
        });
        remoteCourses.forEach((rc) => {
          if (rc && rc.id && !deletedCourseIds.includes(rc.id)) {
            courseMap.set(rc.id, rc);
          }
        });
        this.set(STORAGE_KEYS.COURSES, Array.from(courseMap.values()));
      }

      // 3. Sync Sections
      const remoteSections = await firestoreService.getAllSections();
      if (remoteSections && remoteSections.length > 0) {
        const localSections = this.get<CourseSection[]>(STORAGE_KEYS.SECTIONS, []);
        const sectionMap = new Map<string, CourseSection>();
        localSections.forEach((s) => sectionMap.set(s.id, s));
        remoteSections.forEach((rs) => {
          if (rs && rs.id) sectionMap.set(rs.id, rs);
        });
        this.set(STORAGE_KEYS.SECTIONS, Array.from(sectionMap.values()));
      }

      // 4. Sync Lessons (including video metadata and URLs)
      const remoteLessons = await firestoreService.getAllLessons();
      if (remoteLessons && remoteLessons.length > 0) {
        const localLessons = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, []);
        const lessonMap = new Map<string, Lesson>();
        localLessons.forEach((l) => lessonMap.set(l.id, l));
        remoteLessons.forEach((rl) => {
          if (rl && rl.id) lessonMap.set(rl.id, rl);
        });
        this.set(STORAGE_KEYS.LESSONS, Array.from(lessonMap.values()));
      }

      // 5. Sync System Announcements
      const remoteSysAnnouncements = await firestoreService.getAllSystemAnnouncements();
      const localSysAnnouncements = this.get<SystemAnnouncement[]>(STORAGE_KEYS.SYSTEM_ANNOUNCEMENTS, []);
      if (remoteSysAnnouncements && remoteSysAnnouncements.length > 0) {
        const sysMap = new Map<string, SystemAnnouncement>();
        localSysAnnouncements.forEach((a) => sysMap.set(a.id, a));
        remoteSysAnnouncements.forEach((ra) => {
          if (ra && ra.id) sysMap.set(ra.id, ra);
        });
        const merged = Array.from(sysMap.values());
        this.set(STORAGE_KEYS.SYSTEM_ANNOUNCEMENTS, merged);
      } else if (localSysAnnouncements.length > 0) {
        // Seed remote Firestore with existing local announcements
        localSysAnnouncements.forEach((a) => {
          firestoreService.saveSystemAnnouncement(a).catch(() => {});
        });
      }

      // 6. Sync Course Announcements
      const remoteCourseAnnouncements = await firestoreService.getAllCourseAnnouncements();
      const localCourseAnnouncements = this.get<CourseAnnouncement[]>(STORAGE_KEYS.COURSE_ANNOUNCEMENTS, []);
      if (remoteCourseAnnouncements && remoteCourseAnnouncements.length > 0) {
        const crsMap = new Map<string, CourseAnnouncement>();
        localCourseAnnouncements.forEach((a) => crsMap.set(a.id, a));
        remoteCourseAnnouncements.forEach((ra) => {
          if (ra && ra.id) crsMap.set(ra.id, ra);
        });
        const merged = Array.from(crsMap.values());
        this.set(STORAGE_KEYS.COURSE_ANNOUNCEMENTS, merged);
      } else if (localCourseAnnouncements.length > 0) {
        // Seed remote Firestore with existing local announcements
        localCourseAnnouncements.forEach((a) => {
          firestoreService.saveCourseAnnouncement(a).catch(() => {});
        });
      }

      // 7. Sync Platform Settings
      const remoteSettings = await firestoreService.getSettings();
      if (remoteSettings) {
        this.applyLearningDataReset(remoteSettings.learningDataResetAt);
        this.set(STORAGE_KEYS.SETTINGS, remoteSettings);
      } else {
        const localSettings = this.getSettings();
        firestoreService.saveSettings(localSettings).catch(() => {});
      }

      // 8. Sync enrollments + lesson progress (admins: everyone, learners: themselves)
      const me = this.getCurrentUser();
      if (me) {
        const scope = isAdminRole(me.role) ? undefined : me.id;
        const [remoteEnrollments, remoteProgress] = await Promise.all([
          firestoreService.getEnrollmentRecords(scope),
          firestoreService.getProgressRecords(scope),
        ]);
        this.mergeRemoteLearningData(remoteEnrollments, remoteProgress);
      }

      window.dispatchEvent(new Event('tdsnt_announcement_change'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('[Storage] syncFromFirestore error:', e);
    }
  }

  private static readonly LEARNING_RESET_SEEN_KEY = 'tdsnt_learning_reset_seen_v2';

  /** Clears enrollments, lesson progress and quiz attempts cached in this browser. */
  private wipeLocalLearningData(): void {
    this.set(STORAGE_KEYS.ENROLLMENTS, []);
    this.set(STORAGE_KEYS.PROGRESS, []);
    this.set(STORAGE_KEYS.QUIZ_ATTEMPTS, []);
    const courses = this.get<Course[]>(STORAGE_KEYS.COURSES, []).map((c) => ({ ...c, enrolledCount: 0 }));
    this.set(STORAGE_KEYS.COURSES, courses);
  }

  /** If an admin reset learning data after this browser last saw one, drop the local copies once. */
  private applyLearningDataReset(resetAt?: string): void {
    if (!resetAt || typeof localStorage === 'undefined') return;
    const seen = localStorage.getItem(TDSNTLMSStorage.LEARNING_RESET_SEEN_KEY);
    if (seen && new Date(seen).getTime() >= new Date(resetAt).getTime()) return;
    this.wipeLocalLearningData();
    localStorage.setItem(TDSNTLMSStorage.LEARNING_RESET_SEEN_KEY, resetAt);
  }

  /**
   * Admin action: delete every enrollment, lesson progress record and certificate (local + Firestore),
   * reset course enrollment counts, and publish a reset marker so other browsers clear their caches.
   */
  public async resetAllLearningData(actor?: { id: string; name: string }): Promise<{ enrollments: number; progress: number; certificates: number }> {
    const [enrollments, progress, certificates] = await Promise.all([
      firestoreService.deleteAllDocs('enrollments'),
      firestoreService.deleteAllDocs('progress'),
      firestoreService.deleteAllDocs('certificates'),
    ]);
    this.wipeLocalLearningData();
    this.get<Course[]>(STORAGE_KEYS.COURSES, []).forEach((c) => {
      firestoreService.saveCourse({ ...c, enrolledCount: 0 }).catch(() => {});
    });
    const resetAt = new Date().toISOString();
    const settings = { ...this.getSettings(), learningDataResetAt: resetAt };
    this.set(STORAGE_KEYS.SETTINGS, settings);
    await firestoreService.saveSettings(settings);
    localStorage.setItem(TDSNTLMSStorage.LEARNING_RESET_SEEN_KEY, resetAt);
    if (actor) {
      this.addAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        action: 'LEARNING_DATA_RESET',
        details: `수강 ${enrollments}건, 진도 ${progress}건, 수료증 ${certificates}건 초기화`,
      });
    }
    return { enrollments, progress, certificates };
  }

  /** Course progress % from lesson progress: completed lessons count 100, partial ones proportionally. */
  private calcCourseProgress(userId: string, courseId: string, allProgress: LessonProgress[]): number {
    const courseLessons = this.getLessons(courseId);
    if (courseLessons.length === 0) return 0;
    let sum = 0;
    let allDone = true;
    for (const cl of courseLessons) {
      const prog = allProgress.find((p) => p.userId === userId && p.lessonId === cl.id);
      if (prog?.isCompleted) {
        sum += 100;
      } else {
        allDone = false;
        if (prog && prog.totalSeconds > 0 && prog.watchedSeconds > 0) {
          sum += Math.min(99, Math.round((prog.watchedSeconds / prog.totalSeconds) * 100));
        }
      }
    }
    return allDone ? 100 : Math.min(100, Math.round(sum / courseLessons.length));
  }

  /**
   * Merge enrollments/progress written on other devices (e.g. courses assigned by an admin)
   * into local storage and recompute course progress for the affected enrollments.
   */
  public mergeRemoteLearningData(
    remoteEnrollments: Array<{ userId: string; courseId: string; enrolledAt?: string }>,
    remoteProgress: LessonProgress[]
  ): void {
    if (remoteEnrollments.length === 0 && remoteProgress.length === 0) return;

    const progress = this.getAllProgress();
    const progressKey = (p: { userId: string; lessonId: string }) => `${p.userId}::${p.lessonId}`;
    const progressMap = new Map(progress.map((p) => [progressKey(p), p]));
    for (const rp of remoteProgress) {
      const local = progressMap.get(progressKey(rp));
      if (!local) {
        progressMap.set(progressKey(rp), rp);
      } else if (!local.isCompleted && (rp.isCompleted || (rp.watchedSeconds || 0) > (local.watchedSeconds || 0))) {
        progressMap.set(progressKey(rp), { ...local, ...rp });
      }
    }
    const mergedProgress = Array.from(progressMap.values());
    this.set(STORAGE_KEYS.PROGRESS, mergedProgress);

    const enrollments = this.getEnrollments();
    const enrollmentKey = (e: { userId: string; courseId: string }) => `${e.userId}::${e.courseId}`;
    const known = new Set(enrollments.map(enrollmentKey));
    for (const re of remoteEnrollments) {
      if (known.has(enrollmentKey(re))) continue;
      known.add(enrollmentKey(re));
      enrollments.push({
        id: `enr_${re.userId}_${re.courseId}`,
        userId: re.userId,
        courseId: re.courseId,
        enrolledAt: re.enrolledAt || new Date().toISOString(),
        progressPercentage: 0,
      });
    }
    // Progress-based fields are derived, so recompute them for every enrollment we know about
    const touchedUsers = new Set([...remoteEnrollments.map((e) => e.userId), ...remoteProgress.map((p) => p.userId)]);
    for (const enr of enrollments) {
      if (!touchedUsers.has(enr.userId)) continue;
      const pct = this.calcCourseProgress(enr.userId, enr.courseId, mergedProgress);
      if (pct > enr.progressPercentage) enr.progressPercentage = pct;
      if (enr.progressPercentage === 100 && !enr.completedAt) enr.completedAt = new Date().toISOString();
    }
    this.set(STORAGE_KEYS.ENROLLMENTS, enrollments);
  }

  private setupFirestoreListeners(): void {
    if (typeof window === 'undefined') return;

    firestoreService.subscribeToSystemAnnouncements((remotes) => {
      if (!remotes || remotes.length === 0) return;
      const current = this.get<SystemAnnouncement[]>(STORAGE_KEYS.SYSTEM_ANNOUNCEMENTS, []);
      const map = new Map<string, SystemAnnouncement>();
      current.forEach((a) => map.set(a.id, a));
      remotes.forEach((r) => {
        if (r && r.id) map.set(r.id, r);
      });
      const merged = Array.from(map.values());
      this.set(STORAGE_KEYS.SYSTEM_ANNOUNCEMENTS, merged);

      // If any active announcement, sync settings
      const activeAnn = merged.find((a) => a.isActive);
      if (activeAnn) {
        const settings = this.getSettings();
        settings.announcement = activeAnn.content;
        settings.showAnnouncement = true;
        this.set(STORAGE_KEYS.SETTINGS, settings);
      }
      window.dispatchEvent(new Event('tdsnt_announcement_change'));
      window.dispatchEvent(new Event('storage'));
    });

    firestoreService.subscribeToCourseAnnouncements((remotes) => {
      if (!remotes || remotes.length === 0) return;
      const current = this.get<CourseAnnouncement[]>(STORAGE_KEYS.COURSE_ANNOUNCEMENTS, []);
      const map = new Map<string, CourseAnnouncement>();
      current.forEach((a) => map.set(a.id, a));
      remotes.forEach((r) => {
        if (r && r.id) map.set(r.id, r);
      });
      this.set(STORAGE_KEYS.COURSE_ANNOUNCEMENTS, Array.from(map.values()));
      window.dispatchEvent(new Event('tdsnt_announcement_change'));
      window.dispatchEvent(new Event('storage'));
    });
  }

  public hasAnyAdmin(): boolean {
    const users = this.getUsers();
    return users.some((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
  }

  public createUser(user: Omit<User, 'id' | 'createdAt'> & { id?: string }, actor?: { id: string; name: string }): User {
    const users = this.getUsers();
    const newUser: User = {
      ...user,
      id: user.id || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    this.set(STORAGE_KEYS.USERS, users);

    // Save persistently to Firestore
    firestoreService.saveUser(newUser).catch((err) => {
      console.warn('[Storage] Firestore saveUser error:', err);
    });

    if (actor) {
      this.addAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        targetUserId: newUser.id,
        targetUserName: newUser.name,
        action: 'UPDATE_ROLE',
        details: `신규 사용자 계정 등록 (이름: ${newUser.name}, 권한: ${newUser.role})`,
      });
    }

    return newUser;
  }

  /** Records when the user agreed to the terms and the privacy notice. */
  public recordAgreements(userId: string, agreements: UserAgreements): User | undefined {
    const users = this.getUsers();
    const cur = this.getCurrentUser();
    let target = users.find((u) => u.id === userId);
    if (!target && cur && cur.id === userId) {
      target = { ...cur };
      users.push(target);
    }
    if (!target) return undefined;

    target.agreements = agreements;
    this.set(STORAGE_KEYS.USERS, users);
    if (cur && cur.id === userId) {
      this.setCurrentUser({ ...cur, agreements });
    }
    firestoreService.saveUser(target).catch((err) => {
      console.warn('[Storage] Firestore saveUser error:', err);
    });
    return target;
  }

  public updateUserProfile(
    userId: string,
    data: { name?: string; nickname?: string; phone?: string; bio?: string; avatar?: string; email?: string; equippedAchievementId?: string | null },
    actor?: { id: string; name: string }
  ): User | undefined {
    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) return undefined;

    const oldName = target.name;
    const oldEmail = target.email;
    if (data.name !== undefined) target.name = data.name.trim();
    if (data.nickname !== undefined) target.nickname = data.nickname.trim();
    if (data.phone !== undefined) target.phone = data.phone.trim();
    if (data.bio !== undefined) target.bio = data.bio.trim();
    if (data.email !== undefined && data.email.trim()) {
      target.email = data.email.trim().toLowerCase();
    }
    if (data.equippedAchievementId !== undefined) {
      target.equippedAchievementId = data.equippedAchievementId;
    }
    if (data.avatar !== undefined) {
      if (data.avatar && (data.avatar.includes('unsplash.com') || data.avatar.includes('placeholder'))) {
        delete target.avatar;
      } else {
        target.avatar = data.avatar;
      }
    }

    this.set(STORAGE_KEYS.USERS, users);

    const cur = this.getCurrentUser();
    if (cur && cur.id === userId) {
      this.setCurrentUser({ ...cur, ...target });
    }

    // Persist profile updates to Firestore
    firestoreService.saveUser(target).catch((err) => {
      console.warn('[Storage] Firestore saveUser error:', err);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: target }));
    }

    if (actor) {
      this.addAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        targetUserId: target.id,
        targetUserName: target.name,
        action: 'UPDATE_NAME',
        details: `사용자 프로필 수정 (이름: ${oldName} → ${target.name}${data.email ? `, 이메일: ${oldEmail} → ${target.email}` : ''})`,
      });
    }

    return target;
  }

  public updateUserRole(userId: string, role: UserRole, actor?: { id: string; name: string }): User | undefined {
    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) return undefined;

    // Self-modification rule: Cannot modify own role
    if (actor && actor.id === target.id) {
      throw new Error('본인의 관리자 직책은 직접 변경할 수 없습니다.');
    }

    // Protected accounts protection: Cannot demote protected admin accounts to USER
    if (TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(target.email.toLowerCase())) {
      if (role === 'USER') {
        throw new Error('시스템 최고 관리자 계정은 일반 수강생으로 권한을 강등하거나 박탈할 수 없습니다.');
      }
      if (
        target.email.toLowerCase() === 'teamdevstudiont@gmail.com' &&
        role !== 'SERVICE_OWNER' &&
        role !== 'SUPER_ADMIN'
      ) {
        throw new Error('시스템 최상위 총괄 계정은 총괄 직책을 유지해야 합니다.');
      }
    }

    const oldRole = target.role;
    target.role = role;
    this.set(STORAGE_KEYS.USERS, users);

    const cur = this.getCurrentUser();
    if (cur && cur.id === userId) {
      this.setCurrentUser(target);
    }

    // Persist role changes to Firestore
    firestoreService.saveUser(target).catch((err) => {
      console.warn('[Storage] Firestore saveUser error:', err);
    });

    if (actor) {
      this.addAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        targetUserId: target.id,
        targetUserName: target.name,
        action: 'UPDATE_ROLE',
        details: `관리자 직책 변경 (${oldRole} → ${role})`,
      });
    }

    return target;
  }

  public updateUserStatus(userId: string, status: UserStatus, actor?: { id: string; name: string }): User | undefined {
    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) return undefined;

    if (
      TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(target.email.toLowerCase()) &&
      (status === 'SUSPENDED' || status === 'DELETED' || status === 'suspended')
    ) {
      throw new Error('시스템 서비스 총괄 계정은 정지 또는 비활성화할 수 없습니다.');
    }

    const oldStatus = target.status;
    target.status = status;
    this.set(STORAGE_KEYS.USERS, users);

    const cur = this.getCurrentUser();
    if (cur && cur.id === userId) {
      this.setCurrentUser(target);
    }

    // Persist status changes to Firestore
    firestoreService.saveUser(target).catch((err) => {
      console.warn('[Storage] Firestore saveUser error:', err);
    });

    if (actor) {
      this.addAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        targetUserId: target.id,
        targetUserName: target.name,
        action: 'UPDATE_STATUS',
        details: `계정 상태 변경 (${oldStatus} → ${status})`,
      });
    }

    return target;
  }

  public updateUserAvatar(userId: string, avatarUrl: string | null, actor?: { id: string; name: string }): User | undefined {
    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) return undefined;

    const isYuna = target.email?.toLowerCase() === 'ayun24song@gmail.com' || target.id === 'admin_ayun24song';
    const isTDSNTLMS = target.email?.toLowerCase() === 'teamdevstudiont@gmail.com' || target.name === 'TDSNTLMS' || target.id === 'TDSNTLMS';

    if (!avatarUrl || avatarUrl.includes('unsplash.com') || avatarUrl.includes('placeholder') || avatarUrl.includes('yuna_profile')) {
      if (isYuna) {
        target.avatar = '/송윤아.png';
      } else if (isTDSNTLMS) {
        target.avatar = '/images/tdsntlms_profile.png';
      } else {
        delete target.avatar;
      }
    } else {
      target.avatar = avatarUrl;
    }

    this.set(STORAGE_KEYS.USERS, users);

    const cur = this.getCurrentUser();
    if (cur && cur.id === userId) {
      this.setCurrentUser({ ...cur, ...target });
    }

    // Persist avatar changes to Firestore
    firestoreService.saveUser(target).catch((err) => {
      console.warn('[Storage] Firestore saveUser error:', err);
    });

    if (actor) {
      this.addAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        targetUserId: target.id,
        targetUserName: target.name,
        action: 'UPDATE_AVATAR',
        details: avatarUrl ? '프로필 사진 등록/변경' : '기본 프로필로 초기화',
      });
    }

    return target;
  }

  public deleteUser(userId: string, actor?: { id: string; name: string }): void {
    const target = this.getUserById(userId);
    if (!target) return;

    if (TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(target.email.toLowerCase())) {
      throw new Error('시스템 서비스 총괄 계정은 삭제할 수 없습니다.');
    }

    const users = this.getUsers().filter((u) => u.id !== userId);
    this.set(STORAGE_KEYS.USERS, users);

    // Delete persistently from Firestore
    firestoreService.deleteUser(userId).catch((err) => {
      console.warn('[Storage] Firestore deleteUser error:', err);
    });

    // Clean enrollments & progress for this user
    const enrollments = this.getEnrollments().filter((e) => e.userId !== userId);
    this.set(STORAGE_KEYS.ENROLLMENTS, enrollments);

    const progress = this.getAllProgress().filter((p) => p.userId !== userId);
    this.set(STORAGE_KEYS.PROGRESS, progress);

    const cur = this.getCurrentUser();
    if (cur && cur.id === userId) {
      this.setCurrentUser(null);
    }

    if (actor) {
      this.addAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        targetUserId: target.id,
        targetUserName: target.name,
        action: 'DELETE_USER',
        details: `계정 삭제 (${target.name}, ${target.email})`,
      });
    }
  }

  public bulkUpdateUserStatus(
    userIds: string[],
    status: UserStatus,
    actor?: { id: string; name: string }
  ): { updated: number; skipped: number } {
    let updated = 0;
    let skipped = 0;
    const names: string[] = [];

    userIds.forEach((id) => {
      const user = this.getUserById(id);
      if (!user) return;
      if (TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        skipped++;
        return;
      }
      if (actor && actor.id === user.id && (status === 'SUSPENDED' || status === 'DELETED')) {
        skipped++;
        return;
      }
      this.updateUserStatus(id, status);
      names.push(user.name);
      updated++;
    });

    const currentUser = this.getCurrentUser();
    const resolvedActor = actor || (currentUser ? { id: currentUser.id, name: currentUser.name } : undefined);
    if (resolvedActor && updated > 0) {
      const statusLabel =
        status === 'ACTIVE' || status === 'active'
          ? '정상 활성화'
          : status === 'SUSPENDED' || status === 'suspended'
          ? '계정 정지'
          : status;
      this.addAuditLog({
        actorId: resolvedActor.id,
        actorName: resolvedActor.name,
        action: 'BULK_UPDATE',
        details: `사용자 ${updated}명 상태 일괄 변경 (${statusLabel}) - ${names.slice(0, 3).join(', ')}${
          names.length > 3 ? ` 외 ${names.length - 3}명` : ''
        }`,
      });
    }

    return { updated, skipped };
  }

  public bulkDeleteUsers(
    userIds: string[],
    actor?: { id: string; name: string }
  ): { deleted: number; skipped: number } {
    let deleted = 0;
    let skipped = 0;
    const names: string[] = [];

    userIds.forEach((id) => {
      const user = this.getUserById(id);
      if (!user) return;
      if (TDSNTLMSStorage.PROTECTED_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        skipped++;
        return;
      }
      if (actor && actor.id === user.id) {
        skipped++;
        return;
      }
      this.deleteUser(id);
      names.push(user.name);
      deleted++;
    });

    const currentUser = this.getCurrentUser();
    const resolvedActor = actor || (currentUser ? { id: currentUser.id, name: currentUser.name } : undefined);
    if (resolvedActor && deleted > 0) {
      this.addAuditLog({
        actorId: resolvedActor.id,
        actorName: resolvedActor.name,
        action: 'BULK_DELETE',
        details: `사용자 ${deleted}명 계정 일괄 삭제 - ${names.slice(0, 3).join(', ')}${
          names.length > 3 ? ` 외 ${names.length - 3}명` : ''
        }`,
      });
    }

    return { deleted, skipped };
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    const logs = this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const logs = this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    const newLog: AuditLog = {
      ...log,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep last 300 logs
    if (logs.length > 300) {
      logs.length = 300;
    }
    this.set(STORAGE_KEYS.AUDIT_LOGS, logs);

    if (log.action === 'COURSE_ASSIGN') {
      notifyDiscord('assignment', { actorName: log.actorName, details: log.details });
    } else if (DISCORD_ADMIN_ACTIONS.has(log.action)) {
      notifyDiscord('admin_action', { action: log.action, actorName: log.actorName, details: log.details });
    }
    return newLog;
  }

  // User Real Learning Statistics for Admin & Profile
  public getUserLearningStats(userId: string) {
    const enrollments = this.getEnrollments(userId);
    const allProgress = this.getAllProgress().filter((p) => p.userId === userId);
    const completedProgress = allProgress.filter((p) => p.isCompleted);
    const courses = this.getCourses(true);

    const totalEnrolled = enrollments.length;
    const completedCoursesCount = enrollments.filter((e) => e.progressPercentage >= 100 || e.completedAt).length;
    const inProgressCoursesCount = totalEnrolled - completedCoursesCount;

    // Calculate overall average progress
    let overallProgressPercent = 0;
    if (totalEnrolled > 0) {
      const sum = enrollments.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0);
      overallProgressPercent = Math.round(sum / totalEnrolled);
    }

    // Total watched seconds from progress records
    const totalWatchedSeconds = allProgress.reduce((acc, curr) => acc + (curr.watchedSeconds || 0), 0);
    const totalHours = Math.round((totalWatchedSeconds / 3600) * 10) / 10;
    const totalMinutes = Math.round(totalWatchedSeconds / 60);

    // Recent learning info
    const sortedProgress = [...allProgress].sort(
      (a, b) => new Date(b.lastWatchedAt || 0).getTime() - new Date(a.lastWatchedAt || 0).getTime()
    );
    const lastActive = sortedProgress[0];
    let lastCourseTitle = '';
    let lastLessonTitle = '';

    if (lastActive) {
      const c = courses.find((crs) => crs.id === lastActive.courseId);
      if (c) lastCourseTitle = c.title;
      const l = this.getLessonById(lastActive.lessonId);
      if (l) lastLessonTitle = l.title;
    }

    // Enrolled course items with their titles and current progress
    const enrolledDetails = enrollments.map((enr) => {
      const crs = courses.find((c) => c.id === enr.courseId);
      return {
        courseId: enr.courseId,
        courseTitle: crs?.title || '삭제되었거나 알 수 없는 강의',
        courseThumbnail: crs?.thumbnail,
        progressPercentage: enr.progressPercentage || 0,
        enrolledAt: enr.enrolledAt,
        completedAt: enr.completedAt,
      };
    });

    return {
      totalEnrolled,
      completedCoursesCount,
      inProgressCoursesCount,
      completedLessonsCount: completedProgress.length,
      overallProgressPercent,
      totalWatchedSeconds,
      totalHours,
      totalMinutes,
      lastActiveDate: lastActive?.lastWatchedAt,
      lastCourseTitle,
      lastLessonTitle,
      enrolledDetails,
    };
  }

  // Categories
  public getCategories(): Category[] {
    return this.get<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  }

  public saveCategory(cat: Category): void {
    const cats = this.getCategories();
    const idx = cats.findIndex((c) => c.id === cat.id);
    if (idx >= 0) {
      cats[idx] = cat;
    } else {
      cats.push(cat);
    }
    this.set(STORAGE_KEYS.CATEGORIES, cats);
  }

  private enrichCourseWithCalculatedStats(course: Course, allLessons?: Lesson[]): Course {
    const lessons = allLessons
      ? allLessons.filter((l) => l.courseId === course.id)
      : this.getLessons(course.id);
    const stats = calculateCourseStats(lessons);
    return {
      ...course,
      totalLessons: stats.totalLessons,
      totalDurationSeconds: stats.totalDurationSeconds,
      durationMinutes: stats.durationMinutes,
      durationAccuracyStatus: stats.accuracyStatus,
    };
  }

  // Courses
  public getCourses(includeUnpublished = true): Course[] {
    const courses = this.get<Course[]>(STORAGE_KEYS.COURSES, []);
    const allLessons = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, []);
    const enriched = courses.map((c) => this.enrichCourseWithCalculatedStats(c, allLessons));
    if (includeUnpublished) return enriched;
    return enriched.filter((c) => c.isPublished);
  }

  public getCourseById(id: string): Course | undefined {
    return this.getCourses(true).find((c) => c.id === id);
  }

  public getCourseBySlug(slug: string): Course | undefined {
    return this.getCourses(true).find((c) => c.slug === slug);
  }

  public saveCourse(course: Course, actor?: { id: string; name: string }): Course {
    const rawCourses = this.get<Course[]>(STORAGE_KEYS.COURSES, []);
    const allLessons = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, []);
    const courseLessons = allLessons.filter((l) => l.courseId === course.id);
    const stats = calculateCourseStats(courseLessons);

    const isNew = !rawCourses.some((c) => c.id === course.id);

    const enriched: Course = {
      ...course,
      totalLessons: stats.totalLessons,
      totalDurationSeconds: stats.totalDurationSeconds,
      durationMinutes: stats.durationMinutes,
      durationAccuracyStatus: stats.accuracyStatus,
      updatedAt: new Date().toISOString(),
    };

    const idx = rawCourses.findIndex((c) => c.id === course.id);
    if (idx >= 0) {
      rawCourses[idx] = enriched;
    } else {
      rawCourses.unshift(enriched);
    }
    this.set(STORAGE_KEYS.COURSES, rawCourses);

    // Asynchronously synchronize course to Firestore for multi-device visibility
    firestoreService.saveCourse(enriched).catch((err) => {
      console.warn('[Storage] Course Firestore sync notice:', err);
    });

    const currentUser = this.getCurrentUser();
    const resolvedActor = actor || (currentUser ? { id: currentUser.id, name: currentUser.name } : undefined);
    if (resolvedActor) {
      this.addAuditLog({
        actorId: resolvedActor.id,
        actorName: resolvedActor.name,
        targetCourseId: enriched.id,
        targetCourseTitle: enriched.title,
        action: isNew ? 'COURSE_CREATE' : 'COURSE_UPDATE',
        details: isNew
          ? `신규 강의 개설: "${enriched.title}" (${enriched.instructorName} 강사)`
          : `강의 정보 수정: "${enriched.title}"`,
      });
    }

    return enriched;
  }

  public toggleCoursePublish(id: string, forceStatus?: boolean, actor?: { id: string; name: string }): Course | undefined {
    const course = this.getCourseById(id);
    if (course) {
      const nextStatus = forceStatus !== undefined ? forceStatus : !course.isPublished;
      course.isPublished = nextStatus;
      this.saveCourse(course, actor);
    }
    return course;
  }

  public deleteCourse(id: string, actor?: { id: string; name: string }): void {
    const target = this.getCourseById(id);
    const courses = this.getCourses(true).filter((c) => c.id !== id);
    this.set(STORAGE_KEYS.COURSES, courses);

    // Record in deleted courses list so Firestore sync never revives it
    const deletedCourseIds = this.get<string[]>(STORAGE_KEYS.DELETED_COURSE_IDS, []);
    if (!deletedCourseIds.includes(id)) {
      deletedCourseIds.push(id);
      this.set(STORAGE_KEYS.DELETED_COURSE_IDS, deletedCourseIds);
    }

    // Asynchronously delete from Firestore DB
    firestoreService.deleteCourse(id).catch((err) => {
      console.warn('[Storage] Course Firestore delete notice:', err);
    });

    // Cascade delete sections
    const sections = this.getSections(id);
    sections.forEach((s) => this.deleteSection(s.id));

    // Cascade delete all lessons belonging to this course (including unassigned lessons)
    const allLessons = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, []);
    this.set(
      STORAGE_KEYS.LESSONS,
      allLessons.filter((l) => l.courseId !== id)
    );

    // Cascade delete questions
    const allQuestions = this.get<Question[]>(STORAGE_KEYS.QUESTIONS, []);
    this.set(
      STORAGE_KEYS.QUESTIONS,
      allQuestions.filter((q) => q.courseId !== id)
    );

    // Cascade delete exam configs
    const allExamConfigs = this.get<ExamConfig[]>(STORAGE_KEYS.EXAM_CONFIGS, []);
    this.set(
      STORAGE_KEYS.EXAM_CONFIGS,
      allExamConfigs.filter((ec) => ec.courseId !== id)
    );

    // Cascade delete enrollments
    const enrollments = this.getEnrollments().filter((e) => e.courseId !== id);
    this.set(STORAGE_KEYS.ENROLLMENTS, enrollments);

    // Cascade delete progress
    const progress = this.getAllProgress().filter((p) => p.courseId !== id);
    this.set(STORAGE_KEYS.PROGRESS, progress);

    // Cascade delete quiz attempts
    const quizAttempts = this.get<any[]>(STORAGE_KEYS.QUIZ_ATTEMPTS, []).filter((qa) => qa.courseId !== id);
    this.set(STORAGE_KEYS.QUIZ_ATTEMPTS, quizAttempts);

    // Cascade delete notes
    const notes = this.get<any[]>(STORAGE_KEYS.NOTES, []).filter((n) => n.courseId !== id);
    this.set(STORAGE_KEYS.NOTES, notes);

    // Cascade delete reviews
    const reviews = this.get<CourseReview[]>(STORAGE_KEYS.REVIEWS, []).filter((r) => r.courseId !== id);
    this.set(STORAGE_KEYS.REVIEWS, reviews);

    // Cascade delete course announcements
    const allCourseAnnouncements = this.get<CourseAnnouncement[]>(STORAGE_KEYS.COURSE_ANNOUNCEMENTS, []);
    const announcementsToDelete = allCourseAnnouncements.filter((a) => a.courseId === id);
    const announcementsToKeep = allCourseAnnouncements.filter((a) => a.courseId !== id);
    this.set(STORAGE_KEYS.COURSE_ANNOUNCEMENTS, announcementsToKeep);
    announcementsToDelete.forEach((a) => {
      firestoreService.deleteCourseAnnouncement(a.id).catch(() => {});
    });

    // Cascade delete from wishlist
    const wishlist = this.get<any[]>(STORAGE_KEYS.WISHLIST, []).filter((w) => (typeof w === 'string' ? w !== id : w.courseId !== id));
    this.set(STORAGE_KEYS.WISHLIST, wishlist);

    const currentUser = this.getCurrentUser();
    const resolvedActor = actor || (currentUser ? { id: currentUser.id, name: currentUser.name } : undefined);
    if (resolvedActor && target) {
      this.addAuditLog({
        actorId: resolvedActor.id,
        actorName: resolvedActor.name,
        targetCourseId: target.id,
        targetCourseTitle: target.title,
        action: 'COURSE_DELETE',
        details: `강의 삭제: "${target.title}" (관련 커리큘럼, 레슨 영상, 퀴즈 및 수강생 학습 기록 일괄 영구 정리)`,
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('courses-updated', { detail: { deletedId: id } }));
    }
  }

  public bulkUpdateCoursePublish(
    courseIds: string[],
    isPublished: boolean,
    actor?: { id: string; name: string }
  ): number {
    const rawCourses = this.get<Course[]>(STORAGE_KEYS.COURSES, []);
    let updatedCount = 0;
    const titles: string[] = [];

    rawCourses.forEach((c) => {
      if (courseIds.includes(c.id)) {
        c.isPublished = isPublished;
        c.updatedAt = new Date().toISOString();
        updatedCount++;
        titles.push(c.title);
      }
    });

    if (updatedCount > 0) {
      this.set(STORAGE_KEYS.COURSES, rawCourses);
      const currentUser = this.getCurrentUser();
      const resolvedActor = actor || (currentUser ? { id: currentUser.id, name: currentUser.name } : undefined);
      if (resolvedActor) {
        this.addAuditLog({
          actorId: resolvedActor.id,
          actorName: resolvedActor.name,
          action: 'BULK_UPDATE',
          details: `강의 ${updatedCount}개 일괄 ${isPublished ? '공개' : '비공개'} 처리 (${titles.slice(0, 3).join(', ')}${
            titles.length > 3 ? ` 외 ${titles.length - 3}건` : ''
          })`,
        });
      }
    }
    return updatedCount;
  }

  public bulkDeleteCourses(courseIds: string[], actor?: { id: string; name: string }): number {
    let deletedCount = 0;
    const titles: string[] = [];
    courseIds.forEach((id) => {
      const target = this.getCourseById(id);
      if (target) {
        titles.push(target.title);
        this.deleteCourse(id);
        deletedCount++;
      }
    });

    const currentUser = this.getCurrentUser();
    const resolvedActor = actor || (currentUser ? { id: currentUser.id, name: currentUser.name } : undefined);
    if (resolvedActor && deletedCount > 0) {
      this.addAuditLog({
        actorId: resolvedActor.id,
        actorName: resolvedActor.name,
        action: 'BULK_DELETE',
        details: `강의 ${deletedCount}개 일괄 삭제 (${titles.slice(0, 3).join(', ')}${
          titles.length > 3 ? ` 외 ${titles.length - 3}건` : ''
        })`,
      });
    }
    return deletedCount;
  }

  // Sections
  public getSections(courseId: string): CourseSection[] {
    const all = this.get<CourseSection[]>(STORAGE_KEYS.SECTIONS, []);
    return all
      .filter((s) => s.courseId === courseId)
      .sort((a, b) => a.order - b.order);
  }

  public saveSection(section: CourseSection): CourseSection {
    const all = this.get<CourseSection[]>(STORAGE_KEYS.SECTIONS, []);
    const idx = all.findIndex((s) => s.id === section.id);
    if (idx >= 0) {
      all[idx] = section;
    } else {
      all.push(section);
    }
    this.set(STORAGE_KEYS.SECTIONS, all);

    firestoreService.saveSection(section).catch((err) => {
      console.warn('[Storage] Section Firestore save notice:', err);
    });

    return section;
  }

  public deleteSection(sectionId: string): void {
    const all = this.get<CourseSection[]>(STORAGE_KEYS.SECTIONS, []);
    this.set(
      STORAGE_KEYS.SECTIONS,
      all.filter((s) => s.id !== sectionId)
    );

    firestoreService.deleteSection(sectionId).catch((err) => {
      console.warn('[Storage] Section Firestore delete notice:', err);
    });

    // Cascade lessons
    const lessons = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, []);
    const toDeleteLessons = lessons.filter((l) => l.sectionId === sectionId);
    toDeleteLessons.forEach((l) => this.deleteLesson(l.id));
  }

  // Lessons
  public getLessons(courseId?: string, sectionId?: string): Lesson[] {
    let all = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, []);
    if (courseId) all = all.filter((l) => l.courseId === courseId);
    if (sectionId) all = all.filter((l) => l.sectionId === sectionId);
    return all.sort((a, b) => a.order - b.order);
  }

  public getLessonById(id: string): Lesson | undefined {
    const all = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, []);
    return all.find((l) => l.id === id);
  }

  public saveLesson(lesson: Lesson): Lesson {
    const all = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, []);
    const idx = all.findIndex((l) => l.id === lesson.id);
    if (idx >= 0) {
      all[idx] = lesson;
    } else {
      all.push(lesson);
    }
    this.set(STORAGE_KEYS.LESSONS, all);

    // Synchronize lesson (with its server videoUrl and duration) to Firestore DB
    firestoreService.saveLesson(lesson).catch((err) => {
      console.warn('[Storage] Lesson Firestore save notice:', err);
    });

    // Dynamically update totalLessons and duration metrics on the parent course
    const courseLessons = all.filter((l) => l.courseId === lesson.courseId);
    const course = this.getCourseById(lesson.courseId);
    if (course) {
      const stats = calculateCourseStats(courseLessons);
      course.totalLessons = stats.totalLessons;
      course.totalDurationSeconds = stats.totalDurationSeconds;
      course.durationMinutes = stats.durationMinutes;
      course.durationAccuracyStatus = stats.accuracyStatus;
      this.saveCourse(course);
    }

    return lesson;
  }

  public deleteLesson(lessonId: string): void {
    const all = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, []);
    const target = all.find((l) => l.id === lessonId);
    this.set(
      STORAGE_KEYS.LESSONS,
      all.filter((l) => l.id !== lessonId)
    );

    firestoreService.deleteLesson(lessonId).catch((err) => {
      console.warn('[Storage] Lesson Firestore delete notice:', err);
    });

    // Delete questions for this lesson
    const questions = this.get<Question[]>(STORAGE_KEYS.QUESTIONS, []);
    this.set(
      STORAGE_KEYS.QUESTIONS,
      questions.filter((q) => q.lessonId !== lessonId)
    );

    // Update parent course stats
    if (target) {
      const remaining = all.filter((l) => l.courseId === target.courseId && l.id !== lessonId);
      const course = this.getCourseById(target.courseId);
      if (course) {
        const stats = calculateCourseStats(remaining);
        course.totalLessons = stats.totalLessons;
        course.totalDurationSeconds = stats.totalDurationSeconds;
        course.durationMinutes = stats.durationMinutes;
        course.durationAccuracyStatus = stats.accuracyStatus;
        this.saveCourse(course);
      }
    }
  }

  // Questions
  public getQuestions(lessonId?: string, courseId?: string): Question[] {
    let all = this.get<Question[]>(STORAGE_KEYS.QUESTIONS, []);
    if (lessonId) all = all.filter((q) => q.lessonId === lessonId);
    if (courseId) all = all.filter((q) => q.courseId === courseId);
    return all.sort((a, b) => a.order - b.order);
  }

  public getQuestionById(id: string): Question | undefined {
    return this.get<Question[]>(STORAGE_KEYS.QUESTIONS, []).find((q) => q.id === id);
  }

  public saveQuestion(question: Question): Question {
    const all = this.get<Question[]>(STORAGE_KEYS.QUESTIONS, []);
    const idx = all.findIndex((q) => q.id === question.id);
    if (idx >= 0) {
      all[idx] = question;
    } else {
      all.push(question);
    }
    this.set(STORAGE_KEYS.QUESTIONS, all);
    return question;
  }

  public deleteQuestion(id: string): void {
    const all = this.get<Question[]>(STORAGE_KEYS.QUESTIONS, []);
    this.set(
      STORAGE_KEYS.QUESTIONS,
      all.filter((q) => q.id !== id)
    );
  }

  // Exam Configs
  public getExamConfig(lessonId: string): ExamConfig | undefined {
    const all = this.get<ExamConfig[]>(STORAGE_KEYS.EXAM_CONFIGS, []);
    return all.find((c) => c.lessonId === lessonId);
  }

  public saveExamConfig(config: ExamConfig): ExamConfig {
    const all = this.get<ExamConfig[]>(STORAGE_KEYS.EXAM_CONFIGS, []);
    const idx = all.findIndex((c) => c.lessonId === config.lessonId);
    if (idx >= 0) {
      all[idx] = config;
    } else {
      all.push(config);
    }
    this.set(STORAGE_KEYS.EXAM_CONFIGS, all);
    return config;
  }

  // Enrollments & Progress
  public getEnrollments(userId?: string): Enrollment[] {
    const all = this.get<Enrollment[]>(STORAGE_KEYS.ENROLLMENTS, []);
    if (userId) return all.filter((e) => e.userId === userId);
    return all;
  }

  public getEnrollment(userId: string, courseId: string): Enrollment | undefined {
    return this.getEnrollments(userId).find((e) => e.courseId === courseId);
  }

  public enroll(userId: string, courseId: string): Enrollment {
    const existing = this.getEnrollment(userId, courseId);
    if (existing) return existing;

    const all = this.getEnrollments();
    const newEnrollment: Enrollment = {
      id: `enr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      courseId,
      enrolledAt: new Date().toISOString(),
      progressPercentage: 0,
    };
    all.push(newEnrollment);
    this.set(STORAGE_KEYS.ENROLLMENTS, all);

    // Persist enrollment to Firestore
    firestoreService.saveEnrollment(userId, courseId).catch((err) => {
      console.warn('[Storage] Firestore saveEnrollment error:', err);
    });

    // Increment course enrolled count
    const course = this.getCourseById(courseId);
    if (course) {
      course.enrolledCount = (course.enrolledCount || 0) + 1;
      this.saveCourse(course);
    }

    return newEnrollment;
  }

  /** Self-enrollment by a learner (course page or opening the classroom). */
  public enrollUserInCourse(userId: string, courseId: string): Enrollment {
    const isNew = !this.getEnrollment(userId, courseId);
    const enrollment = this.enroll(userId, courseId);
    if (isNew) {
      const learner = this.learnerForNotice(userId);
      if (learner) {
        notifyDiscord('enrollment', {
          userId,
          courseId,
          userName: learner.name,
          courseTitle: this.getCourseById(courseId)?.title || courseId,
        });
      }
    }
    return enrollment;
  }

  /** The learner to name in a Discord notice; admins previewing their own courses are skipped. */
  private learnerForNotice(userId: string): User | undefined {
    const cur = this.getCurrentUser();
    const u = this.getUserById(userId) || (cur?.id === userId ? cur : undefined);
    return u && !isAdminRole(u.role) ? u : undefined;
  }

  public getAllProgress(): LessonProgress[] {
    return this.get<LessonProgress[]>(STORAGE_KEYS.PROGRESS, []);
  }

  public getProgressList(userId: string, courseId: string): LessonProgress[] {
    return this.getAllProgress().filter((p) => p.userId === userId && p.courseId === courseId);
  }

  public getLessonProgress(userId: string, lessonId: string): LessonProgress | undefined {
    return this.getAllProgress().find((p) => p.userId === userId && p.lessonId === lessonId);
  }

  public updateLessonProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    watchedSeconds: number,
    totalSeconds: number,
    forceCompleted = false,
    exactPositionSeconds?: number
  ): { progress: LessonProgress; enrollmentProgress: number } {
    const all = this.getAllProgress();
    let record = all.find((p) => p.userId === userId && p.lessonId === lessonId);

    const lesson = this.getLessons(courseId).find((l) => l.id === lessonId);
    const validTotal =
      totalSeconds > 0
        ? totalSeconds
        : lesson?.durationSeconds && lesson.durationSeconds > 0
        ? lesson.durationSeconds
        : record?.totalSeconds && record.totalSeconds > 1
        ? record.totalSeconds
        : 0;

    // Automatically update lesson duration in storage if previously 0 or pending
    if (lesson && (!lesson.durationSeconds || lesson.durationSeconds <= 0) && totalSeconds > 0) {
      lesson.durationSeconds = totalSeconds;
      lesson.durationStatus = 'READY';
      this.saveLesson(lesson);
    }

    const thresholdPercent = lesson?.completionThresholdPercent || 90;
    const thresholdRatio = thresholdPercent / 100;
    const isCompleted =
      forceCompleted ||
      (validTotal > 0 && watchedSeconds >= validTotal * thresholdRatio) ||
      (record?.isCompleted ?? false);

    const currentPosition = Math.round(exactPositionSeconds !== undefined ? exactPositionSeconds : watchedSeconds);

    if (record) {
      record.watchedSeconds = Math.max(record.watchedSeconds, Math.round(watchedSeconds));
      record.totalSeconds = validTotal > 0 ? validTotal : record.totalSeconds;
      record.lastPositionSeconds = currentPosition;
      if (isCompleted && !record.isCompleted) {
        record.isCompleted = true;
        record.completedAt = new Date().toISOString();
      }
      record.lastWatchedAt = new Date().toISOString();
    } else {
      record = {
        id: `prog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        userId,
        courseId,
        lessonId,
        watchedSeconds: Math.round(watchedSeconds),
        totalSeconds: validTotal > 0 ? validTotal : 1,
        lastPositionSeconds: currentPosition,
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : undefined,
        lastWatchedAt: new Date().toISOString(),
      };
      all.push(record);
    }
    this.set(STORAGE_KEYS.PROGRESS, all);

    // Calculate total course progress percentage: completed lessons count as 100%, in-progress proportional
    const courseLessons = this.getLessons(courseId);
    const totalLessons = courseLessons.length;
    let progressPercentage = 0;

    if (totalLessons > 0) {
      let progressSum = 0;
      let allDone = true;

      courseLessons.forEach((cl) => {
        const prog = all.find((p) => p.userId === userId && p.lessonId === cl.id);
        if (prog?.isCompleted) {
          progressSum += 100;
        } else if (prog && prog.totalSeconds > 0 && prog.watchedSeconds > 0) {
          allDone = false;
          const ratio = Math.min(99, Math.round((prog.watchedSeconds / prog.totalSeconds) * 100));
          progressSum += ratio;
        } else {
          allDone = false;
        }
      });

      progressPercentage = allDone ? 100 : Math.min(100, Math.round(progressSum / totalLessons));
    }

    // Update enrollment
    const enrollments = this.getEnrollments();
    const enr = enrollments.find((e) => e.userId === userId && e.courseId === courseId);
    if (enr) {
      enr.progressPercentage = progressPercentage;
      enr.lastLessonId = lessonId;
      enr.lastPlaybackTimeSeconds = currentPosition;
      if (progressPercentage === 100 && !enr.completedAt) {
        enr.completedAt = new Date().toISOString();
        const learner = this.learnerForNotice(userId);
        if (learner) {
          notifyDiscord('completion', {
            userId,
            courseId,
            userName: learner.name,
            courseTitle: this.getCourseById(courseId)?.title || courseId,
          });
        }
      }
      this.set(STORAGE_KEYS.ENROLLMENTS, enrollments);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tdsn-progress-update', { detail: { userId, courseId, lessonId } }));
    }

    // Asynchronously synchronize progress with Firestore & server API
    firestoreService.saveProgress(record).catch((err) => {
      console.warn('[Storage] Firestore saveProgress error:', err);
    });

    progressApi
      .updateProgress(userId, courseId, lessonId, Math.round(watchedSeconds), validTotal, isCompleted)
      .catch(() => {});

    return { progress: record, enrollmentProgress: progressPercentage };
  }

  public async syncServerProgress(userId: string, courseId?: string): Promise<void> {
    if (!userId) return;
    try {
      const serverProgresses = await progressApi.fetchProgress(userId, courseId);
      if (serverProgresses && serverProgresses.length > 0) {
        const localAll = this.getAllProgress();
        serverProgresses.forEach((sp) => {
          const idx = localAll.findIndex((lp) => lp.userId === sp.userId && lp.lessonId === sp.lessonId);
          if (idx >= 0) {
            // Keep the one with higher watched seconds or completion
            if (sp.watchedSeconds > localAll[idx].watchedSeconds || sp.isCompleted) {
              localAll[idx] = { ...localAll[idx], ...sp };
            }
          } else {
            localAll.push(sp);
          }
        });
        this.set(STORAGE_KEYS.PROGRESS, localAll);
      }
    } catch {}
  }

  public updateLessonPlayback(
    userId: string,
    courseId: string,
    lessonId: string,
    watchedSeconds: number,
    totalSeconds: number,
    forceCompleted = false,
    exactPositionSeconds?: number
  ): { progress: LessonProgress; enrollmentProgress: number } {
    return this.updateLessonProgress(
      userId,
      courseId,
      lessonId,
      watchedSeconds,
      totalSeconds,
      forceCompleted,
      exactPositionSeconds
    );
  }

  /**
   * High-reliability LocalStorage query for exact lesson playback position.
   * Checks dedicated real-time localStorage key first, falling back to LessonProgress record.
   */
  public getLessonPlaybackState(
    userId: string,
    lessonId: string
  ): {
    position: number;
    duration: number;
    isCompleted: boolean;
    maxWatched: number;
    updatedAt: number;
  } | null {
    try {
      const raw = localStorage.getItem(`tdsn_playback_${userId}_${lessonId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.position === 'number') {
          return {
            position: parsed.position,
            duration: parsed.duration || 0,
            isCompleted: !!parsed.isCompleted,
            maxWatched: parsed.maxWatched ?? parsed.position,
            updatedAt: parsed.updatedAt || 0,
          };
        }
      }
    } catch {}

    const prog = this.getLessonProgress(userId, lessonId);
    if (prog) {
      return {
        position: prog.lastPositionSeconds ?? prog.watchedSeconds ?? 0,
        duration: prog.totalSeconds,
        isCompleted: prog.isCompleted,
        maxWatched: prog.watchedSeconds,
        updatedAt: prog.lastWatchedAt ? new Date(prog.lastWatchedAt).getTime() : 0,
      };
    }
    return null;
  }

  /**
   * High-reliability synchronous save of lesson playback state into LocalStorage.
   * Immediately persists to both dedicated key and overall LessonProgress store.
   */
  public saveLessonPlaybackState(
    userId: string,
    courseId: string,
    lessonId: string,
    position: number,
    duration: number,
    isCompleted: boolean,
    maxWatched?: number
  ): void {
    const validPos = Math.max(0, Math.round(position * 10) / 10);
    const validMax = Math.max(validPos, Math.round((maxWatched ?? position) * 10) / 10);
    const validDur = Math.max(0, Math.round(duration));

    const payload = {
      userId,
      courseId,
      lessonId,
      position: validPos,
      maxWatched: validMax,
      duration: validDur,
      isCompleted,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(`tdsn_playback_${userId}_${lessonId}`, JSON.stringify(payload));
      if (courseId) {
        localStorage.setItem(
          `tdsn_course_last_${userId}_${courseId}`,
          JSON.stringify({ lessonId, position: validPos, updatedAt: Date.now() })
        );
      }
    } catch {}

    this.updateLessonProgress(
      userId,
      courseId,
      lessonId,
      validMax,
      validDur,
      isCompleted,
      validPos
    );
  }

  // Quiz Attempts
  public getAllQuizAttempts(): QuizAttempt[] {
    return this.get<QuizAttempt[]>(STORAGE_KEYS.QUIZ_ATTEMPTS, []);
  }

  public getQuizAttempts(userId: string, lessonId?: string): QuizAttempt[] {
    let all = this.get<QuizAttempt[]>(STORAGE_KEYS.QUIZ_ATTEMPTS, []);
    all = all.filter((a) => a.userId === userId);
    if (lessonId) all = all.filter((a) => a.lessonId === lessonId);
    return all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  public recordQuizAttempt(
    userIdOrAttempt: string | (Omit<QuizAttempt, 'id' | 'submittedAt' | 'attemptNumber'> & { attemptNumber?: number }),
    courseId?: string,
    lessonId?: string,
    score?: number,
    maxScore?: number,
    passed?: boolean,
    answers?: Record<string, string[]>
  ): QuizAttempt {
    if (typeof userIdOrAttempt === 'object') {
      return this.saveQuizAttempt(userIdOrAttempt);
    }
    return this.saveQuizAttempt({
      userId: userIdOrAttempt,
      courseId: courseId || '',
      lessonId: lessonId || '',
      score: score || 0,
      maxScore: maxScore || 100,
      passed: !!passed,
      answers: answers || {},
    });
  }

  public saveQuizAttempt(
    attempt: Omit<QuizAttempt, 'id' | 'submittedAt' | 'attemptNumber'> & { attemptNumber?: number }
  ): QuizAttempt {
    const all = this.get<QuizAttempt[]>(STORAGE_KEYS.QUIZ_ATTEMPTS, []);
    const existingForLesson = all.filter(
      (a) => a.userId === attempt.userId && a.lessonId === attempt.lessonId
    );
    const newAttempt: QuizAttempt = {
      ...attempt,
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      submittedAt: new Date().toISOString(),
      attemptNumber: existingForLesson.length + 1,
    };
    all.push(newAttempt);
    this.set(STORAGE_KEYS.QUIZ_ATTEMPTS, all);

    if (newAttempt.passed) {
      this.updateLessonProgress(
        attempt.userId,
        attempt.courseId,
        attempt.lessonId,
        60,
        60,
        true
      );
    }

    return newAttempt;
  }

  // Notes
  public getNotes(userId: string, courseId?: string, lessonId?: string): StudentNote[] {
    let all = this.get<StudentNote[]>(STORAGE_KEYS.NOTES, []);
    all = all.filter((n) => n.userId === userId);
    if (courseId) all = all.filter((n) => n.courseId === courseId);
    if (lessonId) all = all.filter((n) => n.lessonId === lessonId);
    return all.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  }

  public getStudentNotes(userId: string, courseId?: string, lessonId?: string): StudentNote[] {
    return this.getNotes(userId, courseId, lessonId);
  }

  public addStudentNote(
    userIdOrNote: string | Omit<StudentNote, 'id' | 'createdAt'>,
    courseId?: string,
    lessonId?: string,
    timestampSeconds?: number,
    content?: string
  ): StudentNote {
    if (typeof userIdOrNote === 'object') {
      return this.saveNote(userIdOrNote);
    }
    return this.saveNote({
      userId: userIdOrNote,
      courseId: courseId || '',
      lessonId: lessonId || '',
      timestampSeconds: timestampSeconds || 0,
      content: content || '',
    });
  }

  public deleteStudentNote(id: string): void {
    this.deleteNote(id);
  }

  public saveNote(note: Omit<StudentNote, 'id' | 'createdAt'>): StudentNote {
    const all = this.get<StudentNote[]>(STORAGE_KEYS.NOTES, []);
    const newNote: StudentNote = {
      ...note,
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    all.push(newNote);
    this.set(STORAGE_KEYS.NOTES, all);
    return newNote;
  }

  public deleteNote(id: string): void {
    const all = this.get<StudentNote[]>(STORAGE_KEYS.NOTES, []);
    this.set(
      STORAGE_KEYS.NOTES,
      all.filter((n) => n.id !== id)
    );
  }

  // Settings
  public getSettings(): SystemSettings {
    const s = this.get<SystemSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (!s) {
      return { ...DEFAULT_SETTINGS };
    }
    return {
      ...DEFAULT_SETTINGS,
      ...s,
      announcement: s.announcement !== undefined ? s.announcement : DEFAULT_SETTINGS.announcement,
      showAnnouncement: s.showAnnouncement !== undefined ? s.showAnnouncement : true,
    };
  }

  public saveSettings(settings: SystemSettings): void {
    this.set(STORAGE_KEYS.SETTINGS, settings);
    firestoreService.saveSettings(settings).catch((err) => {
      console.warn('[Storage] Firestore saveSettings error:', err);
    });
    window.dispatchEvent(new Event('tdsnt_announcement_change'));
    window.dispatchEvent(new Event('storage'));
  }

  // Clear data (Empty state test)
  public clearAllData(): void {
    this.set(STORAGE_KEYS.COURSES, []);
    this.set(STORAGE_KEYS.SECTIONS, []);
    this.set(STORAGE_KEYS.LESSONS, []);
    this.set(STORAGE_KEYS.QUESTIONS, []);
    this.set(STORAGE_KEYS.EXAM_CONFIGS, []);
    this.set(STORAGE_KEYS.ENROLLMENTS, []);
    this.set(STORAGE_KEYS.PROGRESS, []);
    this.set(STORAGE_KEYS.QUIZ_ATTEMPTS, []);
    this.set(STORAGE_KEYS.NOTES, []);
  }

  public resetToDefault(): void {
    this.clearAllData();
    this.set(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  // Analytics helper for Admin Dashboard
  public getPlatformAnalytics() {
    const users = this.getUsers();
    const courses = this.getCourses(true);
    const enrollments = this.getEnrollments();
    const attempts = this.get<QuizAttempt[]>(STORAGE_KEYS.QUIZ_ATTEMPTS, []);

    const studentCount = users.filter((u) => u.role === 'USER').length;
    const adminCount = users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
    const publishedCoursesCount = courses.filter((c) => c.isPublished).length;
    const completedEnrollmentsCount = enrollments.filter((e) => e.progressPercentage === 100).length;

    const totalScores = attempts.reduce((acc, a) => acc + (a.maxScore ? (a.score / a.maxScore) * 100 : 0), 0);
    const averageScore = attempts.length > 0 ? Math.round(totalScores / attempts.length) : 0;

    return {
      totalUsers: users.length,
      studentCount,
      adminCount,
      totalCourses: courses.length,
      publishedCoursesCount,
      totalEnrollments: enrollments.length,
      completedEnrollmentsCount,
      totalAttempts: attempts.length,
      averageScore,
    };
  }

  // Bookmarks
  public getBookmarks(userId: string, courseId?: string, lessonId?: string): LessonBookmark[] {
    let all = this.get<LessonBookmark[]>(STORAGE_KEYS.BOOKMARKS, []);
    all = all.filter((b) => b.userId === userId);
    if (courseId) all = all.filter((b) => b.courseId === courseId);
    if (lessonId) all = all.filter((b) => b.lessonId === lessonId);
    return all.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  }

  public saveBookmark(bookmark: Omit<LessonBookmark, 'id' | 'createdAt'>): LessonBookmark {
    const all = this.get<LessonBookmark[]>(STORAGE_KEYS.BOOKMARKS, []);
    const newBookmark: LessonBookmark = {
      ...bookmark,
      id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    all.push(newBookmark);
    this.set(STORAGE_KEYS.BOOKMARKS, all);
    return newBookmark;
  }

  public deleteBookmark(id: string): void {
    const all = this.get<LessonBookmark[]>(STORAGE_KEYS.BOOKMARKS, []);
    this.set(
      STORAGE_KEYS.BOOKMARKS,
      all.filter((b) => b.id !== id)
    );
  }

  // Notifications
  public getNotifications(userId: string): SystemNotification[] {
    const all = this.get<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return all.filter((n) => n.userId === userId || n.userId === 'all').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public addNotification(notif: Omit<SystemNotification, 'id' | 'createdAt' | 'isRead'>): SystemNotification {
    const all = this.get<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const newNotif: SystemNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newNotif);
    this.set(STORAGE_KEYS.NOTIFICATIONS, all);
    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const all = this.get<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const notif = all.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.set(STORAGE_KEYS.NOTIFICATIONS, all);
    }
  }

  public markAllNotificationsAsRead(userId: string): void {
    const all = this.get<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    all.forEach((n) => {
      if (n.userId === userId || n.userId === 'all') {
        n.isRead = true;
      }
    });
    this.set(STORAGE_KEYS.NOTIFICATIONS, all);
  }

  public deleteNotification(userId: string, id: string): void {
    const all = this.get<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    this.set(
      STORAGE_KEYS.NOTIFICATIONS,
      all.filter((n) => !(n.id === id && (n.userId === userId || n.userId === 'all')))
    );
  }

  // Wishlist
  public getWishlist(userId: string): WishlistItem[] {
    const all = this.get<WishlistItem[]>(STORAGE_KEYS.WISHLIST, []);
    return all.filter((item) => item.userId === userId);
  }

  public isInWishlist(userId: string, courseId: string): boolean {
    const all = this.get<WishlistItem[]>(STORAGE_KEYS.WISHLIST, []);
    return all.some((item) => item.userId === userId && item.courseId === courseId);
  }

  public isCourseInWishlist(userId: string, courseId: string): boolean {
    return this.isInWishlist(userId, courseId);
  }

  public toggleWishlist(userId: string, courseId: string): boolean {
    const all = this.get<WishlistItem[]>(STORAGE_KEYS.WISHLIST, []);
    const idx = all.findIndex((item) => item.userId === userId && item.courseId === courseId);
    let added = false;
    if (idx >= 0) {
      all.splice(idx, 1);
      added = false;
    } else {
      all.push({
        id: `wish_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        userId,
        courseId,
        createdAt: new Date().toISOString(),
      });
      added = true;
    }
    this.set(STORAGE_KEYS.WISHLIST, all);
    return added;
  }

  // Reviews & Ratings
  public getCourseReviews(courseId: string): CourseReview[] {
    const all = this.get<CourseReview[]>(STORAGE_KEYS.REVIEWS, []);
    // Filter out legacy dummy reviews and filter by courseId
    const forCourse = all.filter(
      (r) => r.courseId === courseId && !r.id?.startsWith('rev_admin_') && !r.id?.startsWith('rev_inst_')
    );

    // Ensure deduplication in case of any remaining duplicates
    const uniqueMap = new Map<string, CourseReview>();
    forCourse.forEach((rev) => {
      const existing = uniqueMap.get(rev.userId);
      if (!existing || new Date(rev.createdAt || 0) > new Date(existing.createdAt || 0)) {
        uniqueMap.set(rev.userId, rev);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getUserCourseReview(userId: string, courseId: string): CourseReview | undefined {
    if (!userId || !courseId) return undefined;
    const courseReviews = this.getCourseReviews(courseId);
    return courseReviews.find((r) => r.userId === userId);
  }

  public hasUserReviewedCourse(userId: string, courseId: string): boolean {
    return !!this.getUserCourseReview(userId, courseId);
  }

  public addCourseReview(
    courseIdOrObj: string | Omit<CourseReview, 'id' | 'createdAt'>,
    userId?: string,
    userName?: string,
    rating?: number,
    comment?: string,
    userRole?: string,
    userAvatar?: string
  ): CourseReview {
    let all = this.get<CourseReview[]>(STORAGE_KEYS.REVIEWS, []);

    let targetCourseId = '';
    let targetUserId = '';
    let targetUserName = '';
    let targetRating = 5;
    let targetComment = '';
    let targetUserRole: string | undefined = undefined;
    let targetUserAvatar: string | undefined = undefined;

    if (typeof courseIdOrObj === 'object') {
      targetCourseId = courseIdOrObj.courseId;
      targetUserId = courseIdOrObj.userId;
      targetUserName = courseIdOrObj.userName;
      targetRating = courseIdOrObj.rating;
      targetComment = courseIdOrObj.comment;
      targetUserRole = courseIdOrObj.userRole;
      targetUserAvatar = courseIdOrObj.userAvatar;
    } else {
      targetCourseId = courseIdOrObj;
      targetUserId = userId || 'anonymous';
      targetUserName = userName || '익명 수강생';
      targetRating = rating || 5;
      targetComment = comment || '';
      targetUserRole = userRole;
      targetUserAvatar = userAvatar;
    }

    const clampedRating = Math.max(1, Math.min(5, Math.round(targetRating * 2) / 2)); // support 1 to 5 with accurate step

    // Check if user already submitted a review for this course (중복 등록 방지)
    const existingIndex = all.findIndex(
      (r) => r.courseId === targetCourseId && r.userId === targetUserId
    );

    let savedReview: CourseReview;

    if (existingIndex !== -1) {
      // Overwrite/update existing review instead of creating duplicate
      all[existingIndex] = {
        ...all[existingIndex],
        rating: clampedRating,
        comment: targetComment,
        userName: targetUserName || all[existingIndex].userName,
        userRole: targetUserRole || all[existingIndex].userRole,
        userAvatar: targetUserAvatar || all[existingIndex].userAvatar,
        updatedAt: new Date().toISOString(),
      };
      savedReview = all[existingIndex];
    } else {
      // Create new review
      savedReview = {
        id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        courseId: targetCourseId,
        userId: targetUserId,
        userName: targetUserName,
        userRole: targetUserRole,
        userAvatar: targetUserAvatar,
        rating: clampedRating,
        comment: targetComment,
        createdAt: new Date().toISOString(),
      };
      all.push(savedReview);
    }

    // Clean up any other duplicates or fake placeholder reviews for this course
    const otherReviews = all.filter(
      (r) => r.courseId !== targetCourseId && !r.id?.startsWith('rev_admin_') && !r.id?.startsWith('rev_inst_')
    );
    const thisCourseReviews = all.filter(
      (r) => r.courseId === targetCourseId && !r.id?.startsWith('rev_admin_') && !r.id?.startsWith('rev_inst_')
    );

    // Deduplicate by userId for this course
    const deduplicatedThisCourse = new Map<string, CourseReview>();
    thisCourseReviews.forEach((rev) => {
      deduplicatedThisCourse.set(rev.userId, rev);
    });

    const finalReviews = [...otherReviews, ...Array.from(deduplicatedThisCourse.values())];
    this.set(STORAGE_KEYS.REVIEWS, finalReviews);

    // Accurately recalculate course average rating and review count
    this.recalculateCourseRating(targetCourseId);

    // Persist review to Firestore
    firestoreService.saveReview(savedReview).catch((err) => {
      console.warn('[Storage] Firestore saveReview error:', err);
    });

    return savedReview;
  }

  public updateCourseReview(
    reviewId: string,
    rating: number,
    comment: string
  ): CourseReview | null {
    const all = this.get<CourseReview[]>(STORAGE_KEYS.REVIEWS, []);
    const index = all.findIndex((r) => r.id === reviewId);
    if (index === -1) return null;

    const clampedRating = Math.max(1, Math.min(5, Math.round(rating * 2) / 2));
    all[index] = {
      ...all[index],
      rating: clampedRating,
      comment: comment.trim(),
      updatedAt: new Date().toISOString(),
    };

    this.set(STORAGE_KEYS.REVIEWS, all);
    this.recalculateCourseRating(all[index].courseId);

    firestoreService.saveReview(all[index]).catch((err) => {
      console.warn('[Storage] Firestore saveReview error:', err);
    });

    return all[index];
  }

  public deleteCourseReview(reviewId: string): boolean {
    const all = this.get<CourseReview[]>(STORAGE_KEYS.REVIEWS, []);
    const review = all.find((r) => r.id === reviewId);
    if (!review) return false;

    const courseId = review.courseId;
    const remaining = all.filter((r) => r.id !== reviewId);
    this.set(STORAGE_KEYS.REVIEWS, remaining);

    this.recalculateCourseRating(courseId);

    firestoreService.deleteReview(reviewId).catch((err) => {
      console.warn('[Storage] Firestore deleteReview error:', err);
    });

    return true;
  }

  public recalculateCourseRating(courseId: string): void {
    const courseReviews = this.getCourseReviews(courseId);
    const count = courseReviews.length;
    const sum = courseReviews.reduce((acc, r) => acc + (typeof r.rating === 'number' ? r.rating : 5), 0);
    const avgRating = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

    const courses = this.getCourses(true);
    const targetCourse = courses.find((c) => c.id === courseId);
    if (targetCourse) {
      targetCourse.rating = avgRating;
      targetCourse.reviewsCount = count;
      this.saveCourse(targetCourse);
    }
  }

  // Search History
  public getRecentSearches(userId: string): string[] {
    const all = this.get<Record<string, string[]>>(STORAGE_KEYS.SEARCH_HISTORY, {});
    return all[userId] || [];
  }

  public addRecentSearch(userId: string, query: string): void {
    if (!query.trim()) return;
    const all = this.get<Record<string, string[]>>(STORAGE_KEYS.SEARCH_HISTORY, {});
    const list = all[userId] || [];
    const filtered = list.filter((q) => q.toLowerCase() !== query.trim().toLowerCase());
    filtered.unshift(query.trim());
    all[userId] = filtered.slice(0, 8); // Keep top 8
    this.set(STORAGE_KEYS.SEARCH_HISTORY, all);
  }

  public removeRecentSearch(userId: string, query: string): void {
    const all = this.get<Record<string, string[]>>(STORAGE_KEYS.SEARCH_HISTORY, {});
    const list = all[userId] || [];
    all[userId] = list.filter((q) => q !== query);
    this.set(STORAGE_KEYS.SEARCH_HISTORY, all);
  }

  public deleteRecentSearch(userId: string, query: string): void {
    this.removeRecentSearch(userId, query);
  }

  public clearRecentSearches(userId: string): void {
    const all = this.get<Record<string, string[]>>(STORAGE_KEYS.SEARCH_HISTORY, {});
    delete all[userId];
    this.set(STORAGE_KEYS.SEARCH_HISTORY, all);
  }

  // Progress and Enrollment Helper Methods
  public getProgressByUser(userId: string): LessonProgress[] {
    return this.getAllProgress().filter((p) => p.userId === userId);
  }

  public getEnrollmentsByUser(userId: string): Enrollment[] {
    return this.getEnrollments(userId);
  }

  public getQuizAttemptsByUser(userId: string): QuizAttempt[] {
    return this.getQuizAttempts(userId);
  }

  // Learning Goals & Streak
  public getUserGoal(userId: string): UserLearningGoal {
    const all = this.get<Record<string, UserLearningGoal>>(STORAGE_KEYS.GOALS, {});
    return (
      all[userId] || {
        userId,
        targetHoursWeekly: 10,
        weeklyTargetHours: 10,
        completedHoursThisWeek: 0,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  public getLearningGoal(userId: string): UserLearningGoal {
    return this.getUserGoal(userId);
  }

  public saveUserGoal(userId: string, targetHoursWeekly: number): UserLearningGoal {
    const all = this.get<Record<string, UserLearningGoal>>(STORAGE_KEYS.GOALS, {});
    const goal: UserLearningGoal = {
      userId,
      targetHoursWeekly,
      weeklyTargetHours: targetHoursWeekly,
      completedHoursThisWeek: 0,
      updatedAt: new Date().toISOString(),
    };
    all[userId] = goal;
    this.set(STORAGE_KEYS.GOALS, all);
    return goal;
  }

  public updateLearningGoal(userId: string, targetHoursWeekly: number): UserLearningGoal {
    return this.saveUserGoal(userId, targetHoursWeekly);
  }

  public getUserStreak(userId: string): number {
    const progresses = this.getProgressByUser(userId);
    if (!progresses || progresses.length === 0) return 0;

    const dates = Array.from(
      new Set(
        progresses
          .map((p) => (p.lastWatchedAt ? p.lastWatchedAt.split('T')[0] : ''))
          .filter(Boolean)
      )
    )
      .sort()
      .reverse();

    if (dates.length === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // If neither today nor yesterday has activity, streak is 0
    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 1;
    let currDate = new Date(dates[0]);

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i]);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        streak++;
        currDate = prevDate;
      } else {
        break;
      }
    }

    return streak;
  }

  public getUserActivityHeatmap(userId: string): Record<string, number> {
    const progresses = this.getProgressByUser(userId);
    const map: Record<string, number> = {};
    progresses.forEach((p) => {
      if (p.lastWatchedAt) {
        const d = p.lastWatchedAt.split('T')[0];
        map[d] = (map[d] || 0) + (p.watchedSeconds || 0);
      }
    });
    return map;
  }

  public getUserBadges(userId: string): AchievementBadge[] {
    const user = this.getUser(userId);
    const isAdmin = !!(user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'));

    const enrollments = this.getEnrollmentsByUser(userId);
    const progresses = this.getProgressByUser(userId);
    const attempts = this.getQuizAttemptsByUser(userId);
    const streak = this.getUserStreak(userId);

    const completedEnrollments = enrollments
      .filter((e) => e.progressPercentage === 100)
      .sort((a, b) => (a.completedAt || a.enrolledAt || '').localeCompare(b.completedAt || b.enrolledAt || ''));
    const completedCount = completedEnrollments.length;

    const totalWatchedSeconds = progresses.reduce((sum, p) => sum + (p.watchedSeconds || 0), 0);
    const latestProgress = [...progresses].sort((a, b) => (b.lastWatchedAt || '').localeCompare(a.lastWatchedAt || ''))[0];

    const perfectAttempt = attempts.find((a) => (a.maxScore || 100) > 0 && a.score === (a.maxScore || 100));
    const hasPerfectScore = !!perfectAttempt;

    const passedAttempts = attempts
      .filter((a) => a.passed)
      .sort((a, b) => (a.attemptedAt || '').localeCompare(b.attemptedAt || ''));
    const passedQuizCount = passedAttempts.length;
    const userGoal = this.getUserGoal(userId);

    const safePercent = (curr: number, req: number) => {
      if (!req || req <= 0) return 0;
      const p = Math.round(((curr || 0) / req) * 100);
      return Math.min(100, Math.max(0, isNaN(p) ? 0 : p));
    };

    // Standard LMS Learning Badges (Activity Based)
    const standardBadges: AchievementBadge[] = [
      {
        id: 'badge_first_course',
        title: '첫 학습 시작',
        description: '첫 번째 정규 과정을 100% 완강하여 배움의 첫걸음을 성공적으로 내디뎠습니다.',
        conditionText: '정규 강의 1개 과정을 100% 완강 및 수료하기',
        icon: '🌱',
        category: 'completion',
        tier: 'bronze',
        rarity: 'COMMON',
        requiredCount: 1,
        currentCount: completedCount,
        progressPercent: safePercent(completedCount, 1),
        unlocked: completedCount >= 1,
        earned: completedCount >= 1,
        earnedAt: completedCount >= 1 ? (completedEnrollments[0]?.completedAt || completedEnrollments[0]?.enrolledAt) : undefined,
        badgeType: 'STARTER',
        unit: '개 과정',
        isAdminOnly: false,
      },
      {
        id: 'badge_passionate_learner',
        title: '꾸준한 학습',
        description: '3개 이상의 정규 과정을 성실히 완주하며 지속적인 학습 습관을 형성했습니다.',
        conditionText: '정규 강의 3개 과정을 100% 완강 및 수료하기',
        icon: '📚',
        category: 'completion',
        tier: 'silver',
        rarity: 'RARE',
        requiredCount: 3,
        currentCount: completedCount,
        progressPercent: safePercent(completedCount, 3),
        unlocked: completedCount >= 3,
        earned: completedCount >= 3,
        earnedAt: completedCount >= 3 ? (completedEnrollments[2]?.completedAt || completedEnrollments[2]?.enrolledAt) : undefined,
        badgeType: 'PASSIONATE',
        unit: '개 과정',
        isAdminOnly: false,
      },
      {
        id: 'badge_knowledge_explorer',
        title: '역량 확장',
        description: '총 5개 과정을 성공적으로 이수하여 직무 실무 역량을 다각도로 확장했습니다.',
        conditionText: '정규 강의 5개 과정을 100% 완강 및 수료하기',
        icon: '📈',
        category: 'completion',
        tier: 'gold',
        rarity: 'EPIC',
        requiredCount: 5,
        currentCount: completedCount,
        progressPercent: safePercent(completedCount, 5),
        unlocked: completedCount >= 5,
        earned: completedCount >= 5,
        earnedAt: completedCount >= 5 ? (completedEnrollments[4]?.completedAt || completedEnrollments[4]?.enrolledAt) : undefined,
        badgeType: 'EXPLORER',
        unit: '개 과정',
        isAdminOnly: false,
      },
      {
        id: 'badge_course_master',
        title: '전문성 달성',
        description: '10개 이상의 핵심 교육과정을 완강하여 분야별 높은 전문성을 입증했습니다.',
        conditionText: '정규 강의 10개 과정을 100% 완강 및 수료하기',
        icon: '🎓',
        category: 'completion',
        tier: 'platinum',
        rarity: 'LEGENDARY',
        requiredCount: 10,
        currentCount: completedCount,
        progressPercent: safePercent(completedCount, 10),
        unlocked: completedCount >= 10,
        earned: completedCount >= 10,
        earnedAt: completedCount >= 10 ? (completedEnrollments[9]?.completedAt || completedEnrollments[9]?.enrolledAt) : undefined,
        badgeType: 'MASTER',
        unit: '개 과정',
        isAdminOnly: false,
      },
      {
        id: 'badge_grand_master',
        title: '학습 완주',
        description: '총 20개 이상의 사내 교육과정을 모두 완강한 TDSN 최고 수준의 명예 학습자입니다.',
        conditionText: '정규 강의 20개 과정을 100% 완강 및 수료하기',
        icon: '🏆',
        category: 'completion',
        tier: 'diamond',
        rarity: 'LEGENDARY',
        requiredCount: 20,
        currentCount: completedCount,
        progressPercent: safePercent(completedCount, 20),
        unlocked: completedCount >= 20,
        earned: completedCount >= 20,
        earnedAt: completedCount >= 20 ? (completedEnrollments[19]?.completedAt || completedEnrollments[19]?.enrolledAt) : undefined,
        badgeType: 'GRAND_MASTER',
        unit: '개 과정',
        isAdminOnly: false,
      },
      {
        id: 'badge_10h',
        title: '학습 시간 누적',
        description: '누적 동영상 강의 시청 시간 10시간(36,000초)을 성실히 달성했습니다.',
        conditionText: '누적 동영상 시청 시간 10시간(36,000초) 달성하기',
        icon: '⏱️',
        category: 'time',
        tier: 'silver',
        rarity: 'RARE',
        requiredCount: 36000,
        currentCount: totalWatchedSeconds,
        progressPercent: safePercent(totalWatchedSeconds, 36000),
        unlocked: totalWatchedSeconds >= 36000,
        earned: totalWatchedSeconds >= 36000,
        earnedAt: totalWatchedSeconds >= 36000 ? latestProgress?.lastWatchedAt : undefined,
        unit: '초',
        isAdminOnly: false,
      },
      {
        id: 'badge_streak_7',
        title: '성실한 출석',
        description: '학습 공백 없이 7일 연속으로 강의실에 출석하여 자기주도 학습을 실천했습니다.',
        conditionText: '7일간 연속으로 1회 이상 학습 활동 이어가기',
        icon: '📅',
        category: 'streak',
        tier: 'gold',
        rarity: 'EPIC',
        requiredCount: 7,
        currentCount: streak,
        progressPercent: safePercent(streak, 7),
        unlocked: streak >= 7,
        earned: streak >= 7,
        earnedAt: streak >= 7 ? new Date().toISOString() : undefined,
        unit: '일 연속',
        isAdminOnly: false,
      },
      {
        id: 'badge_perfect_quiz',
        title: '우수 학습 성취',
        description: '과정 내 차시별 퀴즈 또는 종합 평가에서 오답 없이 100점 만점을 기록했습니다.',
        conditionText: '과정 내 퀴즈 또는 테스트에서 100점 만점 1회 달성하기',
        icon: '⭐',
        category: 'quiz',
        tier: 'gold',
        rarity: 'EPIC',
        requiredCount: 1,
        currentCount: hasPerfectScore ? 1 : 0,
        progressPercent: hasPerfectScore ? 100 : 0,
        unlocked: hasPerfectScore,
        earned: hasPerfectScore,
        earnedAt: perfectAttempt?.attemptedAt,
        unit: '회 달성',
        isAdminOnly: false,
      },
      {
        id: 'badge_quiz_pass_3',
        title: '평가 기준 통과',
        description: '3회 이상의 퀴즈 및 평가 테스트에서 이수 기준 점수를 우수하게 통과했습니다.',
        conditionText: '퀴즈 및 평가 테스트 기준 점수를 3회 이상 합격(Pass)하기',
        icon: '✅',
        category: 'quiz',
        tier: 'bronze',
        rarity: 'COMMON',
        requiredCount: 3,
        currentCount: passedQuizCount,
        progressPercent: safePercent(passedQuizCount, 3),
        unlocked: passedQuizCount >= 3,
        earned: passedQuizCount >= 3,
        earnedAt: passedAttempts[2]?.attemptedAt,
        unit: '회 합격',
        isAdminOnly: false,
      },
      {
        id: 'badge_assignment_complete',
        title: '과제 완주',
        description: '지정된 정규 과제 및 실습 미션을 모두 기한 내 성실히 제출 완료했습니다.',
        conditionText: '수강 과정 내 부여된 모든 과제 및 실무 미션 제출하기',
        icon: '📋',
        category: 'completion',
        tier: 'gold',
        rarity: 'EPIC',
        requiredCount: 1,
        currentCount: completedCount >= 1 ? 1 : 0,
        progressPercent: completedCount >= 1 ? 100 : 0,
        unlocked: completedCount >= 1,
        earned: completedCount >= 1,
        earnedAt: completedCount >= 1 ? completedEnrollments[0]?.completedAt : undefined,
        unit: '회 완료',
        isAdminOnly: false,
      },
      {
        id: 'badge_goal_reached',
        title: '목표 달성',
        description: '주간 및 월간으로 직접 설정한 자기주도 학습 목표 시간을 100% 달성했습니다.',
        conditionText: '설정한 주간 학습 목표 시간을 100% 충족하기',
        icon: '🎯',
        category: 'mastery',
        tier: 'platinum',
        rarity: 'LEGENDARY',
        requiredCount: 1,
        currentCount: (userGoal && (userGoal.completedHoursThisWeek || 0) >= (userGoal.weeklyTargetHours || 5)) ? 1 : 0,
        progressPercent: (userGoal && (userGoal.completedHoursThisWeek || 0) >= (userGoal.weeklyTargetHours || 5)) ? 100 : 50,
        unlocked: !!(userGoal && (userGoal.completedHoursThisWeek || 0) >= (userGoal.weeklyTargetHours || 5)),
        earned: !!(userGoal && (userGoal.completedHoursThisWeek || 0) >= (userGoal.weeklyTargetHours || 5)),
        earnedAt: userGoal?.updatedAt,
        unit: '회 달성',
        isAdminOnly: false,
      },
      {
        id: 'badge_study_leader',
        title: '스터디 리더',
        description: '사내 동료들과 자율 학습 스터디를 결성하고 적극적으로 학습을 리드했습니다.',
        conditionText: '사내 스터디 그룹 활동 및 지식 공유 리드하기',
        icon: '👥',
        category: 'mastery',
        tier: 'gold',
        rarity: 'EPIC',
        requiredCount: 1,
        currentCount: completedCount >= 2 ? 1 : 0,
        progressPercent: completedCount >= 2 ? 100 : 30,
        unlocked: completedCount >= 2,
        earned: completedCount >= 2,
        earnedAt: completedCount >= 2 ? completedEnrollments[1]?.completedAt : undefined,
        unit: '그룹 참여',
        isAdminOnly: false,
      },
      {
        id: 'badge_community_active',
        title: '커뮤니티 활동가',
        description: '강의 Q&A 및 토론 게시판에서 동료 학습자들과 유익한 질문과 답변을 교류했습니다.',
        conditionText: '커뮤니티 및 질문 게시판에 활발히 활동하기',
        icon: '💬',
        category: 'streak',
        tier: 'bronze',
        rarity: 'COMMON',
        requiredCount: 1,
        currentCount: 1,
        progressPercent: 100,
        unlocked: true,
        earned: true,
        earnedAt: user?.createdAt || '2026-01-01T00:00:00.000Z',
        unit: '활동',
        isAdminOnly: false,
      },
    ];

    // Admin Exclusive Achievements (Special Tier, Verified Admin Role strictly required)
    const adminBadges: AchievementBadge[] = [
      {
        id: 'badge_admin_ops',
        title: '운영 관리자',
        description: '서비스 운영 및 플랫폼 전반의 정책 설정을 관장하는 관리자 전용 업적입니다.',
        conditionText: '사내 서비스 운영 및 사용자 정책 관리 권한 보유',
        icon: '👑',
        category: 'admin',
        tier: 'admin',
        rarity: 'SPECIAL',
        requiredCount: 1,
        currentCount: isAdmin ? 1 : 0,
        progressPercent: isAdmin ? 100 : 0,
        unlocked: isAdmin,
        earned: isAdmin,
        earnedAt: isAdmin ? (user?.createdAt || '2026-01-01T00:00:00.000Z') : undefined,
        badgeType: 'ADMIN',
        unit: '권한',
        isAdminOnly: true,
      },
      {
        id: 'badge_admin_data',
        title: '데이터 관리자',
        description: '전사 수강생의 진도율 및 학습 분석 통계 빅데이터를 총괄 분석하는 관리자 전용 업적입니다.',
        conditionText: '전사 수강생 진도율 및 학습 분석 통계 관리 권한 보유',
        icon: '📊',
        category: 'admin',
        tier: 'admin',
        rarity: 'SPECIAL',
        requiredCount: 1,
        currentCount: isAdmin ? 1 : 0,
        progressPercent: isAdmin ? 100 : 0,
        unlocked: isAdmin,
        earned: isAdmin,
        earnedAt: isAdmin ? (user?.createdAt || '2026-01-01T00:00:00.000Z') : undefined,
        badgeType: 'ADMIN',
        unit: '권한',
        isAdminOnly: true,
      },
      {
        id: 'badge_admin_super',
        title: '서비스 총괄',
        description: 'LMS 플랫폼 전권을 총괄하는 서비스 총괄 전용 업적입니다.',
        conditionText: '플랫폼 최상위 서비스 총괄(SERVICE_OWNER) 권한 보유',
        icon: '🌟',
        category: 'admin',
        tier: 'admin',
        rarity: 'SPECIAL',
        requiredCount: 1,
        currentCount: isAdmin ? 1 : 0,
        progressPercent: isAdmin ? 100 : 0,
        unlocked: isAdmin,
        earned: isAdmin,
        earnedAt: isAdmin ? (user?.createdAt || '2026-01-01T00:00:00.000Z') : undefined,
        badgeType: 'ADMIN',
        unit: '권한',
        isAdminOnly: true,
      },
      {
        id: 'badge_admin_cert',
        title: '수료 인증관',
        description: '교육과정 이수 요건을 정밀 검증하고 디지털 수료증 발급을 관장하는 공인 관리자 전용 업적입니다.',
        conditionText: '공식 수료증 발급 및 인증번호 위변조 검증 관리 권한 보유',
        icon: '📜',
        category: 'admin',
        tier: 'admin',
        rarity: 'SPECIAL',
        requiredCount: 1,
        currentCount: isAdmin ? 1 : 0,
        progressPercent: isAdmin ? 100 : 0,
        unlocked: isAdmin,
        earned: isAdmin,
        earnedAt: isAdmin ? (user?.createdAt || '2026-01-01T00:00:00.000Z') : undefined,
        badgeType: 'ADMIN',
        unit: '권한',
        isAdminOnly: true,
      },
    ];

    // Administrator auto-earns all badges (Requirement 15)
    if (isAdmin) {
      standardBadges.forEach((b) => {
        b.unlocked = true;
        b.earned = true;
        b.progressPercent = 100;
        if (!b.earnedAt) {
          b.earnedAt = user?.createdAt || '2026-01-01T00:00:00.000Z';
        }
      });
    }

    const allBadges = isAdmin ? [...standardBadges, ...adminBadges] : standardBadges;

    // Apply custom badge title overrides (Requirement 16)
    const titleOverrides = this.getBadgeNameOverrides();
    allBadges.forEach((b) => {
      if (titleOverrides[b.id]) {
        b.title = titleOverrides[b.id];
      }
    });

    return allBadges;
  }

  public getBadgeNameOverrides(): Record<string, string> {
    return this.get<Record<string, string>>(STORAGE_KEYS.BADGE_NAME_OVERRIDES, {});
  }

  public setBadgeTitle(badgeId: string, newTitle: string, actorId?: string): boolean {
    if (!badgeId || !newTitle.trim()) return false;
    if (actorId) {
      const actor = this.getUser(actorId);
      if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN')) {
        return false;
      }
    }
    const overrides = this.getBadgeNameOverrides();
    overrides[badgeId] = newTitle.trim();
    this.set(STORAGE_KEYS.BADGE_NAME_OVERRIDES, overrides);
    return true;
  }

  public getCustomFrames(userId?: string): CustomFrameConfig[] {
    const list = this.get<CustomFrameConfig[]>(STORAGE_KEYS.CUSTOM_FRAMES, []);
    return list;
  }

  public saveCustomFrame(userId: string, frame: CustomFrameConfig): CustomFrameConfig {
    const user = this.getUser(userId);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    const list = this.getCustomFrames();
    const existingIndex = list.findIndex((f) => f.id === frame.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...frame, updatedAt: new Date().toISOString() };
    } else {
      list.push({ ...frame, createdAt: new Date().toISOString() });
    }
    this.set(STORAGE_KEYS.CUSTOM_FRAMES, list);
    return frame;
  }

  public deleteCustomFrame(userId: string, frameId: string): boolean {
    const user = this.getUser(userId);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return false;
    }
    let list = this.getCustomFrames();
    const beforeLen = list.length;
    list = list.filter((f) => f.id !== frameId);
    this.set(STORAGE_KEYS.CUSTOM_FRAMES, list);
    return list.length < beforeLen;
  }

  public getUserBadgeTitle(userId: string): { title: string; badge: string; color: string; tier: string } {
    const user = this.getUser(userId);
    const isServiceGeneral = !!(user && (user.role === 'SUPER_ADMIN' || user.role === 'SERVICE_OWNER'));
    const isAdmin = !!(user && (
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'SERVICE_OWNER' ||
      user.role === 'SECURITY_MANAGER' ||
      user.role === 'CONTENT_MANAGER' ||
      user.role === 'LEARNING_MANAGER' ||
      user.role === 'COMMUNITY_MANAGER' ||
      user.role === 'USER_MANAGER' ||
      user.role === 'OPERATIONS_MANAGER'
    ));
    const enrollments = this.getEnrollmentsByUser(userId);
    const completedCount = enrollments.filter((e) => e.progressPercentage === 100).length;

    if (isServiceGeneral) {
      return {
        title: '서비스 총괄',
        badge: '✦',
        color: 'bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 text-amber-300 border border-amber-400/50',
        tier: 'ADMIN',
      };
    }
    if (isAdmin) {
      return {
        title: '공식 운영진',
        badge: '🛡️',
        color: 'bg-slate-900 text-amber-300 border border-amber-400/40',
        tier: 'ADMIN',
      };
    }
    if (completedCount >= 20) {
      return { title: '학습 완주자', badge: '🏆', color: 'bg-purple-600 text-white', tier: 'LEGENDARY' };
    }
    if (completedCount >= 10) {
      return { title: '전문성 달성', badge: '🎓', color: 'bg-cyan-600 text-white', tier: 'PLATINUM' };
    }
    if (completedCount >= 5) {
      return { title: '역량 확장', badge: '📈', color: 'bg-amber-600 text-white', tier: 'GOLD' };
    }
    if (completedCount >= 3) {
      return { title: '꾸준한 학습자', badge: '📚', color: 'bg-indigo-600 text-white', tier: 'SILVER' };
    }
    if (completedCount >= 1) {
      return { title: '첫 학습 시작', badge: '🌱', color: 'bg-emerald-600 text-white', tier: 'BRONZE' };
    }
    return { title: '도전 학습자', badge: '📖', color: 'bg-slate-700 text-white', tier: 'ROOKIE' };
  }

  public getBadges(userId: string): AchievementBadge[] {
    return this.getUserBadges(userId);
  }

  /**
   * Equips or unequips an achievement as the user's profile decoration.
   * Performs server-equivalent role validation: non-admins cannot equip admin badges!
   */
  public equipAchievement(
    userId: string,
    achievementId: string | null
  ): { success: boolean; message: string; user?: User } {
    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: '사용자를 찾을 수 없습니다.' };
    }

    // Unequip to default
    if (!achievementId) {
      target.equippedAchievementId = null;
      this.set(STORAGE_KEYS.USERS, users);
      const cur = this.getCurrentUser();
      if (cur && cur.id === userId) {
        this.setCurrentUser({ ...cur, equippedAchievementId: null });
      }
      firestoreService.saveUser(target).catch(() => {});
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: target }));
      }
      return { success: true, message: '기본 장식으로 변경되었습니다.', user: target };
    }

    const isAdmin =
      target.role === 'ADMIN' ||
      target.role === 'SUPER_ADMIN' ||
      isServiceOwner(target.role) ||
      (typeof target.role === 'string' && target.role.endsWith('_MANAGER'));

    // Support custom frame equipping
    if (achievementId.startsWith('custom_frame_')) {
      if (!isAdmin) {
        return {
          success: false,
          message: '관리자 전용 커스텀 프레임은 관리자 권한을 가진 사용자만 장착할 수 있습니다.',
        };
      }
      target.equippedAchievementId = achievementId;
      this.set(STORAGE_KEYS.USERS, users);
      const cur = this.getCurrentUser();
      if (cur && cur.id === userId) {
        this.setCurrentUser({ ...cur, equippedAchievementId: achievementId });
      }
      firestoreService.saveUser(target).catch(() => {});
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: target }));
      }
      return {
        success: true,
        message: '커스텀 프레임이 프로필에 적용되었습니다.',
        user: target,
      };
    }

    const badges = this.getUserBadges(userId);
    const badge = badges.find((b) => b.id === achievementId);
    if (!badge) {
      return { success: false, message: '존재하지 않는 업적입니다.' };
    }

    // Must be unlocked/earned
    if (!badge.unlocked && !badge.earned) {
      return { success: false, message: '획득하지 않은 업적은 프로필 장식으로 장착할 수 없습니다.' };
    }

    if (badge.isAdminOnly && !isAdmin) {
      return {
        success: false,
        message: '관리자 전용 업적은 관리자 권한을 가진 사용자만 장착할 수 있습니다.',
      };
    }

    target.equippedAchievementId = achievementId;
    this.set(STORAGE_KEYS.USERS, users);
    const cur = this.getCurrentUser();
    if (cur && cur.id === userId) {
      this.setCurrentUser({ ...cur, equippedAchievementId: achievementId });
    }
    firestoreService.saveUser(target).catch(() => {});
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: target }));
    }

    return {
      success: true,
      message: `'${badge.title}' 업적 장식이 프로필에 적용되었습니다.`,
      user: target,
    };
  }

  /**
   * Retrieves the currently equipped badge object for a user, validating role entitlement.
   */
  public getUserEquippedBadge(userId: string): AchievementBadge | null {
    const user = this.getUser(userId);
    if (!user || !user.equippedAchievementId) return null;

    const badges = this.getUserBadges(userId);
    const badge = badges.find((b) => b.id === user.equippedAchievementId);
    if (!badge) return null;

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    if (badge.isAdminOnly && !isAdmin) {
      return null;
    }

    if (!badge.unlocked && !badge.earned) {
      return null;
    }

    return badge;
  }

  // Course Announcements Management
  public getCourseAnnouncements(courseId?: string): CourseAnnouncement[] {
    const all = this.get<CourseAnnouncement[]>(STORAGE_KEYS.COURSE_ANNOUNCEMENTS, []);
    if (!courseId) {
      return all.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return all
      .filter((a) => a.courseId === courseId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  public getCourseAnnouncementById(id: string): CourseAnnouncement | undefined {
    const all = this.get<CourseAnnouncement[]>(STORAGE_KEYS.COURSE_ANNOUNCEMENTS, []);
    return all.find((a) => a.id === id);
  }

  public saveCourseAnnouncement(announcement: CourseAnnouncement): CourseAnnouncement {
    const all = this.get<CourseAnnouncement[]>(STORAGE_KEYS.COURSE_ANNOUNCEMENTS, []);
    const idx = all.findIndex((a) => a.id === announcement.id);

    let updated: CourseAnnouncement;
    if (idx >= 0) {
      updated = {
        ...all[idx],
        ...announcement,
        updatedAt: new Date().toISOString(),
      };
      all[idx] = updated;
    } else {
      updated = {
        ...announcement,
        createdAt: announcement.createdAt || new Date().toISOString(),
      };
      all.unshift(updated);
    }

    this.set(STORAGE_KEYS.COURSE_ANNOUNCEMENTS, all);

    // Keep course.notice synchronized with the latest announcement
    const course = this.getCourseById(announcement.courseId);
    if (course) {
      course.notice = announcement.content;
      this.saveCourse(course);
    }

    // Persist to Firestore
    firestoreService.saveCourseAnnouncement(updated).catch((err) => {
      console.warn('[Storage] Firestore saveCourseAnnouncement error:', err);
    });

    window.dispatchEvent(new Event('tdsnt_announcement_change'));
    window.dispatchEvent(new Event('storage'));

    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.addAuditLog({
        actorId: currentUser.id,
        actorName: currentUser.name,
        targetCourseId: announcement.courseId,
        targetCourseTitle: course?.title,
        action: idx >= 0 ? 'ANNOUNCEMENT_UPDATE' : 'ANNOUNCEMENT_CREATE',
        details: `강의 공지사항 ${idx >= 0 ? '수정' : '등록'}: "${updated.title}" (${course?.title || '강의'})`,
      });
    }

    return updated;
  }

  public deleteCourseAnnouncement(id: string): void {
    const all = this.get<CourseAnnouncement[]>(STORAGE_KEYS.COURSE_ANNOUNCEMENTS, []);
    const target = all.find((a) => a.id === id);
    const filtered = all.filter((a) => a.id !== id);
    this.set(STORAGE_KEYS.COURSE_ANNOUNCEMENTS, filtered);

    // Delete from Firestore
    firestoreService.deleteCourseAnnouncement(id).catch((err) => {
      console.warn('[Storage] Firestore deleteCourseAnnouncement error:', err);
    });

    window.dispatchEvent(new Event('tdsnt_announcement_change'));
    window.dispatchEvent(new Event('storage'));

    // If deleted announcement belonged to a course, sync remaining notice
    if (target) {
      const remainingForCourse = filtered.filter((a) => a.courseId === target.courseId);
      const course = this.getCourseById(target.courseId);
      if (course) {
        course.notice = remainingForCourse.length > 0 ? remainingForCourse[0].content : '';
        this.saveCourse(course);
      }
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        this.addAuditLog({
          actorId: currentUser.id,
          actorName: currentUser.name,
          targetCourseId: target.courseId,
          targetCourseTitle: course?.title,
          action: 'ANNOUNCEMENT_DELETE',
          details: `강의 공지사항 삭제: "${target.title}" (${course?.title || '강의'})`,
        });
      }
    }
  }

  // System-wide Announcements Management
  public getSystemAnnouncements(): SystemAnnouncement[] {
    let all = this.get<SystemAnnouncement[]>(STORAGE_KEYS.SYSTEM_ANNOUNCEMENTS, []);
    if (!all || all.length === 0) {
      // Seed with initial default announcement matching current settings
      const settings = this.getSettings();
      const initialAnn: SystemAnnouncement = {
        id: 'sys_ann_default',
        title: '2026년 TDSN LMS 아카데미 온라인 실무 역량 강화 교육과정 오픈',
        content: settings.announcement || DEFAULT_SETTINGS.announcement || '',
        isActive: settings.showAnnouncement !== false,
        priority: 'important',
        createdAt: new Date().toISOString(),
        authorName: '서비스 총괄',
        authorRole: 'SERVICE_OWNER',
      };
      all = [initialAnn];
      this.set(STORAGE_KEYS.SYSTEM_ANNOUNCEMENTS, all);
      // Persist initial to Firestore as well
      firestoreService.saveSystemAnnouncement(initialAnn).catch(() => {});
    }
    return all;
  }

  public saveSystemAnnouncement(announcement: SystemAnnouncement): SystemAnnouncement {
    const all = this.getSystemAnnouncements();
    const idx = all.findIndex((a) => a.id === announcement.id);
    let updated: SystemAnnouncement;

    if (idx >= 0) {
      updated = {
        ...all[idx],
        ...announcement,
        updatedAt: new Date().toISOString(),
      };
      all[idx] = updated;
    } else {
      updated = {
        ...announcement,
        createdAt: announcement.createdAt || new Date().toISOString(),
      };
      all.unshift(updated);
    }

    // If this announcement is marked active, sync with global portal banner
    if (updated.isActive) {
      all.forEach((item) => {
        if (item.id !== updated.id) {
          item.isActive = false;
        }
      });
      const settings = this.getSettings();
      settings.announcement = updated.content;
      settings.showAnnouncement = true;
      settings.announcementUpdatedAt = new Date().toISOString();
      this.saveSettings(settings);
    } else {
      const settings = this.getSettings();
      if (settings.announcement === updated.content) {
        const otherActive = all.find((a) => a.id !== updated.id && a.isActive);
        if (otherActive) {
          settings.announcement = otherActive.content;
          settings.showAnnouncement = true;
        } else {
          settings.showAnnouncement = false;
        }
        this.saveSettings(settings);
      }
    }

    this.set(STORAGE_KEYS.SYSTEM_ANNOUNCEMENTS, all);

    // Persist all system announcements to Firestore
    all.forEach((item) => {
      firestoreService.saveSystemAnnouncement(item).catch((err) => {
        console.warn('[Storage] Firestore saveSystemAnnouncement error:', err);
      });
    });

    window.dispatchEvent(new Event('tdsnt_announcement_change'));
    window.dispatchEvent(new Event('storage'));

    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.addAuditLog({
        actorId: currentUser.id,
        actorName: currentUser.name,
        targetAnnouncementId: updated.id,
        targetAnnouncementTitle: updated.title,
        action: idx >= 0 ? 'ANNOUNCEMENT_UPDATE' : 'ANNOUNCEMENT_CREATE',
        details: idx >= 0
          ? `전사 시스템 공지 수정: "${updated.title}"`
          : `신규 전사 공지 등록: "${updated.title}" (상태: ${updated.isActive ? '메인 즉시 게시' : '비공개'})`,
      });
    }

    return updated;
  }

  public deleteSystemAnnouncement(id: string): void {
    const all = this.getSystemAnnouncements();
    const target = all.find((a) => a.id === id);
    const filtered = all.filter((a) => a.id !== id);
    this.set(STORAGE_KEYS.SYSTEM_ANNOUNCEMENTS, filtered);

    // Delete from Firestore
    firestoreService.deleteSystemAnnouncement(id).catch((err) => {
      console.warn('[Storage] Firestore deleteSystemAnnouncement error:', err);
    });

    if (target && target.isActive) {
      const nextActive = filtered.find((a) => a.isActive);
      const settings = this.getSettings();
      if (nextActive) {
        settings.announcement = nextActive.content;
        settings.showAnnouncement = true;
      } else {
        settings.announcement = '';
        settings.showAnnouncement = false;
      }
      this.saveSettings(settings);
    }

    window.dispatchEvent(new Event('tdsnt_announcement_change'));
    window.dispatchEvent(new Event('storage'));

    const currentUser = this.getCurrentUser();
    if (currentUser && target) {
      this.addAuditLog({
        actorId: currentUser.id,
        actorName: currentUser.name,
        targetAnnouncementId: target.id,
        targetAnnouncementTitle: target.title,
        action: 'ANNOUNCEMENT_DELETE',
        details: `전사 시스템 공지 삭제: "${target.title}"`,
      });
    }
  }

  public toggleSystemAnnouncementActive(id: string, active: boolean): void {
    const all = this.getSystemAnnouncements();
    const target = all.find((a) => a.id === id);
    if (!target) return;

    if (active) {
      all.forEach((a) => {
        a.isActive = a.id === id;
      });
      const settings = this.getSettings();
      settings.announcement = target.content;
      settings.showAnnouncement = true;
      settings.announcementUpdatedAt = new Date().toISOString();
      this.saveSettings(settings);
    } else {
      target.isActive = false;
      const settings = this.getSettings();
      if (settings.announcement === target.content) {
        settings.showAnnouncement = false;
        this.saveSettings(settings);
      }
    }
    this.set(STORAGE_KEYS.SYSTEM_ANNOUNCEMENTS, all);

    // Persist to Firestore
    all.forEach((item) => {
      firestoreService.saveSystemAnnouncement(item).catch((err) => {
        console.warn('[Storage] Firestore toggleSystemAnnouncementActive error:', err);
      });
    });

    window.dispatchEvent(new Event('tdsnt_announcement_change'));
    window.dispatchEvent(new Event('storage'));

    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.addAuditLog({
        actorId: currentUser.id,
        actorName: currentUser.name,
        targetAnnouncementId: target.id,
        targetAnnouncementTitle: target.title,
        action: 'ANNOUNCEMENT_UPDATE',
        details: `전사 공지 게시 상태 전환: "${target.title}" (${active ? '메인 포털 게시 시작' : '게시 중단'})`,
      });
    }
  }
}

export const storage = new TDSNTLMSStorage();
storage.initialize();
