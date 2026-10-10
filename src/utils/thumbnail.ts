/**
 * Video Thumbnail Extractor
 * Automatically extracts the first frame (or early timestamp frame) from a video file/URL
 * to set as the representative thumbnail image for the lecture.
 */

export interface ThumbnailExtractionResult {
  thumbnailUrl: string | null;
  error?: string;
  width?: number;
  height?: number;
}

/**
 * Extracts a video frame and converts it to a high-quality JPEG data URL.
 * Automatically seeks slightly ahead (default 0.3s) to avoid initial blank/black frames.
 */
export function extractFirstFrameThumbnail(
  fileOrUrl: File | string,
  timestampSeconds: number = 0.3
): Promise<ThumbnailExtractionResult> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      let objectUrl: string | null = null;
      if (typeof fileOrUrl === 'string') {
        video.src = fileOrUrl;
      } else {
        objectUrl = URL.createObjectURL(fileOrUrl);
        video.src = objectUrl;
      }

      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        video.removeAttribute('src');
        video.load();
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };

      const captureFrame = () => {
        try {
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 360;

          // Scale down if extremely large for optimal storage and rendering
          const maxDim = 1280;
          let targetWidth = width;
          let targetHeight = height;
          if (targetWidth > maxDim || targetHeight > maxDim) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
              targetWidth = maxDim;
            } else {
              targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
              targetHeight = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            cleanup();
            resolve({ thumbnailUrl: null, error: 'Canvas 2D 컨텍스트 생성 실패' });
            return;
          }

          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

          cleanup();
          resolve({
            thumbnailUrl: dataUrl,
            width: targetWidth,
            height: targetHeight,
          });
        } catch (err: any) {
          cleanup();
          resolve({ thumbnailUrl: null, error: err?.message || '프레임 캡처 중 오류' });
        }
      };

      let seekAttempted = false;

      video.onloadedmetadata = () => {
        const dur = video.duration;
        // Seek to target time or 10% into video to avoid black intro
        let seekTime = timestampSeconds;
        if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
          seekTime = Math.min(timestampSeconds, dur * 0.1);
          if (seekTime < 0.05) seekTime = 0.05;
        }

        try {
          seekAttempted = true;
          video.currentTime = seekTime;
        } catch {
          // If seeking fails, attempt immediate capture on loadeddata
        }
      };

      video.onseeked = () => {
        captureFrame();
      };

      video.onloadeddata = () => {
        // Fallback if onseeked doesn't fire
        if (!seekAttempted) {
          setTimeout(() => {
            if (!cleanedUp) captureFrame();
          }, 200);
        }
      };

      video.onerror = () => {
        cleanup();
        resolve({ thumbnailUrl: null, error: '비디오 로드 실패 (CORS 또는 파일 형식 오류)' });
      };

      // Safeguard timeout
      setTimeout(() => {
        if (!cleanedUp) {
          if (video.readyState >= 2) {
            captureFrame();
          } else {
            cleanup();
            resolve({ thumbnailUrl: null, error: '첫 번째 프레임 추출 대기 시간 초과' });
          }
        }
      }, 7000);
    } catch (err: any) {
      resolve({ thumbnailUrl: null, error: err?.message || '썸네일 추출 실패' });
    }
  });
}
