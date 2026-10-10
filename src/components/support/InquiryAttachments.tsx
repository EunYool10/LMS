import React, { useEffect, useState } from 'react';
import { Download, FileText, ImageOff } from 'lucide-react';
import { InquiryAttachment } from '../../types';
import { formatFileSize } from '../../utils/fileValidation';
import { downloadAttachment, isPreviewableImage, loadAttachment } from '../../services/inquiryFiles';
import { useToast } from '../../context/ToastContext';

/** Thumbnail that loads the image from Firestore when shown; clicking opens it full size in a new tab. */
const ImageThumb: React.FC<{ att: InquiryAttachment }> = ({ att }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let alive = true;
    loadAttachment(att)
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [att.id]);

  return (
    <button
      type="button"
      onClick={() => url && window.open(url, '_blank', 'noopener')}
      disabled={!url}
      className="block aspect-[4/3] w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 cursor-zoom-in disabled:cursor-default"
      aria-label={`${att.name} 크게 보기`}
    >
      {url ? (
        <img src={url} alt={att.name} className="h-full w-full object-cover" />
      ) : failed ? (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-neutral-400">
          <ImageOff className="h-5 w-5" />
          불러오지 못했어요
        </span>
      ) : (
        <span className="block h-full w-full animate-pulse bg-neutral-200/70" />
      )}
    </button>
  );
};

export const InquiryAttachments: React.FC<{ attachments?: InquiryAttachment[] }> = ({ attachments }) => {
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  if (!attachments?.length) return null;

  const download = async (att: InquiryAttachment) => {
    setBusyId(att.id);
    try {
      await downloadAttachment(att);
    } catch {
      showToast('첨부파일을 내려받지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const images = attachments.filter(isPreviewableImage);
  const others = attachments.filter((a) => !isPreviewableImage(a));

  const downloadButton = (att: InquiryAttachment, className = '') => (
    <button
      type="button"
      onClick={() => download(att)}
      disabled={busyId === att.id}
      className={`shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 cursor-pointer ${className}`}
      aria-label={`${att.name} 내려받기`}
      title="내려받기"
    >
      {busyId === att.id ? (
        <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
    </button>
  );

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-neutral-500">첨부파일 {attachments.length}</p>
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((att) => (
            <li key={att.id} className="min-w-0">
              <ImageThumb att={att} />
              <div className="mt-1 flex items-center gap-1">
                <span className="min-w-0 flex-1 truncate text-xs text-neutral-600" title={att.name}>
                  {att.name}
                </span>
                {downloadButton(att)}
              </div>
            </li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <ul className={`flex flex-wrap gap-2 ${images.length ? 'mt-3' : ''}`}>
          {others.map((att) => (
            <li key={att.id} className="flex max-w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white py-1.5 pl-2.5 pr-1.5">
              <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="min-w-0 truncate text-[13px] text-neutral-800" title={att.name}>
                {att.name}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-neutral-400">{formatFileSize(att.size)}</span>
              {downloadButton(att)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
