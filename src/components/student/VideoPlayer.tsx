import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Lesson, LessonProgress, User } from '../../types';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Tv,
  CheckCircle2,
  AlertCircle,
  Clock,
  Film,
  ArrowRight,
  ArrowLeft,
  Lock,
  RefreshCw,
  Sparkles,
  Youtube,
  FastForward,
  X,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { storage } from '../../services/storage';
import { videoApi } from '../../services/videoApi';
import { progressApi } from '../../services/progressApi';
import { mediaStore } from '../../services/mediaStore';
import { formatPlayerTime, extractYouTubeVideoId, formatDuration, formatSecondsToKorean } from '../../utils/duration';
import { isAdminRole } from '../../utils/rbac';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
    _ytCallbacks?: (() => void)[];
  }
}

interface VideoPlayerProps {
  lesson: Lesson;
  courseId?: string;
  lessonId?: string;
  progress?: LessonProgress;
  user?: User | null;
  onProgressUpdate: (watchedSeconds: number, totalSeconds: number, isCompleted: boolean) => void;
  onNextLesson?: () => void;
  onPrevLesson?: () => void;
  hasNextLesson?: boolean;
  hasPrevLesson?: boolean;
  onDurationDetected?: (detectedSeconds: number) => void;
  showBottomBar?: boolean;
  autoPlay?: boolean;
  onAutoPlayChange?: (enabled: boolean) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = React.memo(({
  lesson,
  courseId,
  lessonId,
  progress,
  user,
  onProgressUpdate,
  onNextLesson,
  onPrevLesson,
  hasNextLesson = false,
  hasPrevLesson = false,
  onDurationDetected,
  showBottomBar = false,
  autoPlay = false,
  onAutoPlayChange,
}) => {
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ytWrapperRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerId = `yt-player-${lesson.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Interaction Feedback & Buffering State
  const [isBuffering, setIsBuffering] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'play' | 'pause' | 'skip-back' | 'skip-forward';
    id: number;
  } | null>(null);

  const triggerFeedback = useCallback((type: 'play' | 'pause' | 'skip-back' | 'skip-forward') => {
    const id = Date.now();
    setActionFeedback({ type, id });
    setTimeout(() => {
      setActionFeedback((prev) => (prev?.id === id ? null : prev));
    }, 600);
  }, []);

  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;

  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const onDurationDetectedRef = useRef(onDurationDetected);
  onDurationDetectedRef.current = onDurationDetected;

  // Synchronized Mutable Refs to eliminate stale closures
  const lessonRef = useRef<Lesson>(lesson);
  lessonRef.current = lesson;

  const userRef = useRef<User | null | undefined>(user);
  userRef.current = user;

  const thresholdRef = useRef<number>(lesson.completionThresholdPercent || 90);
  thresholdRef.current = lesson.completionThresholdPercent || 90;

  const durationRef = useRef<number>(lesson.durationSeconds || 0);
  const currentTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const isCompletedRef = useRef<boolean>(progress?.isCompleted ?? false);
  const lastHeartbeatPosRef = useRef<number>(0);
  const maxWatchedPositionRef = useRef<number>(progress?.watchedSeconds || 0);
  const currentLoadedYtIdRef = useRef<string | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(lesson.durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [bufferedPercent, setBufferedPercent] = useState(0);

  // Anti-Cheat & Completion state
  const threshold = lesson.completionThresholdPercent || 90;
  const [uniqueWatchedPercent, setUniqueWatchedPercent] = useState<number>(() => {
    if (progress?.isCompleted) return 100;
    if (progress && progress.totalSeconds > 0 && progress.watchedSeconds > 0) {
      return Math.min(100, Math.round((progress.watchedSeconds / progress.totalSeconds) * 100));
    }
    return 0;
  });
  const [isCompleted, setIsCompleted] = useState<boolean>(progress?.isCompleted ?? false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Seeking & Fast-forward Gating:
  // Non-completed users CANNOT fast-forward or skip past what they have watched.
  // Once completed at least once (or for admins/managers), full scrubbing is unlocked!
  const isPrivilegedUser = isAdminRole(user?.role);
  const hasCompletedVideo = isCompleted || (progress?.isCompleted ?? false);
  const canSeekForward = isPrivilegedUser || hasCompletedVideo;
  const canSeekForwardRef = useRef(canSeekForward);
  canSeekForwardRef.current = canSeekForward;
  const seekingWarningShownRef = useRef(false);

  // Rate and YouTube Seek Guard tracking
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;

  const isRestrictingSeekRef = useRef(false);
  const lastSeekWarningTimeRef = useRef(0);
  const lastYtCheckTimeRef = useRef(Date.now());
  const lastValidYtPositionRef = useRef(0);

  // Resume banner state
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const showResumeBannerRef = useRef(false);
  const [resumePosition, setResumePosition] = useState(0);

  // Video source state
  const [resolvedSourceUrl, setResolvedSourceUrl] = useState<string>('');
  const [sourceType, setSourceType] = useState<'video' | 'youtube' | 'empty'>('empty');
  const [hasLoadError, setHasLoadError] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  // Loading & Retry state
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryNonce, setRetryNonce] = useState<number>(0);

  // Timers
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ytPollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Seeking & Synchronization Refs
  const isSeekingRef = useRef(false);
  const wasPlayingBeforeSeekRef = useRef(false);
  const pendingSeekTargetRef = useRef<number | null>(null);
  const seekLockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedLessonIdRef = useRef<string | null>(null);
  const lastParentReportedSecRef = useRef<number>(-1);
  const lastParentReportTimeRef = useRef<number>(0);

  // Helper to show informative toast when seek forward is blocked
  const showSeekRestrictedToast = useCallback((maxAllowedSec: number) => {
    const now = Date.now();
    if (now - lastSeekWarningTimeRef.current < 2500) return;
    lastSeekWarningTimeRef.current = now;

    const formattedTime = formatPlayerTime(maxAllowedSec);
    showToast(
      `처음 수강 시에는 아직 시청하지 않은 구간으로 건너뛸 수 없습니다. 시청 완료한 구간(${formattedTime})까지만 이동할 수 있습니다.`,
      'warning',
      '탐색 제한'
    );
  }, [showToast]);

  // YouTube Seek Policy Guard:
  // Restricts regular students from seeking forward past their maximum watched position.
  // Seeking backward to already-watched 구간 is fully permitted.
  const enforceYouTubeSeekPolicy = useCallback(
    (reportedTime: number, isBufferingOrPlaying: boolean = false): boolean => {
      if (canSeekForwardRef.current) {
        if (reportedTime > maxWatchedPositionRef.current) {
          maxWatchedPositionRef.current = reportedTime;
        }
        lastValidYtPositionRef.current = reportedTime;
        return true;
      }

      if (isRestrictingSeekRef.current) {
        return false;
      }

      const now = Date.now();
      const elapsedMs = now - lastYtCheckTimeRef.current;
      lastYtCheckTimeRef.current = now;
      const elapsedSec = Math.max(0.1, elapsedMs / 1000);

      const maxAllowed = Math.max(0, maxWatchedPositionRef.current);
      const effectiveRate = playbackRateRef.current || 1;
      const allowedProgress = Math.max(2.0, elapsedSec * effectiveRate * 1.5 + 2.0);

      // If reported time jumps past maxAllowed by more than normal continuous playback progression
      if (reportedTime > maxAllowed + 2.0) {
        const delta = reportedTime - maxAllowed;
        if (delta > allowedProgress || !isBufferingOrPlaying) {
          isRestrictingSeekRef.current = true;

          // Rollback YouTube player immediately
          if (ytPlayerRef.current) {
            try {
              if (typeof ytPlayerRef.current.seekTo === 'function') {
                ytPlayerRef.current.seekTo(maxAllowed, true);
              }
              if (isPlayingRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
                ytPlayerRef.current.playVideo();
              }
            } catch {}
          } else if (ytIframeRef.current?.contentWindow) {
            try {
              ytIframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'seekTo', args: [maxAllowed, true] }),
                '*'
              );
            } catch {}
          }

          currentTimeRef.current = maxAllowed;
          setCurrentTime(maxAllowed);
          lastHeartbeatPosRef.current = maxAllowed;
          lastValidYtPositionRef.current = maxAllowed;
          showSeekRestrictedToast(maxAllowed);

          setTimeout(() => {
            isRestrictingSeekRef.current = false;
          }, 350);

          return false;
        }
      }

      // Backward seek or valid continuous natural progression
      if (reportedTime <= maxAllowed + 2.0) {
        if (reportedTime > maxAllowed) {
          maxWatchedPositionRef.current = reportedTime;
        }
        currentTimeRef.current = reportedTime;
        setCurrentTime(reportedTime);
        lastValidYtPositionRef.current = reportedTime;
        return true;
      }

      return true;
    },
    [showSeekRestrictedToast]
  );

  // Helper to update duration synchronously
  const syncDuration = useCallback((newDur: number) => {
    const rounded = Math.round(newDur);
    if (rounded > 0 && rounded !== durationRef.current) {
      durationRef.current = rounded;
      setDuration(rounded);
      if (onDurationDetectedRef.current) {
        onDurationDetectedRef.current(rounded);
      }
    }
  }, []);

  // Safe Play & Pause with Promise Tracking to eliminate AbortError
  const safePlay = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      const p = videoRef.current.play();
      playPromiseRef.current = p;
      await p;
      playPromiseRef.current = null;
      setIsPlaying(true);
      isPlayingRef.current = true;
      triggerFeedback('play');
      lastHeartbeatPosRef.current = videoRef.current?.currentTime || currentTime;
    } catch (err: any) {
      playPromiseRef.current = null;
      if (err?.name === 'NotAllowedError') {
        // Browser Autoplay Policy blocked audio playback; fallback to muted play
        try {
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            const pMuted = videoRef.current.play();
            playPromiseRef.current = pMuted;
            await pMuted;
            playPromiseRef.current = null;
            setIsPlaying(true);
            isPlayingRef.current = true;
            triggerFeedback('play');
            showToast('브라우저 정책으로 인해 음소거 상태로 자동 재생됩니다. 볼륨을 켜주세요.', 'info', '자동 재생 알림');
          }
        } catch {}
      } else if (err?.name !== 'AbortError') {
        console.warn('Playback play request failed:', err);
      }
    }
  }, [currentTime, showToast, triggerFeedback]);

  // Retry loading handler
  const handleRetryLoading = useCallback(() => {
    setIsRetrying(true);
    setHasLoadError(false);
    setIsLoadingSource(true);
    setRetryNonce((prev) => prev + 1);

    if (videoRef.current) {
      try {
        videoRef.current.load();
      } catch {}
    }

    setTimeout(() => {
      setIsRetrying(false);
    }, 600);
  }, []);

  // Play fallback sample stream handler
  const handlePlayFallbackSample = useCallback(() => {
    setHasLoadError(false);
    setIsLoadingSource(false);
    setSourceType('video');
    setResolvedSourceUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
    setYoutubeVideoId(null);
    showToast('안정적인 교육용 샘플 스트림 영상으로 전환되었습니다.', 'info', '대체 영상 연결');
    setTimeout(() => {
      safePlay().catch(() => {});
    }, 150);
  }, [showToast, safePlay]);

  // 1. Resolve Canonical Video Source URL (using courseId/lessonId and storage/API)
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingSource(true);
    setHasLoadError(false);

    const targetCourseId = courseId || lesson.courseId;
    const targetLessonId = lessonId || lesson.id;

    // Fetch canonical lesson record if parameters are available
    let canonicalLesson = lesson;
    if (targetCourseId && targetLessonId) {
      const found = storage.getLessons(targetCourseId).find((l) => l.id === targetLessonId);
      if (found) {
        canonicalLesson = found;
      }
    }

    const rawUrl = (canonicalLesson.videoUrl || '').trim();

    if (!rawUrl) {
      setSourceType('empty');
      setResolvedSourceUrl('');
      setYoutubeVideoId(null);
      setIsLoadingSource(false);
      return;
    }

    // Check YouTube
    const ytId = extractYouTubeVideoId(rawUrl);
    if (ytId) {
      setSourceType('youtube');
      setYoutubeVideoId(ytId);
      setResolvedSourceUrl(`https://www.youtube-nocookie.com/embed/${ytId}?enablejsapi=1&autoplay=${autoPlay ? 1 : 0}&origin=${encodeURIComponent(window.location.origin)}`);
      setIsLoadingSource(false);

      // If duration is unknown, fetch metadata from server in parallel
      if (!canonicalLesson.durationSeconds || canonicalLesson.durationSeconds <= 0) {
        videoApi.fetchYouTubeVideoInfo(rawUrl).then((info) => {
          if (!isCancelled && info.durationSeconds && info.durationSeconds > 0) {
            syncDuration(info.durationSeconds);
          }
        });
      }
      return;
    }

    // Check IndexedDB
    if (rawUrl.startsWith('idb://')) {
      mediaStore.resolveMediaUrl(rawUrl).then((blobUrl) => {
        if (!isCancelled) {
          if (!blobUrl) {
            setSourceType('empty');
            setResolvedSourceUrl('');
          } else {
            setSourceType('video');
            setResolvedSourceUrl(blobUrl);
          }
          setYoutubeVideoId(null);
          setIsLoadingSource(false);
        }
      });
      return;
    }

    // Standard Direct MP4 or Server Stream
    // Check if we have a locally cached blob in IndexedDB for instant zero-latency loading
    const videoIdMatch = rawUrl.match(/vid_[a-zA-Z0-9_-]+/);
    const videoId = videoIdMatch ? videoIdMatch[0] : undefined;
    const lookupKeys = [lesson.id, targetLessonId, videoId, rawUrl];

    mediaStore.findMediaByAnyKey(lookupKeys).then((cached) => {
      if (!isCancelled) {
        setSourceType('video');
        if (cached && cached.blob) {
          const blobUrl = URL.createObjectURL(cached.blob);
          setResolvedSourceUrl(blobUrl);
        } else {
          setResolvedSourceUrl(rawUrl);
        }
        setYoutubeVideoId(null);
        setIsLoadingSource(false);
      }
    }).catch(() => {
      if (!isCancelled) {
        setSourceType('video');
        setResolvedSourceUrl(rawUrl);
        setYoutubeVideoId(null);
        setIsLoadingSource(false);
      }
    });

    const safetyTimeout = setTimeout(() => {
      if (!isCancelled) {
        setIsLoadingSource(false);
      }
    }, 4000);

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimeout);
    };
  }, [lesson.videoUrl, lesson.id, lesson.durationSeconds, courseId, lessonId, syncDuration, autoPlay, retryNonce]);

  // 2. Initialize lesson data & load watch status (Runs strictly once per lesson change)
  useEffect(() => {
    if (initializedLessonIdRef.current === lesson.id) {
      return;
    }
    initializedLessonIdRef.current = lesson.id;

    setIsPlaying(false);
    isPlayingRef.current = false;
    setHasLoadError(false);

    const initialDur = lesson.durationSeconds || 0;
    durationRef.current = initialDur;
    setDuration(initialDur);

    const initialCompleted = progress?.isCompleted ?? false;
    isCompletedRef.current = initialCompleted;
    setIsCompleted(initialCompleted);

    const prevPos = progress?.watchedSeconds || 0;

    // If previously completed, unlock full seeking immediately!
    if (initialCompleted) {
      maxWatchedPositionRef.current = initialDur > 0 ? initialDur : 999999;
      setUniqueWatchedPercent(100);
    } else {
      maxWatchedPositionRef.current = prevPos;
      if (initialDur > 0 && prevPos > 0) {
        setUniqueWatchedPercent(Math.min(100, Math.round((prevPos / initialDur) * 100)));
      }
    }

    // Fetch genuine server watch status
    if (user?.id) {
      videoApi.getWatchStatus(user.id, lesson.courseId, lesson.id).then((status) => {
        if (status && status.success) {
          if (status.uniquePercent && status.uniquePercent > 0) {
            setUniqueWatchedPercent(status.uniquePercent);
          }
          if (status.isCompleted && !isCompletedRef.current) {
            isCompletedRef.current = true;
            setIsCompleted(true);
            maxWatchedPositionRef.current = durationRef.current > 0 ? durationRef.current : 999999;
          }
        }
      });
    }

    // Resume prompt check:
    // If student has watched at least 5 seconds and hasn't finished (or returning),
    // display the prompt to choose between resuming or starting from the beginning.
    const totalKnownSecs = initialDur > 0 ? initialDur : progress?.totalSeconds || 0;
    const shouldPromptResume =
      progress &&
      progress.watchedSeconds >= 5 &&
      (totalKnownSecs <= 0 || progress.watchedSeconds < totalKnownSecs - 8) &&
      !initialCompleted;

    if (shouldPromptResume) {
      setResumePosition(progress.watchedSeconds);
      setShowResumeBanner(true);
      showResumeBannerRef.current = true;
      // Keep initial view at start while user decides
      currentTimeRef.current = 0;
      setCurrentTime(0);
      lastHeartbeatPosRef.current = 0;
    } else {
      setShowResumeBanner(false);
      showResumeBannerRef.current = false;
      currentTimeRef.current = prevPos;
      setCurrentTime(prevPos);
      lastHeartbeatPosRef.current = prevPos;
    }
  }, [lesson.id, user?.id, lesson.durationSeconds]);

  // Synchronize completion state when unlocked without resetting playback or seek position
  useEffect(() => {
    if (progress?.isCompleted && !isCompletedRef.current) {
      isCompletedRef.current = true;
      setIsCompleted(true);
      maxWatchedPositionRef.current = durationRef.current > 0 ? durationRef.current : 999999;
    }
  }, [progress?.isCompleted]);

  // Save playback position to localStorage on page close / unload / tab hide
  useEffect(() => {
    const handleSaveBeforeUnload = () => {
      const activeUser = userRef.current;
      const currentLesson = lessonRef.current;
      if (!activeUser?.id || !currentLesson) return;
      const targetCourseId = courseId || currentLesson.courseId;
      const targetLessonId = lessonId || currentLesson.id;
      const pos = currentTimeRef.current;
      const dur = durationRef.current;
      if (pos > 0 && dur > 0) {
        storage.updateLessonPlayback(
          activeUser.id,
          targetCourseId,
          targetLessonId,
          pos,
          dur,
          isCompletedRef.current
        );
      }
    };

    window.addEventListener('beforeunload', handleSaveBeforeUnload);
    window.addEventListener('pagehide', handleSaveBeforeUnload);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleSaveBeforeUnload();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleSaveBeforeUnload);
      window.removeEventListener('pagehide', handleSaveBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [courseId, lessonId]);

  // 3. Heartbeat Runner (Both Client-side & Server API)
  const sendHeartbeat = useCallback(
    async (forcePosition?: number) => {
      const activeUser = userRef.current;
      const currentLesson = lessonRef.current;
      if (!activeUser?.id || !currentLesson) return;

      let currentPos = forcePosition !== undefined ? forcePosition : 0;
      let vidDuration = durationRef.current || currentLesson.durationSeconds || 0;
      const currentThreshold = thresholdRef.current;

      // Extract current playback position dynamically
      if (sourceType === 'youtube' && ytPlayerRef.current) {
        try {
          if (forcePosition === undefined && typeof ytPlayerRef.current.getCurrentTime === 'function') {
            const rawPos = ytPlayerRef.current.getCurrentTime() || 0;
            currentPos =
              !canSeekForwardRef.current && rawPos > maxWatchedPositionRef.current + 2.0
                ? maxWatchedPositionRef.current
                : rawPos;
          }
          if (typeof ytPlayerRef.current.getDuration === 'function') {
            const ytDur = Math.round(ytPlayerRef.current.getDuration() || 0);
            if (ytDur > 0) {
              vidDuration = ytDur;
              syncDuration(ytDur);
            }
          }
        } catch {}
      } else if (videoRef.current) {
        if (forcePosition === undefined) {
          const rawPos = videoRef.current.currentTime || 0;
          currentPos =
            !canSeekForwardRef.current && rawPos > maxWatchedPositionRef.current + 2.0
              ? maxWatchedPositionRef.current
              : rawPos;
        }
        if (videoRef.current.duration > 0) {
          vidDuration = Math.round(videoRef.current.duration);
          syncDuration(vidDuration);
        }
      }

      if (vidDuration <= 0) return;

      const lastPos = lastHeartbeatPosRef.current;
      let interval: [number, number] | undefined = undefined;
      if (currentPos > lastPos && currentPos - lastPos <= 15.0) {
        interval = [Math.max(0, lastPos), currentPos];
      }
      lastHeartbeatPosRef.current = currentPos;

      // Calculate progress contribution
      if (currentPos > maxWatchedPositionRef.current) {
        if (canSeekForwardRef.current || currentPos <= maxWatchedPositionRef.current + 2.0) {
          maxWatchedPositionRef.current = currentPos;
        } else {
          currentPos = maxWatchedPositionRef.current;
        }
      }
      const clientWatchedPercent = Math.min(100, Math.round((currentPos / vidDuration) * 100));
      const reachedThreshold = clientWatchedPercent >= currentThreshold;

      // Always update local storage first so user sees immediate progress
      if (reachedThreshold && !isCompletedRef.current) {
        isCompletedRef.current = true;
        setIsCompleted(true);
        maxWatchedPositionRef.current = vidDuration;
        setUniqueWatchedPercent(Math.max(currentThreshold, clientWatchedPercent));
        onProgressUpdateRef.current(currentPos, vidDuration, true);
        showToastRef.current(
          `'${currentLesson.title}' 학습 기준(${currentThreshold}%)을 충족하여 완료되었습니다.`,
          'success',
          '학습 완료'
        );
      } else {
        setUniqueWatchedPercent((prev) => Math.max(prev, clientWatchedPercent));
        onProgressUpdateRef.current(currentPos, vidDuration, isCompletedRef.current);
      }

      // Sync with server progress API (/api/progress/update) & heartbeat API (/api/progress/heartbeat)
      try {
        progressApi
          .updateProgress(
            activeUser.id,
            currentLesson.courseId,
            currentLesson.id,
            Math.round(currentPos),
            vidDuration,
            isCompletedRef.current || reachedThreshold
          )
          .catch(() => {});

        const res = await videoApi.sendHeartbeat({
          userId: activeUser.id,
          courseId: currentLesson.courseId,
          lessonId: currentLesson.id,
          currentPosition: currentPos,
          interval,
          duration: vidDuration,
          requiredThresholdPercent: currentThreshold,
        });

        if (res && res.success) {
          if (res.uniquePercent !== undefined) {
            setUniqueWatchedPercent((prev) => Math.max(prev, res.uniquePercent));
          }
          if ((res.isCompleted || res.uniquePercent >= currentThreshold) && !isCompletedRef.current) {
            isCompletedRef.current = true;
            setIsCompleted(true);
            onProgressUpdateRef.current(currentPos, vidDuration, true);
          }
        }
      } catch (err) {
        // Fallback already handled client-side
      }
    },
    [sourceType, syncDuration]
  );

  // Set up periodic heartbeat timer
  useEffect(() => {
    if (isPlaying) {
      heartbeatTimerRef.current = setInterval(() => {
        sendHeartbeat();
      }, 3000);
    } else {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    }

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
    };
  }, [isPlaying, sendHeartbeat]);

  // Video Completed Handler
  const handleEnded = useCallback(async () => {
    setIsPlaying(false);
    isPlayingRef.current = false;

    const currentLesson = lessonRef.current;
    const activeUser = userRef.current;
    const currentThreshold = thresholdRef.current;
    let vidDuration = durationRef.current || currentLesson.durationSeconds || 0;

    if (sourceType === 'youtube' && ytPlayerRef.current?.getDuration) {
      try {
        const ytDur = Math.round(ytPlayerRef.current.getDuration() || 0);
        if (ytDur > 0) vidDuration = ytDur;
      } catch {}
    }

    if (vidDuration <= 0) vidDuration = 60;

    // Strict Anti-Cheat & Seek Restriction:
    // If student attempts to seek to the end without actually watching the required threshold:
    const actualWatchedSec = maxWatchedPositionRef.current;
    const actualPercent = vidDuration > 0 ? (actualWatchedSec / vidDuration) * 100 : 0;
    if (!canSeekForwardRef.current && actualPercent < currentThreshold - 2) {
      if (sourceType === 'youtube' && ytPlayerRef.current?.seekTo) {
        try {
          ytPlayerRef.current.seekTo(actualWatchedSec, true);
        } catch {}
      }
      showToast(
        `강의 수료 기준(${currentThreshold}%) 이상 시청해야 학습 완료로 인정됩니다. 시청한 구간으로 이동합니다.`,
        'warning',
        '학습 완료 기준 미달'
      );
      return;
    }

    isCompletedRef.current = true;
    setIsCompleted(true);
    maxWatchedPositionRef.current = vidDuration;
    setUniqueWatchedPercent(100);
    onProgressUpdateRef.current(vidDuration, vidDuration, true);
    showToastRef.current(`'${currentLesson.title}' 완강을 축하합니다.`, 'success', '학습 완료');

    if (activeUser?.id) {
      sendHeartbeat(vidDuration);
      videoApi
        .verifyCompletion({
          userId: activeUser.id,
          courseId: currentLesson.courseId,
          lessonId: currentLesson.id,
          requiredThresholdPercent: currentThreshold,
        })
        .catch(() => {});
    }
  }, [sourceType, sendHeartbeat, showToast]);

  // Cleanup video playback and flush progress heartbeat when lesson changes or unmounts
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {}
      }
      sendHeartbeat();
    };
  }, [lesson.id, sendHeartbeat]);

  // 4. YouTube IFrame API Initialization, Polling & postMessage Fallback
  useEffect(() => {
    if (sourceType !== 'youtube' || !youtubeVideoId) return;

    let isSubscribed = true;

    // Direct postMessage listener for YouTube events (works even if YT.Player script is blocked)
    const handleWindowMessage = (e: MessageEvent) => {
      if (!isSubscribed) return;
      try {
        let data = e.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        if (data && data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            const curr = data.info.currentTime;
            const allowed = enforceYouTubeSeekPolicy(curr, isPlayingRef.current);
            if (!allowed) {
              return;
            }
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            syncDuration(Math.round(data.info.duration));
          }
          if (typeof data.info.playerState === 'number') {
            const playing = data.info.playerState === 1;
            if (playing !== isPlayingRef.current) {
              isPlayingRef.current = playing;
              setIsPlaying(playing);
              if (playing) {
                setShowResumeBanner(false);
              } else if (data.info.playerState === 2) {
                sendHeartbeat();
              } else if (data.info.playerState === 0) {
                handleEnded();
              }
            }
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleWindowMessage);

    const setupYTPlayer = () => {
      if (!isSubscribed) return;
      if (!window.YT || !window.YT.Player) return;

      const iframe = document.getElementById(ytContainerId);
      if (!iframe) return;

      try {
        if (ytPlayerRef.current && currentLoadedYtIdRef.current === youtubeVideoId) {
          return;
        }

        if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
          try {
            ytPlayerRef.current.destroy();
          } catch {}
          ytPlayerRef.current = null;
        }

        currentLoadedYtIdRef.current = youtubeVideoId;

        ytPlayerRef.current = new window.YT.Player(ytContainerId, {
          events: {
            onReady: (event: any) => {
              if (!isSubscribed) return;
              setIsLoadingSource(false);
              try {
                const ytDur = Math.round(event.target.getDuration() || 0);
                if (ytDur > 0) {
                  syncDuration(ytDur);
                }
                if (autoPlay && !showResumeBannerRef.current) {
                  event.target.playVideo();
                }
              } catch {}
            },
            onStateChange: (event: any) => {
              if (!isSubscribed) return;
              // YT.PlayerState: PLAYING = 1, PAUSED = 2, ENDED = 0, BUFFERING = 3
              if (event.data === 1 || event.data === 3) {
                try {
                  const currYt = event.target.getCurrentTime() || 0;
                  const allowed = enforceYouTubeSeekPolicy(currYt, true);
                  if (!allowed) {
                    return;
                  }
                  lastHeartbeatPosRef.current = currYt;
                } catch {}
              }

              if (event.data === 1) {
                setIsLoadingSource(false);
                setIsPlaying(true);
                isPlayingRef.current = true;
                try {
                  const ytDur = Math.round(event.target.getDuration() || 0);
                  if (ytDur > 0) {
                    syncDuration(ytDur);
                  }
                } catch {}
              } else if (event.data === 2) {
                try {
                  const currYt = event.target.getCurrentTime() || 0;
                  enforceYouTubeSeekPolicy(currYt, false);
                } catch {}
                setIsPlaying(false);
                isPlayingRef.current = false;
                sendHeartbeat();
              } else if (event.data === 0) {
                setIsPlaying(false);
                isPlayingRef.current = false;
                handleEnded();
              }
            },
            onError: (event: any) => {
              if (!isSubscribed) return;
              console.warn('YouTube Player encountered error:', event?.data);
              setIsLoadingSource(false);
              setHasLoadError(true);
            },
          },
        });
      } catch (err) {
        console.warn('YouTube Player initialization warning:', err);
      }
    };

    // Load YouTube IFrame API script safely if not present
    if (!window.YT || !window.YT.Player) {
      if (!window._ytCallbacks) {
        window._ytCallbacks = [];
      }
      window._ytCallbacks.push(setupYTPlayer);

      if (!window.onYouTubeIframeAPIReady) {
        window.onYouTubeIframeAPIReady = () => {
          if (window._ytCallbacks) {
            window._ytCallbacks.forEach((cb) => cb());
            window._ytCallbacks = [];
          }
        };
      }

      if (!document.getElementById('youtube-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }
    } else {
      setupYTPlayer();
    }

    // Active YouTube Polling Interval: Synchronizes Time, Duration, and Progress in Real-time (200ms)
    ytPollingTimerRef.current = setInterval(() => {
      if (!isSubscribed) return;
      if (!ytPlayerRef.current) return;
      // Do not overwrite during active, pending seek, or active rollback
      if (isSeekingRef.current || pendingSeekTargetRef.current !== null || isRestrictingSeekRef.current) return;

      try {
        // Query player state
        if (typeof ytPlayerRef.current.getPlayerState === 'function') {
          const state = ytPlayerRef.current.getPlayerState();
          const currentlyPlaying = state === 1;
          if (currentlyPlaying !== isPlayingRef.current) {
            isPlayingRef.current = currentlyPlaying;
            setIsPlaying(currentlyPlaying);
          }
        }

        // Query current position and duration
        if (typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const curr = ytPlayerRef.current.getCurrentTime() || 0;
          if (Number.isFinite(curr)) {
            const isAllowed = enforceYouTubeSeekPolicy(curr, isPlayingRef.current);
            if (!isAllowed) {
              return;
            }
          }

          let dur = durationRef.current;
          if (typeof ytPlayerRef.current.getDuration === 'function') {
            const ytDur = Math.round(ytPlayerRef.current.getDuration() || 0);
            if (ytDur > 0 && ytDur !== durationRef.current) {
              syncDuration(ytDur);
              dur = ytDur;
            }
          }

          // Continuously update progress while watching
          if (isPlayingRef.current && dur > 0) {
            const currentThreshold = thresholdRef.current;
            const currentPercent = Math.min(100, Math.round((curr / dur) * 100));
            setUniqueWatchedPercent((prev) => Math.max(prev, currentPercent));

            if (currentPercent >= currentThreshold && !isCompletedRef.current) {
              isCompletedRef.current = true;
              setIsCompleted(true);
              onProgressUpdateRef.current(curr, dur, true);
              showToastRef.current(
                `'${lessonRef.current.title}' 학습 기준(${currentThreshold}%)을 충족하여 완료되었습니다.`,
                'success',
                '학습 완료'
              );
            } else {
              const now = Date.now();
              const wholeSec = Math.floor(curr);
              if (wholeSec !== lastParentReportedSecRef.current || now - lastParentReportTimeRef.current >= 1200) {
                lastParentReportedSecRef.current = wholeSec;
                lastParentReportTimeRef.current = now;
                onProgressUpdateRef.current(curr, dur, isCompletedRef.current);
              }
            }
          }
        }
      } catch (e) {
        // Ignore cross-origin / unready errors
      }
    }, 200);

    return () => {
      isSubscribed = false;
      window.removeEventListener('message', handleWindowMessage);
      if (ytPollingTimerRef.current) {
        clearInterval(ytPollingTimerRef.current);
      }
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
          ytPlayerRef.current = null;
          currentLoadedYtIdRef.current = null;
        } catch {}
      }
    };
  }, [sourceType, youtubeVideoId, syncDuration, sendHeartbeat, handleEnded, enforceYouTubeSeekPolicy]);

  // 5. HTML5 Video Player Events
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    // CRITICAL: Lock out stale timeupdates while user is actively scrubbing or seeking is in flight
    if (isSeekingRef.current || pendingSeekTargetRef.current !== null) {
      return;
    }

    const curr = videoRef.current.currentTime;
    if (!Number.isFinite(curr)) return;

    currentTimeRef.current = curr;
    setCurrentTime(curr);

    if (curr > maxWatchedPositionRef.current) {
      maxWatchedPositionRef.current = curr;
    }

    const dur = videoRef.current.duration || durationRef.current;
    if (dur > 0 && Number.isFinite(dur)) {
      syncDuration(dur);
      const currentPercent = Math.min(100, Math.round((curr / dur) * 100));
      setUniqueWatchedPercent((prev) => Math.max(prev, currentPercent));

      if (currentPercent >= threshold && !isCompletedRef.current) {
        isCompletedRef.current = true;
        setIsCompleted(true);
        maxWatchedPositionRef.current = dur;
        onProgressUpdateRef.current(curr, dur, true);
        showToast(
          `'${lessonRef.current.title}' 학습 기준(${threshold}%)을 충족하여 완료되었습니다.`,
          'success',
          '학습 완료'
        );
      } else {
        const now = Date.now();
        const wholeSec = Math.floor(curr);
        if (wholeSec !== lastParentReportedSecRef.current || now - lastParentReportTimeRef.current >= 1200) {
          lastParentReportedSecRef.current = wholeSec;
          lastParentReportTimeRef.current = now;
          onProgressUpdateRef.current(curr, dur, isCompletedRef.current);
        }
      }
    }

    // Update buffered
    if (videoRef.current.buffered.length > 0 && dur > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBufferedPercent(Math.min(100, (bufferedEnd / dur) * 100));
    }
  };

  // Called when video element successfully settles seeking to target frame
  const handleSeeked = useCallback(() => {
    if (seekLockTimerRef.current) {
      clearTimeout(seekLockTimerRef.current);
      seekLockTimerRef.current = null;
    }
    pendingSeekTargetRef.current = null;
    if (videoRef.current) {
      const actual = videoRef.current.currentTime;
      if (Number.isFinite(actual)) {
        currentTimeRef.current = actual;
        setCurrentTime(actual);
      }
    }
  }, []);

  const handleLoadedMetadata = () => {
    setIsLoadingSource(false);
    if (!videoRef.current) return;
    const vidDur = videoRef.current.duration;
    if (vidDur && !isNaN(vidDur) && isFinite(vidDur) && vidDur > 0) {
      syncDuration(vidDur);
    }
    setHasLoadError(false);
    if (autoPlay && !showResumeBannerRef.current) {
      safePlay().catch(() => {});
    }
  };

  const handleCanPlay = () => {
    setIsLoadingSource(false);
    setHasLoadError(false);
    if (autoPlay && !isPlayingRef.current && !showResumeBannerRef.current) {
      safePlay().catch(() => {});
    }
  };

  const handleVideoError = async () => {
    console.warn('Video element failed to load or stream:', resolvedSourceUrl);
    // Before displaying the error overlay, check if mediaStore has a cached local blob
    const targetCourseId = courseId || lesson.courseId;
    const targetLessonId = lessonId || lesson.id;
    const videoIdMatch = (resolvedSourceUrl || lesson.videoUrl || '').match(/vid_[a-zA-Z0-9_-]+/);
    const videoId = videoIdMatch ? videoIdMatch[0] : undefined;
    const candidateKeys = [lesson.id, targetLessonId, videoId];

    try {
      const cached = await mediaStore.findMediaByAnyKey(candidateKeys);
      if (cached && cached.blob) {
        const fallbackBlobUrl = URL.createObjectURL(cached.blob);
        if (fallbackBlobUrl !== resolvedSourceUrl) {
          console.log('Successfully recovered video playback using cached IndexedDB blob:', cached.name);
          setResolvedSourceUrl(fallbackBlobUrl);
          setHasLoadError(false);
          setIsLoadingSource(false);
          return;
        }
      }
    } catch {}

    setIsLoadingSource(false);
    setHasLoadError(true);
  };

  const safePause = useCallback(async () => {
    if (!videoRef.current) return;

    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch {}
    }

    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
    triggerFeedback('pause');
    sendHeartbeat();
  }, [sendHeartbeat, triggerFeedback]);

  // Play / Pause Toggle
  const togglePlay = useCallback(() => {
    if (sourceType === 'empty') {
      showToast('해당 강의 영상이 아직 등록되지 않았습니다 (영상 준비 중).', 'info', '영상 준비 중');
      return;
    }

    if (sourceType === 'youtube') {
      if (ytPlayerRef.current) {
        try {
          const state = ytPlayerRef.current.getPlayerState?.();
          if (state === 1) {
            ytPlayerRef.current.pauseVideo?.();
            setIsPlaying(false);
            isPlayingRef.current = false;
            triggerFeedback('pause');
            sendHeartbeat();
          } else {
            ytPlayerRef.current.playVideo?.();
            setIsPlaying(true);
            isPlayingRef.current = true;
            setShowResumeBanner(false);
            triggerFeedback('play');
          }
          return;
        } catch (e) {
          console.warn('YouTube togglePlay error:', e);
        }
      }

      // Fallback postMessage to iframe if ytPlayerRef is null or restricted
      if (ytIframeRef.current?.contentWindow) {
        const cmd = isPlaying ? 'pauseVideo' : 'playVideo';
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: cmd, args: [] }),
          '*'
        );
        const nextState = !isPlaying;
        setIsPlaying(nextState);
        isPlayingRef.current = nextState;
        triggerFeedback(nextState ? 'play' : 'pause');
        if (!nextState) sendHeartbeat();
      }
      return;
    }

    if (!videoRef.current) return;

    if (!videoRef.current.paused && isPlayingRef.current) {
      safePause();
    } else {
      safePlay();
    }
  }, [sourceType, showToast, safePause, safePlay, triggerFeedback, sendHeartbeat]);

  // Scrubbing & Skipping with Completion Gating
  const handleSeekStart = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    isSeekingRef.current = true;
    wasPlayingBeforeSeekRef.current = isPlayingRef.current;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    let newTime = parseFloat(e.target.value);
    if (!Number.isFinite(newTime)) return;
    if (newTime < 0) newTime = 0;

    // Gating rule: If not completed and not admin, cannot seek beyond max watched position
    if (!canSeekForwardRef.current) {
      const maxAllowed = Math.max(currentTimeRef.current, maxWatchedPositionRef.current);
      if (newTime > maxAllowed + 0.5) {
        newTime = maxAllowed;
        if (!seekingWarningShownRef.current) {
          seekingWarningShownRef.current = true;
          showToast(
            '처음 수강 시에는 영상을 앞으로 건너뛸 수 없습니다. 강의를 완강한 후에는 자유롭게 탐색할 수 있습니다.',
            'warning',
            '탐색 제한'
          );
          setTimeout(() => {
            seekingWarningShownRef.current = false;
          }, 3000);
        }
      }
    }

    setCurrentTime(newTime);
    currentTimeRef.current = newTime;
  };

  const handleSeekEnd = useCallback(
    (e?: React.SyntheticEvent) => {
      if (e) {
        e.stopPropagation();
      }
      if (!isSeekingRef.current && pendingSeekTargetRef.current === null) return;
      isSeekingRef.current = false;
      let target = currentTimeRef.current;

      if (!Number.isFinite(target) || target < 0) {
        target = 0;
      }

      // Strict clamp for non-completed users
      if (!canSeekForwardRef.current) {
        const maxAllowed = Math.max(0, maxWatchedPositionRef.current);
        if (target > maxAllowed + 0.5) {
          target = maxAllowed;
          setCurrentTime(target);
          currentTimeRef.current = target;
          showToast(
            '처음 수강 시에는 영상을 앞으로 건너뛸 수 없습니다. 완강 후에는 자유롭게 이동할 수 있습니다.',
            'warning',
            '탐색 제한'
          );
        }
      }

      // Lock out stale timeupdates while the video seeks to the target frame
      pendingSeekTargetRef.current = target;
      if (seekLockTimerRef.current) {
        clearTimeout(seekLockTimerRef.current);
      }
      seekLockTimerRef.current = setTimeout(() => {
        pendingSeekTargetRef.current = null;
      }, 450);

      if (sourceType === 'youtube' && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(target, true);
        lastHeartbeatPosRef.current = target;
      } else if (videoRef.current) {
        videoRef.current.currentTime = target;
        lastHeartbeatPosRef.current = target;
      }

      // Report final seek position to parent immediately
      const dur = durationRef.current;
      if (dur > 0) {
        onProgressUpdateRef.current(target, dur, isCompletedRef.current);
      }

      if (wasPlayingBeforeSeekRef.current) {
        if (sourceType === 'youtube' && ytPlayerRef.current?.playVideo) {
          ytPlayerRef.current.playVideo();
        } else if (videoRef.current) {
          safePlay();
        }
      }
    },
    [sourceType, safePlay, showToast]
  );

  // Global mouseup/touchend listener to ensure scrubber seeking is cleanly ended
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isSeekingRef.current) {
        handleSeekEnd();
      }
    };
    window.addEventListener('mouseup', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalPointerUp);
    };
  }, [handleSeekEnd]);

  const handleSkip = useCallback(
    (seconds: number) => {
      // If user tries to skip forward (+seconds) and hasn't completed yet, block it
      if (seconds > 0 && !canSeekForwardRef.current) {
        showToast(
          '처음 수강 시에는 영상을 앞으로 건너뛸 수 없습니다. 강의를 완강하신 후에는 자유롭게 넘길 수 있습니다.',
          'warning',
          '건너뛰기 제한'
        );
        return;
      }

      const maxDur = durationRef.current > 0 ? durationRef.current : 99999;
      let target = Math.max(0, Math.min(maxDur, currentTimeRef.current + seconds));

      if (!canSeekForwardRef.current && target > maxWatchedPositionRef.current) {
        target = Math.max(0, maxWatchedPositionRef.current);
      }

      setCurrentTime(target);
      currentTimeRef.current = target;

      if (sourceType === 'youtube' && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(target, true);
        lastHeartbeatPosRef.current = target;
      } else if (videoRef.current) {
        videoRef.current.currentTime = target;
        lastHeartbeatPosRef.current = target;
      }
    },
    [sourceType, showToast]
  );

  // Surface Click Handler: Immediate response with zero delay
  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setShowControls(true);
    togglePlay();
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    toggleFullscreen();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (sourceType === 'youtube' && ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(val * 100);
      if (val === 0) {
        ytPlayerRef.current.mute?.();
        setIsMuted(true);
      } else {
        ytPlayerRef.current.unMute?.();
        setIsMuted(false);
      }
    } else if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (sourceType === 'youtube' && ytPlayerRef.current) {
      if (nextMuted) {
        ytPlayerRef.current.mute?.();
      } else {
        ytPlayerRef.current.unMute?.();
      }
    } else if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  }, [isMuted, sourceType]);

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (sourceType === 'youtube' && ytPlayerRef.current?.setPlaybackRate) {
      ytPlayerRef.current.setPlaybackRate(rate);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Synchronize Fullscreen change events (e.g. user pressing ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Global Keyboard Shortcuts (Space, Arrow keys, F, M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handleSkip(-10);
        triggerFeedback('skip-back');
      } else if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleSkip(10);
        triggerFeedback('skip-forward');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVolume((v) => {
          const next = Math.min(1, Math.round((v + 0.1) * 10) / 10);
          if (videoRef.current) {
            videoRef.current.volume = next;
            videoRef.current.muted = false;
          }
          setIsMuted(false);
          return next;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVolume((v) => {
          const next = Math.max(0, Math.round((v - 0.1) * 10) / 10);
          if (videoRef.current) {
            videoRef.current.volume = next;
            videoRef.current.muted = next === 0;
          }
          setIsMuted(next === 0);
          return next;
        });
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay, handleSkip, toggleFullscreen, toggleMute, triggerFeedback]);

  const togglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPip(true);
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  // Auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Resume handlers
  const handleResumePlayback = () => {
    setShowResumeBanner(false);
    showResumeBannerRef.current = false;
    const target = resumePosition;

    if (target > maxWatchedPositionRef.current) {
      maxWatchedPositionRef.current = target;
    }

    if (sourceType === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(target, true);
      setCurrentTime(target);
      currentTimeRef.current = target;
      lastHeartbeatPosRef.current = target;
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
      isPlayingRef.current = true;
    } else if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
      currentTimeRef.current = target;
      lastHeartbeatPosRef.current = target;
      safePlay();
    }
    showToast(
      `${formatSecondsToKorean(target)} (${formatPlayerTime(target)})부터 이어서 학습을 시작합니다.`,
      'info',
      '이어보기'
    );
  };

  const handleRestartPlayback = () => {
    setShowResumeBanner(false);
    showResumeBannerRef.current = false;

    if (sourceType === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(0, true);
      setCurrentTime(0);
      currentTimeRef.current = 0;
      lastHeartbeatPosRef.current = 0;
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
      isPlayingRef.current = true;
    } else if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      currentTimeRef.current = 0;
      lastHeartbeatPosRef.current = 0;
      safePlay();
    }
    showToast('처음부터 학습을 시작합니다.', 'info', '처음부터 시청');
  };

  const handleDismissResumeBanner = () => {
    setShowResumeBanner(false);
    showResumeBannerRef.current = false;
  };

  // Manual completion button action
  const handleManualComplete = async () => {
    const activeUser = userRef.current;
    const currentLesson = lessonRef.current;
    if (!activeUser?.id || !currentLesson) {
      showToast('로그인이 필요한 기능입니다.', 'warning');
      return;
    }

    const isUserPrivileged = activeUser.role === 'ADMIN' || activeUser.role === 'SUPER_ADMIN';
    if (!isUserPrivileged && uniqueWatchedPercent < threshold && !isCompleted) {
      showToast(
        `강사가 설정한 최소 학습 기준(${threshold}%) 이상 시청해야 완료할 수 있습니다. (현재 시청률: ${uniqueWatchedPercent}%)`,
        'warning',
        '학습 완료 기준 미달'
      );
      return;
    }

    let vidDuration = durationRef.current || currentLesson.durationSeconds || 0;
    if (sourceType === 'youtube' && ytPlayerRef.current?.getDuration) {
      try {
        const d = Math.round(ytPlayerRef.current.getDuration() || 0);
        if (d > 0) vidDuration = d;
      } catch {}
    }
    if (vidDuration <= 0) vidDuration = 60;

    setIsVerifying(true);
    isCompletedRef.current = true;
    setIsCompleted(true);
    setUniqueWatchedPercent(100);
    onProgressUpdate(vidDuration, vidDuration, true);
    showToast(`'${currentLesson.title}' 강의가 완료 처리되었습니다.`, 'success', '학습 완료');

    try {
      await videoApi.verifyCompletion({
        userId: activeUser.id,
        courseId: currentLesson.courseId,
        lessonId: currentLesson.id,
        requiredThresholdPercent: threshold,
      });
    } catch {}
    setIsVerifying(false);
  };

  // Precompute robust, safe values for timeline progress to prevent NaN/division-by-zero flickers
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeCurrentTime = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
  const playheadPercent =
    safeDuration > 0 ? Math.min(100, Math.max(0, (safeCurrentTime / safeDuration) * 100)) : 0;
  const safeBufferedPercent =
    Number.isFinite(bufferedPercent) && bufferedPercent >= 0 ? Math.min(100, bufferedPercent) : 0;
  const allowedRegionPercent =
    safeDuration > 0
      ? Math.min(100, Math.max(0, (maxWatchedPositionRef.current / safeDuration) * 100))
      : 0;

  return (
    <div className="space-y-4">
      {/* Video Container Frame */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className="relative aspect-video w-full max-h-[calc(100vh-4.5rem)] md:max-h-none mx-auto bg-slate-950 rounded-2xl overflow-hidden shadow-md group select-none border border-slate-800"
      >
        {/* Resume Learning Modal / Banner */}
        {showResumeBanner && (
          <div
            role="dialog"
            aria-modal="true"
            className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-sm bg-slate-900/95 border border-indigo-500/40 rounded-2xl shadow-2xl p-5 text-white space-y-4 relative">
              <button
                type="button"
                onClick={handleDismissResumeBanner}
                className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">학습 이어보기</h4>
                  <p className="text-xs text-slate-400">이전 수강 기록이 확인되었습니다</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-slate-200 space-y-1">
                <p className="leading-relaxed">
                  이전에{' '}
                  <strong className="text-indigo-300 font-bold">
                    {formatSecondsToKorean(resumePosition)} ({formatPlayerTime(resumePosition)})
                  </strong>
                  까지 수강하셨습니다.
                </p>
                <p className="text-slate-400">이어서 수강을 진행하시겠습니까?</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRestartPlayback}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>처음부터</span>
                </button>
                <button
                  type="button"
                  onClick={handleResumePlayback}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>이어보기</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1. Explicit Loading State Overlay (Prevents Blank Screen) */}
        {isLoadingSource && !hasLoadError && sourceType !== 'empty' && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-25 select-none">
            {lesson.videoThumbnail && (
              <img
                src={lesson.videoThumbnail}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-xs"
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-3 border-indigo-500/30 border-t-indigo-500 animate-spin mb-3 shadow-lg" />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-semibold mb-2">
                <Film className="w-3.5 h-3.5" />
                <span>강의 영상 로딩 중</span>
              </div>
              <p className="text-sm font-semibold text-white mb-1 max-w-sm line-clamp-1">{lesson.title}</p>
              <p className="text-xs text-slate-400">플레이어 및 스트리밍 연결을 초기화하고 있습니다...</p>
            </div>
          </div>
        )}

        {/* 2. Empty / Unregistered Video State */}
        {sourceType === 'empty' ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900/95 select-none z-15">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
              <Film className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full text-xs font-semibold mb-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>강의 영상 미등록 (준비 중)</span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-100 mb-1">등록된 강의 영상이 없습니다</h4>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
              현재 차시의 동영상 파일이나 외부 링크가 아직 등록되지 않았습니다. 관리자가 동영상을 업로드하면 즉시 학습할 수 있습니다.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleRetryLoading}
                className="py-2 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>다시 확인하기</span>
              </button>
              {hasNextLesson && onNextLesson && (
                <button
                  type="button"
                  onClick={onNextLesson}
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <span>다음 차시로 이동</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {hasPrevLesson && onPrevLesson && (
                <button
                  type="button"
                  onClick={onPrevLesson}
                  className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>이전 차시로</span>
                </button>
              )}
            </div>
          </div>
        ) : sourceType === 'youtube' && youtubeVideoId ? (
          <div ref={ytWrapperRef} className="w-full h-full relative bg-black flex items-center justify-center">
            <iframe
              key={lesson.id}
              id={ytContainerId}
              ref={ytIframeRef}
              src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=${autoPlay && !showResumeBanner ? 1 : 0}&rel=0&modestbranding=1&playsinline=1`}
              title={lesson.title || '강의 영상'}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => {
                setIsLoadingSource(false);
              }}
            />
            {/* Top Info & Status Badges */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
              {duration <= 0 && (
                <div className="bg-black/70 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/20">
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>재생시간 확인 중...</span>
                </div>
              )}
              {!canSeekForward ? (
                <div className="bg-slate-900/85 backdrop-blur-xs text-amber-300 text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-amber-500/30 shadow-md">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>진도 탐색 제한 (시청한 구간까지 이동 가능)</span>
                </div>
              ) : (
                <div className="bg-slate-900/85 backdrop-blur-xs text-emerald-300 text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/30 shadow-md">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>자유 탐색 가능</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <video
              key={lesson.id}
              ref={videoRef}
              src={resolvedSourceUrl}
              poster={lesson.videoThumbnail}
              onPlay={() => {
                setIsPlaying(true);
                isPlayingRef.current = true;
                setShowResumeBanner(false);
                setIsBuffering(false);
              }}
              onPause={() => {
                setIsPlaying(false);
                isPlayingRef.current = false;
                setShowControls(true);
                sendHeartbeat();
              }}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => {
                setIsBuffering(false);
                setIsLoadingSource(false);
              }}
              onCanPlay={handleCanPlay}
              onTimeUpdate={handleTimeUpdate}
              onSeeked={handleSeeked}
              onLoadedMetadata={handleLoadedMetadata}
              onSeeking={() => {
                if (!canSeekForwardRef.current && videoRef.current) {
                  const cur = videoRef.current.currentTime;
                  if (cur > maxWatchedPositionRef.current + 1.5) {
                    videoRef.current.currentTime = Math.max(0, maxWatchedPositionRef.current);
                    setCurrentTime(videoRef.current.currentTime);
                    currentTimeRef.current = videoRef.current.currentTime;
                    showToast(
                      '처음 수강 시에는 영상을 앞으로 건너뛸 수 없습니다.',
                      'warning',
                      '탐색 제한'
                    );
                  }
                }
              }}
              onEnded={handleEnded}
              onError={handleVideoError}
              playsInline
              preload="auto"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Dedicated Interactive Click Surface (handles immediate click and double click) */}
            <div
              onClick={handleSurfaceClick}
              onDoubleClick={handleDoubleClick}
              className="absolute inset-0 z-10 cursor-pointer"
              title="클릭: 재생/일시정지 | 더블클릭: 전체화면"
            />


            {/* Center Play Button Overlay (when paused) */}
            {!isPlaying && !hasLoadError && (
              <div
                onClick={handleSurfaceClick}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer z-15"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-2xl transition-transform transform hover:scale-105 pointer-events-auto cursor-pointer"
                  title="재생 (Space)"
                >
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 translate-x-0.5 fill-current" />
                </button>
              </div>
            )}

            {/* Buffering Indicator */}
            {isBuffering && isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-18">
                <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-xs flex items-center justify-center text-indigo-400 shadow-xl border border-white/10">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              </div>
            )}

            {/* Action Feedback Ripple (Visual feedback on click/double-click/keyboard) */}
            {actionFeedback && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div
                  key={actionFeedback.id}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/80 backdrop-blur-xs text-white flex items-center justify-center animate-ping duration-500 shadow-2xl border border-white/20"
                >
                  {actionFeedback.type === 'play' && (
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current translate-x-0.5" />
                  )}
                  {actionFeedback.type === 'pause' && (
                    <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
                  )}
                  {actionFeedback.type === 'skip-forward' && (
                    <div className="flex flex-col items-center">
                      <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
                      <span className="text-[10px] font-bold mt-0.5">+10초</span>
                    </div>
                  )}
                  {actionFeedback.type === 'skip-back' && (
                    <div className="flex flex-col items-center">
                      <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" />
                      <span className="text-[10px] font-bold mt-0.5">-10초</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Custom Control Overlay */}
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300 ${
                showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Timeline / Progress Scrubber */}
              <div
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="relative mb-2.5 flex items-center group/scrubber select-none cursor-pointer py-1"
              >
                {/* Buffered & Watched Bar Background */}
                <div className="w-full h-1.5 group-hover/scrubber:h-2.5 bg-white/20 rounded-full overflow-hidden relative transition-[height] duration-150">
                  {/* Buffered Bar */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-white/30 rounded-full pointer-events-none"
                    style={{ width: `${safeBufferedPercent}%` }}
                  />
                  {/* Allowed / Watched Region for non-completed students */}
                  {!canSeekForward && safeDuration > 0 && (
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-indigo-400/25 rounded-full pointer-events-none"
                      style={{
                        width: `${allowedRegionPercent}%`,
                      }}
                    />
                  )}
                  {/* Current Playhead Bar */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-indigo-500 rounded-full pointer-events-none"
                    style={{ width: `${playheadPercent}%` }}
                  />
                </div>

                {/* Scrubber Playhead Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md border-2 border-indigo-600 transition-transform scale-0 group-hover/scrubber:scale-100 pointer-events-none"
                  style={{
                    left: `calc(${playheadPercent}% - 6px)`,
                  }}
                />

                {/* Range Input for Scrubbing */}
                <input
                  type="range"
                  min="0"
                  max={safeDuration > 0 ? safeDuration : 100}
                  step="0.1"
                  value={safeDuration > 0 ? Math.min(safeDuration, safeCurrentTime) : 0}
                  onChange={handleSeek}
                  onMouseDown={handleSeekStart}
                  onTouchStart={handleSeekStart}
                  onMouseUp={handleSeekEnd}
                  onTouchEnd={handleSeekEnd}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 appearance-none outline-none focus:outline-none ring-0 focus:ring-0 select-none"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  title={
                    canSeekForward
                      ? '구간 이동 (완강 완료: 자유 탐색 가능)'
                      : '구간 이동 (완강 전: 시청한 구간까지만 이동 가능)'
                  }
                />
              </div>

              {/* Control Buttons Bar */}
              <div className="flex items-center justify-between text-white text-xs">
                {/* Left Controls */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                    title={isPlaying ? '일시정지 (Space)' : '재생 (Space)'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSkip(-10)}
                    className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="10초 뒤로"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSkip(10)}
                    className={`p-1 transition-colors cursor-pointer relative ${
                      canSeekForward ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-amber-300'
                    }`}
                    title={canSeekForward ? '10초 앞으로' : '10초 앞으로 (완강 후 이용 가능)'}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    {!canSeekForward && (
                      <span className="absolute -top-1 -right-1 bg-amber-500/90 text-slate-950 p-0.5 rounded-full">
                        <Lock className="w-2 h-2 stroke-[3]" />
                      </span>
                    )}
                  </button>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-1.5 group/vol">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={isMuted ? '음소거 해제' : '음소거'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-14 h-1 bg-white/30 accent-indigo-500 rounded-full cursor-pointer hidden sm:block"
                    />
                  </div>

                  {/* Exact Time Display */}
                  <div className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                    <span>{formatPlayerTime(currentTime)}</span>
                    <span className="text-slate-500">/</span>
                    <span>{duration > 0 ? formatPlayerTime(duration) : '확인 중...'}</span>

                    {/* Completion Exploration Status Badge */}
                    {canSeekForward ? (
                      <span
                        className="hidden lg:inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded ml-1"
                        title="완강 완료: 전체 구간 자유 탐색 가능"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>자유 탐색</span>
                      </span>
                    ) : (
                      <span
                        className="hidden lg:inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded ml-1"
                        title="완강 전에는 앞으로 건너뛸 수 없습니다. 완강 시 자유 탐색이 해제됩니다."
                      >
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        <span>건너뛰기 제한</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Playback Rate */}
                  <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-0.5">
                    {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleRateChange(rate)}
                        className={`text-[10px] font-semibold px-1 py-0.5 rounded transition-colors ${
                          playbackRate === rate ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  {/* Autoplay Toggle in Player Controls */}
                  {onAutoPlayChange && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !autoPlay;
                        onAutoPlayChange(nextVal);
                        showToast(
                          nextVal ? '다음 강의 자동 재생이 활성화되었습니다.' : '다음 강의 자동 재생이 해제되었습니다.',
                          'info',
                          '자동 재생 설정'
                        );
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                        autoPlay ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-white/10'
                      }`}
                      title={autoPlay ? '다음 차시 이동 시 자동 재생 (클릭하여 끄기)' : '다음 차시 이동 시 자동 재생 꺼짐 (클릭하여 켜기)'}
                    >
                      <FastForward className={`w-3 h-3 ${autoPlay ? 'text-indigo-300' : ''}`} />
                      <span className="hidden sm:inline">자동재생 {autoPlay ? 'ON' : 'OFF'}</span>
                    </button>
                  )}

                  {/* Picture in Picture */}
                  <button
                    type="button"
                    onClick={togglePip}
                    className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="화면 속 화면 (PiP)"
                  >
                    <Tv className="w-3.5 h-3.5" />
                  </button>

                  {/* Fullscreen */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="전체화면"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Global Video Error Overlay (for HTML5 video or YouTube load failures) */}
        {hasLoadError && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-30 select-none"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-3 shadow-inner">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-xs font-semibold mb-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>동영상 재생 오류</span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white mb-1">동영상을 재생할 수 없습니다</h4>
            <p className="text-xs text-slate-300 max-w-md leading-relaxed mb-4">
              영상 원본 소스 연결이 불안정하거나 지원되지 않는 미디어 형식입니다. 네트워크 상태를 확인하신 후 다시 시도해 주세요.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleRetryLoading}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>다시 시도하기</span>
              </button>
              <button
                type="button"
                onClick={handlePlayFallbackSample}
                className="py-2 px-3.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-white/15"
                title="안정적인 기본 교육용 샘플 스트림으로 전환합니다"
              >
                <Film className="w-3.5 h-3.5 text-amber-300" />
                <span>대체 샘플 영상으로 시청</span>
              </button>
              {hasNextLesson && onNextLesson && (
                <button
                  type="button"
                  onClick={onNextLesson}
                  className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>다음 차시로 이동</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress & Completion Status Bar */}
      {showBottomBar && (
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Watch Progress Indicator */}
          <div className="space-y-1.5 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">실제 시청 진도율</span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  uniqueWatchedPercent >= threshold || isCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-indigo-50 text-indigo-700'
                }`}
              >
                {isCompleted ? 100 : uniqueWatchedPercent}% (수료 기준: {threshold}%)
              </span>
              {isCompleted && (
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>수강 완료</span>
                </span>
              )}
            </div>
            <div className="w-full sm:w-72 bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isCompleted || uniqueWatchedPercent >= threshold ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${isCompleted ? 100 : Math.min(100, uniqueWatchedPercent)}%` }}
              />
            </div>
          </div>

          {/* Action Buttons: Prev, Complete Verification, Next, and Autoplay setting */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Autoplay setting badge/toggle */}
            {onAutoPlayChange && (
              <button
                type="button"
                onClick={() => {
                  const nextVal = !autoPlay;
                  onAutoPlayChange(nextVal);
                  showToast(
                    nextVal ? '다음 강의 자동 재생이 활성화되었습니다.' : '다음 강의 자동 재생이 해제되었습니다.',
                    'info',
                    '자동 재생 설정'
                  );
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  autoPlay
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
                title="다음 강의로 넘어갈 때 자동으로 재생할지 설정합니다."
              >
                <FastForward className={`w-3.5 h-3.5 ${autoPlay ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>다음 강의 자동 재생 {autoPlay ? 'ON' : 'OFF'}</span>
              </button>
            )}
            {hasPrevLesson && (
              <button
                type="button"
                onClick={onPrevLesson}
                className="py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>이전 강의</span>
              </button>
            )}

            {/* Strict Complete Button */}
            {(() => {
              const isUserPrivileged = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
              const canComplete = isCompleted || isUserPrivileged || uniqueWatchedPercent >= threshold;

              return (
                <button
                  type="button"
                  disabled={isVerifying || isCompleted || !canComplete}
                  onClick={handleManualComplete}
                  className={`py-2 px-3.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs ${
                    isCompleted
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 cursor-default'
                      : canComplete
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                  title={
                    !canComplete
                      ? `영상의 ${threshold}% 이상을 시청해야 완료할 수 있습니다. (현재 시청률: ${uniqueWatchedPercent}%)`
                      : '학습 완료 처리'
                  }
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>학습 완료됨</span>
                    </>
                  ) : canComplete ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>학습 완료하기</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>학습 완료 ({threshold}% 이상 시청 시 가능)</span>
                    </>
                  )}
                </button>
              );
            })()}

            {/* Next Lesson Button (Disabled until completed or allowed) */}
            {hasNextLesson && (
              <button
                type="button"
                disabled={!isCompleted && (lesson.sequentialLock ?? true)}
                onClick={onNextLesson}
                className={`py-2 px-3.5 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors ${
                  isCompleted || !(lesson.sequentialLock ?? true)
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
                title={
                  !isCompleted && (lesson.sequentialLock ?? true)
                    ? '현재 강의를 시청하여 완료한 후 다음 강의로 이동할 수 있습니다.'
                    : '다음 강의로 이동'
                }
              >
                <span>다음 강의</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
