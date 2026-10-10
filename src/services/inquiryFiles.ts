// Inquiry attachments.
// The server disk is wiped on every Render restart and Firebase Storage is not configured, so file bytes
// are stored in Firestore: each file is split into base64 pieces saved as system_settings/inqfile_* docs
// (a Firestore document is limited to 1 MiB). Large photos are shrunk in the browser before upload.

import { firestoreService } from './firebase';
import { InquiryAttachment } from '../types';

export const ATTACH_MAX_FILES = 3;
export const ATTACH_MAX_BYTES = 5 * 1024 * 1024;

const CHUNK_BYTES = 640 * 1024; // ≈ 874KB as base64, safely under the 1 MiB document limit

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const DOC_EXTS = ['pdf', 'txt', 'csv', 'log', 'xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt', 'hwp', 'hwpx', 'zip'];
export const ATTACH_ACCEPT = [...IMAGE_EXTS, ...DOC_EXTS].map((e) => `.${e}`).join(',');

const extOf = (name: string) => (name.split('.').pop() || '').toLowerCase();

/** Only raster images are shown inline; SVG/HTML are not accepted at all because they can carry scripts. */
export const isPreviewableImage = (att: { name: string; type: string }) =>
  IMAGE_EXTS.includes(extOf(att.name)) && /^image\/(jpeg|png|gif|webp)$/.test(att.type);

export function validateAttachment(file: File): string | null {
  const ext = extOf(file.name);
  if (![...IMAGE_EXTS, ...DOC_EXTS].includes(ext)) return `‘${file.name}’은(는) 첨부할 수 없는 형식이에요. 이미지, PDF, 문서, zip 파일만 올릴 수 있어요.`;
  if (file.size === 0) return `‘${file.name}’은(는) 빈 파일이에요.`;
  // Images get shrunk later, so only reject ones that are unreasonably large to begin with.
  const limit = IMAGE_EXTS.includes(ext) && ext !== 'gif' ? 25 * 1024 * 1024 : ATTACH_MAX_BYTES;
  if (file.size > limit) return `‘${file.name}’이(가) 너무 커요. 파일당 5MB까지 올릴 수 있어요.`;
  return null;
}

/** Shrinks large JPEG/PNG/WebP photos and screenshots (long side ≤ 2000px, JPEG). Other files pass through. */
export async function prepareAttachment(file: File): Promise<File> {
  const ext = extOf(file.name);
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext) || typeof createImageBitmap === 'undefined') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const maxSide = 2000;
  const longSide = Math.max(bitmap.width, bitmap.height);
  if (file.size <= 1.5 * 1024 * 1024 && longSide <= 2400) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(1, maxSide / longSide);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.fillStyle = '#fff'; // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg' });
}

const chunkId = (attachmentId: string, index: number) => `inqfile_${attachmentId}_${index}`;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Uploads already-prepared files for one inquiry. onProgress receives 0–1 over all files. */
export async function uploadAttachments(inquiryId: string, files: File[], onProgress?: (ratio: number) => void): Promise<InquiryAttachment[]> {
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0) || 1;
  let doneBytes = 0;
  const uploaded: InquiryAttachment[] = [];
  try {
    for (const file of files) {
      const attachmentId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const chunks = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));
      for (let i = 0; i < chunks; i++) {
        const piece = file.slice(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES);
        await firestoreService.saveInquiryFileChunk(chunkId(attachmentId, i), {
          inquiryId,
          attachmentId,
          index: i,
          data: await blobToBase64(piece),
        });
        doneBytes += piece.size;
        onProgress?.(doneBytes / totalBytes);
      }
      uploaded.push({ id: attachmentId, name: file.name, type: file.type || 'application/octet-stream', size: file.size, chunks });
    }
    return uploaded;
  } catch (err) {
    deleteAttachments(uploaded).catch(() => {});
    throw err;
  }
}

const blobCache = new Map<string, Promise<Blob>>();

/** Reassembles an attachment from its pieces (cached for the session). */
export function loadAttachment(att: InquiryAttachment): Promise<Blob> {
  let pending = blobCache.get(att.id);
  if (!pending) {
    pending = Promise.all(Array.from({ length: att.chunks }, (_, i) => firestoreService.getInquiryFileChunk(chunkId(att.id, i)))).then(
      (parts) => {
        if (parts.some((p) => p == null)) throw new Error('첨부파일 일부를 찾을 수 없어요.');
        const bytes = parts.map((b64) => Uint8Array.from(atob(b64 as string), (c) => c.charCodeAt(0)));
        return new Blob(bytes, { type: att.type || 'application/octet-stream' });
      }
    );
    pending.catch(() => blobCache.delete(att.id));
    blobCache.set(att.id, pending);
  }
  return pending;
}

/** Saves the attachment to the user's computer under its original name. */
export async function downloadAttachment(att: InquiryAttachment): Promise<void> {
  const blob = await loadAttachment(att);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = att.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function deleteAttachments(atts: InquiryAttachment[] | undefined): Promise<void> {
  if (!atts?.length) return;
  const ids = atts.flatMap((a) => Array.from({ length: a.chunks }, (_, i) => chunkId(a.id, i)));
  await firestoreService.deleteInquiryFileChunks(ids);
  atts.forEach((a) => blobCache.delete(a.id));
}
