import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Lesson, DurationStatus, VideoSourceType } from '../../types';
import {
  UploadCloud,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Film,
  Camera,
  Lock,
  Percent,
  RefreshCw,
  Info,
  Youtube,
  X,
  XCircle,
  Loader2,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { videoApi } from '../../services/videoApi';
import { firestoreService } from '../../services/firebase';
import { mediaStore } from '../../services/mediaStore';
import {
  formatDuration,
  extractYouTubeVideoId,
  extractMediaDuration,
} from '../../utils/duration';
import {
  validateVideoFile,
  MAX_VIDEO_FILE_SIZE_MB,
  formatFileSize,
} from '../../utils/fileValidation';
import { extractFirstFrameThumbnail } from '../../utils/thumbnail';

export interface ActiveUploadProgress {
  isUploading: boolean;
  progress: number;
  fileName: string;
  bytesInfo: string;
  lessonTitle: string;
  uploadId?: string;
  thumbnailUrl?: string;
  onCancel: () => void;
}

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson?: Lesson;
  existingLessons?: Lesson[];
  onProgressUpdate?: (progress: ActiveUploadProgress | null) => void;
  onSave: (
    videoData: {
      title: string;
      videoUrl: string;
      videoThumbnail?: string;
      durationSeconds: number | null;
      durationStatus?: DurationStatus;
      sourceType?: VideoSourceType;
      youtubeVideoId?: string | null;
      completionThresholdPercent?: number;
      sequentialLock?: boolean;
      contentSummary?: string;
      isFreePreview: boolean;
      videoStatus?: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
      videoOriginalName?: string;
      videoFileSize?: number;
    },
    setAsCourseThumbnail?: boolean
  ) => void;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  lesson,
  existingLessons,
  onProgressUpdate,
  onSave,
}) => {
  const { showToast } = useToast();
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const initialTab =
    lesson?.videoUrl?.startsWith('http') && !lesson.videoUrl.includes('/api/videos/stream')
      ? 'url'
      : 'file';

  const [tab, setTab] = useState<'file' | 'url'>(initialTab);
  const [title, setTitle] = useState(lesson?.title || '');
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(lesson?.videoThumbnail || '');

  // Exact duration state (NO arbitrary 600 default)
  const [durationSeconds, setDurationSeconds] = useState<number | null>(
    typeof lesson?.durationSeconds === 'number' && lesson.durationSeconds > 0
      ? lesson.durationSeconds
      : null
  );
  const [durationStatus, setDurationStatus] = useState<DurationStatus>(
    lesson?.durationStatus ||
      (typeof lesson?.durationSeconds === 'number' && lesson.durationSeconds > 0
        ? 'READY'
        : 'PENDING')
  );
  const [isCheckingDuration, setIsCheckingDuration] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(
    lesson?.youtubeVideoId || extractYouTubeVideoId(lesson?.videoUrl) || null
  );
  const [sourceType, setSourceType] = useState<VideoSourceType>(
    lesson?.sourceType || (lesson?.videoUrl?.includes('youtu') ? 'YOUTUBE' : 'UPLOAD')
  );

  // Manual duration editing state
  const [isManualDuration, setIsManualDuration] = useState(false);
  const [manualMinutes, setManualMinutes] = useState<string>(
    durationSeconds ? String(Math.floor(durationSeconds / 60)) : ''
  );
  const [manualSecs, setManualSecs] = useState<string>(
    durationSeconds ? String(durationSeconds % 60) : ''
  );

  const [completionThreshold, setCompletionThreshold] = useState<number>(
    lesson?.completionThresholdPercent || 90
  );
  const [sequentialLock, setSequentialLock] = useState<boolean>(
    lesson?.sequentialLock !== undefined ? lesson.sequentialLock : true
  );
  const [contentSummary, setContentSummary] = useState(lesson?.contentSummary || '');
  const [isFreePreview, setIsFreePreview] = useState(lesson?.isFreePreview || false);

  // Real upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytesInfo, setUploadedBytesInfo] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(
    lesson?.videoOriginalName || null
  );
  const [videoStatus, setVideoStatus] = useState<'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'>(
    lesson?.videoStatus || (lesson?.videoUrl ? 'READY' : 'READY')
  );
  const [videoFileSize, setVideoFileSize] = useState<number | undefined>(lesson?.videoFileSize);
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Cancellation and chunk cleanup tracking
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeUploadIdRef = useRef<string | null>(null);

  // Duplicate filename detection & confirmation modal states
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [pendingDuplicateFile, setPendingDuplicateFile] = useState<File | null>(null);
  const [duplicateReason, setDuplicateReason] = useState<string>('');

  // Auto-extracted first frame thumbnail states
  const [isThumbnailAutoGenerated, setIsThumbnailAutoGenerated] = useState(false);
  const [setAsCourseThumbnail, setSetAsCourseThumbnail] = useState(true);
  const [isExtractingThumbnail, setIsExtractingThumbnail] = useState(false);

  // Pre-validation error state for clear user feedback
  const [validationError, setValidationError] = useState<{
    title: string;
    message: string;
    details?: {
      filename: string;
      formattedSize: string;
      fileExtension: string;
    };
  } | null>(null);

  // Cancel in-progress upload and clean up server temporary chunk files
  const handleCancelUpload = async () => {
    if (!isUploading) return;
    const confirmCancel = window.confirm(
      '동영상 업로드를 취소하시겠습니까?\n업로드 중이던 서버의 임시 청크 데이터는 즉시 정리 및 삭제됩니다.'
    );
    if (!confirmCancel) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (activeUploadIdRef.current) {
      await videoApi.cancelUploadSession(activeUploadIdRef.current);
      activeUploadIdRef.current = null;
    }

    setIsUploading(false);
    setUploadProgress(0);
    setUploadedBytesInfo('');
    setSelectedFileName(lesson?.videoOriginalName || null);
    setVideoStatus(lesson?.videoUrl ? 'READY' : 'READY');
    if (onProgressUpdate) {
      onProgressUpdate(null);
    }
    showToast('업로드가 취소되었으며 서버 임시 청크 파일이 깨끗이 정리되었습니다.', 'info', '업로드 취소');
  };

  // Helper to extract first frame and set as thumbnail automatically
  const autoExtractAndSetThumbnail = async (file: File) => {
    setIsExtractingThumbnail(true);
    try {
      const res = await extractFirstFrameThumbnail(file, 0.3);
      if (res.thumbnailUrl) {
        setThumbnailUrl(res.thumbnailUrl);
        setIsThumbnailAutoGenerated(true);
        showToast(
          '강의 영상 첫 번째 프레임을 추출하여 대표 썸네일 이미지로 자동 설정했습니다.',
          'success',
          '썸네일 자동 설정'
        );
      }
    } catch (err) {
      console.warn('Auto thumbnail extraction failed:', err);
    } finally {
      setIsExtractingThumbnail(false);
    }
  };

  // Core File Upload Processor (executed after validation & duplicate confirmation)
  const processUploadFile = async (file: File) => {
    if (!file) return;

    // 1. Strict pre-validation: check file format (MP4, MOV, WebM) & size limit (100MB)
    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      setValidationError({
        title: validation.errorTitle || '업로드 검사 실패',
        message: validation.errorMessage || '지원되지 않는 강의 자료 파일입니다.',
        details: validation.details
          ? {
              filename: validation.details.filename,
              formattedSize: validation.details.formattedSize,
              fileExtension: validation.details.fileExtension,
            }
          : undefined,
      });
      showToast(
        validation.errorMessage || '업로드할 수 없는 파일입니다.',
        'error',
        validation.errorTitle || '파일 검사 실패'
      );
      return;
    }

    // Pre-validation passed: clear previous error state
    setValidationError(null);

    // Create local object URL for instant, latency-free preview
    const previewUrl = URL.createObjectURL(file);
    setLocalBlobUrl(previewUrl);

    setSelectedFileName(file.name);
    setVideoFileSize(file.size);
    setSourceType('UPLOAD');
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    // Setup abort controller for cancel capability
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;
    activeUploadIdRef.current = null;

    setIsUploading(true);
    setVideoStatus('UPLOADING');
    setUploadProgress(0);

    // Kick off automatic first-frame thumbnail extraction immediately
    autoExtractAndSetThumbnail(file);

    try {
      let extractedDur: number | undefined = undefined;
      try {
        const { durationSeconds: fileDur } = await extractMediaDuration(file);
        if (fileDur && fileDur > 0) {
          extractedDur = fileDur;
          setDurationSeconds(fileDur);
          setDurationStatus('READY');
          setManualMinutes(String(Math.floor(fileDur / 60)));
          setManualSecs(String(fileDur % 60));
        }
      } catch (durErr) {
        console.warn('Could not extract duration immediately:', durErr);
      }

      // 1. First attempt to upload to backend server with chunking & cancellation
      let uploadSucceeded = false;
      try {
        const result = await videoApi.uploadVideo(
          file,
          (percent, loaded, total) => {
            if (abortCtrl.signal.aborted) return;
            setUploadProgress(percent);
            const formatBytes = (bytes: number) => {
              if (bytes >= 1024 * 1024 * 1024) {
                return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
              }
              return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
            };
            const bytesStr = `${formatBytes(loaded)} / ${formatBytes(total)}`;
            setUploadedBytesInfo(bytesStr);

            // Sync visual progress bar to CurriculumManager (lecture editing page)
            if (onProgressUpdate) {
              onProgressUpdate({
                isUploading: true,
                progress: percent,
                fileName: file.name,
                bytesInfo: bytesStr,
                lessonTitle: title || lesson?.title || file.name.replace(/\.[^/.]+$/, ''),
                uploadId: activeUploadIdRef.current || undefined,
                onCancel: handleCancelUpload,
              });
            }
          },
          extractedDur,
          abortCtrl.signal,
          (id) => {
            activeUploadIdRef.current = id;
          }
        );

        if (result.success && result.video) {
          uploadSucceeded = true;
          const streamUrl = result.video.video_url || result.video.url || '';
          setVideoUrl(streamUrl);
          setVideoStatus('READY');

          // Synchronize video metadata to Firestore DB for universal multi-device access
          const videoId = result.video.video_id || result.video.id || `vid_${Date.now()}`;
          firestoreService.saveVideoMeta({
            video_id: videoId,
            file_name: file.name,
            video_url: streamUrl,
            thumbnail_url: thumbnailUrl || undefined,
            file_size: file.size,
            mime_type: file.type || 'video/mp4',
            duration_seconds: extractedDur,
            uploaded_at: new Date().toISOString(),
            status: 'ready',
          }).catch((dbErr) => {
            console.warn('[VideoUploadModal] Firestore video metadata notice:', dbErr);
          });

          showToast('동영상 파일이 서버 스토리지 및 DB에 안전하게 업로드되었습니다.', 'success', '업로드 완료');
        } else {
          throw new Error(result.message || '서버 업로드에 실패했습니다.');
        }
      } catch (serverUploadErr: any) {
        if (abortCtrl.signal.aborted || serverUploadErr?.isCancelled) {
          console.log('Upload was cancelled by user.');
          return;
        }
        console.error('Server upload failed:', serverUploadErr);
        setVideoStatus('FAILED');
        showToast(serverUploadErr?.message || '동영상 업로드에 실패했습니다. 다시 시도해주세요.', 'error', '업로드 실패');
        return;
      }

      // Check if cancelled
      if (abortCtrl.signal.aborted) {
        return;
      }
    } catch (err: any) {
      if (abortCtrl.signal.aborted || err?.isCancelled) {
        return;
      }
      console.error('Video upload processing error:', err);
      setVideoStatus('FAILED');
      showToast(err?.message || '동영상 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsUploading(false);
      if (onProgressUpdate) {
        onProgressUpdate(null);
      }
    }
  };

  // Duplicate Check before processing file
  const checkAndProcessFile = async (file: File) => {
    if (!file) return;

    // 1. First run format & size pre-validation
    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      setValidationError({
        title: validation.errorTitle || '업로드 검사 실패',
        message: validation.errorMessage || '지원되지 않는 강의 자료 파일입니다.',
        details: validation.details
          ? {
              filename: validation.details.filename,
              formattedSize: validation.details.formattedSize,
              fileExtension: validation.details.fileExtension,
            }
          : undefined,
      });
      showToast(
        validation.errorMessage || '업로드할 수 없는 파일입니다.',
        'error',
        validation.errorTitle || '파일 검사 실패'
      );
      return;
    }

    // 2. Check duplicate filename in existing curriculum lessons
    const duplicateLesson = existingLessons?.find(
      (l) =>
        l.videoOriginalName &&
        l.videoOriginalName.trim().toLowerCase() === file.name.trim().toLowerCase() &&
        l.id !== lesson?.id
    ) || (
      lesson?.videoOriginalName &&
      lesson.videoOriginalName.trim().toLowerCase() === file.name.trim().toLowerCase() &&
      lesson.videoUrl
        ? lesson
        : null
    );

    // 3. Check duplicate filename in server storage
    let duplicateOnServer = false;
    try {
      const checkRes = await videoApi.checkDuplicateVideo(file.name);
      if (checkRes.isDuplicate) {
        duplicateOnServer = true;
      }
    } catch {}

    if (duplicateLesson || duplicateOnServer) {
      setPendingDuplicateFile(file);
      setDuplicateReason(
        duplicateLesson
          ? `현재 과정의 강의 "${duplicateLesson.title}" 에 이미 동일한 파일명("${file.name}")이 등록되어 있습니다.`
          : `서버 저장소에 이미 동일한 파일명("${file.name}")의 영상이 보관되어 있습니다.`
      );
      setIsDuplicateModalOpen(true);
      return;
    }

    // No duplicate detected, proceed directly
    processUploadFile(file);
  };

  // Handle Real File Selection via File Input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      checkAndProcessFile(file);
    }
    // Reset input so selecting the same file triggers change
    e.target.value = '';
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      checkAndProcessFile(file);
    }
  };

  // Verify YouTube or Streaming URL
  const handleCheckUrlDuration = async (urlToCheck?: string) => {
    const targetUrl = (urlToCheck || videoUrl).trim();
    if (!targetUrl) return;

    const ytId = extractYouTubeVideoId(targetUrl);
    if (ytId) {
      setYoutubeVideoId(ytId);
      setSourceType('YOUTUBE');
      setIsCheckingDuration(true);
      setDurationStatus('PENDING');

      try {
        const info = await videoApi.fetchYouTubeVideoInfo(targetUrl);
        if (info.success && info.valid) {
          if (info.title && !title.trim()) {
            setTitle(info.title);
          }
          if (info.thumbnailUrl && !thumbnailUrl.trim()) {
            setThumbnailUrl(info.thumbnailUrl);
          }
          if (typeof info.durationSeconds === 'number' && info.durationSeconds > 0) {
            setDurationSeconds(info.durationSeconds);
            setDurationStatus('READY');
            setManualMinutes(String(Math.floor(info.durationSeconds / 60)));
            setManualSecs(String(info.durationSeconds % 60));
            showToast(`YouTube 재생시간 확인 완료: ${formatDuration(info.durationSeconds)}`, 'success');
          } else {
            setDurationSeconds(null);
            setDurationStatus('PENDING');
            showToast('YouTube 영상 확인 완료 (학습자 플레이어 재생 시 실제 시간이 자동 연동됩니다)', 'info');
          }
        } else {
          setDurationStatus(info.durationStatus || 'FAILED');
          showToast(info.message || 'YouTube 영상 정보를 확인할 수 없습니다.', 'warning');
        }
      } catch (e: any) {
        setDurationStatus('FAILED');
      } finally {
        setIsCheckingDuration(false);
      }
    } else {
      // Direct stream URL
      setSourceType('URL');
      setYoutubeVideoId(null);
      setIsCheckingDuration(true);
      try {
        const res = await videoApi.validateUrl(targetUrl);
        if (res.valid) {
          showToast('유효한 동영상 스트리밍 링크가 확인되었습니다.', 'success');
          // Try client media duration extraction
          extractMediaDuration(targetUrl).then(({ durationSeconds: directDur }) => {
            if (directDur && directDur > 0) {
              setDurationSeconds(directDur);
              setDurationStatus('READY');
            }
          });
        } else {
          showToast(res.message || '영상 링크 검증 실패', 'warning');
        }
      } finally {
        setIsCheckingDuration(false);
      }
    }
  };

  // Capture video frame as thumbnail
  const handleCaptureThumbnail = () => {
    const video = previewVideoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setThumbnailUrl(dataUrl);
        showToast('현재 재생 위치의 프레임이 썸네일로 지정되었습니다.', 'success');
      }
    } catch (err) {
      showToast('썸네일 추출에 실패했습니다. (CORS 제한 또는 비디오 로딩 중)', 'warning');
    }
  };

  // Auto-detect video duration from preview element
  const handlePreviewLoadedMetadata = () => {
    if (previewVideoRef.current) {
      const dur = previewVideoRef.current.duration;
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
        const rounded = Math.round(dur);
        setDurationSeconds(rounded);
        setDurationStatus('READY');
        setManualMinutes(String(Math.floor(rounded / 60)));
        setManualSecs(String(rounded % 60));
      }
    }
  };

  // Apply manual duration
  const handleApplyManualDuration = () => {
    const m = parseInt(manualMinutes, 10) || 0;
    const s = parseInt(manualSecs, 10) || 0;
    const total = m * 60 + s;
    if (total > 0) {
      setDurationSeconds(total);
      setDurationStatus('READY');
      showToast(`재생시간이 ${formatDuration(total)}으로 설정되었습니다.`, 'success');
    } else {
      showToast('1초 이상의 유효한 시간을 입력해주세요.', 'warning');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('강의 제목을 입력해주세요.', 'error');
      return;
    }

    if (!videoUrl.trim()) {
      showToast('동영상 파일을 업로드하거나 유효한 URL을 입력해주세요.', 'error');
      return;
    }

    const calculatedSeconds =
      isManualDuration && (parseInt(manualMinutes, 10) || parseInt(manualSecs, 10))
        ? (parseInt(manualMinutes, 10) || 0) * 60 + (parseInt(manualSecs, 10) || 0)
        : durationSeconds;

    onSave(
      {
        title: title.trim(),
        videoUrl: videoUrl.trim(),
        videoThumbnail: thumbnailUrl.trim() || undefined,
        durationSeconds: calculatedSeconds && calculatedSeconds > 0 ? calculatedSeconds : null,
        durationStatus: calculatedSeconds && calculatedSeconds > 0 ? 'READY' : durationStatus,
        sourceType,
        youtubeVideoId: youtubeVideoId || extractYouTubeVideoId(videoUrl.trim()),
        completionThresholdPercent: completionThreshold,
        sequentialLock,
        contentSummary: contentSummary.trim(),
        isFreePreview,
        videoStatus,
        videoOriginalName: selectedFileName || undefined,
        videoFileSize,
      },
      setAsCourseThumbnail
    );

    onClose();
    showToast('영상 강의가 성공적으로 저장되었습니다.', 'success');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
      onClose={onClose}
      title={lesson ? '영상 강의 수정' : '영상 강의 업로드 및 등록'}
      subtitle="실제 동영상 메타데이터 및 정확한 재생시간(Duration)을 관리합니다."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Source Tab Toggle */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab('file')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-colors cursor-pointer ${
              tab === 'file'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            내 컴퓨터에서 파일 업로드 (MP4 / MOV / WebM · 100MB 제한)
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-colors cursor-pointer ${
              tab === 'url'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            외부 스트리밍 / YouTube 링크
          </button>
        </div>

        {/* Tab 1: File Upload */}
        {tab === 'file' ? (
          <div className="space-y-3">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all duration-150 ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-50/80 scale-[1.01]'
                  : validationError
                  ? 'border-rose-300 bg-rose-50/30'
                  : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'
              }`}
            >
              <UploadCloud
                className={`w-10 h-10 mx-auto mb-2 transition-colors ${
                  isDragging
                    ? 'text-indigo-600 animate-bounce'
                    : validationError
                    ? 'text-rose-500'
                    : 'text-indigo-500'
                }`}
              />
              <p className="text-xs font-bold text-slate-800 mb-1">
                {isDragging ? '여기에 동영상 파일을 놓으세요!' : '강의 동영상 자료를 드래그하거나 클릭하여 업로드하세요'}
              </p>

              {/* Strict Format and Size Guide Badges */}
              <div className="flex items-center justify-center gap-1.5 my-2 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100/70 text-indigo-700 border border-indigo-200">
                  MP4
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100/70 text-indigo-700 border border-indigo-200">
                  MOV
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100/70 text-indigo-700 border border-indigo-200">
                  WebM
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100/80 text-amber-800 border border-amber-300/70">
                  최대 100MB 이하
                </span>
              </div>

              <p className="text-[11px] text-slate-500 mb-3">
                업로드 전 파일 형식(MP4, MOV, WebM)과 100MB 용량 제한을 사전에 검사합니다.
              </p>

              <input
                type="file"
                accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                id="video-file-upload-input"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
              <label
                htmlFor="video-file-upload-input"
                className={`inline-block py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer ${
                  isUploading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {isUploading ? '업로드 진행 중...' : '동영상 파일 선택하기'}
              </label>

              {/* Pre-validation Error Alert Banner */}
              {validationError && (
                <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-left flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-rose-900">{validationError.title}</h5>
                      <button
                        type="button"
                        onClick={() => setValidationError(null)}
                        className="text-rose-400 hover:text-rose-700 text-[11px] font-medium cursor-pointer"
                      >
                        닫기
                      </button>
                    </div>
                    <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                      {validationError.message}
                    </p>
                    {validationError.details && (
                      <div className="mt-2 text-[10px] text-rose-800/90 bg-rose-100/70 rounded-md px-2 py-1.5 flex flex-wrap gap-x-3 gap-y-1">
                        <span>선택 파일: <b className="font-semibold">{validationError.details.filename}</b></span>
                        <span>측정 크기: <b className="font-semibold">{validationError.details.formattedSize}</b></span>
                        <span>확장자: <b className="font-semibold">{validationError.details.fileExtension || '없음'}</b></span>
                      </div>
                    )}
                    <div className="mt-2 text-[10px] text-rose-600 font-medium">
                      <b>업로드 규격 안내:</b> 강의 자료 파일은 <b>MP4, MOV, WebM</b> 형식만 지원되며 단일 파일 <b>100MB 이하</b>만 등록 가능합니다.
                    </div>
                  </div>
                </div>
              )}

              {/* Real Upload Progress Bar with Cancel Button */}
              {isUploading && (
                <div className="mt-4 p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl space-y-2 text-left shadow-xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="truncate max-w-[200px] flex items-center gap-1.5 text-indigo-950 font-bold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
                      <span>{selectedFileName}</span>
                    </span>
                    <span className="tabular-nums font-bold text-indigo-700 text-xs">
                      {uploadProgress}% {uploadedBytesInfo ? `(${uploadedBytesInfo})` : ''}
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-150 relative overflow-hidden"
                      style={{ width: `${Math.max(4, uploadProgress)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">
                      서버 청크 분할 전송 중 (100MB 이하 검사 완료)
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelUpload}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>업로드 취소</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Success Indicator */}
              {!isUploading && !validationError && (videoUrl || localBlobUrl) && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50/80 border border-emerald-200/60 rounded-lg py-1.5 px-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate max-w-[320px]">
                    동영상 검사 통과 및 보관 완료: {selectedFileName || 'video.mp4'}
                    {videoFileSize ? ` (${formatFileSize(videoFileSize)})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Video Live Preview if URL exists */}
            {(localBlobUrl || videoUrl) && (
              <div className="bg-slate-900 rounded-xl p-3 text-white space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-indigo-400" />
                    <span>업로드 영상 미리보기</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCaptureThumbnail}
                    className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                    title="현재 재생 위치를 썸네일로 추출"
                  >
                    <Camera className="w-3 h-3 text-indigo-400" />
                    <span>썸네일 캡처</span>
                  </button>
                </div>
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                  <video
                    ref={previewVideoRef}
                    src={localBlobUrl || videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={handlePreviewLoadedMetadata}
                    onError={() => {
                      // If streaming URL fails in preview, fallback to localBlobUrl
                      if (localBlobUrl && previewVideoRef.current && previewVideoRef.current.src !== localBlobUrl) {
                        previewVideoRef.current.src = localBlobUrl;
                      }
                    }}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: External URL */
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                동영상 스트리밍 또는 YouTube 링크 *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVideoUrl(val);
                      const ytId = extractYouTubeVideoId(val);
                      if (ytId) {
                        setYoutubeVideoId(ytId);
                        setSourceType('YOUTUBE');
                      }
                    }}
                    onBlur={() => {
                      if (videoUrl.trim() && !durationSeconds) {
                        handleCheckUrlDuration();
                      }
                    }}
                    placeholder="https://www.youtube.com/watch?v=... 또는 https://.../video.mp4"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckUrlDuration()}
                  disabled={!videoUrl.trim() || isCheckingDuration}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDuration ? 'animate-spin' : ''}`} />
                  <span>{isCheckingDuration ? '확인 중...' : '재생시간 확인'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <Youtube className="w-3.5 h-3.5 text-rose-500" />
                <span>YouTube 링크 입력 시 실제 영상 재생시간을 자동으로 동기화합니다.</span>
              </p>
            </div>
          </div>
        )}

        {/* Real-time Duration Status Card */}
        <div
          className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
            durationStatus === 'READY' && durationSeconds && durationSeconds > 0
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : durationStatus === 'PENDING'
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-rose-50/70 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {durationStatus === 'READY' && durationSeconds && durationSeconds > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : durationStatus === 'PENDING' ? (
              <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>
                  {durationStatus === 'READY' && durationSeconds && durationSeconds > 0
                    ? `확인된 영상 길이: ${formatDuration(durationSeconds)} (${durationSeconds}초)`
                    : durationStatus === 'PENDING'
                    ? '재생시간 확인 중 (학습자 플레이어 재생 시 자동 동기화)'
                    : '재생시간 확인 실패 (URL을 점검해주세요)'}
                </span>
              </div>
              <p className="text-[11px] opacity-80 mt-0.5">
                {durationStatus === 'READY'
                  ? '실제 영상 메타데이터와 동기화되어 부정 시청 방지 및 진도율 기준에 사용됩니다.'
                  : '정확한 시간을 즉시 지정하려면 [수동 입력]을 사용할 수 있습니다.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsManualDuration(!isManualDuration)}
              className="text-[11px] font-semibold text-indigo-700 bg-white/80 hover:bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              {isManualDuration ? '수동 닫기' : '수동 시간 입력'}
            </button>
          </div>
        </div>

        {/* Manual Duration Input Toggle */}
        {isManualDuration && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <span className="font-bold text-slate-800">영상 실제 재생시간 수동 지정</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="600"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  placeholder="0"
                  className="w-16 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                />
                <span className="text-slate-600 font-medium">분</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={manualSecs}
                  onChange={(e) => setManualSecs(e.target.value)}
                  placeholder="0"
                  className="w-16 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                />
                <span className="text-slate-600 font-medium">초</span>
              </div>
              <button
                type="button"
                onClick={handleApplyManualDuration}
                className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 cursor-pointer shadow-2xs"
              >
                적용
              </button>
            </div>
          </div>
        )}

        {/* Video Metadata Inputs */}
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">강의 영상 제목 *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 1강. TypeScript 핵심 기초 및 LMS 아키텍처"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                수료 인정 필수 시청률 (%)
              </label>
              <div className="relative">
                <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={completionThreshold}
                  onChange={(e) => setCompletionThreshold(parseInt(e.target.value) || 90)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value={80}>80% 이상 시청 시 완료</option>
                  <option value={90}>90% 이상 시청 시 완료 (권장/기본)</option>
                  <option value={95}>95% 이상 시청 시 완료</option>
                  <option value={100}>100% 완강 시에만 완료</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>강의 대표 썸네일 이미지</span>
                {isExtractingThumbnail && (
                  <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-normal">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    첫 프레임 추출 중...
                  </span>
                )}
                {isThumbnailAutoGenerated && !isExtractingThumbnail && (
                  <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    첫 프레임 자동 설정됨
                  </span>
                )}
              </label>

              {thumbnailUrl ? (
                <div className="space-y-2">
                  <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video max-h-32 flex items-center justify-center">
                    <img
                      src={thumbnailUrl}
                      alt="강의 대표 썸네일"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleCaptureThumbnail}
                        className="p-1.5 bg-white text-slate-700 rounded-md text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-50 cursor-pointer shadow-xs"
                        title="현재 재생 위치로 다시 캡처"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>다시 캡처</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setThumbnailUrl('');
                          setIsThumbnailAutoGenerated(false);
                        }}
                        className="p-1.5 bg-rose-600 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 hover:bg-rose-700 cursor-pointer shadow-xs"
                        title="썸네일 삭제"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>삭제</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => {
                      setThumbnailUrl(e.target.value);
                      setIsThumbnailAutoGenerated(false);
                    }}
                    placeholder="https://.../thumbnail.jpg"
                    className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-600"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://.../thumbnail.jpg 또는 영상 업로드 시 자동 추출"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    강의 영상을 업로드하면 <b>첫 번째 프레임이 대표 썸네일로 자동 추출</b>되어 기본 적용됩니다.
                  </p>
                </div>
              )}

              {/* Course thumbnail application checkbox */}
              {thumbnailUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="set-as-course-thumb"
                    checked={setAsCourseThumbnail}
                    onChange={(e) => setSetAsCourseThumbnail(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="set-as-course-thumb"
                    className="text-[11px] font-medium text-slate-700 cursor-pointer flex items-center gap-1"
                  >
                    <ImageIcon className="w-3 h-3 text-indigo-500" />
                    <span>이 썸네일을 전체 강의 과정(코스) 대표 이미지로도 함께 설정</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Sequential Lock & Free Preview Checks */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sequential-lock"
                checked={sequentialLock}
                onChange={(e) => setSequentialLock(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label
                htmlFor="sequential-lock"
                className="text-xs font-medium text-slate-700 cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                <span>순차 학습 강제 (이 강의를 이수해야 다음 강의 수강 가능)</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="free-preview"
                checked={isFreePreview}
                onChange={(e) => setIsFreePreview(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="free-preview" className="text-xs font-medium text-slate-700 cursor-pointer">
                비로그인 사용자에게 무료 맛보기 강의로 공개
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">강의 요약 및 학습 가이드</label>
            <textarea
              rows={3}
              value={contentSummary}
              onChange={(e) => setContentSummary(e.target.value)}
              placeholder="학습 목표, 핵심 키워드, 다루는 실습 내용을 입력하세요."
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isUploading || isCheckingDuration}
            className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            영상 강의 저장하기
          </button>
        </div>
      </form>
    </Modal>

    {/* Duplicate Filename Warning & Overwrite Confirmation Modal */}
    {isDuplicateModalOpen && pendingDuplicateFile && (
      <Modal
        isOpen={isDuplicateModalOpen}
        onClose={() => {
          setIsDuplicateModalOpen(false);
          setPendingDuplicateFile(null);
        }}
        title="동일한 파일명 감지 (덮어쓰기 확인)"
        subtitle="이미 등록되어 있거나 서버에 업로드된 파일명과 동일한 파일이 감지되었습니다."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-2 flex-1 min-w-0">
              <p className="font-bold text-sm text-amber-950">
                기존 파일과 동일한 파일명이 선택되었습니다.
              </p>
              <div className="bg-amber-100/80 rounded-lg p-2.5 text-xs space-y-1">
                <div>
                  <span className="text-amber-800">선택된 파일: </span>
                  <b className="font-mono text-amber-950 font-bold">{pendingDuplicateFile.name}</b>
                  <span className="text-amber-700 font-medium"> ({formatFileSize(pendingDuplicateFile.size)})</span>
                </div>
                {duplicateReason && (
                  <p className="text-[11px] text-amber-800 font-medium pt-0.5">
                    {duplicateReason}
                  </p>
                )}
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                계속 진행하여 덮어쓰시겠습니까? <b>덮어쓰기를 선택하면</b> 기존 파일 데이터가 새로 교체되며, 새로 업로드된 동영상의 첫 번째 프레임으로 강의 대표 썸네일이 자동 재설정됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsDuplicateModalOpen(false);
                setPendingDuplicateFile(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              취소 (다른 파일 선택)
            </button>
            <button
              type="button"
              onClick={() => {
                const targetFile = pendingDuplicateFile;
                setIsDuplicateModalOpen(false);
                setPendingDuplicateFile(null);
                if (targetFile) {
                  processUploadFile(targetFile);
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>기존 파일 덮어쓰기 진행</span>
            </button>
          </div>
        </div>
      </Modal>
    )}
  </>
  );
};
