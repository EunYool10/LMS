// Real Video Upload & Anti-Cheat Progress Service
import { validateVideoFile } from '../utils/fileValidation';
import { VideoMetadata } from '../types';

export interface VideoUploadResult {
  success: boolean;
  video?: {
    id?: string;
    video_id?: string;
    filename?: string;
    file_name?: string;
    originalName?: string;
    size?: number;
    file_size?: number;
    mimeType?: string;
    mime_type?: string;
    url?: string;
    video_url?: string;
    thumbnail_url?: string;
    status?: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' | 'ready' | 'processing' | 'uploading' | 'failed';
    durationSeconds?: number;
    duration_seconds?: number;
    createdAt?: string;
    uploaded_at?: string;
    uploaded_by?: string;
  };
  message?: string;
}

export interface WatchHeartbeatResponse {
  success: boolean;
  currentPosition: number;
  uniqueWatchedSeconds: number;
  uniquePercent: number;
  isCompleted: boolean;
  canComplete: boolean;
  threshold: number;
  intervals: [number, number][];
}

export interface VerificationResponse {
  success: boolean;
  verified: boolean;
  isCompleted: boolean;
  uniquePercent?: number;
  requiredPercent?: number;
  message?: string;
}

export const videoApi = {
  /**
   * Cancel an active upload session on the server and purge temporary chunk files
   */
  async cancelUploadSession(uploadId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/videos/upload/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId }),
      });
      const data = await res.json().catch(() => ({}));
      return Boolean(data.success);
    } catch {
      return false;
    }
  },

  /**
   * Check if a video with the same filename is already registered or uploaded
   */
  async checkDuplicateVideo(filename: string): Promise<{ isDuplicate: boolean; existingVideo?: any; message?: string }> {
    try {
      const res = await fetch(`/api/videos/check-duplicate?filename=${encodeURIComponent(filename)}`);
      if (res.ok) {
        return await res.json();
      }
      return { isDuplicate: false };
    } catch {
      return { isDuplicate: false };
    }
  },

  /**
   * Upload video with chunked slicing to bypass proxy payload limits (prevents HTTP 413)
   * Tracks upload progress smoothly per-chunk, supports graceful cancellation.
   */
  async uploadVideo(
    file: File,
    onProgress?: (percentage: number, loaded: number, total: number) => void,
    durationSeconds?: number,
    abortSignal?: AbortSignal,
    onUploadIdAssigned?: (uploadId: string) => void
  ): Promise<VideoUploadResult> {
    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      throw new Error(validation.errorMessage || '유효하지 않은 파일입니다.');
    }

    if (abortSignal?.aborted) {
      const err: any = new Error('업로드가 취소되었습니다.');
      err.isCancelled = true;
      throw err;
    }

    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB slices to strictly adhere to proxy/Cloud Run limits
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const mimeType = file.type || 'video/mp4';

    // Step 1: Initialize chunk upload session
    let uploadId: string;
    try {
      const initRes = await fetch('/api/videos/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          totalChunks,
          mimeType,
        }),
        signal: abortSignal,
      });

      if (!initRes.ok) {
        const errJson = await initRes.json().catch(() => ({}));
        throw new Error(errJson.message || `분할 업로드 초기화 실패 (HTTP ${initRes.status})`);
      }

      const initData = await initRes.json();
      uploadId = initData.uploadId;
      if (!uploadId) throw new Error('업로드 세션 ID를 발급받지 못했습니다.');
      if (onUploadIdAssigned) {
        onUploadIdAssigned(uploadId);
      }
    } catch (initErr: any) {
      if (abortSignal?.aborted || initErr.name === 'AbortError') {
        const err: any = new Error('업로드가 취소되었습니다.');
        err.isCancelled = true;
        throw err;
      }
      console.warn('Chunk init failed, attempting direct upload fallback:', initErr);
      return videoApi.uploadDirectFallback(file, onProgress, durationSeconds, abortSignal);
    }

    // Step 2: Upload each chunk with retry & cancellation support
    let totalUploadedBytes = 0;
    let activeXhr: XMLHttpRequest | null = null;

    const onAbort = () => {
      if (activeXhr) {
        try {
          activeXhr.abort();
        } catch {}
      }
      if (uploadId) {
        videoApi.cancelUploadSession(uploadId).catch(() => {});
      }
    };

    if (abortSignal) {
      abortSignal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (abortSignal?.aborted) {
          await videoApi.cancelUploadSession(uploadId);
          const err: any = new Error('업로드가 취소되었습니다.');
          err.isCancelled = true;
          throw err;
        }

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunkBlob = file.slice(start, end);
        const chunkSize = end - start;

        let chunkSuccess = false;
        let lastError: any = null;

        // Retry each chunk up to 3 times on transient network error
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (abortSignal?.aborted) {
            await videoApi.cancelUploadSession(uploadId);
            const err: any = new Error('업로드가 취소되었습니다.');
            err.isCancelled = true;
            throw err;
          }

          try {
            await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              activeXhr = xhr;

              if (abortSignal?.aborted) {
                activeXhr = null;
                const err: any = new Error('업로드가 취소되었습니다.');
                err.isCancelled = true;
                reject(err);
                return;
              }

              const formData = new FormData();
              formData.append('uploadId', uploadId);
              formData.append('chunkIndex', String(chunkIndex));
              formData.append('totalChunks', String(totalChunks));
              formData.append('chunk', chunkBlob, `chunk_${chunkIndex}`);

              const chunkUrl = `/api/videos/upload/chunk?uploadId=${encodeURIComponent(uploadId)}&chunkIndex=${chunkIndex}&totalChunks=${totalChunks}`;
              xhr.open('POST', chunkUrl, true);

              xhr.setRequestHeader('X-Upload-Id', uploadId);
              xhr.setRequestHeader('X-Chunk-Index', String(chunkIndex));
              xhr.setRequestHeader('X-Total-Chunks', String(totalChunks));

              if (xhr.upload && onProgress) {
                xhr.upload.onprogress = (e) => {
                  if (e.lengthComputable) {
                    const currentChunkLoaded = e.loaded;
                    const currentTotalLoaded = Math.min(file.size, totalUploadedBytes + currentChunkLoaded);
                    const percent = Math.min(99, Math.round((currentTotalLoaded / file.size) * 100));
                    onProgress(percent, currentTotalLoaded, file.size);
                  }
                };
              }

              xhr.onload = () => {
                activeXhr = null;
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    const res = JSON.parse(xhr.responseText);
                    if (res.success) {
                      resolve();
                    } else {
                      reject(new Error(res.message || `청크 #${chunkIndex + 1} 업로드 실패`));
                    }
                  } catch {
                    resolve();
                  }
                } else {
                  try {
                    const res = JSON.parse(xhr.responseText);
                    reject(new Error(res.message || `청크 #${chunkIndex + 1} 업로드 오류 (HTTP ${xhr.status})`));
                  } catch {
                    reject(new Error(`청크 #${chunkIndex + 1} 업로드 오류 (HTTP ${xhr.status})`));
                  }
                }
              };

              xhr.onerror = () => {
                activeXhr = null;
                reject(new Error(`청크 #${chunkIndex + 1} 네트워크 통신 실패`));
              };

              xhr.onabort = () => {
                activeXhr = null;
                const err: any = new Error('업로드가 취소되었습니다.');
                err.isCancelled = true;
                reject(err);
              };

              xhr.send(formData);
            });

            chunkSuccess = true;
            totalUploadedBytes += chunkSize;
            if (onProgress) {
              const percent = Math.min(99, Math.round((totalUploadedBytes / file.size) * 100));
              onProgress(percent, totalUploadedBytes, file.size);
            }
            break;
          } catch (err: any) {
            lastError = err;
            if (err?.isCancelled || abortSignal?.aborted) {
              throw err;
            }
            console.warn(`Retry chunk ${chunkIndex + 1}/${totalChunks} (Attempt ${attempt}/3):`, err);
            await new Promise((r) => setTimeout(r, 500 * attempt));
          }
        }

        if (!chunkSuccess) {
          // Cancel session on server and clean up temporary chunk files
          await videoApi.cancelUploadSession(uploadId);
          throw new Error(
            lastError?.message || `청크 #${chunkIndex + 1}/${totalChunks} 업로드에 실패했습니다.`
          );
        }
      }

      if (abortSignal?.aborted) {
        await videoApi.cancelUploadSession(uploadId);
        const err: any = new Error('업로드가 취소되었습니다.');
        err.isCancelled = true;
        throw err;
      }

      // Step 3: Complete upload and request chunk assembly
      const compRes = await fetch('/api/videos/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          filename: file.name,
          totalChunks,
          mimeType,
          durationSeconds,
        }),
        signal: abortSignal,
      });

      if (!compRes.ok) {
        const errJson = await compRes.json().catch(() => ({}));
        throw new Error(errJson.message || `동영상 청크 병합 처리 실패 (HTTP ${compRes.status})`);
      }

      const compData: VideoUploadResult = await compRes.json();

      if (onProgress) {
        onProgress(100, file.size, file.size);
      }

      return compData;
    } finally {
      if (abortSignal) {
        abortSignal.removeEventListener('abort', onAbort);
      }
    }
  },

  /**
   * Direct single-shot upload fallback
   */
  uploadDirectFallback(
    file: File,
    onProgress?: (percentage: number, loaded: number, total: number) => void,
    durationSeconds?: number,
    abortSignal?: AbortSignal
  ): Promise<VideoUploadResult> {
    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      return Promise.reject(new Error(validation.errorMessage || '유효하지 않은 파일입니다.'));
    }

    if (abortSignal?.aborted) {
      const err: any = new Error('업로드가 취소되었습니다.');
      err.isCancelled = true;
      return Promise.reject(err);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (abortSignal) {
        abortSignal.addEventListener(
          'abort',
          () => {
            try {
              xhr.abort();
            } catch {}
            const err: any = new Error('업로드가 취소되었습니다.');
            err.isCancelled = true;
            reject(err);
          },
          { once: true }
        );
      }

      const formData = new FormData();
      formData.append('file', file);
      if (durationSeconds) {
        formData.append('durationSeconds', String(durationSeconds));
      }

      xhr.open('POST', '/api/videos/upload', true);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent, event.loaded, event.total);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data as VideoUploadResult);
          } catch (e) {
            reject(new Error('서버 응답 파싱 실패'));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.message || `업로드 실패 (HTTP ${xhr.status})`));
          } catch {
            reject(new Error(`업로드 실패 (HTTP ${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('네트워크 연결 문제로 동영상 업로드에 실패했습니다.'));
      };

      xhr.onabort = () => {
        const err: any = new Error('업로드가 취소되었습니다.');
        err.isCancelled = true;
        reject(err);
      };

      xhr.send(formData);
    });
  },

  /**
   * Get all registered videos from the server and database
   */
  async getVideos(): Promise<VideoMetadata[]> {
    try {
      const res = await fetch('/api/videos');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.videos)) {
          return data.videos;
        }
      }
      return [];
    } catch (err) {
      console.warn('[VideoAPI] Failed to fetch videos list from server:', err);
      return [];
    }
  },

  /**
   * Get single video metadata from server
   */
  async getVideo(id: string): Promise<VideoMetadata | null> {
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.video) {
          return data.video;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Delete uploaded video file from server and database
   */
  async deleteVideo(idOrFilename: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(idOrFilename)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Fetch YouTube metadata and real duration from server
   */
  async fetchYouTubeVideoInfo(urlOrVideoId: string): Promise<{
    success: boolean;
    valid: boolean;
    videoId?: string;
    durationSeconds?: number | null;
    durationStatus: 'READY' | 'PENDING' | 'FAILED' | 'UNAVAILABLE';
    title?: string;
    channelTitle?: string;
    thumbnailUrl?: string;
    embedUrl?: string;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/youtube/video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlOrVideoId }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return {
        success: false,
        valid: false,
        durationSeconds: null,
        durationStatus: 'FAILED',
        message: e?.message || 'YouTube 영상 정보 요청 실패',
      };
    }
  },

  /**
   * Validate external or streaming URL
   */
  async validateUrl(
    url: string
  ): Promise<{
    valid: boolean;
    type?: string;
    videoId?: string;
    durationSeconds?: number | null;
    durationStatus?: 'READY' | 'PENDING' | 'FAILED' | 'UNAVAILABLE';
    title?: string;
    thumbnailUrl?: string;
    embedUrl?: string;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/videos/validate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      return data;
    } catch {
      return { valid: false, message: 'URL 검증 요청 실패' };
    }
  },

  /**
   * Send watch heartbeat with interval
   */
  async sendHeartbeat(params: {
    userId: string;
    courseId: string;
    lessonId: string;
    currentPosition: number;
    interval?: [number, number];
    duration: number;
    requiredThresholdPercent?: number;
  }): Promise<WatchHeartbeatResponse | null> {
    try {
      const res = await fetch('/api/progress/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (res.ok) {
        return (await res.json()) as WatchHeartbeatResponse;
      }
    } catch (e) {
      // Ignore network errors silently
    }
    return null;
  },

  /**
   * Verify genuine lesson completion on server
   */
  async verifyCompletion(params: {
    userId: string;
    courseId: string;
    lessonId: string;
    requiredThresholdPercent?: number;
  }): Promise<VerificationResponse> {
    try {
      const res = await fetch('/api/progress/verify-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      return data as VerificationResponse;
    } catch (e: any) {
      return {
        success: false,
        verified: false,
        isCompleted: false,
        message: e?.message || '완료 검증 요청에 실패했습니다.',
      };
    }
  },

  /**
   * Get watch session status for student and lesson
   */
  async getWatchStatus(userId: string, courseId: string, lessonId: string) {
    try {
      const url = new URL('/api/progress/watch-status', window.location.origin);
      url.searchParams.append('userId', userId);
      url.searchParams.append('courseId', courseId);
      url.searchParams.append('lessonId', lessonId);

      const res = await fetch(url.toString());
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return null;
  },
};
