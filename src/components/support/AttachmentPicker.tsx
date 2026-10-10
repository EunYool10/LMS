import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, ImageIcon, Paperclip, X } from 'lucide-react';
import { formatFileSize } from '../../utils/fileValidation';
import {
  ATTACH_ACCEPT,
  ATTACH_MAX_BYTES,
  ATTACH_MAX_FILES,
  isPreviewableImage,
  prepareAttachment,
  validateAttachment,
} from '../../services/inquiryFiles';

interface AttachmentPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

/** File chooser with drag & drop for inquiries. Photos are shrunk as soon as they are added. */
export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({ files, onChange, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const previews = useMemo(() => files.map((f) => (isPreviewableImage(f) ? URL.createObjectURL(f) : null)), [files]);
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

  const addFiles = async (incoming: File[]) => {
    if (!incoming.length || disabled) return;
    const nextErrors: string[] = [];
    const room = ATTACH_MAX_FILES - files.length;
    if (incoming.length > room) nextErrors.push(`파일은 최대 ${ATTACH_MAX_FILES}개까지 첨부할 수 있어요.`);

    setProcessing(true);
    const accepted: File[] = [];
    for (const file of incoming.slice(0, Math.max(0, room))) {
      const error = validateAttachment(file);
      if (error) {
        nextErrors.push(error);
        continue;
      }
      const prepared = await prepareAttachment(file);
      if (prepared.size > ATTACH_MAX_BYTES) {
        nextErrors.push(`‘${file.name}’이(가) 너무 커요. 파일당 5MB까지 올릴 수 있어요.`);
        continue;
      }
      accepted.push(prepared);
    }
    setProcessing(false);
    setErrors(nextErrors);
    if (accepted.length) onChange([...files, ...accepted]);
  };

  const full = files.length >= ATTACH_MAX_FILES;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-neutral-800">
          첨부파일 <span className="font-normal text-neutral-400">(선택)</span>
        </span>
        <span className="text-xs tabular-nums text-neutral-400">
          {files.length}/{ATTACH_MAX_FILES}
        </span>
      </div>

      {!full && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(Array.from(e.dataTransfer.files));
          }}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-center transition-colors ${
            dragging ? 'border-brand-500 bg-brand-50/60' : 'border-neutral-300 bg-neutral-50/60'
          }`}
        >
          <button
            type="button"
            disabled={disabled || processing}
            onClick={() => inputRef.current?.click()}
            className="lms-btn lms-btn-secondary lms-btn-sm"
          >
            {processing ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
            ) : (
              <Paperclip className="h-3.5 w-3.5" />
            )}
            {processing ? '파일 준비 중…' : '파일 선택'}
          </button>
          <p className="text-xs text-neutral-500">또는 여기로 끌어다 놓기 · 이미지, PDF, 문서, zip · 파일당 5MB, 최대 {ATTACH_MAX_FILES}개</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ATTACH_ACCEPT}
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              e.target.value = '';
            }}
          />
        </div>
      )}

      {errors.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {errors.map((msg) => (
            <li key={msg} className="text-xs text-rose-600">
              {msg}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-2.5 py-2">
              {previews[i] ? (
                <img src={previews[i]!} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-neutral-100 text-neutral-500">
                  {file.type.startsWith('image/') ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-neutral-800">{file.name}</span>
                <span className="block text-xs tabular-nums text-neutral-500">{formatFileSize(file.size)}</span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
                aria-label={`${file.name} 빼기`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
