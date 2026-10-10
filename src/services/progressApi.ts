import { LessonProgress } from '../types';
import { firestoreService } from './firebase';

export const progressApi = {
  /**
   * Fetch progress from Firestore first, with server API fallback
   */
  async fetchProgress(userId: string, courseId?: string): Promise<LessonProgress[]> {
    if (!userId) return [];

    try {
      // 1. Query Firestore first for persistent real-time state
      const firestoreProgress = await firestoreService.getUserProgress(userId, courseId);
      if (firestoreProgress && firestoreProgress.length > 0) {
        return firestoreProgress;
      }
    } catch (e) {
      console.warn('[progressApi] Firestore fetch fallback:', e);
    }

    try {
      const url = new URL('/api/progress', window.location.origin);
      url.searchParams.append('userId', userId);
      if (courseId) url.searchParams.append('courseId', courseId);

      const res = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        const serverProgs = (data.progresses || []) as LessonProgress[];
        if (serverProgs.length > 0) {
          // Asynchronously sync to Firestore
          firestoreService.batchSyncProgress(userId, serverProgs).catch(() => {});
        }
        return serverProgs;
      }
    } catch (e) {
      // Fallback silently
    }
    return [];
  },

  /**
   * Update progress on Firestore and backend
   */
  async updateProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    watchedSeconds: number,
    totalSeconds: number,
    isCompleted: boolean
  ): Promise<LessonProgress | null> {
    if (!userId || !courseId || !lessonId) return null;

    const progressRecord: LessonProgress = {
      id: `prog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      courseId,
      lessonId,
      watchedSeconds: Math.max(0, Math.round(watchedSeconds)),
      totalSeconds: Math.max(0, Math.round(totalSeconds)),
      uniqueWatchedSeconds: Math.max(0, Math.round(watchedSeconds)),
      uniquePercent: totalSeconds > 0 ? Math.min(100, Math.round((watchedSeconds / totalSeconds) * 100)) : 0,
      isCompleted: !!isCompleted,
      lastWatchedAt: new Date().toISOString(),
      ...(isCompleted ? { completedAt: new Date().toISOString() } : {}),
    };

    // 1. Persist directly to Firebase Firestore
    firestoreService.saveProgress(progressRecord).catch((err) => {
      console.warn('[progressApi] Firestore saveProgress error:', err);
    });

    // 2. Update backend server
    try {
      const res = await fetch('/api/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          courseId,
          lessonId,
          watchedSeconds,
          totalSeconds,
          isCompleted,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.progress as LessonProgress;
      }
    } catch (e) {
      // Network/dev fallback
    }
    return progressRecord;
  },

  /**
   * Batch sync progress to Firestore & backend
   */
  async syncProgress(userId: string, progresses: LessonProgress[]): Promise<boolean> {
    if (!userId || !progresses.length) return false;

    // 1. Persist to Firestore
    firestoreService.batchSyncProgress(userId, progresses).catch((err) => {
      console.warn('[progressApi] Firestore batchSync error:', err);
    });

    // 2. Sync to server API
    try {
      const res = await fetch('/api/progress/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, progresses }),
      });
      return res.ok;
    } catch {
      return true;
    }
  },
};
