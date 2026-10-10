/**
 * File validation utilities for lecture materials and media uploads.
 * Restricts formats strictly to MP4, MOV, WebM and maximum size to 100MB.
 */

export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm'] as const;
export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export const MAX_VIDEO_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB limit
export const MAX_VIDEO_FILE_SIZE_MB = 100;

export interface FileValidationResult {
  isValid: boolean;
  errorTitle?: string;
  errorMessage?: string;
  details?: {
    filename: string;
    fileSize: number;
    fileExtension: string;
    mimeType: string;
    formattedSize: string;
    maxAllowedSize: string;
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${bytes}B`;
}

/**
 * Pre-validates lecture material files before network transmission or local storage
 * Enforces:
 * 1. MP4, MOV, WebM formats only
 * 2. File size <= 100MB
 * 3. File size > 0
 */
export function validateVideoFile(file: File): FileValidationResult {
  if (!file) {
    return {
      isValid: false,
      errorTitle: '파일 선택 필요',
      errorMessage: '업로드할 강의 자료 파일을 선택해주세요.',
    };
  }

  const filename = file.name || '';
  const lastDotIndex = filename.lastIndexOf('.');
  const ext = lastDotIndex !== -1 ? filename.substring(lastDotIndex).toLowerCase() : '';
  const mimeType = (file.type || '').toLowerCase();
  const formattedSize = formatFileSize(file.size);
  const maxAllowedSize = `${MAX_VIDEO_FILE_SIZE_MB}MB`;

  const details = {
    filename,
    fileSize: file.size,
    fileExtension: ext,
    mimeType,
    formattedSize,
    maxAllowedSize,
  };

  // 1. Check for empty files
  if (file.size === 0) {
    return {
      isValid: false,
      errorTitle: '유효하지 않은 파일',
      errorMessage: '선택하신 파일의 크기가 0바이트입니다. 정상적인 동영상 강의 자료를 선택해주세요.',
      details,
    };
  }

  // 2. Validate file format: only MP4, MOV, WebM allowed
  const isExtensionValid = (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
  const isMimeValid = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mimeType);

  if (!isExtensionValid && !isMimeValid) {
    return {
      isValid: false,
      errorTitle: '지원되지 않는 파일 형식',
      errorMessage: `강의 자료는 MP4, MOV, WebM 형식만 지원됩니다. (선택된 파일: ${filename.slice(-15)} [${ext || mimeType || '알 수 없음'}])`,
      details,
    };
  }

  // 3. Validate file size limit (100MB)
  if (file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      errorTitle: '파일 용량 제한 초과',
      errorMessage: `강의 자료 파일은 최대 100MB 이하만 업로드 가능합니다. (선택된 파일: ${formattedSize} / 제한: 100MB)`,
      details,
    };
  }

  return {
    isValid: true,
    details,
  };
}
