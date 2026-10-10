import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  Firestore,
  onSnapshot,
} from 'firebase/firestore';
import {
  User,
  LessonProgress,
  CourseReview,
  VideoMetadata,
  Course,
  CourseSection,
  Lesson,
  SystemAnnouncement,
  CourseAnnouncement,
  SystemSettings,
  Inquiry,
} from '../types';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  measurementId: firebaseConfigJson.measurementId,
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID from config
export const db: Firestore = firebaseConfigJson.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Authentication for Google Social Login
export const auth: Auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in using Firebase Google Auth Popup
 */
export async function signInWithGoogleAuth(): Promise<{ user: any; credential?: any }> {
  const result = await signInWithPopup(auth, googleAuthProvider);
  return {
    user: result.user,
    credential: GoogleAuthProvider.credentialFromResult(result),
  };
}

/**
 * Firebase Firestore Service for TDSNTLMS
 * Persistent Cloud Database for Users, Learning Progress, Enrollments, Reviews, and Certificates
 */
export const firestoreService = {
  // ====================================================
  // USERS COLLECTION
  // ====================================================

  /**
   * Save or update user profile in Firestore
   */
  async saveUser(user: User): Promise<boolean> {
    if (!user || !user.id) return false;
    try {
      const userRef = doc(db, 'users', user.id);
      const cleanEmail = (user.email || '').toLowerCase().trim();
      const isAdminAccount =
        cleanEmail === 'teamdevstudiont@gmail.com' ||
        cleanEmail === 'eunyool100208@gmail.com' ||
        cleanEmail === 'deer123424@gmail.com' ||
        cleanEmail === 'ayun24song@gmail.com' ||
        user.id === 'TDSNTLMS' ||
        user.id === 'admin_EunYool' ||
        user.id === 'admin_ayun24song';

      // Strictly guard against overwriting protected admin roles with USER
      let finalRole = user.role;
      if (isAdminAccount && (!finalRole || finalRole === 'USER')) {
        finalRole = 'SUPER_ADMIN';
      } else if (!finalRole) {
        finalRole = 'USER';
      }

      const cleanData: Record<string, any> = {
        id: user.id,
        name: user.name || '',
        email: cleanEmail,
        role: finalRole,
        status: user.status || 'ACTIVE',
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (user.nickname !== undefined) cleanData.nickname = user.nickname;
      if (user.avatar !== undefined) cleanData.avatar = user.avatar;
      if (user.phone !== undefined) cleanData.phone = user.phone;
      if (user.bio !== undefined) cleanData.bio = user.bio;
      if (user.equippedAchievementId !== undefined) cleanData.equippedAchievementId = user.equippedAchievementId;
      if (user.kakaoId !== undefined) cleanData.kakaoId = user.kakaoId;
      if (user.naverId !== undefined) cleanData.naverId = user.naverId;
      if (user.googleId !== undefined) cleanData.googleId = user.googleId;
      if (user.provider !== undefined) cleanData.provider = user.provider;
      if (user.agreements !== undefined) cleanData.agreements = user.agreements;

      await setDoc(userRef, cleanData, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to save user:', err);
      return false;
    }
  },

  /**
   * Fetch user by Kakao ID from Firestore
   */
  async getUserByKakaoId(kakaoId: string): Promise<User | null> {
    if (!kakaoId) return null;
    try {
      const clean = String(kakaoId).trim();
      const direct = await this.getUser(`kakao_${clean}`);
      if (direct) return direct;

      const q = query(collection(db, 'users'), where('kakaoId', '==', clean));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as User;
      }
    } catch (err) {
      console.warn('[Firestore] Failed to get user by kakaoId:', err);
    }
    return null;
  },

  /**
   * Fetch user by Naver ID from Firestore
   */
  async getUserByNaverId(naverId: string): Promise<User | null> {
    if (!naverId) return null;
    try {
      const clean = String(naverId).trim();
      const direct = await this.getUser(`naver_${clean}`);
      if (direct) return direct;

      const q = query(collection(db, 'users'), where('naverId', '==', clean));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as User;
      }
    } catch (err) {
      console.warn('[Firestore] Failed to get user by naverId:', err);
    }
    return null;
  },

  /**
   * Fetch user by Google ID from Firestore
   */
  async getUserByGoogleId(googleId: string): Promise<User | null> {
    if (!googleId) return null;
    try {
      const clean = String(googleId).trim();
      const direct = await this.getUser(`google_${clean}`);
      if (direct) return direct;

      const q = query(collection(db, 'users'), where('googleId', '==', clean));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as User;
      }
    } catch (err) {
      console.warn('[Firestore] Failed to get user by googleId:', err);
    }
    return null;
  },

  /**
   * Fetch single user profile from Firestore by userId
   */
  async getUser(userId: string): Promise<User | null> {
    if (!userId) return null;
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const u = snap.data() as User;
        const cleanEmail = (u.email || '').toLowerCase().trim();
        if (
          cleanEmail === 'teamdevstudiont@gmail.com' ||
          cleanEmail === 'eunyool100208@gmail.com' ||
          cleanEmail === 'deer123424@gmail.com' ||
          cleanEmail === 'ayun24song@gmail.com' ||
          u.id === 'TDSNTLMS' ||
          u.id === 'admin_EunYool' ||
          u.id === 'admin_ayun24song'
        ) {
          if (!u.role || u.role === 'USER') {
            u.role = 'SUPER_ADMIN';
          }
        }
        return u;
      }
    } catch (err) {
      console.warn('[Firestore] Failed to get user:', err);
    }
    return null;
  },

  /**
   * Fetch user by email from Firestore
   */
  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    try {
      const cleanEmail = email.toLowerCase().trim();
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const u = snap.docs[0].data() as User;
        if (
          cleanEmail === 'teamdevstudiont@gmail.com' ||
          cleanEmail === 'eunyool100208@gmail.com' ||
          cleanEmail === 'deer123424@gmail.com' ||
          cleanEmail === 'ayun24song@gmail.com'
        ) {
          if (!u.role || u.role === 'USER') {
            u.role = 'SUPER_ADMIN';
          }
        }
        return u;
      }
    } catch (err) {
      console.warn('[Firestore] Failed to get user by email:', err);
    }
    return null;
  },

  /**
   * Fetch all users from Firestore
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: User[] = [];
      snap.forEach((d) => {
        const u = d.data() as User;
        const cleanEmail = (u.email || '').toLowerCase().trim();
        if (
          cleanEmail === 'teamdevstudiont@gmail.com' ||
          cleanEmail === 'eunyool100208@gmail.com' ||
          cleanEmail === 'deer123424@gmail.com' ||
          cleanEmail === 'ayun24song@gmail.com' ||
          u.id === 'TDSNTLMS' ||
          u.id === 'admin_EunYool' ||
          u.id === 'admin_ayun24song'
        ) {
          if (!u.role || u.role === 'USER') {
            u.role = 'SUPER_ADMIN';
          }
        }
        list.push(u);
      });
      return list;
    } catch (err) {
      console.warn('[Firestore] Failed to get all users:', err);
      return [];
    }
  },

  /**
   * Delete user from Firestore
   */
  async deleteUser(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
      await deleteDoc(doc(db, 'users', userId));
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to delete user:', err);
      return false;
    }
  },

  // ====================================================
  // PROGRESS COLLECTION (Migrating devProgressStore)
  // ====================================================

  /**
   * Save or update lesson learning progress in Firestore
   */
  async saveProgress(progress: LessonProgress): Promise<boolean> {
    if (!progress || !progress.userId || !progress.lessonId) return false;
    try {
      const docId = `${progress.userId}_${progress.lessonId}`;
      const progressRef = doc(db, 'progress', docId);

      const record: Record<string, any> = {
        id: progress.id || `prog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: progress.userId,
        courseId: progress.courseId,
        lessonId: progress.lessonId,
        watchedSeconds: Math.max(0, progress.watchedSeconds || 0),
        totalSeconds: Math.max(0, progress.totalSeconds || 0),
        uniqueWatchedSeconds: Math.max(0, progress.uniqueWatchedSeconds || progress.watchedSeconds || 0),
        uniquePercent: Math.min(100, Math.max(0, progress.uniquePercent || 0)),
        isCompleted: !!progress.isCompleted,
        lastWatchedAt: progress.lastWatchedAt || new Date().toISOString(),
      };

      if (progress.completedAt) {
        record.completedAt = progress.completedAt;
      }

      await setDoc(progressRef, record, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to save progress:', err);
      return false;
    }
  },

  /**
   * Fetch user's progress records from Firestore
   */
  async getUserProgress(userId: string, courseId?: string): Promise<LessonProgress[]> {
    if (!userId) return [];
    try {
      let q;
      if (courseId) {
        q = query(
          collection(db, 'progress'),
          where('userId', '==', userId),
          where('courseId', '==', courseId)
        );
      } else {
        q = query(collection(db, 'progress'), where('userId', '==', userId));
      }

      const snap = await getDocs(q);
      const list: LessonProgress[] = [];
      snap.forEach((d) => {
        list.push(d.data() as LessonProgress);
      });
      return list;
    } catch (err) {
      console.warn('[Firestore] Failed to get progress:', err);
      return [];
    }
  },

  /**
   * Batch sync progress records to Firestore
   */
  async batchSyncProgress(userId: string, progresses: LessonProgress[]): Promise<boolean> {
    if (!userId || !progresses.length) return false;
    try {
      const batch = writeBatch(db);
      for (const p of progresses) {
        if (!p.lessonId) continue;
        const docId = `${userId}_${p.lessonId}`;
        const ref = doc(db, 'progress', docId);
        batch.set(
          ref,
          {
            id: p.id || `prog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            userId,
            courseId: p.courseId,
            lessonId: p.lessonId,
            watchedSeconds: Math.max(0, p.watchedSeconds || 0),
            totalSeconds: Math.max(0, p.totalSeconds || 0),
            uniqueWatchedSeconds: Math.max(0, p.uniqueWatchedSeconds || p.watchedSeconds || 0),
            uniquePercent: Math.min(100, Math.max(0, p.uniquePercent || 0)),
            isCompleted: !!p.isCompleted,
            lastWatchedAt: p.lastWatchedAt || new Date().toISOString(),
            ...(p.completedAt ? { completedAt: p.completedAt } : {}),
          },
          { merge: true }
        );
      }
      await batch.commit();
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to batch sync progress:', err);
      return false;
    }
  },

  // ====================================================
  // ENROLLMENTS COLLECTION
  // ====================================================

  /**
   * Delete every document in a collection (used by the admin learning-data reset). Returns the count.
   */
  async deleteAllDocs(collectionName: string): Promise<number> {
    const snap = await getDocs(collection(db, collectionName));
    let deleted = 0;
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += Math.min(400, snap.docs.length - i);
    }
    return deleted;
  },

  /**
   * Fetch enrollment records (all users when userId is omitted — admin reporting).
   */
  async getEnrollmentRecords(userId?: string): Promise<Array<{ userId: string; courseId: string; enrolledAt?: string }>> {
    try {
      const ref = userId ? query(collection(db, 'enrollments'), where('userId', '==', userId)) : collection(db, 'enrollments');
      const snap = await getDocs(ref);
      return snap.docs
        .map((d) => d.data() as { userId: string; courseId: string; enrolledAt?: string })
        .filter((e) => e && e.userId && e.courseId);
    } catch (err) {
      console.warn('[Firestore] Failed to get enrollment records:', err);
      return [];
    }
  },

  /**
   * Fetch lesson progress records (all users when userId is omitted — admin reporting).
   */
  async getProgressRecords(userId?: string): Promise<LessonProgress[]> {
    try {
      const ref = userId ? query(collection(db, 'progress'), where('userId', '==', userId)) : collection(db, 'progress');
      const snap = await getDocs(ref);
      return snap.docs.map((d) => d.data() as LessonProgress).filter((p) => p && p.userId && p.lessonId);
    } catch (err) {
      console.warn('[Firestore] Failed to get progress records:', err);
      return [];
    }
  },

  /**
   * Save course enrollment in Firestore
   */
  async saveEnrollment(userId: string, courseId: string): Promise<boolean> {
    if (!userId || !courseId) return false;
    try {
      const docId = `${userId}_${courseId}`;
      const ref = doc(db, 'enrollments', docId);
      await setDoc(
        ref,
        {
          id: docId,
          userId,
          courseId,
          enrolledAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to save enrollment:', err);
      return false;
    }
  },

  /**
   * Fetch all enrollments for a user
   */
  async getUserEnrollments(userId: string): Promise<string[]> {
    if (!userId) return [];
    try {
      const q = query(collection(db, 'enrollments'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const courseIds: string[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.courseId) courseIds.push(data.courseId);
      });
      return courseIds;
    } catch (err) {
      console.warn('[Firestore] Failed to get user enrollments:', err);
      return [];
    }
  },

  // ====================================================
  // REVIEWS COLLECTION
  // ====================================================

  /**
   * Save or update course review in Firestore
   */
  async saveReview(review: CourseReview): Promise<boolean> {
    if (!review || !review.id) return false;
    try {
      const ref = doc(db, 'reviews', review.id);
      await setDoc(ref, review, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to save review:', err);
      return false;
    }
  },

  /**
   * Fetch reviews for course from Firestore
   */
  async getCourseReviews(courseId: string): Promise<CourseReview[]> {
    if (!courseId) return [];
    try {
      const q = query(collection(db, 'reviews'), where('courseId', '==', courseId));
      const snap = await getDocs(q);
      const list: CourseReview[] = [];
      snap.forEach((d) => {
        list.push(d.data() as CourseReview);
      });
      return list;
    } catch (err) {
      console.warn('[Firestore] Failed to get course reviews:', err);
      return [];
    }
  },

  /**
   * Delete review from Firestore
   */
  async deleteReview(reviewId: string): Promise<boolean> {
    if (!reviewId) return false;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to delete review:', err);
      return false;
    }
  },

  // ====================================================
  // CERTIFICATES COLLECTION
  // ====================================================

  /**
   * Save certificate to Firestore
   */
  async saveCertificate(cert: any): Promise<boolean> {
    if (!cert || !cert.id) return false;
    try {
      const ref = doc(db, 'certificates', cert.id);
      await setDoc(ref, cert, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to save certificate:', err);
      return false;
    }
  },

  /**
   * Validate/lookup certificate by certificateNumber in Firestore
   */
  async getCertificateByNumber(certNumber: string): Promise<any | null> {
    if (!certNumber) return null;
    try {
      const cleanNum = certNumber.trim().toUpperCase();
      const q = query(collection(db, 'certificates'), where('certificateNumber', '==', cleanNum));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data();
      }
    } catch (err) {
      console.warn('[Firestore] Failed to get certificate by number:', err);
    }
    return null;
  },

  // ====================================================
  // VIDEOS COLLECTION (Server-stored video metadata)
  // ====================================================

  /**
   * Save uploaded video metadata to Firestore
   */
  async saveVideoMeta(video: VideoMetadata): Promise<boolean> {
    if (!video || !video.video_id) return false;
    try {
      const ref = doc(db, 'videos', video.video_id);
      const cleanData: Record<string, any> = {
        video_id: video.video_id,
        file_name: video.file_name || 'video.mp4',
        video_url: video.video_url,
        file_size: Number(video.file_size) || 0,
        mime_type: video.mime_type || 'video/mp4',
        uploaded_at: video.uploaded_at || new Date().toISOString(),
        status: video.status || 'ready',
      };
      if (video.thumbnail_url !== undefined) cleanData.thumbnail_url = video.thumbnail_url;
      if (video.duration_seconds !== undefined) cleanData.duration_seconds = video.duration_seconds;
      if (video.uploaded_by !== undefined) cleanData.uploaded_by = video.uploaded_by;

      await setDoc(ref, cleanData, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to save video metadata:', err);
      return false;
    }
  },

  /**
   * Get all registered video metadata records from Firestore
   */
  async getAllVideos(): Promise<VideoMetadata[]> {
    try {
      const snap = await getDocs(collection(db, 'videos'));
      const videos = snap.docs.map((d) => d.data() as VideoMetadata);
      return videos.sort((a, b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime());
    } catch (err) {
      console.warn('[Firestore] Failed to get videos list:', err);
      return [];
    }
  },

  /**
   * Get single video metadata by video_id
   */
  async getVideo(videoId: string): Promise<VideoMetadata | null> {
    if (!videoId) return null;
    try {
      const ref = doc(db, 'videos', videoId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as VideoMetadata;
      }
    } catch (err) {
      console.warn('[Firestore] Failed to get video by ID:', err);
    }
    return null;
  },

  /**
   * Delete video metadata from Firestore
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    if (!videoId) return false;
    try {
      await deleteDoc(doc(db, 'videos', videoId));
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to delete video metadata:', err);
      return false;
    }
  },

  // ====================================================
  // COURSES COLLECTION
  // ====================================================

  async saveCourse(course: Course): Promise<boolean> {
    if (!course || !course.id) return false;
    try {
      const ref = doc(db, 'courses', course.id);
      await setDoc(ref, course, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to save course:', err);
      return false;
    }
  },

  async getAllCourses(): Promise<Course[]> {
    try {
      const snap = await getDocs(collection(db, 'courses'));
      return snap.docs.map((d) => d.data() as Course);
    } catch (err) {
      console.warn('[Firestore] Failed to get courses:', err);
      return [];
    }
  },

  async deleteCourse(courseId: string): Promise<boolean> {
    if (!courseId) return false;
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to delete course:', err);
      return false;
    }
  },

  // ====================================================
  // SECTIONS COLLECTION
  // ====================================================

  async saveSection(section: CourseSection): Promise<boolean> {
    if (!section || !section.id) return false;
    try {
      const ref = doc(db, 'sections', section.id);
      await setDoc(ref, section, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to save section:', err);
      return false;
    }
  },

  async getAllSections(): Promise<CourseSection[]> {
    try {
      const snap = await getDocs(collection(db, 'sections'));
      return snap.docs.map((d) => d.data() as CourseSection);
    } catch (err) {
      console.warn('[Firestore] Failed to get sections:', err);
      return [];
    }
  },

  async deleteSection(sectionId: string): Promise<boolean> {
    if (!sectionId) return false;
    try {
      await deleteDoc(doc(db, 'sections', sectionId));
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to delete section:', err);
      return false;
    }
  },

  // ====================================================
  // LESSONS COLLECTION
  // ====================================================

  async saveLesson(lesson: Lesson): Promise<boolean> {
    if (!lesson || !lesson.id) return false;
    try {
      const ref = doc(db, 'lessons', lesson.id);
      // Clean undefined values
      const cleanLesson = JSON.parse(JSON.stringify(lesson));
      await setDoc(ref, cleanLesson, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to save lesson:', err);
      return false;
    }
  },

  async getAllLessons(): Promise<Lesson[]> {
    try {
      const snap = await getDocs(collection(db, 'lessons'));
      return snap.docs.map((d) => d.data() as Lesson);
    } catch (err) {
      console.warn('[Firestore] Failed to get lessons:', err);
      return [];
    }
  },

  async deleteLesson(lessonId: string): Promise<boolean> {
    if (!lessonId) return false;
    try {
      await deleteDoc(doc(db, 'lessons', lessonId));
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to delete lesson:', err);
      return false;
    }
  },

  // ====================================================
  // SYSTEM ANNOUNCEMENTS COLLECTION
  // ====================================================

  async saveSystemAnnouncement(ann: SystemAnnouncement): Promise<boolean> {
    if (!ann || !ann.id) return false;
    try {
      const ref = doc(db, 'system_announcements', ann.id);
      const clean = JSON.parse(JSON.stringify(ann));
      await setDoc(ref, clean, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to save system announcement:', err);
      return false;
    }
  },

  async getAllSystemAnnouncements(): Promise<SystemAnnouncement[]> {
    try {
      const snap = await getDocs(collection(db, 'system_announcements'));
      return snap.docs.map((d) => d.data() as SystemAnnouncement);
    } catch (err) {
      console.warn('[Firestore] Failed to get system announcements:', err);
      return [];
    }
  },

  async deleteSystemAnnouncement(id: string): Promise<boolean> {
    if (!id) return false;
    try {
      await deleteDoc(doc(db, 'system_announcements', id));
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to delete system announcement:', err);
      return false;
    }
  },

  // ====================================================
  // COURSE ANNOUNCEMENTS COLLECTION
  // ====================================================

  async saveCourseAnnouncement(ann: CourseAnnouncement): Promise<boolean> {
    if (!ann || !ann.id) return false;
    try {
      const ref = doc(db, 'course_announcements', ann.id);
      const clean = JSON.parse(JSON.stringify(ann));
      await setDoc(ref, clean, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to save course announcement:', err);
      return false;
    }
  },

  async getAllCourseAnnouncements(): Promise<CourseAnnouncement[]> {
    try {
      const snap = await getDocs(collection(db, 'course_announcements'));
      return snap.docs.map((d) => d.data() as CourseAnnouncement);
    } catch (err) {
      console.warn('[Firestore] Failed to get course announcements:', err);
      return [];
    }
  },

  async deleteCourseAnnouncement(id: string): Promise<boolean> {
    if (!id) return false;
    try {
      await deleteDoc(doc(db, 'course_announcements', id));
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to delete course announcement:', err);
      return false;
    }
  },

  // ====================================================
  // SYSTEM SETTINGS COLLECTION
  // ====================================================

  async saveSettings(settings: SystemSettings): Promise<boolean> {
    try {
      const ref = doc(db, 'system_settings', 'global');
      const clean = JSON.parse(JSON.stringify(settings));
      await setDoc(ref, clean, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firestore] Failed to save system settings:', err);
      return false;
    }
  },

  async getSettings(): Promise<SystemSettings | null> {
    try {
      const snap = await getDoc(doc(db, 'system_settings', 'global'));
      if (snap.exists()) {
        return snap.data() as SystemSettings;
      }
    } catch (err) {
      console.warn('[Firestore] Failed to get system settings:', err);
    }
    return null;
  },

  // ====================================================
  // INQUIRIES
  // Stored in system_settings as `inquiry_*` docs tagged kind: 'inquiry', because the
  // deployed Firestore rules reject writes to collections they do not list.
  // Errors are thrown so the UI can tell the sender that delivery failed.
  // ====================================================

  async saveInquiry(inquiry: Inquiry): Promise<void> {
    const clean = JSON.parse(JSON.stringify({ ...inquiry, kind: 'inquiry' }));
    await setDoc(doc(db, 'system_settings', inquiry.id), clean);
  },

  async updateInquiry(id: string, patch: Partial<Inquiry>): Promise<void> {
    await setDoc(doc(db, 'system_settings', id), JSON.parse(JSON.stringify(patch)), { merge: true });
  },

  /** All inquiries (admins) or one user's inquiries, newest first. */
  async getInquiries(userId?: string): Promise<Inquiry[]> {
    const base = collection(db, 'system_settings');
    const q = userId
      ? query(base, where('kind', '==', 'inquiry'), where('userId', '==', userId))
      : query(base, where('kind', '==', 'inquiry'));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const { kind: _kind, ...rest } = d.data();
        return { ...rest, id: d.id } as Inquiry;
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },

  async deleteInquiry(id: string): Promise<void> {
    await deleteDoc(doc(db, 'system_settings', id));
  },

  /** One base64 piece of an inquiry attachment (system_settings/inqfile_<attachmentId>_<index>). */
  async saveInquiryFileChunk(id: string, chunk: { inquiryId: string; attachmentId: string; index: number; data: string }): Promise<void> {
    await setDoc(doc(db, 'system_settings', id), { ...chunk, kind: 'inquiry_file' });
  },

  async getInquiryFileChunk(id: string): Promise<string | null> {
    const snap = await getDoc(doc(db, 'system_settings', id));
    return snap.exists() ? ((snap.data() as { data?: string }).data ?? null) : null;
  },

  async deleteInquiryFileChunks(ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(db);
      ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, 'system_settings', id)));
      await batch.commit();
    }
  },

  // Real-time listener for system announcements
  subscribeToSystemAnnouncements(callback: (announcements: SystemAnnouncement[]) => void): () => void {
    try {
      const q = collection(db, 'system_announcements');
      return onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as SystemAnnouncement);
          callback(list);
        },
        (err) => {
          console.warn('[Firestore] System announcements listener error:', err);
        }
      );
    } catch {
      return () => {};
    }
  },

  // Real-time listener for course announcements
  subscribeToCourseAnnouncements(callback: (announcements: CourseAnnouncement[]) => void): () => void {
    try {
      const q = collection(db, 'course_announcements');
      return onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as CourseAnnouncement);
          callback(list);
        },
        (err) => {
          console.warn('[Firestore] Course announcements listener error:', err);
        }
      );
    } catch {
      return () => {};
    }
  },
};
