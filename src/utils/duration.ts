import { Lesson, DurationStatus, DurationAccuracyStatus } from '../types';

/**
 * Format raw seconds strictly into clean Korean duration format:
 * - 'X시간 X분 X초' (e.g. 1시간 23분 45초)
 * - 'X시간 X분' (when s = 0)
 * - 'X시간 X초' (when m = 0)
 * - 'X시간' (when m = 0, s = 0)
 * - 'X분 X초' (when h = 0)
 * - 'X분' (when h = 0, s = 0)
 * - 'X초' (when h = 0, m = 0)
 * 
 * @param seconds Duration in seconds
 * @param fallback Optional fallback message if seconds is null/undefined/invalid
 */
export function formatSecondsToKorean(seconds?: number | null, fallback = '0초'): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return fallback;
  }
  const totalSec = Math.round(seconds);
  if (totalSec === 0) return '0초';

  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (h > 0) {
    if (m === 0 && s === 0) return `${h}시간`;
    if (s === 0) return `${h}시간 ${m}분`;
    if (m === 0) return `${h}시간 ${s}초`;
    return `${h}시간 ${m}분 ${s}초`;
  }

  if (m > 0) {
    if (s === 0) return `${m}분`;
    return `${m}분 ${s}초`;
  }

  return `${s}초`;
}

/**
 * Universal Duration Formatter for TDSNTLMS
 * Formats seconds into clean Korean text (e.g. 45초, 1분 30초, 3분 42초, 1시간 1분 15초)
 * or displays accurate loading/error statuses when duration is not available.
 * 
 * NEVER uses hardcoded fallbacks like 10분 or 600초.
 */
export function formatDuration(
  seconds?: number | null,
  status?: DurationStatus | string,
  options?: {
    fallbackText?: string;
    showHoursAlways?: boolean;
    compact?: boolean;
  }
): string {
  // If duration is valid positive number
  if (typeof seconds === 'number' && !isNaN(seconds) && isFinite(seconds) && seconds > 0) {
    const totalSec = Math.round(seconds);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    if (options?.compact) {
      if (h > 0) return `${h}h ${m}m ${s > 0 ? `${s}s` : ''}`.trim();
      if (m > 0) return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
      return `${s}s`;
    }

    return formatSecondsToKorean(seconds);
  }

  // Handle statuses when duration is missing or unverified
  if (status === 'PENDING') {
    return '재생시간 확인 중...';
  }
  if (status === 'FAILED') {
    return '재생시간 확인 실패';
  }
  if (status === 'UNAVAILABLE') {
    return '재생시간 확인 불가';
  }

  return options?.fallbackText || '재생시간 정보 없음';
}

/**
 * Formats time for video player counters (e.g. 03:42, 01:10:15)
 */
export function formatPlayerTime(seconds?: number | null): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format total course duration in a natural way
 */
export function formatCourseTotalDuration(
  totalSeconds?: number | null,
  durationMinutes?: number | null
): string {
  if (typeof totalSeconds === 'number' && totalSeconds > 0) {
    return formatDuration(totalSeconds);
  }
  if (typeof durationMinutes === 'number' && durationMinutes > 0) {
    return formatDuration(durationMinutes * 60);
  }
  return '재생시간 정보 없음';
}

/**
 * Calculate dynamic, real course statistics strictly from its lesson array.
 * Source of Truth for course duration and lesson counts.
 */
export function calculateCourseStats(lessons: Lesson[] = []): {
  totalLessons: number;
  totalDurationSeconds: number;
  durationMinutes: number;
  formattedDuration: string;
  isAllDurationReady: boolean;
  unverifiedLessonsCount: number;
  accuracyStatus: DurationAccuracyStatus;
} {
  const totalLessons = lessons.length;
  let totalDurationSeconds = 0;
  let unverifiedLessonsCount = 0;

  lessons.forEach((l) => {
    // Only sum up valid positive durations
    if (typeof l.durationSeconds === 'number' && l.durationSeconds > 0) {
      totalDurationSeconds += l.durationSeconds;
    } else if (l.type === 'video') {
      unverifiedLessonsCount++;
    }
  });

  const durationMinutes = Math.round(totalDurationSeconds / 60);
  const isAllDurationReady = unverifiedLessonsCount === 0;
  const accuracyStatus: DurationAccuracyStatus =
    totalLessons === 0
      ? 'ALL_VERIFIED'
      : unverifiedLessonsCount === 0
      ? 'ALL_VERIFIED'
      : totalDurationSeconds > 0
      ? 'PARTIAL_UNVERIFIED'
      : 'UNVERIFIED';

  return {
    totalLessons,
    totalDurationSeconds,
    durationMinutes,
    formattedDuration: formatDuration(totalDurationSeconds),
    isAllDurationReady,
    unverifiedLessonsCount,
    accuracyStatus,
  };
}

/**
 * Extract YouTube Video ID from any standard or modern YouTube URL format
 */
export function extractYouTubeVideoId(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Pattern matching watch?v=, youtu.be/, embed/, shorts/, etc.
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regex);
  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }
  return null;
}

/**
 * Parse ISO 8601 duration (e.g. PT9M37S, PT1H2M30S, PT45S, PT10M) to seconds
 */
export function parseISO8601Duration(durationStr?: string | null): number | null {
  if (!durationStr || typeof durationStr !== 'string') return null;
  const trimmed = durationStr.trim();
  const match = trimmed.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
  if (!match) return null;

  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  const minutes = parseInt(match[3] || '0', 10);
  const seconds = parseFloat(match[4] || '0');

  const totalSeconds = Math.round(days * 86400 + hours * 3600 + minutes * 60 + seconds);
  return totalSeconds > 0 ? totalSeconds : null;
}

/**
 * Client-side HTML5 Video Metadata extractor
 * Extracts actual video duration in seconds without arbitrary fallbacks
 */
export function extractMediaDuration(
  fileOrUrl: File | string
): Promise<{ durationSeconds: number | null; error?: string }> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';

      let objectUrl: string | null = null;
      if (typeof fileOrUrl === 'string') {
        video.src = fileOrUrl;
      } else {
        objectUrl = URL.createObjectURL(fileOrUrl);
        video.src = objectUrl;
      }

      const cleanup = () => {
        video.removeAttribute('src');
        video.load();
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };

      video.onloadedmetadata = () => {
        const dur = video.duration;
        cleanup();
        if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
          resolve({ durationSeconds: Math.round(dur) });
        } else {
          resolve({ durationSeconds: null, error: '영상 메타데이터에서 길이를 읽을 수 없습니다.' });
        }
      };

      video.onerror = () => {
        cleanup();
        resolve({ durationSeconds: null, error: '비디오 파일을 로드할 수 없습니다.' });
      };

      // Set timeout in case metadata event never fires
      setTimeout(() => {
        cleanup();
        resolve({ durationSeconds: null, error: '메타데이터 로딩 시간 초과' });
      }, 10000);
    } catch (err: any) {
      resolve({ durationSeconds: null, error: err?.message || '알 수 없는 오류' });
    }
  });
}
