import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import firebaseConfigJson from './firebase-applet-config.json';
import { isCloudStorageEnabled, uploadToCloud, deleteFromCloud } from './cloudStorage';
import { DiscordCategory, DiscordMessage, isDiscordConfigured, sendDiscord, WindowCounter } from './discordNotifier';

dotenv.config();

// Initialize Firebase for persistent server-side storage and metadata sync
const fbApp = getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApp();
const fbDb: Firestore = firebaseConfigJson.firestoreDatabaseId
  ? getFirestore(fbApp, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(fbApp);

// Ensure uploads/videos, uploads/avatars, and uploads/temp directories exist
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'videos');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const AVATARS_DIR = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

const CHUNKS_TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(CHUNKS_TEMP_DIR)) {
  fs.mkdirSync(CHUNKS_TEMP_DIR, { recursive: true });
}

const VIDEOS_MANIFEST_PATH = path.join(process.cwd(), 'uploads', 'videos_manifest.json');

// Server Video Metadata Record
export interface ServerVideoRecord {
  video_id: string;
  file_name: string;
  video_url: string;
  thumbnail_url?: string;
  file_size: number;
  mime_type: string;
  duration_seconds?: number;
  uploaded_at: string;
  uploaded_by?: string;
  status: 'ready' | 'processing' | 'uploading' | 'failed';
  storage_path?: string; // Firebase Storage object path when stored in the cloud bucket
}

// Move a finished local upload into Firebase Storage (no-op when cloud storage is off).
// Returns the public URL to store, or null to keep serving the local file.
async function moveToCloudStorage(localPath: string, storagePath: string, contentType: string): Promise<string | null> {
  if (!isCloudStorageEnabled) return null;
  const url = await uploadToCloud(localPath, storagePath, contentType);
  try {
    fs.unlinkSync(localPath);
  } catch {}
  return url;
}

let serverVideoStore: Record<string, ServerVideoRecord> = {};

// Helper: Save video manifest to disk
function saveVideosManifest() {
  try {
    const list = Object.values(serverVideoStore);
    const uniqueMap = new Map<string, ServerVideoRecord>();
    list.forEach((v) => {
      if (v && v.video_id) uniqueMap.set(v.video_id, v);
    });
    fs.writeFileSync(VIDEOS_MANIFEST_PATH, JSON.stringify(Array.from(uniqueMap.values()), null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Video] Failed to save videos_manifest.json:', err);
  }
}

// Helper: Load video manifest from disk
function loadVideosManifest() {
  try {
    if (fs.existsSync(VIDEOS_MANIFEST_PATH)) {
      const raw = fs.readFileSync(VIDEOS_MANIFEST_PATH, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((v: ServerVideoRecord) => {
          if (v && v.video_id) {
            serverVideoStore[v.video_id] = v;
            const fn = path.basename(v.video_url || '');
            if (fn) serverVideoStore[fn] = v;
          }
        });
      }
    }
  } catch (err) {
    console.warn('[Video] Failed to load videos_manifest.json:', err);
  }
}

// Helper: Scan uploads directory for existing physical files
function scanUploadsDirectory() {
  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      files.forEach((file) => {
        const ext = path.extname(file).toLowerCase();
        if (['.mp4', '.mov', '.webm', '.m4v'].includes(ext)) {
          const filePath = path.join(UPLOADS_DIR, file);
          const stat = fs.statSync(filePath);
          const videoId = path.basename(file, ext);
          if (!serverVideoStore[videoId] && !serverVideoStore[file]) {
            const entry: ServerVideoRecord = {
              video_id: videoId,
              file_name: file,
              video_url: `/api/videos/stream/${file}`,
              file_size: stat.size,
              mime_type: ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : 'video/mp4',
              uploaded_at: stat.birthtime.toISOString(),
              status: 'ready',
            };
            serverVideoStore[videoId] = entry;
            serverVideoStore[file] = entry;
          }
        }
      });
      saveVideosManifest();
    }
  } catch (err) {
    console.warn('[Video] Failed to scan uploads directory:', err);
  }
}

// Helper: Sync videos with Firestore DB
async function syncVideosWithFirestore() {
  try {
    const snap = await getDocs(collection(fbDb, 'videos'));
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() as ServerVideoRecord;
      if (data && data.video_id) {
        serverVideoStore[data.video_id] = data;
        const fn = path.basename(data.video_url || '');
        if (fn) serverVideoStore[fn] = data;
      }
    });
    saveVideosManifest();
    console.log(`[Video] Synced ${snap.docs.length} videos from Firestore DB.`);
  } catch (err) {
    console.warn('[Video] Firestore sync fallback to local manifest:', err);
  }
}

// Helper: Save video metadata to DB and manifest
async function saveVideoToDatabase(record: ServerVideoRecord) {
  serverVideoStore[record.video_id] = record;
  const fn = path.basename(record.video_url || '');
  if (fn) serverVideoStore[fn] = record;
  saveVideosManifest();

  try {
    const ref = doc(fbDb, 'videos', record.video_id);
    await setDoc(ref, record, { merge: true });
    console.log(`[Video] Video ${record.video_id} metadata persisted to Firestore.`);
  } catch (err) {
    console.warn('[Video] Failed to save video to Firestore:', err);
  }
}

// Helper: Delete video from disk, memory, manifest, and Firestore DB
async function deleteVideoFromDatabase(idOrFilename: string) {
  let target = serverVideoStore[idOrFilename];
  if (!target) {
    target = Object.values(serverVideoStore).find(
      (v) => v.video_id === idOrFilename || v.file_name === idOrFilename || path.basename(v.video_url) === idOrFilename
    );
  }

  const videoId = target?.video_id || idOrFilename;
  const filename = target?.storage_path
    ? path.basename(target.storage_path)
    : target
      ? path.basename(target.video_url)
      : idOrFilename;

  // 1. Delete the stored file (Firebase Storage object or physical file in UPLOADS_DIR)
  if (target?.storage_path) {
    try {
      await deleteFromCloud(target.storage_path);
      console.log(`[Video] Storage object ${target.storage_path} removed.`);
    } catch (err) {
      console.warn('[Video] Failed to delete video from Firebase Storage:', err);
    }
  }
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`[Video] Physical file ${filename} removed from disk.`);
    } catch (err) {
      console.warn('[Video] Failed to unlink video file:', err);
    }
  }

  // 2. Remove from local store & manifest
  if (target) {
    delete serverVideoStore[target.video_id];
    delete serverVideoStore[path.basename(target.video_url)];
  }
  delete serverVideoStore[idOrFilename];
  saveVideosManifest();

  // 3. Delete document from Firestore
  try {
    await deleteDoc(doc(fbDb, 'videos', videoId));
    console.log(`[Video] Video document ${videoId} deleted from Firestore.`);
  } catch (err) {
    console.warn('[Video] Failed to delete video doc from Firestore:', err);
  }
}

// Multer Storage for real video files (direct upload fallback)
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const uniqueId = `vid_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${uniqueId}${ext}`);
  },
});

const ALLOWED_VIDEO_EXTS = ['.mp4', '.mov', '.webm'];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const videoUpload = multer({
  storage: videoStorage,
  limits: {
    fileSize: MAX_VIDEO_FILE_SIZE, // 100MB
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowed = ALLOWED_VIDEO_EXTS.includes(ext) || ALLOWED_VIDEO_MIMES.includes(file.mimetype);
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 동영상 형식입니다. (MP4, MOV, WebM 형식만 업로드할 수 있습니다)'));
    }
  },
});

// Multer Storage for Chunked Sliced Video Uploads (completely prevents HTTP 413)
const chunkStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const rawId = (
      req.query?.uploadId ||
      (req.headers['x-upload-id'] as string) ||
      req.body?.uploadId ||
      ''
    ) as string;
    const safeUploadId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeUploadId) {
      return cb(new Error('유효한 업로드 세션 ID(uploadId)가 누락되었습니다.'), '');
    }
    const uploadDir = path.join(CHUNKS_TEMP_DIR, safeUploadId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, _file, cb) => {
    const chunkIdx = (
      req.query?.chunkIndex ??
      (req.headers['x-chunk-index'] as string) ??
      req.body?.chunkIndex ??
      '0'
    ) as string;
    const cleanIndex = parseInt(chunkIdx, 10);
    cb(null, `chunk_${isNaN(cleanIndex) ? 0 : cleanIndex}`);
  },
});

const chunkUpload = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per chunk limit (safe for 2MB-4MB slices)
  },
});

// Multer Storage for user profile avatars
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATARS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueId = `avatar_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${uniqueId}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 이미지 형식입니다. (JPG, PNG, WebP 지원)'));
    }
  },
});

// In-memory progress, watch sessions, and enrollment store on backend
const serverProgressStore: Record<string, any[]> = {};
const serverEnrollmentStore: Record<string, any[]> = {};

// Anti-Cheat Watch Sessions Store
interface WatchSession {
  userId: string;
  courseId: string;
  lessonId: string;
  duration: number;
  intervals: [number, number][]; // Array of [startSec, endSec] watched intervals
  uniqueWatchedSeconds: number;
  uniquePercent: number;
  isCompleted: boolean;
  lastPosition: number;
  lastUpdated: string;
}

const serverWatchSessions: Record<string, WatchSession> = {};

// Helper: Merge intervals to compute true cumulative unique watched seconds
function mergeWatchedIntervals(
  existing: [number, number][],
  newInterval: [number, number],
  maxDuration: number
): { merged: [number, number][]; totalUnique: number } {
  const [start, end] = newInterval;
  if (isNaN(start) || isNaN(end) || end <= start) {
    const total = calculateTotalUnique(existing);
    return { merged: existing, totalUnique: total };
  }

  // Cap interval within video boundaries
  const validStart = Math.max(0, Math.min(start, maxDuration));
  const validEnd = Math.max(0, Math.min(end, maxDuration));

  if (validEnd <= validStart) {
    const total = calculateTotalUnique(existing);
    return { merged: existing, totalUnique: total };
  }

  // Add new interval and sort
  const all = [...existing, [validStart, validEnd] as [number, number]].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];

  for (const interval of all) {
    if (merged.length === 0) {
      merged.push([...interval]);
    } else {
      const prev = merged[merged.length - 1];
      if (interval[0] <= prev[1] + 1.0) {
        // Overlapping or adjacent
        prev[1] = Math.max(prev[1], interval[1]);
      } else {
        merged.push([...interval]);
      }
    }
  }

  const totalUnique = calculateTotalUnique(merged);
  return { merged, totalUnique };
}

function calculateTotalUnique(intervals: [number, number][]): number {
  return intervals.reduce((acc, [s, e]) => acc + Math.max(0, e - s), 0);
}

// Helper: Cryptographic PBKDF2 Password Hashing with Salt
function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

// Strictly Allowed Admin Accounts
const ALLOWED_ADMIN_EMAILS = [
  'teamdevstudiont@gmail.com',
  'eunyool100208@gmail.com',
  'deer123424@gmail.com',
  'ayun24song@gmail.com',
];

interface AdminCredential {
  id: string;
  name: string;
  email: string;
  role: string;
  hash: string;
  salt: string;
  avatar?: string;
  createdAt: string;
  status: 'active' | 'suspended';
}

const adminCredentialsStore: Record<string, AdminCredential> = {};

// Active sessions map to store issued tokens and role metadata
interface ActiveSession {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: number;
}
const activeSessions: Map<string, ActiveSession> = new Map();

// Whitelist of valid role tags for server-side RBAC validation
export const ALLOWED_ROLE_TAGS = [
  'SUPER_ADMIN',
  'SERVICE_OWNER',
  'SECURITY_MANAGER',
  'CONTENT_MANAGER',
  'LEARNING_MANAGER',
  'COMMUNITY_MANAGER',
  'USER_MANAGER',
  'OPERATIONS_MANAGER',
  'USER',
];

export const serverAuditLogs: Array<{
  id: string;
  actorId: string;
  actorName: string;
  targetUserId: string;
  targetUserName: string;
  action: string;
  details: string;
  timestamp: string;
}> = [];

// Initialize the allowed admin accounts with initial password hashed and salted on server.
// The password must come from INITIAL_ADMIN_PASSWORD. Without it a random one is used, so admin
// sign-in stays closed instead of falling back to a password anyone could read in the repository.
const INITIAL_ADMIN_PW = (() => {
  const fromEnv = (process.env.INITIAL_ADMIN_PASSWORD || '').trim();
  if (fromEnv) return fromEnv;
  console.warn('[Auth] INITIAL_ADMIN_PASSWORD is not set — admin sign-in is disabled until it is configured.');
  return crypto.randomBytes(32).toString('hex');
})();

function initAdminAccounts() {
  const adminDefs = [
    {
      id: 'TDSNTLMS',
      name: 'TDSNTLMS',
      email: 'teamdevstudiont@gmail.com',
      role: 'SUPER_ADMIN',
      avatar: '/images/tdsntlms_profile.png',
    },
    {
      id: 'admin_EunYool',
      name: '은율',
      email: 'eunyool100208@gmail.com',
      role: 'SUPER_ADMIN',
      avatar: undefined,
    },
    {
      id: 'admin_EunYool',
      name: '은율',
      email: 'deer123424@gmail.com',
      role: 'SUPER_ADMIN',
      avatar: undefined,
    },
    {
      id: 'admin_ayun24song',
      name: '윤아',
      email: 'ayun24song@gmail.com',
      role: 'SUPER_ADMIN',
      avatar: '/송윤아.png',
    },
  ];

  for (const def of adminDefs) {
    const cleanEmail = def.email.toLowerCase();
    if (!adminCredentialsStore[cleanEmail]) {
      const { hash, salt } = hashPassword(INITIAL_ADMIN_PW);
      adminCredentialsStore[cleanEmail] = {
        id: def.id,
        name: def.name,
        email: cleanEmail,
        role: def.role,
        hash,
        salt,
        avatar: def.avatar,
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'active',
      };
    } else {
      adminCredentialsStore[cleanEmail].id = def.id;
      // Protected admin role restoration: never allow to become USER
      if (!adminCredentialsStore[cleanEmail].role || adminCredentialsStore[cleanEmail].role === 'USER') {
        adminCredentialsStore[cleanEmail].role = def.role;
      }
      if (!adminCredentialsStore[cleanEmail].name) {
        adminCredentialsStore[cleanEmail].name = def.name;
      }
      if (def.avatar && !adminCredentialsStore[cleanEmail].avatar) {
        adminCredentialsStore[cleanEmail].avatar = def.avatar;
      }
    }
  }
}

const userProfilesStore: Record<string, any> = {};

initAdminAccounts();

async function startServer() {
  const app = express();
  // Hosting platforms (Render etc.) inject PORT; locally it is 3000.
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'TDSNTLMS Auth & Learning Core', timestamp: new Date().toISOString() });
  });

  // ==========================================
  // DISCORD NOTIFICATIONS
  // ==========================================

  const clientIp = (req: express.Request) =>
    String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';

  // Category switches from 환경설정 > 알림 (system_settings/global.discordNotify). Missing means on.
  let discordToggles: { at: number; value: Record<string, boolean> } | null = null;
  const isDiscordCategoryOn = async (category: DiscordCategory) => {
    if (!discordToggles || Date.now() - discordToggles.at > 60_000) {
      let value: Record<string, boolean> = {};
      try {
        const snap = await getDoc(doc(fbDb, 'system_settings', 'global'));
        value = (snap.exists() && (snap.data() as any).discordNotify) || {};
      } catch {}
      discordToggles = { at: Date.now(), value };
    }
    return discordToggles.value[category] !== false;
  };

  const notifyDiscord = async (message: DiscordMessage & { category: DiscordCategory }) =>
    (await isDiscordCategoryOn(message.category)) ? sendDiscord(message) : false;

  /** Display name for alerts raised by the server, which only knows the user id. */
  const lookupLabels = async (userId?: string, courseId?: string) => {
    let userLabel = userId || '-';
    let courseLabel = courseId || '-';
    try {
      if (userId) {
        const u = await getDoc(doc(fbDb, 'users', userId));
        if (u.exists()) userLabel = `${(u.data() as any).name || userId} (${(u.data() as any).email || userId})`;
      }
      if (courseId) {
        const c = await getDoc(doc(fbDb, 'courses', courseId));
        if (c.exists()) courseLabel = (c.data() as any).title || courseId;
      }
    } catch {}
    return { userLabel, courseLabel };
  };

  const ADMIN_ACTION_LABELS: Record<string, string> = {
    UPDATE_ROLE: '권한 변경',
    UPDATE_STATUS: '계정 상태 변경',
    DELETE_USER: '사용자 삭제',
    PASSWORD_CHANGE: '비밀번호 변경',
    COURSE_DELETE: '강의 삭제',
    BULK_DELETE: '일괄 삭제',
    LEARNING_DATA_RESET: '학습 기록 초기화',
  };
  const SUSPICIOUS_LABELS: Record<string, string> = {
    seek_skip: '아직 보지 않은 구간으로 건너뛰기를 반복 시도',
  };

  const notifyRate = new WindowCounter(5 * 60 * 1000);

  app.get('/api/notify/status', (_req, res) => {
    res.json({ configured: isDiscordConfigured() });
  });

  // Events reported by the browser (enrollments, inquiries, admin actions, …). The server builds the
  // message from a fixed set of event kinds so the endpoint cannot be used to post arbitrary content.
  app.post('/api/notify/event', async (req, res) => {
    const ip = clientIp(req);
    if (notifyRate.hit(`ip:${ip}`) > 40 || notifyRate.hit('all') > 300) {
      return res.status(429).json({ sent: false, reason: 'rate_limited' });
    }
    const { kind, data } = req.body || {};
    const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const v = (key: string, max = 120) => String(d[key] ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

    let message: (DiscordMessage & { category: DiscordCategory }) | null = null;
    switch (kind) {
      case 'enrollment':
        message = {
          category: 'enrollment',
          title: '📚 수강 신청',
          description: `**${v('userName')}**님이 「${v('courseTitle')}」 수강을 시작했습니다.`,
          dedupeKey: `enroll:${v('userId')}:${v('courseId')}`,
        };
        break;
      case 'assignment':
        message = {
          category: 'enrollment',
          title: '🗂️ 수강 배정',
          description: v('details', 300) || `${v('actorName')}님이 수강을 배정했습니다.`,
          fields: [{ name: '관리자', value: v('actorName') }],
        };
        break;
      case 'completion':
        message = {
          category: 'completion',
          title: '🎓 과정 수료',
          description: `**${v('userName')}**님이 「${v('courseTitle')}」 과정을 수료했습니다.`,
          dedupeKey: `complete:${v('userId')}:${v('courseId')}`,
        };
        break;
      case 'inquiry':
        message = {
          category: 'inquiry',
          title: '💬 새 문의',
          description: `「${v('title', 100)}」\n관리자 콘솔 › 문의 관리에서 답변해 주세요.`,
          fields: [
            { name: '유형', value: v('categoryLabel') },
            { name: '보낸 사람', value: v('userName') + (d.guest ? ' (비회원)' : '') },
            ...(Number(d.attachments) > 0 ? [{ name: '첨부', value: `${Math.min(Number(d.attachments), 10)}개` }] : []),
          ],
          dedupeKey: `inquiry:${v('inquiryId')}`,
        };
        break;
      case 'admin_action': {
        const label = ADMIN_ACTION_LABELS[v('action')];
        if (!label) return res.status(400).json({ sent: false, reason: 'unknown_action' });
        message = {
          category: 'security',
          title: `🛡️ 관리 작업 · ${label}`,
          description: v('details', 300),
          fields: [{ name: '관리자', value: v('actorName') }],
        };
        break;
      }
      case 'suspicious': {
        const label = SUSPICIOUS_LABELS[v('reason')];
        if (!label) return res.status(400).json({ sent: false, reason: 'unknown_reason' });
        message = {
          category: 'security',
          title: '⚠️ 이상 행동 감지',
          description: label,
          fields: [
            { name: '사용자', value: v('userName') },
            { name: '강의', value: v('courseTitle') },
            { name: '차시', value: v('lessonTitle') },
            { name: '횟수', value: v('count') },
          ],
          dedupeKey: `suspicious:${v('reason')}:${v('userId')}:${v('lessonId')}`,
        };
        break;
      }
      case 'test': {
        if (!isDiscordConfigured()) return res.json({ sent: false, reason: 'not_configured' });
        if (notifyRate.hit(`test:${ip}`) > 5) return res.status(429).json({ sent: false, reason: 'rate_limited' });
        const sent = await sendDiscord({
          category: 'test',
          title: '✅ 테스트 알림',
          description: 'TDSNT LMS와 Discord 웹훅이 연결되었습니다. 앞으로 선택한 알림이 이 채널로 옵니다.',
          fields: [{ name: '보낸 사람', value: v('actorName') || '-' }],
        });
        return res.json({ sent, reason: sent ? undefined : 'webhook_error' });
      }
      default:
        return res.status(400).json({ sent: false, reason: 'unknown_kind' });
    }

    if (!isDiscordConfigured()) return res.json({ sent: false, reason: 'not_configured' });
    const sent = await notifyDiscord(message);
    return res.json({ sent });
  });

  // Server-side detections
  const adminLoginFailures = new WindowCounter(15 * 60 * 1000);
  const spoofedHeartbeats = new WindowCounter(30 * 60 * 1000);

  // API Auth Session Verification Endpoint
  app.get('/api/auth/session', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return res.status(401).json({ success: false, valid: false, message: '인증 토큰이 없습니다.' });
    }

    const session = activeSessions.get(token);
    if (session) {
      return res.json({
        success: true,
        valid: true,
        role: session.role,
        userId: session.id,
      });
    }

    if (token.startsWith('tdsnt_jwt_sa_')) {
      return res.json({
        success: true,
        valid: true,
        role: 'SUPER_ADMIN',
      });
    }

    if (token.startsWith('tdsnt_jwt_usr_') || token.startsWith('tdsnt_token_')) {
      return res.json({
        success: true,
        valid: true,
        role: 'USER',
      });
    }

    return res.json({
      success: true,
      valid: true,
    });
  });

  // ==========================================
  // KAKAO OAUTH INTEGRATION ENDPOINTS
  // ==========================================

  const customKakaoSettings = {
    clientId: '',
    clientSecret: '',
    redirectUri: '',
  };

  function getKakaoConfig(req?: express.Request) {
    const clientId = (
      process.env.KAKAO_CLIENT_ID ||
      process.env.VITE_KAKAO_CLIENT_ID ||
      process.env.KAKAO_REST_API_KEY ||
      process.env.VITE_KAKAO_REST_API_KEY ||
      process.env.KAKAO_JAVASCRIPT_KEY ||
      process.env.VITE_KAKAO_JAVASCRIPT_KEY ||
      customKakaoSettings.clientId ||
      ''
    ).trim();

    const clientSecret = (
      process.env.KAKAO_CLIENT_SECRET ||
      customKakaoSettings.clientSecret ||
      ''
    ).trim();

    let redirectUri = (
      process.env.KAKAO_REDIRECT_URI ||
      process.env.VITE_KAKAO_REDIRECT_URI ||
      customKakaoSettings.redirectUri ||
      ''
    ).trim();

    if (!redirectUri && req) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
      redirectUri = `${protocol}://${host}/api/auth/kakao/callback`;
    } else if (!redirectUri && process.env.APP_URL) {
      redirectUri = `${process.env.APP_URL.replace(/\/$/, '')}/api/auth/kakao/callback`;
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      enabled: !!clientId,
    };
  }

  async function exchangeKakaoAuthCode(code: string, redirectUri: string, clientSecret?: string, clientId?: string) {
    const cfg = getKakaoConfig();
    const targetClientId = clientId || cfg.clientId;
    const targetSecret = clientSecret || cfg.clientSecret;

    if (!targetClientId) {
      throw new Error('카카오 Client ID(REST API 키)가 설정되지 않았습니다.');
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: targetClientId,
      redirect_uri: redirectUri,
      code,
    });

    if (targetSecret) {
      tokenParams.append('client_secret', targetSecret);
    }

    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: tokenParams.toString(),
    });

    const tokenData = (await tokenRes.json().catch(() => ({}))) as any;
    if (!tokenRes.ok || !tokenData.access_token) {
      const errDetail = tokenData.error_description || tokenData.error || '토큰 교환 실패';
      throw new Error(`카카오 인증 토큰 교환 오류: ${errDetail}`);
    }

    const accessToken = tokenData.access_token;

    // Fetch User Info from Kakao API
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    const userData = (await userRes.json().catch(() => ({}))) as any;
    if (!userRes.ok || !userData.id) {
      const errDetail = userData.msg || '사용자 정보 획득 실패';
      throw new Error(`카카오 사용자 정보 조회 오류: ${errDetail}`);
    }

    return userData;
  }

  async function handleKakaoUserLogin(userData: any) {
    const kakaoId = String(userData.id);
    const nickname =
      userData.kakao_account?.profile?.nickname ||
      userData.properties?.nickname ||
      '카카오 수강생';
    const profileImage =
      userData.kakao_account?.profile?.profile_image_url ||
      userData.properties?.profile_image ||
      undefined;
    const email =
      userData.kakao_account?.email ||
      `${kakaoId}@kakao.tdsnt`;

    const userId = `kakao_${kakaoId}`;

    // Check if existing in userProfilesStore or Firestore
    let existingUser = userProfilesStore[userId] || userProfilesStore[email];

    if (!existingUser && fbDb) {
      try {
        const snap = await getDoc(doc(fbDb, 'users', userId));
        if (snap.exists()) {
          existingUser = snap.data();
        }
      } catch (e) {
        console.warn('[KakaoAuth] Firestore lookup error:', e);
      }
    }

    const isProtectedAdmin = ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase());
    const finalRole = isProtectedAdmin ? 'SUPER_ADMIN' : (existingUser?.role || 'USER');

    const resolvedUser = {
      id: userId,
      kakaoId,
      name: existingUser?.name || nickname,
      email: existingUser?.email || email,
      role: finalRole,
      status: existingUser?.status || 'ACTIVE',
      avatar: existingUser?.avatar !== undefined ? existingUser?.avatar : profileImage,
      provider: 'kakao',
      createdAt: existingUser?.createdAt || new Date().toISOString(),
    };

    // Cache in userProfilesStore
    userProfilesStore[userId] = resolvedUser;
    userProfilesStore[email] = resolvedUser;

    // Persist to Firestore
    if (fbDb) {
      try {
        await setDoc(doc(fbDb, 'users', userId), resolvedUser, { merge: true });
      } catch (e) {
        console.warn('[KakaoAuth] Firestore save error:', e);
      }
    }

    // Issue session token
    const token = `tdsnt_jwt_usr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    activeSessions.set(token, {
      id: resolvedUser.id,
      email: resolvedUser.email,
      name: resolvedUser.name,
      role: resolvedUser.role,
      createdAt: Date.now(),
    });

    return { user: resolvedUser, token };
  }

  // Get Kakao Client Configuration
  app.get('/api/auth/kakao/config', (req, res) => {
    const cfg = getKakaoConfig(req);
    res.json({
      success: true,
      enabled: cfg.enabled,
      clientId: cfg.clientId,
      redirectUri: cfg.redirectUri,
    });
  });

  // Save/Update Kakao Settings from Admin UI
  app.post('/api/settings/kakao', (req, res) => {
    const { clientId, clientSecret, redirectUri } = req.body || {};
    if (clientId !== undefined) customKakaoSettings.clientId = String(clientId).trim();
    if (clientSecret !== undefined) customKakaoSettings.clientSecret = String(clientSecret).trim();
    if (redirectUri !== undefined) customKakaoSettings.redirectUri = String(redirectUri).trim();

    res.json({
      success: true,
      message: '카카오 로그인 설정이 반영되었습니다.',
      config: getKakaoConfig(req),
    });
  });

  // Direct Redirect to Kakao Authorize Endpoint
  app.get('/api/auth/kakao/authorize', (req, res) => {
    const cfg = getKakaoConfig(req);
    if (!cfg.clientId) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>카카오 설정 안내</title></head>
        <body style="font-family:sans-serif; text-align:center; padding-top:60px;">
          <h3>카카오 Client ID(REST API 키)가 설정되지 않았습니다.</h3>
          <p>관리자 콘솔 [시스템 설정] 또는 환경변수(KAKAO_CLIENT_ID)를 설정해주세요.</p>
          <button onclick="if(window.opener){window.close();}else{window.location.href='/';}" style="padding:8px 16px; margin-top:16px;">닫기</button>
        </body>
        </html>
      `);
    }
    const redirectUri = (req.query.redirect_uri as string) || cfg.redirectUri;
    const authorizeUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${cfg.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    res.redirect(authorizeUrl);
  });

  // Code Exchange endpoint for SDK / Single-Page requests
  app.post('/api/auth/kakao/exchange', async (req, res) => {
    const { code, redirectUri, clientId } = req.body || {};
    if (!code) {
      return res.status(400).json({ success: false, message: '인증 코드가 누락되었습니다.' });
    }

    const cfg = getKakaoConfig(req);
    const targetRedirectUri = redirectUri || cfg.redirectUri;

    try {
      const userData = await exchangeKakaoAuthCode(code, targetRedirectUri, cfg.clientSecret, clientId || cfg.clientId);
      const authResult = await handleKakaoUserLogin(userData);
      return res.json({
        success: true,
        user: authResult.user,
        token: authResult.token,
        message: '카카오 로그인이 성공적으로 완료되었습니다.',
      });
    } catch (err: any) {
      console.error('[KakaoAuthExchange Error]', err);
      return res.status(500).json({
        success: false,
        message: err.message || '카카오 로그인 인증 처리 중 오류가 발생했습니다.',
      });
    }
  });

  // OAuth Redirect Callback Handler (Supports popup postMessage and full page redirect)
  const kakaoCallbackHandler = async (req: express.Request, res: express.Response) => {
    const { code, error, error_description } = req.query;

    if (error) {
      const errMsg = (error_description as string) || (error as string) || '카카오 로그인이 취소되었거나 거부되었습니다.';
      return res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="utf-8">
          <title>카카오 로그인 오류</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; padding: 32px 24px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 380px; width: 90%; }
            .btn { display: inline-block; margin-top: 18px; padding: 10px 20px; background: #4f46e5; color: white; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2 style="font-size: 18px; font-weight: 800; color: #e11d48; margin: 0 0 8px;">로그인 취소 / 오류</h2>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 16px;">${errMsg}</p>
            <a href="/" class="btn" onclick="if(window.opener){window.close();return false;}">홈으로 돌아가기</a>
          </div>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'KAKAO_AUTH_ERROR', message: ${JSON.stringify(errMsg)} }, '*');
              setTimeout(() => { try { window.close(); } catch(e) {} }, 1500);
            }
          </script>
        </body>
        </html>
      `);
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head><meta charset="utf-8"><title>오류</title></head>
        <body style="font-family:sans-serif; text-align:center; padding-top:50px;">
          <p>인증 코드가 전달되지 않았습니다.</p>
          <script>if(window.opener){setTimeout(()=>window.close(), 1500);}</script>
        </body>
        </html>
      `);
    }

    const cfg = getKakaoConfig(req);
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const reqCallbackUri = `${protocol}://${host}${req.path}`;
    const redirectUri = cfg.redirectUri || reqCallbackUri;

    try {
      const userData = await exchangeKakaoAuthCode(code, redirectUri, cfg.clientSecret, cfg.clientId);
      const authResult = await handleKakaoUserLogin(userData);

      return res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TDSNTLMS 카카오 로그인</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; padding: 32px 24px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 380px; width: 90%; }
            .icon { width: 52px; height: 52px; background: #FEE500; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
            .spinner { width: 28px; height: 28px; border: 3px solid #fde047; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 16px auto 0; }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#000000">
                <path d="M12 3C6.477 3 2 6.477 2 10.771c0 2.781 1.884 5.228 4.707 6.577-.208.777-.753 2.815-.863 3.25-.136.541.198.533.417.388.172-.114 2.735-1.859 3.844-2.617.618.087 1.25.132 1.895.132 5.523 0 10-3.477 10-7.771S17.523 3 12 3z"/>
              </svg>
            </div>
            <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px;">카카오 로그인 성공</h2>
            <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">학습 계정 정보를 동기화하고 있습니다.<br/>잠시만 기다려주세요...</p>
            <div class="spinner"></div>
          </div>
          <script>
            const payload = {
              type: 'KAKAO_AUTH_SUCCESS',
              token: ${JSON.stringify(authResult.token)},
              user: ${JSON.stringify(authResult.user)}
            };
            try {
              localStorage.setItem('tdsnt_jwt_auth_token_v1', payload.token);
              localStorage.setItem('tdsnt_current_user', JSON.stringify(payload.user));
            } catch(e) {}

            if (window.opener && window.opener !== window) {
              window.opener.postMessage(payload, '*');
              setTimeout(() => {
                try { window.close(); } catch(e) {}
              }, 300);
            } else {
              window.location.href = '/?login=kakao_success';
            }
          </script>
        </body>
        </html>
      `);
    } catch (err: any) {
      console.error('[KakaoAuthCallback Error]', err);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="utf-8">
          <title>카카오 로그인 실패</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; padding: 32px 24px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 380px; width: 90%; }
            .btn { display: inline-block; margin-top: 18px; padding: 10px 20px; background: #4f46e5; color: white; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2 style="font-size: 18px; font-weight: 800; color: #e11d48; margin: 0 0 8px;">로그인 처리 실패</h2>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 16px;">${err.message || '카카오 로그인 처리 중 오류가 발생했습니다.'}</p>
            <a href="/" class="btn" onclick="if(window.opener){window.close();return false;}">홈으로 돌아가기</a>
          </div>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'KAKAO_AUTH_ERROR', message: ${JSON.stringify(err.message || '카카오 로그인 실패')} }, '*');
              setTimeout(() => { try { window.close(); } catch(e) {} }, 2500);
            }
          </script>
        </body>
        </html>
      `);
    }
  };

  app.get(['/api/auth/kakao/callback', '/api/auth/kakao/callback/', '/auth/kakao/callback', '/auth/kakao/callback/'], kakaoCallbackHandler);

  // ==========================================
  // NAVER OAUTH INTEGRATION ENDPOINTS
  // ==========================================

  const customNaverSettings = {
    clientId: '',
    clientSecret: '',
    redirectUri: '',
  };

  function getNaverConfig(req?: express.Request) {
    const clientId = (
      process.env.NAVER_CLIENT_ID ||
      process.env.VITE_NAVER_CLIENT_ID ||
      customNaverSettings.clientId ||
      ''
    ).trim();

    const clientSecret = (
      process.env.NAVER_CLIENT_SECRET ||
      customNaverSettings.clientSecret ||
      ''
    ).trim();

    let redirectUri = (
      process.env.NAVER_REDIRECT_URI ||
      process.env.VITE_NAVER_REDIRECT_URI ||
      customNaverSettings.redirectUri ||
      ''
    ).trim();

    if (!redirectUri && req) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
      redirectUri = `${protocol}://${host}/api/auth/naver/callback`;
    } else if (!redirectUri && process.env.APP_URL) {
      redirectUri = `${process.env.APP_URL.replace(/\/$/, '')}/api/auth/naver/callback`;
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      enabled: !!clientId,
    };
  }

  async function exchangeNaverAuthCode(code: string, state: string, redirectUri: string, clientSecret?: string, clientId?: string) {
    const cfg = getNaverConfig();
    const targetClientId = clientId || cfg.clientId;
    const targetSecret = clientSecret || cfg.clientSecret;

    if (!targetClientId) {
      throw new Error('네이버 Client ID가 설정되지 않았습니다.');
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: targetClientId,
      client_secret: targetSecret,
      code,
      state: state || 'tdsnt_state',
    });

    const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?${tokenParams.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    const tokenData = (await tokenRes.json().catch(() => ({}))) as any;
    if (!tokenRes.ok || !tokenData.access_token) {
      const errDetail = tokenData.error_description || tokenData.error || '토큰 발급 실패';
      throw new Error(`네이버 인증 토큰 교환 오류: ${errDetail}`);
    }

    const accessToken = tokenData.access_token;

    // Fetch Profile from Naver OpenAPI
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = (await userRes.json().catch(() => ({}))) as any;
    if (!userRes.ok || !userData.response || !userData.response.id) {
      const errDetail = userData.message || '네이버 프로필 조회 실패';
      throw new Error(`네이버 사용자 정보 조회 오류: ${errDetail}`);
    }

    return userData.response;
  }

  async function handleNaverUserLogin(naverUser: any) {
    const naverId = String(naverUser.id);
    const name = naverUser.name || naverUser.nickname || '네이버 수강생';
    const email = naverUser.email || `${naverId}@naver.tdsnt`;
    const avatar = naverUser.profile_image || undefined;
    const userId = `naver_${naverId}`;

    let existingUser = userProfilesStore[userId] || userProfilesStore[email];

    if (!existingUser && fbDb) {
      try {
        const snap = await getDoc(doc(fbDb, 'users', userId));
        if (snap.exists()) {
          existingUser = snap.data();
        }
      } catch (e) {
        console.warn('[NaverAuth] Firestore lookup error:', e);
      }
    }

    const cleanEmail = email.toLowerCase().trim();
    const isProtectedAdmin = ALLOWED_ADMIN_EMAILS.includes(cleanEmail);
    const finalRole = isProtectedAdmin ? 'SUPER_ADMIN' : (existingUser?.role || 'USER');

    const resolvedUser = {
      id: userId,
      naverId,
      name: existingUser?.name || name,
      email: existingUser?.email || email,
      role: finalRole,
      status: existingUser?.status || 'ACTIVE',
      avatar: existingUser?.avatar !== undefined ? existingUser?.avatar : avatar,
      provider: 'naver',
      createdAt: existingUser?.createdAt || new Date().toISOString(),
    };

    userProfilesStore[userId] = resolvedUser;
    userProfilesStore[email] = resolvedUser;

    if (fbDb) {
      try {
        await setDoc(doc(fbDb, 'users', userId), resolvedUser, { merge: true });
      } catch (e) {
        console.warn('[NaverAuth] Firestore save error:', e);
      }
    }

    const token = `tdsnt_jwt_usr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    activeSessions.set(token, {
      id: resolvedUser.id,
      email: resolvedUser.email,
      name: resolvedUser.name,
      role: resolvedUser.role,
      createdAt: Date.now(),
    });

    return { user: resolvedUser, token };
  }

  // Get Naver Client Configuration
  app.get('/api/auth/naver/config', (req, res) => {
    const cfg = getNaverConfig(req);
    res.json({
      success: true,
      enabled: cfg.enabled,
      clientId: cfg.clientId,
      redirectUri: cfg.redirectUri,
    });
  });

  // Save/Update Naver Settings from Admin UI
  app.post('/api/settings/naver', (req, res) => {
    const { clientId, clientSecret, redirectUri } = req.body || {};
    if (clientId !== undefined) customNaverSettings.clientId = String(clientId).trim();
    if (clientSecret !== undefined) customNaverSettings.clientSecret = String(clientSecret).trim();
    if (redirectUri !== undefined) customNaverSettings.redirectUri = String(redirectUri).trim();

    res.json({
      success: true,
      message: '네이버 로그인 설정이 반영되었습니다.',
      config: getNaverConfig(req),
    });
  });

  // Direct Redirect to Naver Authorize Endpoint
  app.get('/api/auth/naver/authorize', (req, res) => {
    const cfg = getNaverConfig(req);
    if (!cfg.clientId) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>네이버 설정 안내</title></head>
        <body style="font-family:sans-serif; text-align:center; padding-top:60px;">
          <h3>네이버 Client ID가 설정되지 않았습니다.</h3>
          <p>관리자 콘솔 [시스템 설정] 또는 환경변수(NAVER_CLIENT_ID)를 설정해주세요.</p>
          <button onclick="if(window.opener){window.close();}else{window.location.href='/';}" style="padding:8px 16px; margin-top:16px;">닫기</button>
        </body>
        </html>
      `);
    }
    const state = crypto.randomBytes(8).toString('hex');
    const redirectUri = (req.query.redirect_uri as string) || cfg.redirectUri;
    const authorizeUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${cfg.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    res.redirect(authorizeUrl);
  });

  // Code Exchange endpoint for Naver
  app.post('/api/auth/naver/exchange', async (req, res) => {
    const { code, state, redirectUri, clientId } = req.body || {};
    if (!code) {
      return res.status(400).json({ success: false, message: '인증 코드가 누락되었습니다.' });
    }

    const cfg = getNaverConfig(req);
    const targetRedirectUri = redirectUri || cfg.redirectUri;

    try {
      const naverUser = await exchangeNaverAuthCode(code, state || '', targetRedirectUri, cfg.clientSecret, clientId || cfg.clientId);
      const authResult = await handleNaverUserLogin(naverUser);
      return res.json({
        success: true,
        user: authResult.user,
        token: authResult.token,
        message: '네이버 로그인이 성공적으로 완료되었습니다.',
      });
    } catch (err: any) {
      console.error('[NaverAuthExchange Error]', err);
      return res.status(500).json({
        success: false,
        message: err.message || '네이버 로그인 인증 처리 중 오류가 발생했습니다.',
      });
    }
  });

  // Naver OAuth Redirect Callback Handler
  const naverCallbackHandler = async (req: express.Request, res: express.Response) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
      const errMsg = (error_description as string) || (error as string) || '네이버 로그인이 취소되었거나 거부되었습니다.';
      return res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="utf-8">
          <title>네이버 로그인 오류</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; padding: 32px 24px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 380px; width: 90%; }
            .btn { display: inline-block; margin-top: 18px; padding: 10px 20px; background: #03c75a; color: white; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2 style="font-size: 18px; font-weight: 800; color: #e11d48; margin: 0 0 8px;">로그인 취소 / 오류</h2>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 16px;">${errMsg}</p>
            <a href="/" class="btn" onclick="if(window.opener){window.close();return false;}">홈으로 돌아가기</a>
          </div>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'NAVER_AUTH_ERROR', message: ${JSON.stringify(errMsg)} }, '*');
              setTimeout(() => { try { window.close(); } catch(e) {} }, 1500);
            }
          </script>
        </body>
        </html>
      `);
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head><meta charset="utf-8"><title>오류</title></head>
        <body style="font-family:sans-serif; text-align:center; padding-top:50px;">
          <p>인증 코드가 전달되지 않았습니다.</p>
          <script>if(window.opener){setTimeout(()=>window.close(), 1500);}</script>
        </body>
        </html>
      `);
    }

    const cfg = getNaverConfig(req);
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const reqCallbackUri = `${protocol}://${host}${req.path}`;
    const redirectUri = cfg.redirectUri || reqCallbackUri;

    try {
      const naverUser = await exchangeNaverAuthCode(code, (state as string) || '', redirectUri, cfg.clientSecret, cfg.clientId);
      const authResult = await handleNaverUserLogin(naverUser);

      return res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TDSNTLMS 네이버 로그인</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; padding: 32px 24px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 380px; width: 90%; }
            .icon { width: 52px; height: 52px; background: #03C75A; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
            .spinner { width: 28px; height: 28px; border: 3px solid #bbf7d0; border-top-color: #03c75a; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 16px auto 0; }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M16.273 12.845 7.37 0H0v24h7.727V11.155L16.63 24H24V0h-7.727v12.845z"/>
              </svg>
            </div>
            <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px;">네이버 로그인 성공</h2>
            <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">학습 계정 정보를 동기화하고 있습니다.<br/>잠시만 기다려주세요...</p>
            <div class="spinner"></div>
          </div>
          <script>
            const payload = {
              type: 'NAVER_AUTH_SUCCESS',
              token: ${JSON.stringify(authResult.token)},
              user: ${JSON.stringify(authResult.user)}
            };
            try {
              localStorage.setItem('tdsnt_jwt_auth_token_v1', payload.token);
              localStorage.setItem('tdsnt_current_user', JSON.stringify(payload.user));
            } catch(e) {}

            if (window.opener && window.opener !== window) {
              window.opener.postMessage(payload, '*');
              setTimeout(() => {
                try { window.close(); } catch(e) {}
              }, 300);
            } else {
              window.location.href = '/?login=naver_success';
            }
          </script>
        </body>
        </html>
      `);
    } catch (err: any) {
      console.error('[NaverAuthCallback Error]', err);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="utf-8">
          <title>네이버 로그인 실패</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; padding: 32px 24px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 380px; width: 90%; }
            .btn { display: inline-block; margin-top: 18px; padding: 10px 20px; background: #03c75a; color: white; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2 style="font-size: 18px; font-weight: 800; color: #e11d48; margin: 0 0 8px;">로그인 처리 실패</h2>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 16px;">${err.message || '네이버 로그인 처리 중 오류가 발생했습니다.'}</p>
            <a href="/" class="btn" onclick="if(window.opener){window.close();return false;}">홈으로 돌아가기</a>
          </div>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'NAVER_AUTH_ERROR', message: ${JSON.stringify(err.message || '네이버 로그인 실패')} }, '*');
              setTimeout(() => { try { window.close(); } catch(e) {} }, 2500);
            }
          </script>
        </body>
        </html>
      `);
    }
  };

  app.get(['/api/auth/naver/callback', '/api/auth/naver/callback/', '/auth/naver/callback', '/auth/naver/callback/'], naverCallbackHandler);

  // ==========================================
  // GOOGLE AUTH INTEGRATION ENDPOINTS
  // ==========================================

  // Google OAuth Client Config
  app.get('/api/auth/google/config', (req, res) => {
    const oAuthClientId = firebaseConfigJson.oAuthClientId || process.env.GOOGLE_CLIENT_ID || '';
    res.json({
      success: true,
      enabled: true,
      clientId: oAuthClientId,
    });
  });

  // Google Auth Verify & Session Issuer (Supports Firebase Auth Client Result)
  app.post('/api/auth/google/verify', async (req, res) => {
    const { uid, email, displayName, photoURL } = req.body || {};
    if (!uid && !email) {
      return res.status(400).json({ success: false, message: 'Google 사용자 정보가 누락되었습니다.' });
    }

    const cleanEmail = (email || '').toLowerCase().trim();
    const googleId = String(uid || Buffer.from(cleanEmail).toString('hex').slice(0, 10));
    const userId = `google_${googleId}`;
    const name = displayName || cleanEmail.split('@')[0] || '구글 수강생';

    let existingUser = userProfilesStore[userId] || (cleanEmail ? userProfilesStore[cleanEmail] : null);

    if (!existingUser && fbDb) {
      try {
        const snap = await getDoc(doc(fbDb, 'users', userId));
        if (snap.exists()) {
          existingUser = snap.data();
        }
      } catch (e) {
        console.warn('[GoogleAuth] Firestore lookup error:', e);
      }
    }

    const isProtectedAdmin = ALLOWED_ADMIN_EMAILS.includes(cleanEmail);
    const finalRole = isProtectedAdmin ? 'SUPER_ADMIN' : (existingUser?.role || 'USER');

    const resolvedUser = {
      id: userId,
      googleId,
      name: existingUser?.name || name,
      email: existingUser?.email || cleanEmail,
      role: finalRole,
      status: existingUser?.status || 'ACTIVE',
      avatar: existingUser?.avatar !== undefined ? existingUser?.avatar : photoURL,
      provider: 'google',
      createdAt: existingUser?.createdAt || new Date().toISOString(),
    };

    userProfilesStore[userId] = resolvedUser;
    if (cleanEmail) {
      userProfilesStore[cleanEmail] = resolvedUser;
    }

    if (fbDb) {
      try {
        await setDoc(doc(fbDb, 'users', userId), resolvedUser, { merge: true });
      } catch (e) {
        console.warn('[GoogleAuth] Firestore save error:', e);
      }
    }

    const token = `tdsnt_jwt_usr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    activeSessions.set(token, {
      id: resolvedUser.id,
      email: resolvedUser.email,
      name: resolvedUser.name,
      role: resolvedUser.role,
      createdAt: Date.now(),
    });

    return res.json({
      success: true,
      user: resolvedUser,
      token,
      message: 'Google 로그인이 성공적으로 완료되었습니다.',
    });
  });

  // API Auth Login Endpoint
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    let cleanEmail = (email || '').trim().toLowerCase();
    if (cleanEmail === 'tdsntlms' || cleanEmail === 'admin_teamdevstudiont') {
      cleanEmail = 'teamdevstudiont@gmail.com';
    }
    const rawPassword = password != null ? String(password) : '';

    if (!cleanEmail) {
      return res.status(400).json({ success: false, message: '이메일 주소 또는 아이디를 입력해주세요.' });
    }

    if (!rawPassword) {
      return res.status(400).json({ success: false, message: '비밀번호를 입력해주세요.' });
    }

    // Check if email is in the allowed admin list
    if (ALLOWED_ADMIN_EMAILS.includes(cleanEmail)) {
      const adminAcc = adminCredentialsStore[cleanEmail];
      if (!adminAcc) {
        return res.status(403).json({ success: false, message: '접근 권한이 없는 관리자 계정입니다.' });
      }

      if (adminAcc.status === 'suspended') {
        notifyDiscord({
          category: 'security',
          title: '⚠️ 정지된 관리자 계정 로그인 시도',
          fields: [
            { name: '계정', value: cleanEmail },
            { name: 'IP', value: clientIp(req) },
          ],
          dedupeKey: `suspended-login:${cleanEmail}:${Math.floor(Date.now() / 3_600_000)}`,
        }).catch(() => {});
        return res.status(403).json({ success: false, message: '이용이 정지된 관리자 계정입니다. 시스템 총괄자에게 문의하세요.' });
      }

      // Verify exact password (and trimmed fallback in case of user pasting)
      const isMatch = verifyPassword(rawPassword, adminAcc.hash, adminAcc.salt) ||
                      verifyPassword(rawPassword.trim(), adminAcc.hash, adminAcc.salt);

      if (!isMatch) {
        const failures = adminLoginFailures.hit(cleanEmail);
        if (failures === 5 || failures === 20) {
          notifyDiscord({
            category: 'security',
            title: '⚠️ 관리자 로그인 실패 반복',
            description: `15분 안에 비밀번호가 ${failures}번 틀렸습니다. 본인이 아니라면 비밀번호를 바꿔 주세요.`,
            fields: [
              { name: '계정', value: cleanEmail },
              { name: 'IP', value: clientIp(req) },
            ],
          }).catch(() => {});
        }
        return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }

      // Success: Issue admin session token
      const token = `tdsnt_jwt_sa_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const customProfile = userProfilesStore[cleanEmail] || userProfilesStore[adminAcc.id] || {};
      const finalRole = customProfile.role || adminAcc.role;
      const finalName = customProfile.name || adminAcc.name;

      activeSessions.set(token, {
        id: adminAcc.id,
        email: adminAcc.email,
        name: finalName,
        role: finalRole,
        createdAt: Date.now(),
      });

      // Every admin sign-in is posted so a login by someone else is noticed quickly.
      notifyDiscord({
        category: 'security',
        title: '🔐 관리자 로그인',
        description: '관리자 계정으로 로그인했습니다. 본인이 아니라면 바로 비밀번호를 바꿔 주세요.',
        fields: [
          { name: '계정', value: `${finalName} (${adminAcc.email})` },
          { name: 'IP', value: clientIp(req) },
        ],
        dedupeKey: `admin-login:${adminAcc.email}:${clientIp(req)}:${Math.floor(Date.now() / (6 * 3_600_000))}`,
      }).catch(() => {});

      return res.json({
        success: true,
        user: {
          id: adminAcc.id,
          name: finalName,
          email: adminAcc.email,
          role: finalRole,
          status: customProfile.status || adminAcc.status,
          avatar: customProfile.avatar !== undefined ? customProfile.avatar : adminAcc.avatar,
          createdAt: adminAcc.createdAt,
        },
        token,
        message: '관리자 인증이 완료되었습니다.',
      });
    }

    // Student (General User) Account Login
    const userId = `usr_${Buffer.from(cleanEmail).toString('hex').slice(0, 10)}`;
    const customProfile = userProfilesStore[cleanEmail] || userProfilesStore[userId] || {};
    const userToken = `tdsnt_jwt_usr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const studentName = customProfile.name || cleanEmail.split('@')[0];
    const studentRole = customProfile.role || 'USER';

    activeSessions.set(userToken, {
      id: userId,
      email: cleanEmail,
      name: studentName,
      role: studentRole,
      createdAt: Date.now(),
    });

    return res.json({
      success: true,
      user: {
        id: userId,
        name: studentName,
        email: cleanEmail,
        role: studentRole,
        status: customProfile.status || 'active',
        avatar: customProfile.avatar,
        createdAt: new Date().toISOString(),
      },
      token: userToken,
      message: '수강생 로그인이 완료되었습니다.',
    });
  });

  // Sync user profile across sessions
  app.post('/api/user/sync-profile', (req, res) => {
    const { id, email, name, role, avatar, status } = req.body || {};
    if (email) {
      const clean = email.toLowerCase();
      const isAdminAccount = ALLOWED_ADMIN_EMAILS.includes(clean);
      // Strictly prevent demoting protected admin accounts to USER
      const safeRole = (isAdminAccount && role === 'USER') ? undefined : role;

      userProfilesStore[clean] = {
        ...userProfilesStore[clean],
        ...(id ? { id } : {}),
        ...(name ? { name } : {}),
        ...(safeRole ? { role: safeRole } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
        ...(status ? { status } : {}),
      };
      if (adminCredentialsStore[clean]) {
        if (name) adminCredentialsStore[clean].name = name;
        if (safeRole && safeRole !== 'USER') adminCredentialsStore[clean].role = safeRole;
        if (avatar !== undefined) adminCredentialsStore[clean].avatar = avatar;
        if (status) adminCredentialsStore[clean].status = status;
      }
    }
    if (id) {
      const existingUser = Object.values(userProfilesStore).find((u) => u && u.id === id);
      const isTargetAdmin = (existingUser?.email && ALLOWED_ADMIN_EMAILS.includes(existingUser.email.toLowerCase())) ||
                            Object.values(adminCredentialsStore).some((a) => a.id === id);
      const safeRole = (isTargetAdmin && role === 'USER') ? undefined : role;

      userProfilesStore[id] = {
        ...userProfilesStore[id],
        ...(name ? { name } : {}),
        ...(safeRole ? { role: safeRole } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
        ...(status ? { status } : {}),
      };
    }
    res.json({ success: true });
  });

  // API Auth Change Password Endpoint (Admin password change)
  app.post('/api/auth/change-password', (req, res) => {
    const { email, currentPassword, newPassword } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const currentPw = currentPassword != null ? String(currentPassword) : '';
    const newPw = newPassword != null ? String(newPassword) : '';

    if (!ALLOWED_ADMIN_EMAILS.includes(cleanEmail)) {
      return res.status(403).json({ success: false, message: '관리자 허용 계정만 이 경로로 비밀번호를 변경할 수 있습니다.' });
    }

    const adminAcc = adminCredentialsStore[cleanEmail];
    if (!adminAcc) {
      return res.status(404).json({ success: false, message: '해당 관리자 계정을 찾을 수 없습니다.' });
    }

    const isMatch = verifyPassword(currentPw, adminAcc.hash, adminAcc.salt) ||
                    verifyPassword(currentPw.trim(), adminAcc.hash, adminAcc.salt);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: '현재 사용 중인 비밀번호가 일치하지 않습니다.' });
    }

    if (!newPw || newPw.length < 6) {
      return res.status(400).json({ success: false, message: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
    }

    // Re-hash with fresh salt
    const { hash, salt } = hashPassword(newPw);
    adminAcc.hash = hash;
    adminAcc.salt = salt;

    return res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
    });
  });

  // API User Profile Avatar Upload
  app.post('/api/me/avatar', avatarUpload.single('avatar'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '업로드할 이미지 파일을 선택해주세요.' });
    }

    let avatarUrl = `/api/uploads/avatars/${req.file.filename}`;
    try {
      const cloudUrl = await moveToCloudStorage(req.file.path, `avatars/${req.file.filename}`, req.file.mimetype);
      if (cloudUrl) avatarUrl = cloudUrl;
    } catch (err) {
      console.error('Failed to store avatar in Firebase Storage:', err);
      return res.status(500).json({ success: false, message: '프로필 사진 저장에 실패했습니다.' });
    }
    return res.json({
      success: true,
      avatarUrl,
      filename: req.file.filename,
      message: '프로필 사진이 성공적으로 업로드되었습니다.',
    });
  });

  // API User Profile Avatar Serve
  app.get('/api/uploads/avatars/:filename', (req, res) => {
    const filename = req.params.filename;
    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(AVATARS_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '프로필 이미지를 찾을 수 없습니다.' });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
  });

  // API Delete User Profile Avatar
  app.delete('/api/me/avatar/:filename', async (req, res) => {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    const filePath = path.join(AVATARS_DIR, safeFilename);

    if (/^avatar_[\w-]+\.\w+$/.test(safeFilename)) {
      try {
        await deleteFromCloud(`avatars/${safeFilename}`);
      } catch (err) {
        console.error('Failed to delete avatar from Firebase Storage:', err);
      }
    }

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to unlink avatar:', err);
      }
    }

    return res.json({ success: true, message: '프로필 이미지가 삭제되었습니다.' });
  });

  // In-memory stores for achievement customization
  const badgeTitleOverrides: Record<string, string> = {};
  const customFramesStore: any[] = [];

  // API Equip Achievement Decoration with Server-side Role Validation
  app.post('/api/me/equipped-achievement', (req, res) => {
    const { userId, achievementId, role } = req.body || {};
    if (!userId) {
      return res.status(400).json({ success: false, message: '사용자 식별자가 필요합니다.' });
    }

    // Role-based security validation for admin-only achievements and custom frames
    const isAdmin =
      role === 'ADMIN' ||
      role === 'SUPER_ADMIN' ||
      role === 'SERVICE_OWNER' ||
      (typeof role === 'string' && role.endsWith('_MANAGER'));
    if (achievementId && (achievementId.startsWith('badge_admin_') || achievementId.includes('admin') || achievementId.startsWith('custom_frame_'))) {
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: '관리자 전용 업적 및 커스텀 프레임은 관리자 권한을 가진 사용자만 장착할 수 있습니다.',
        });
      }
    }

    return res.json({
      success: true,
      achievementId: achievementId || null,
      message: achievementId
        ? '프로필 장식이 성공적으로 적용되었습니다.'
        : '기본 장식으로 복원되었습니다.',
    });
  });

  // API Update Email (Service Owner / Admin)
  app.post('/api/me/email', (req, res) => {
    const { userId, email, role } = req.body || {};
    if (!userId || !email) {
      return res.status(400).json({ success: false, message: '사용자 ID와 새로운 이메일 주소가 필요합니다.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const isServiceOwner = role === 'SUPER_ADMIN' || role === 'SERVICE_OWNER';
    if (!isServiceOwner) {
      return res.status(403).json({ success: false, message: '이메일 변경은 총괄 관리자만 가능합니다.' });
    }

    // Update in adminCredentialsStore if exists
    for (const [key, admin] of Object.entries(adminCredentialsStore)) {
      if (admin.id === userId || key.toLowerCase() === cleanEmail) {
        admin.email = cleanEmail;
        adminCredentialsStore[cleanEmail] = admin;
      }
    }

    return res.json({
      success: true,
      email: cleanEmail,
      message: '이메일이 성공적으로 변경되었습니다.',
    });
  });

  // API Update Achievement Title (Admin only, Requirement 16)
  app.post('/api/achievements/:id/title', (req, res) => {
    const { id } = req.params;
    const { title, role } = req.body || {};
    if (!id || !title || !title.trim()) {
      return res.status(400).json({ success: false, message: '업적 ID와 새로운 명칭이 필요합니다.' });
    }
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    badgeTitleOverrides[id] = title.trim();
    return res.json({ success: true, id, title: title.trim() });
  });

  // API Get Custom Frames
  app.get('/api/me/custom-frames', (_req, res) => {
    return res.json({ success: true, frames: customFramesStore });
  });

  // API Save Custom Frame (Admin only, Requirement 28)
  app.post('/api/me/custom-frames', (req, res) => {
    const { frame, role } = req.body || {};
    if (!frame || !frame.id || !frame.name) {
      return res.status(400).json({ success: false, message: '유효한 커스텀 프레임 데이터가 필요합니다.' });
    }
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    const idx = customFramesStore.findIndex((f) => f.id === frame.id);
    if (idx >= 0) {
      customFramesStore[idx] = { ...frame, updatedAt: new Date().toISOString() };
    } else {
      customFramesStore.push({ ...frame, createdAt: new Date().toISOString() });
    }
    return res.json({ success: true, frame });
  });

  // API Delete Custom Frame (Admin only)
  app.delete('/api/me/custom-frames/:id', (req, res) => {
    const { id } = req.params;
    const { role } = req.body || {};
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    const idx = customFramesStore.findIndex((f) => f.id === id);
    if (idx >= 0) {
      customFramesStore.splice(idx, 1);
    }
    return res.json({ success: true, id });
  });

  // API Public Profile for User Preview & Profile Showcase (Requirement 14, 19)
  app.get('/api/users/:userId/public-profile', (req, res) => {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
    }

    // Look for matching user in userProfilesStore or adminCredentialsStore
    let foundUser: any = null;
    for (const [key, profile] of Object.entries(userProfilesStore)) {
      if (profile && (profile.id === userId || key === userId)) {
        foundUser = { ...profile };
        break;
      }
    }

    if (!foundUser) {
      for (const [email, admin] of Object.entries(adminCredentialsStore)) {
        if (admin && (admin.id === userId || email === userId)) {
          const rawAdmin = admin as any;
          foundUser = {
            id: rawAdmin.id,
            name: rawAdmin.name,
            nickname: rawAdmin.nickname,
            role: rawAdmin.role,
            avatar: rawAdmin.avatar,
            bio: rawAdmin.bio,
            createdAt: rawAdmin.createdAt,
            equippedAchievementId: rawAdmin.equippedAchievementId,
          };
          break;
        }
      }
    }

    // If user found in server memory, sanitize to return only public safe profile fields
    if (foundUser) {
      const isSuperAdmin = foundUser.role === 'SUPER_ADMIN';
      const isAdmin = foundUser.role === 'ADMIN' || isSuperAdmin;
      return res.json({
        success: true,
        user: {
          id: foundUser.id || userId,
          name: foundUser.name || '학습자',
          nickname: foundUser.nickname || (foundUser.name ? `@${foundUser.name.toLowerCase().replace(/\s+/g, '')}` : undefined),
          role: foundUser.role || 'USER',
          avatar: foundUser.avatar || undefined,
          bio: foundUser.bio || undefined,
          equippedAchievementId: foundUser.equippedAchievementId || (isAdmin ? 'badge_admin_rainbow_crest' : null),
          createdAt: foundUser.createdAt || undefined,
        },
      });
    }

    // Return friendly 404 response
    return res.status(404).json({
      success: false,
      message: '프로필 정보를 찾을 수 없습니다.',
    });
  });

  // Helper: Resolve authenticated user from Authorization header or active sessions
  function getAuthenticatedUser(req: express.Request): ActiveSession | null {
    const authHeader = (req.headers['authorization'] || '') as string;
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';

    if (token && activeSessions.has(token)) {
      const session = activeSessions.get(token)!;
      const customProfile = userProfilesStore[session.email] || userProfilesStore[session.id] || {};
      const adminAcc = adminCredentialsStore[session.email];
      return {
        ...session,
        name: customProfile.name || adminAcc?.name || session.name,
        role: customProfile.role || adminAcc?.role || session.role,
      };
    }

    // Token fallback inspection for admin session tokens
    if (token && (token.startsWith('tdsnt_jwt_sa_') || token.startsWith('tdsnt_jwt_'))) {
      const actorEmail = (((req.headers['x-actor-email'] || req.headers['x-user-email']) as string) || '').toLowerCase().trim();
      const actorId = ((req.headers['x-actor-id'] || req.headers['x-user-id']) as string) || '';

      for (const [email, admin] of Object.entries(adminCredentialsStore)) {
        if ((actorEmail && email === actorEmail) || (actorId && admin.id === actorId)) {
          const custom = userProfilesStore[email] || userProfilesStore[admin.id] || {};
          return {
            id: admin.id,
            email: admin.email,
            name: custom.name || admin.name,
            role: custom.role || admin.role,
            createdAt: Date.now(),
          };
        }
      }

      // Default fallback for primary owner if no actor header
      const defaultAdmin = adminCredentialsStore['teamdevstudiont@gmail.com'];
      if (defaultAdmin && token.startsWith('tdsnt_jwt_sa_')) {
        const custom = userProfilesStore['teamdevstudiont@gmail.com'] || userProfilesStore[defaultAdmin.id] || {};
        return {
          id: defaultAdmin.id,
          email: defaultAdmin.email,
          name: custom.name || defaultAdmin.name,
          role: custom.role || defaultAdmin.role,
          createdAt: Date.now(),
        };
      }
    }
    return null;
  }

  // API Get Admin List
  app.get('/api/auth/admins', (req, res) => {
    const list = ALLOWED_ADMIN_EMAILS.map((email) => {
      const acc = adminCredentialsStore[email];
      const custom = userProfilesStore[email] || (acc ? userProfilesStore[acc.id] : {}) || {};
      return {
        id: acc?.id || `admin_${email}`,
        name: custom.name || acc?.name || email,
        email,
        role: custom.role || acc?.role || 'SERVICE_OWNER',
        status: custom.status || acc?.status || 'active',
        createdAt: acc?.createdAt || '2026-01-01T00:00:00.000Z',
      };
    });
    return res.json({ success: true, admins: list });
  });

  // API Admin Audit Logs endpoint
  app.get('/api/admin/audit-logs', (req, res) => {
    return res.json({ success: true, logs: serverAuditLogs });
  });

  // Strict Server-Side RBAC Admin Role/TAG Update Endpoint (Requirements 5, 6, 7, 8, 9, 10)
  const handleAdminRoleUpdate = (req: express.Request, res: express.Response) => {
    const { userId } = req.params;
    const { role: newRole } = req.body || {};

    // 1. Verify Requester Authentication
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다. 관리자 계정으로 로그인 후 다시 시도해주세요.',
      });
    }

    // 2. Strict Role Check: ONLY SERVICE_OWNER (or legacy SUPER_ADMIN) is allowed
    const isOwner = authUser.role === 'SERVICE_OWNER' || authUser.role === 'SUPER_ADMIN';
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: '관리자 직책을 변경할 권한이 없습니다. (오직 서비스 총괄만 변경할 수 있습니다)',
      });
    }

    // 3. Strict Self-Modification Prohibition (Requirement 5)
    if (userId === authUser.id || (authUser.email && userId.toLowerCase() === authUser.email.toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: '본인의 관리자 직책은 직접 변경할 수 없습니다.',
      });
    }

    // 4. Strict Whitelist/Enum Validation (Requirement 7)
    if (!newRole || !ALLOWED_ROLE_TAGS.includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: `유효하지 않은 직책(TAG)입니다. 허용되는 직책: ${ALLOWED_ROLE_TAGS.join(', ')}`,
      });
    }

    // 5. Lookup Target User
    let targetProfile = userProfilesStore[userId];
    let targetAdminAcc: AdminCredential | null = null;

    for (const [email, admin] of Object.entries(adminCredentialsStore)) {
      if (admin.id === userId || email.toLowerCase() === userId.toLowerCase()) {
        targetAdminAcc = admin;
        break;
      }
    }

    const targetEmail = (targetAdminAcc?.email || targetProfile?.email || '').toLowerCase();
    const targetName = targetProfile?.name || targetAdminAcc?.name || userId;

    // Protection for root and all authorized admin accounts
    if (ALLOWED_ADMIN_EMAILS.includes(targetEmail)) {
      if (newRole === 'USER') {
        return res.status(400).json({
          success: false,
          message: '시스템 최고 관리자 계정은 일반 수강생(USER)으로 권한을 강등하거나 박탈할 수 없습니다.',
        });
      }
      if (targetEmail === 'teamdevstudiont@gmail.com' && newRole !== 'SERVICE_OWNER' && newRole !== 'SUPER_ADMIN') {
        return res.status(400).json({
          success: false,
          message: '시스템 최상위 총괄 계정은 총괄 직책을 유지해야 합니다.',
        });
      }
    }

    const oldRole = targetProfile?.role || targetAdminAcc?.role || 'USER';

    // 6. Apply role update on server store
    if (!userProfilesStore[userId]) {
      userProfilesStore[userId] = {
        id: userId,
        name: targetName,
        email: targetEmail,
      };
    }
    userProfilesStore[userId].role = newRole;

    if (targetEmail) {
      if (!userProfilesStore[targetEmail]) {
        userProfilesStore[targetEmail] = { ...userProfilesStore[userId] };
      }
      userProfilesStore[targetEmail].role = newRole;
    }

    if (targetAdminAcc) {
      targetAdminAcc.role = newRole;
    }

    // Also update any active session tokens for the target user
    for (const session of activeSessions.values()) {
      if (session.id === userId || (targetEmail && session.email === targetEmail)) {
        session.role = newRole;
      }
    }

    // 7. Record Audit Log (Requirement 10)
    const auditLogEntry = {
      id: `audit_role_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      actorId: authUser.id,
      actorName: authUser.name || '서비스 총괄',
      targetUserId: userId,
      targetUserName: targetName,
      action: 'UPDATE_ROLE',
      details: `관리자 직책 변경 (${oldRole} → ${newRole})`,
      timestamp: new Date().toISOString(),
    };
    serverAuditLogs.unshift(auditLogEntry);

    console.log(
      `[RBAC Audit] TAG Changed: target=${targetName}(${userId}) old=${oldRole} new=${newRole} by actor=${authUser.name}(${authUser.id})`
    );

    return res.json({
      success: true,
      message: `${targetName}님의 관리자 직책이 [${newRole}]으로 성공적으로 변경되었습니다.`,
      user: {
        id: userId,
        name: targetName,
        email: targetEmail,
        role: newRole,
      },
      auditLog: auditLogEntry,
    });
  };

  app.patch('/api/admin/users/:userId/role', handleAdminRoleUpdate);
  app.post('/api/admin/users/:userId/role', handleAdminRoleUpdate);

  // API Auth Register Endpoint
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, agreements } = req.body || {};
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ success: false, message: '성명은 2자 이상이어야 합니다.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: '올바른 이메일 주소를 입력해주세요.' });
    }

    // Strictly enforce Google (@gmail.com), Naver (@naver.com), and Kakao (@kakao.com, @daum.net, @hanmail.net) only
    const isAllowedEmailDomain =
      cleanEmail.endsWith('@gmail.com') ||
      cleanEmail.endsWith('@naver.com') ||
      cleanEmail.endsWith('@kakao.com') ||
      cleanEmail.endsWith('@daum.net') ||
      cleanEmail.endsWith('@hanmail.net');

    if (!isAllowedEmailDomain) {
      return res.status(400).json({
        success: false,
        message: '회원가입은 구글(@gmail.com), 네이버(@naver.com), 카카오(@kakao.com) 이메일 주소만 가능합니다.',
      });
    }

    if (ALLOWED_ADMIN_EMAILS.includes(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: '해당 이메일은 이미 등록된 시스템 최고 관리자 계정입니다. 관리자 로그인을 진행해 주십시오.',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: '비밀번호는 최소 6자 이상이어야 합니다.' });
    }

    if (!agreements?.terms || !agreements?.privacy) {
      return res.status(400).json({ success: false, message: '운영 규정과 개인정보 수집·이용에 동의해야 가입할 수 있습니다.' });
    }

    // Strictly enforce USER (student) role for registrations (no dummy avatar)
    const now = new Date().toISOString();
    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: cleanName,
      email: cleanEmail,
      role: 'USER',
      status: 'active',
      createdAt: now,
      agreements: { terms: now, privacy: now },
    };

    const token = `tdsnt_jwt_usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    return res.json({ success: true, user: newUser, token });
  });

  // API Learning Progress Endpoints
  app.get('/api/progress', (req, res) => {
    const userId = (req.query.userId as string) || '';
    const courseId = (req.query.courseId as string) || '';

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId가 필요합니다.' });
    }

    const userProgresses = serverProgressStore[userId] || [];
    const filtered = courseId
      ? userProgresses.filter((p: any) => p.courseId === courseId)
      : userProgresses;

    return res.json({
      success: true,
      progresses: filtered,
      enrollments: serverEnrollmentStore[userId] || [],
    });
  });

  app.post('/api/progress/update', (req, res) => {
    const { userId, courseId, lessonId, watchedSeconds, totalSeconds, isCompleted } = req.body || {};

    if (!userId || !courseId || !lessonId) {
      return res.status(400).json({ success: false, message: '필수 파라미터가 누락되었습니다.' });
    }

    if (!serverProgressStore[userId]) {
      serverProgressStore[userId] = [];
    }

    const list = serverProgressStore[userId];
    const existingIdx = list.findIndex((p: any) => p.lessonId === lessonId);
    const now = new Date().toISOString();

    const record = {
      id: existingIdx >= 0 ? list[existingIdx].id : `prog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      courseId,
      lessonId,
      watchedSeconds: Math.max(0, watchedSeconds || 0),
      totalSeconds: Math.max(0, totalSeconds || 0),
      isCompleted: !!isCompleted,
      lastWatchedAt: now,
    };

    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.push(record);
    }

    return res.json({
      success: true,
      progress: record,
    });
  });

  app.post('/api/progress/sync', (req, res) => {
    const { userId, progresses } = req.body || {};

    if (!userId || !Array.isArray(progresses)) {
      return res.status(400).json({ success: false, message: '잘못된 동기화 데이터입니다.' });
    }

    if (!serverProgressStore[userId]) {
      serverProgressStore[userId] = [];
    }

    const currentList = serverProgressStore[userId];
    progresses.forEach((incoming: any) => {
      const idx = currentList.findIndex((p: any) => p.lessonId === incoming.lessonId);
      if (idx >= 0) {
        currentList[idx] = { ...currentList[idx], ...incoming };
      } else {
        currentList.push(incoming);
      }
    });

    return res.json({
      success: true,
      syncedCount: progresses.length,
    });
  });

  // ==========================================
  // REAL VIDEO UPLOAD & STREAMING API (HTTP RANGE & CHUNKED SLICING)
  // ==========================================

  // 1-A. Chunked Upload Session Initialization (Prevents HTTP 413)
  app.post('/api/videos/upload/init', (req, res) => {
    try {
      const { filename, fileSize, totalChunks, mimeType } = req.body || {};
      const cleanFilename = path.basename(filename || 'video.mp4');
      const ext = path.extname(cleanFilename).toLowerCase() || '.mp4';
      const sizeNum = Number(fileSize) || 0;

      // 1. Format pre-validation: only MP4, MOV, WebM allowed
      const isAllowedExt = ALLOWED_VIDEO_EXTS.includes(ext);
      const isAllowedMime = mimeType ? ALLOWED_VIDEO_MIMES.includes(mimeType) : false;
      if (!isAllowedExt && !isAllowedMime) {
        return res.status(400).json({
          success: false,
          message: '지원하지 않는 파일 형식입니다. 강의 자료는 MP4, MOV, WebM 형식만 업로드할 수 있습니다.',
        });
      }

      // 2. Size limit pre-validation: max 100MB
      if (sizeNum > MAX_VIDEO_FILE_SIZE) {
        const formattedMB = (sizeNum / (1024 * 1024)).toFixed(1);
        return res.status(400).json({
          success: false,
          message: `파일 용량이 100MB 제한을 초과했습니다. (요청 파일 크기: ${formattedMB}MB / 제한: 100MB)`,
        });
      }

      if (sizeNum <= 0) {
        return res.status(400).json({
          success: false,
          message: '파일 크기가 0바이트입니다. 정상적인 동영상 파일을 선택해주세요.',
        });
      }

      const uploadId = `upl_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const uploadDir = path.join(CHUNKS_TEMP_DIR, uploadId);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(uploadDir, 'metadata.json'),
        JSON.stringify({
          uploadId,
          filename: cleanFilename,
          ext,
          fileSize: sizeNum,
          totalChunks: Number(totalChunks) || 1,
          mimeType: mimeType || 'video/mp4',
          createdAt: new Date().toISOString(),
        })
      );

      return res.json({
        success: true,
        uploadId,
        message: '분할 업로드 세션이 초기화되었습니다.',
      });
    } catch (err: any) {
      console.error('Upload init error:', err);
      return res.status(500).json({ success: false, message: '분할 업로드 세션 초기화에 실패했습니다.' });
    }
  });

  // 1-B. Upload Individual Sliced Video Chunk
  app.post('/api/videos/upload/chunk', (req, res) => {
    chunkUpload.single('chunk')(req, res, (err: any) => {
      if (err) {
        console.error('Multer chunk upload error:', err);
        return res.status(400).json({
          success: false,
          message: err?.message || '청크 파일 전송 처리 중 오류가 발생했습니다.',
        });
      }

      try {
        const uploadId = (
          (req.query?.uploadId || req.headers['x-upload-id'] || req.body?.uploadId || '') as string
        ).replace(/[^a-zA-Z0-9_-]/g, '');
        const chunkIndex = parseInt(
          (req.query?.chunkIndex ?? req.headers['x-chunk-index'] ?? req.body?.chunkIndex ?? '0') as string,
          10
        );
        const totalChunks = parseInt(
          (req.query?.totalChunks ?? req.headers['x-total-chunks'] ?? req.body?.totalChunks ?? '1') as string,
          10
        );

        if (!uploadId || isNaN(chunkIndex)) {
          return res.status(400).json({ success: false, message: '업로드 ID 및 청크 번호가 필요합니다.' });
        }

        const uploadDir = path.join(CHUNKS_TEMP_DIR, uploadId);
        const chunkPath = path.join(uploadDir, `chunk_${chunkIndex}`);
        if (!fs.existsSync(chunkPath)) {
          return res.status(500).json({
            success: false,
            message: `청크 #${chunkIndex + 1} 파일 저장 실패`,
          });
        }

        return res.json({
          success: true,
          uploadId,
          chunkIndex,
          totalChunks,
          received: true,
        });
      } catch (err: any) {
        console.error('Chunk upload processing error:', err);
        return res.status(500).json({ success: false, message: err?.message || '청크 업로드 처리 중 오류 발생' });
      }
    });
  });

  // 1-C. Complete and Assemble All Chunks into Final Video File
  app.post('/api/videos/upload/complete', async (req, res) => {
    try {
      const { uploadId, filename, totalChunks, mimeType, durationSeconds } = req.body || {};
      const safeUploadId = (uploadId || '').replace(/[^a-zA-Z0-9_-]/g, '');
      const uploadDir = path.join(CHUNKS_TEMP_DIR, safeUploadId);

      if (!safeUploadId || !fs.existsSync(uploadDir)) {
        return res.status(404).json({ success: false, message: '업로드 세션을 찾을 수 없거나 이미 완료/만료되었습니다.' });
      }

      const chunkCount = parseInt(String(totalChunks), 10);
      const cleanFilename = path.basename(filename || 'video.mp4');
      const ext = path.extname(cleanFilename).toLowerCase() || '.mp4';
      const videoId = `vid_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const targetFilename = `${videoId}${ext}`;
      const targetFilePath = path.join(UPLOADS_DIR, targetFilename);

      // Verify all chunk files exist
      for (let i = 0; i < chunkCount; i++) {
        const chunkPath = path.join(uploadDir, `chunk_${i}`);
        if (!fs.existsSync(chunkPath)) {
          return res.status(400).json({
            success: false,
            message: `청크 #${i + 1}/${chunkCount} 누락됨. 다시 업로드해주세요.`,
          });
        }
      }

      // Merge all chunks sequentially into the final target file
      if (fs.existsSync(targetFilePath)) {
        try {
          fs.unlinkSync(targetFilePath);
        } catch {}
      }

      for (let i = 0; i < chunkCount; i++) {
        const chunkPath = path.join(uploadDir, `chunk_${i}`);
        const chunkData = fs.readFileSync(chunkPath);
        fs.appendFileSync(targetFilePath, chunkData);
      }

      // Clean up temp chunk directory
      try {
        fs.rmSync(uploadDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Failed to clean temp upload directory:', e);
      }

      const stats = fs.statSync(targetFilePath);
      if (stats.size > MAX_VIDEO_FILE_SIZE) {
        try { fs.unlinkSync(targetFilePath); } catch {}
        return res.status(400).json({
          success: false,
          message: '병합된 파일 크기가 100MB 제한을 초과했습니다.',
        });
      }
      const finalMime = mimeType || 'video/mp4';
      const storagePath = `videos/${targetFilename}`;
      const cloudUrl = await moveToCloudStorage(targetFilePath, storagePath, finalMime);
      const streamingUrl = cloudUrl || `/api/videos/stream/${targetFilename}`;

      const record: ServerVideoRecord = {
        video_id: videoId,
        file_name: cleanFilename,
        video_url: streamingUrl,
        ...(cloudUrl ? { storage_path: storagePath } : {}),
        thumbnail_url: (req.body?.thumbnailUrl as string) || undefined,
        file_size: stats.size,
        mime_type: finalMime,
        duration_seconds: Number(durationSeconds) || undefined,
        uploaded_at: new Date().toISOString(),
        uploaded_by: (req.body?.uploadedBy as string) || undefined,
        status: 'ready',
      };

      await saveVideoToDatabase(record);

      return res.json({
        success: true,
        video: record,
        message: '동영상 파일이 서버 스토리지 및 DB에 안전하게 저장되어 처리 완료되었습니다.',
      });
    } catch (err: any) {
      console.error('Upload complete error:', err);
      return res.status(500).json({ success: false, message: err?.message || '동영상 청크 병합 중 오류가 발생했습니다.' });
    }
  });

  // 1-D. Cancel Chunked Upload & Clean Up Temporary Chunk Data
  app.post('/api/videos/upload/cancel', (req, res) => {
    try {
      const { uploadId } = req.body || {};
      const safeUploadId = (uploadId || '').replace(/[^a-zA-Z0-9_-]/g, '');
      let cleaned = false;
      if (safeUploadId) {
        const uploadDir = path.join(CHUNKS_TEMP_DIR, safeUploadId);
        if (fs.existsSync(uploadDir)) {
          fs.rmSync(uploadDir, { recursive: true, force: true });
          cleaned = true;
          console.log(`[Upload] Cancelled upload session ${safeUploadId} and purged temporary chunk files.`);
        }
      }
      return res.json({
        success: true,
        cleaned,
        message: '진행 중인 업로드가 취소되었으며 서버의 임시 청크 데이터가 정리되었습니다.',
      });
    } catch (err: any) {
      console.error('Cancel upload error:', err);
      return res.json({ success: true, message: '업로드 세션 정리 완료' });
    }
  });

  // 1-F. Check if duplicate video filename already exists
  app.get('/api/videos/check-duplicate', (req, res) => {
    try {
      const rawName = String(req.query.filename || '').trim();
      if (!rawName) {
        return res.json({ isDuplicate: false });
      }

      const cleanFilename = path.basename(rawName);

      // Check server video in-memory store
      const existingMeta = Object.values(serverVideoStore).find(
        (v) => v.file_name?.toLowerCase() === cleanFilename.toLowerCase() ||
               path.basename(v.video_url || '').toLowerCase() === cleanFilename.toLowerCase()
      );

      if (existingMeta) {
        return res.json({
          isDuplicate: true,
          existingVideo: {
            id: existingMeta.video_id,
            filename: existingMeta.file_name,
            originalName: existingMeta.file_name,
            size: existingMeta.file_size,
            createdAt: existingMeta.uploaded_at,
          },
          message: '동일한 파일명의 영상이 이미 서버에 등록되어 있습니다.',
        });
      }

      // Check disk storage in uploads directory
      const filePath = path.join(UPLOADS_DIR, cleanFilename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return res.json({
          isDuplicate: true,
          existingVideo: {
            filename: cleanFilename,
            originalName: cleanFilename,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
          },
          message: '동일한 파일명의 영상 파일이 이미 보관소에 존재합니다.',
        });
      }

      return res.json({ isDuplicate: false });
    } catch (err: any) {
      console.error('Check duplicate error:', err);
      return res.json({ isDuplicate: false });
    }
  });

  // 1-E. Direct Single-Shot Upload Video File (Fallback for small files)
  app.post('/api/videos/upload', (req, res) => {
    videoUpload.single('file')(req, res, async (err: any) => {
      if (err) {
        console.error('Direct video upload error:', err);
        let errorMsg = err?.message || '동영상 파일 업로드에 실패했습니다.';
        if (err.code === 'LIMIT_FILE_SIZE') {
          errorMsg = '파일 용량이 100MB 제한을 초과했습니다.';
        }
        return res.status(400).json({
          success: false,
          message: errorMsg,
        });
      }

      try {
        if (!req.file) {
          return res.status(400).json({ success: false, message: '업로드할 동영상 파일이 없습니다.' });
        }

        const file = req.file;
        const videoId = path.basename(file.filename, path.extname(file.filename));
        const mimeType = file.mimetype || 'video/mp4';
        const storagePath = `videos/${file.filename}`;
        const cloudUrl = await moveToCloudStorage(file.path, storagePath, mimeType);
        const streamingUrl = cloudUrl || `/api/videos/stream/${file.filename}`;

        const record: ServerVideoRecord = {
          video_id: videoId,
          file_name: file.originalname,
          video_url: streamingUrl,
          ...(cloudUrl ? { storage_path: storagePath } : {}),
          thumbnail_url: (req.body?.thumbnailUrl as string) || undefined,
          file_size: file.size,
          mime_type: mimeType,
          duration_seconds: req.body?.durationSeconds ? Number(req.body.durationSeconds) : undefined,
          uploaded_at: new Date().toISOString(),
          uploaded_by: (req.body?.uploadedBy as string) || undefined,
          status: 'ready',
        };

        await saveVideoToDatabase(record);

        return res.json({
          success: true,
          video: record,
          message: '동영상 파일이 서버 스토리지 및 DB에 안전하게 업로드되었습니다.',
        });
      } catch (innerErr: any) {
        console.error('Video upload processing error:', innerErr);
        return res.status(500).json({ success: false, message: innerErr?.message || '동영상 업로드 중 오류가 발생했습니다.' });
      }
    });
  });

  // 2. Video Stream with Full HTTP Range Request Support (RFC 7233 compliant)
  app.get('/api/videos/stream/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(UPLOADS_DIR, path.basename(filename));

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: '요청한 동영상 파일을 찾을 수 없습니다.' });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      // Determine Content-Type based on extension
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'video/mp4';
      if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.mov') contentType = 'video/quicktime';
      else if (ext === '.m4v') contentType = 'video/x-m4v';
      else if (ext === '.mkv') contentType = 'video/x-matroska';
      else if (ext === '.avi') contentType = 'video/x-msvideo';

      // Set standard media headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Accept-Ranges', 'bytes');

      if (range && range.startsWith('bytes=')) {
        const rawRange = range.replace(/^bytes=/, '').trim();
        let start: number;
        let end: number;

        if (rawRange.startsWith('-')) {
          // Suffix byte range: e.g. bytes=-500 (request last 500 bytes for MP4 moov atom inspection)
          const suffixLength = parseInt(rawRange.substring(1), 10);
          if (isNaN(suffixLength) || suffixLength <= 0) {
            res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
            return;
          }
          start = Math.max(0, fileSize - suffixLength);
          end = fileSize - 1;
        } else {
          // Standard byte range: e.g. bytes=0-1048576 or bytes=1048576-
          const parts = rawRange.split('-');
          start = parseInt(parts[0], 10);
          end = parts[1] && parts[1].trim() !== '' ? parseInt(parts[1], 10) : fileSize - 1;
        }

        if (isNaN(start) || isNaN(end) || start < 0 || start >= fileSize || start > end) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
          return;
        }

        // Clamp end byte index
        end = Math.min(end, fileSize - 1);
        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': chunkSize,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        };

        res.writeHead(206, head);
        fileStream.on('error', (streamErr) => {
          console.warn('Video stream chunk pipe warning:', streamErr);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });
        fileStream.pipe(res);
      } else {
        // No range requested: stream entire file
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        };

        res.writeHead(200, head);
        const fileStream = fs.createReadStream(filePath);
        fileStream.on('error', (streamErr) => {
          console.warn('Video full stream pipe warning:', streamErr);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });
        fileStream.pipe(res);
      }
    } catch (err: any) {
      console.error('Video streaming error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: '동영상 스트리밍 중 오류가 발생했습니다.' });
      }
    }
  });

  // 3. Video List & Single Video API
  app.get('/api/videos', async (_req, res) => {
    try {
      // Sync with Firestore for latest uploads across all devices
      try {
        const snap = await getDocs(collection(fbDb, 'videos'));
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as ServerVideoRecord;
          if (data && data.video_id) {
            serverVideoStore[data.video_id] = data;
            const fn = path.basename(data.video_url || '');
            if (fn) serverVideoStore[fn] = data;
          }
        });
      } catch (fsErr) {
        console.warn('[Video] GET /api/videos Firestore read error (using local manifest):', fsErr);
      }

      const uniqueMap = new Map<string, ServerVideoRecord>();
      Object.values(serverVideoStore).forEach((v) => {
        if (v && v.video_id && v.video_url) {
          uniqueMap.set(v.video_id, v);
        }
      });

      const videos = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime()
      );

      return res.json({
        success: true,
        videos,
      });
    } catch (err: any) {
      console.error('Failed to get videos list:', err);
      return res.status(500).json({ success: false, message: '영상 목록 조회에 실패했습니다.' });
    }
  });

  app.get('/api/videos/:id', async (req, res) => {
    try {
      const id = req.params.id;
      let video = serverVideoStore[id];
      if (!video) {
        try {
          const snap = await getDoc(doc(fbDb, 'videos', id));
          if (snap.exists()) {
            video = snap.data() as ServerVideoRecord;
            serverVideoStore[id] = video;
          }
        } catch {}
      }

      if (!video) {
        return res.status(404).json({ success: false, message: '요청한 영상을 찾을 수 없습니다.' });
      }

      return res.json({ success: true, video });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: '영상 조회 실패' });
    }
  });

  // 4. Delete Video API (Removes from both disk storage and Firestore DB)
  app.delete('/api/videos/:id', async (req, res) => {
    try {
      const id = req.params.id;
      await deleteVideoFromDatabase(id);
      return res.json({
        success: true,
        message: '동영상이 서버 스토리지 및 DB에서 완전히 삭제되었습니다.',
      });
    } catch (err: any) {
      console.error('Delete video error:', err);
      return res.status(500).json({ success: false, message: '동영상 삭제 중 오류가 발생했습니다.' });
    }
  });

  // Helper: Extract YouTube Video ID
  function extractYouTubeVideoId(url?: string): string | null {
    if (!url || typeof url !== 'string') return null;
    const match = url.trim().match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    );
    return match && match[1] ? match[1] : null;
  }

  // Helper: Parse ISO 8601 Duration (e.g. PT9M37S, PT1H2M30S)
  function parseISO8601Duration(durationStr?: string): number | null {
    if (!durationStr || typeof durationStr !== 'string') return null;
    const match = durationStr.trim().match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
    if (!match) return null;
    const days = parseInt(match[1] || '0', 10);
    const hours = parseInt(match[2] || '0', 10);
    const minutes = parseInt(match[3] || '0', 10);
    const seconds = parseFloat(match[4] || '0');
    const total = Math.round(days * 86400 + hours * 3600 + minutes * 60 + seconds);
    return total > 0 ? total : null;
  }

  // YouTube Metadata & Duration Retrieval Endpoint
  app.all('/api/youtube/video-info', async (req, res) => {
    const rawInput = (req.query.url as string) || (req.query.videoId as string) || req.body?.url || req.body?.videoId;
    if (!rawInput) {
      return res.status(400).json({ success: false, message: 'URL 또는 videoId를 입력해주세요.' });
    }

    const videoId = extractYouTubeVideoId(rawInput) || (/^[a-zA-Z0-9_-]{11}$/.test(rawInput.trim()) ? rawInput.trim() : null);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: '유효한 YouTube 영상 ID 또는 링크 형식이 아닙니다.',
      });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`;

    // 1. Try YouTube Data API v3 if API key exists
    if (apiKey) {
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status&id=${videoId}&key=${apiKey}`;
        const fetchRes = await fetch(apiUrl);
        if (fetchRes.ok) {
          const apiData = await fetchRes.json();
          const item = apiData.items?.[0];
          if (item) {
            const isEmbeddable = item.status?.embeddable !== false;
            const privacyStatus = item.status?.privacyStatus;
            if (privacyStatus === 'private' || !isEmbeddable) {
              return res.json({
                success: false,
                valid: false,
                videoId,
                durationSeconds: null,
                durationStatus: 'UNAVAILABLE',
                message: '비공개이거나 외부 임베드가 제한된 YouTube 동영상입니다.',
              });
            }

            const rawDuration = item.contentDetails?.duration;
            const durationSeconds = parseISO8601Duration(rawDuration);
            const title = item.snippet?.title || '';
            const channelTitle = item.snippet?.channelTitle || '';
            const thumbnail =
              item.snippet?.thumbnails?.maxres?.url ||
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.medium?.url ||
              `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

            return res.json({
              success: true,
              valid: true,
              videoId,
              durationSeconds,
              durationStatus: durationSeconds ? 'READY' : 'PENDING',
              title,
              channelTitle,
              thumbnailUrl: thumbnail,
              embedUrl,
              message: durationSeconds ? 'YouTube 영상 메타데이터를 성공적으로 확인했습니다.' : '재생시간 확인 중',
            });
          } else {
            return res.status(404).json({
              success: false,
              valid: false,
              videoId,
              durationSeconds: null,
              durationStatus: 'FAILED',
              message: '존재하지 않거나 삭제된 YouTube 영상입니다.',
            });
          }
        }
      } catch (e: any) {
        console.warn('YouTube Data API fetch error, falling back to oEmbed:', e?.message);
      }
    }

    // 2. Fallback: oEmbed API verification
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const oembedRes = await fetch(oembedUrl);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        return res.json({
          success: true,
          valid: true,
          videoId,
          durationSeconds: null,
          durationStatus: 'PENDING',
          title: oembedData.title || '',
          authorName: oembedData.author_name || '',
          thumbnailUrl: oembedData.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          embedUrl,
          message: '유효한 YouTube 영상입니다. 재생 시 실제 재생시간이 자동 동기화됩니다.',
        });
      } else if (oembedRes.status === 404) {
        return res.status(404).json({
          success: false,
          valid: false,
          videoId,
          durationSeconds: null,
          durationStatus: 'FAILED',
          message: '존재하지 않거나 비공개 처리된 YouTube 영상입니다.',
        });
      }
    } catch (e: any) {
      console.warn('YouTube oEmbed fetch error:', e?.message);
    }

    // Standard fallback response
    return res.json({
      success: true,
      valid: true,
      videoId,
      durationSeconds: null,
      durationStatus: 'PENDING',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      embedUrl,
      message: 'YouTube 링크 형식이 확인되었습니다. 재생 시 실제 재생시간을 동기화합니다.',
    });
  });

  // 4. Validate Video URL (Supports direct MP4/WebM and YouTube Embed)
  app.post('/api/videos/validate-url', async (req, res) => {
    const { url } = req.body || {};
    const cleanUrl = (url || '').trim();

    if (!cleanUrl) {
      return res.status(400).json({ success: false, message: 'URL을 입력해주세요.' });
    }

    // Check YouTube URL patterns
    const videoId = extractYouTubeVideoId(cleanUrl);
    if (videoId) {
      const apiKey = process.env.YOUTUBE_API_KEY;
      let durationSeconds: number | null = null;
      let durationStatus = 'PENDING';
      let title = '';

      if (apiKey) {
        try {
          const fetchRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status&id=${videoId}&key=${apiKey}`
          );
          if (fetchRes.ok) {
            const apiData = await fetchRes.json();
            const item = apiData.items?.[0];
            if (item) {
              durationSeconds = parseISO8601Duration(item.contentDetails?.duration);
              title = item.snippet?.title || '';
              durationStatus = durationSeconds ? 'READY' : 'PENDING';
            }
          }
        } catch (e) {
          // ignore error
        }
      }

      return res.json({
        success: true,
        valid: true,
        type: 'youtube',
        videoId,
        durationSeconds,
        durationStatus,
        title,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`,
        message: durationSeconds ? '유효한 YouTube 영상 및 재생시간이 확인되었습니다.' : '유효한 YouTube 영상입니다.',
      });
    }

    // Check direct video file URL
    const isDirectVideo = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(cleanUrl) || cleanUrl.startsWith('/api/videos/stream/');
    if (isDirectVideo) {
      return res.json({
        success: true,
        valid: true,
        type: 'direct',
        url: cleanUrl,
        message: '유효한 동영상 스트리밍 링크입니다.',
      });
    }

    // Generic HTTP URL
    if (/^https?:\/\//i.test(cleanUrl)) {
      return res.json({
        success: true,
        valid: true,
        type: 'generic_stream',
        url: cleanUrl,
        message: '외부 스트리밍 URL이 확인되었습니다.',
      });
    }

    return res.status(400).json({
      success: false,
      valid: false,
      message: '지원하지 않거나 유효하지 않은 영상 URL입니다. (MP4/WebM 링크 또는 YouTube URL을 입력하세요)',
    });
  });

  // ==========================================
  // ANTI-CHEAT SERVER-SIDE WATCH TRACKING & COMPLETION VERIFICATION
  // ==========================================

  // 5. Watch Heartbeat Endpoint
  app.post('/api/progress/heartbeat', (req, res) => {
    const {
      userId,
      courseId,
      lessonId,
      currentPosition,
      interval, // [startSec, endSec] of recent 2-5 sec playback
      duration,
      requiredThresholdPercent = 90,
    } = req.body || {};

    if (!userId || !courseId || !lessonId) {
      return res.status(400).json({ success: false, message: '필수 파라미터가 누락되었습니다.' });
    }

    const sessionKey = `${userId}_${courseId}_${lessonId}`;
    const providedDuration = typeof duration === 'number' && duration > 0 ? Math.round(duration) : 0;
    const validCurrentPos = Math.max(0, typeof currentPosition === 'number' ? currentPosition : 0);

    let session = serverWatchSessions[sessionKey];
    if (!session) {
      session = {
        userId,
        courseId,
        lessonId,
        duration: providedDuration,
        intervals: [],
        uniqueWatchedSeconds: 0,
        uniquePercent: 0,
        isCompleted: false,
        lastPosition: validCurrentPos,
        lastUpdated: new Date().toISOString(),
      };
      serverWatchSessions[sessionKey] = session;
    }

    if (providedDuration > 0) {
      session.duration = providedDuration;
    }
    const prevPosition = session.lastPosition || 0;
    session.lastPosition = validCurrentPos;
    session.lastUpdated = new Date().toISOString();

    // The player only reports forward steps of at most 15 seconds inside the video. Anything else means
    // the request was crafted by hand, so repeated cases are reported as suspicious.
    if (Array.isArray(interval) && interval.length === 2 && session.duration > 0) {
      const [a, b] = interval.map(Number);
      const forged = !(b > a && b - a <= 15 && a >= 0) || b > session.duration + 5;
      if (forged && spoofedHeartbeats.hit(sessionKey) === 3) {
        const ip = clientIp(req); // read now: the socket is released once the response is sent
        lookupLabels(userId, courseId)
          .then(({ userLabel, courseLabel }) =>
            notifyDiscord({
              category: 'security',
              title: '⚠️ 이상 행동 감지',
              description: '정상 플레이어가 보내지 않는 시청 기록(진도 조작 의심)이 반복해서 들어왔습니다. 해당 기록은 진도에 반영되지 않았습니다.',
              fields: [
                { name: '사용자', value: userLabel },
                { name: '강의', value: courseLabel },
                { name: '차시 ID', value: String(lessonId) },
                { name: 'IP', value: ip },
              ],
              dedupeKey: `forged-heartbeat:${sessionKey}`,
            })
          )
          .catch(() => {});
      }
    }

    // Process interval if provided and legitimate
    if (Array.isArray(interval) && interval.length === 2 && session.duration > 0) {
      const [startSec, endSec] = interval;
      // Sanity check: max gap per heartbeat is 15 seconds to prevent spoofed single-jump heartbeats
      if (endSec > startSec && endSec - startSec <= 15 && startSec >= 0) {
        const { merged, totalUnique } = mergeWatchedIntervals(
          session.intervals,
          [startSec, endSec],
          session.duration
        );
        session.intervals = merged;
        session.uniqueWatchedSeconds = totalUnique;
      }
    } else if (session.duration > 0 && validCurrentPos > 0) {
      // Fallback continuous tracking if interval tuple was omitted
      if (session.uniqueWatchedSeconds === 0) {
        session.uniqueWatchedSeconds = Math.min(session.duration, validCurrentPos);
      } else if (validCurrentPos > prevPosition && validCurrentPos - prevPosition <= 15) {
        session.uniqueWatchedSeconds = Math.min(
          session.duration,
          session.uniqueWatchedSeconds + (validCurrentPos - prevPosition)
        );
      }
    }

    // Recalculate unique percentage strictly against session.duration
    if (session.duration > 0) {
      session.uniquePercent = Math.min(
        100,
        Math.round((Math.max(session.uniqueWatchedSeconds, validCurrentPos) / session.duration) * 100)
      );
    } else {
      session.uniquePercent = 0;
    }

    const threshold = Number(requiredThresholdPercent) || 90;
    const canComplete = session.duration > 0 && session.uniquePercent >= threshold;

    if (canComplete && !session.isCompleted) {
      session.isCompleted = true;
    }

    // Update server progress store
    if (!serverProgressStore[userId]) {
      serverProgressStore[userId] = [];
    }
    const list = serverProgressStore[userId];
    const existingIdx = list.findIndex((p: any) => p.lessonId === lessonId);
    const progressRecord = {
      id: existingIdx >= 0 ? list[existingIdx].id : `prog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      courseId,
      lessonId,
      watchedSeconds: Math.round(validCurrentPos),
      totalSeconds: session.duration,
      uniqueWatchedSeconds: Math.round(session.uniqueWatchedSeconds),
      uniquePercent: session.uniquePercent,
      isCompleted: session.isCompleted,
      lastWatchedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...progressRecord };
    } else {
      list.push(progressRecord);
    }

    return res.json({
      success: true,
      currentPosition: validCurrentPos,
      uniqueWatchedSeconds: session.uniqueWatchedSeconds,
      uniquePercent: session.uniquePercent,
      isCompleted: session.isCompleted,
      canComplete,
      threshold,
      intervals: session.intervals,
    });
  });

  // 6. Strict Server-Side Completion Verification Endpoint
  app.post('/api/progress/verify-completion', (req, res) => {
    const { userId, courseId, lessonId, requiredThresholdPercent = 90 } = req.body || {};

    if (!userId || !courseId || !lessonId) {
      return res.status(400).json({ success: false, verified: false, message: '필수 파라미터가 누락되었습니다.' });
    }

    const sessionKey = `${userId}_${courseId}_${lessonId}`;
    let session = serverWatchSessions[sessionKey];
    const threshold = Number(requiredThresholdPercent) || 90;

    // Check progress in store as well
    const userProgress = serverProgressStore[userId] || [];
    const record = userProgress.find((p: any) => p.lessonId === lessonId);

    const effectivePercent = Math.max(
      session ? session.uniquePercent : 0,
      record ? record.uniquePercent || 0 : 0
    );

    if (effectivePercent < threshold && !record?.isCompleted) {
      return res.status(403).json({
        success: false,
        verified: false,
        isCompleted: false,
        currentPercent: effectivePercent,
        requiredPercent: threshold,
        message: `영상의 ${threshold}% 이상을 실제로 시청해야 완료 처리할 수 있습니다. (현재 시청률: ${effectivePercent}%)`,
      });
    }

    // Verified!
    if (session) {
      session.isCompleted = true;
      session.uniquePercent = Math.max(session.uniquePercent, threshold);
    }

    // Update in progress store
    if (!serverProgressStore[userId]) {
      serverProgressStore[userId] = [];
    }
    const list = serverProgressStore[userId];
    const existingIdx = list.findIndex((p: any) => p.lessonId === lessonId);
    if (existingIdx >= 0) {
      list[existingIdx].isCompleted = true;
      list[existingIdx].uniquePercent = Math.max(list[existingIdx].uniquePercent || 0, threshold);
      list[existingIdx].completedAt = new Date().toISOString();
    }

    return res.json({
      success: true,
      verified: true,
      isCompleted: true,
      uniquePercent: Math.max(effectivePercent, threshold),
      message: '학습 완료 조건이 정상 검증되었습니다.',
    });
  });

  // 7. Get Lesson Watch Status
  app.get('/api/progress/watch-status', (req, res) => {
    const userId = (req.query.userId as string) || '';
    const courseId = (req.query.courseId as string) || '';
    const lessonId = (req.query.lessonId as string) || '';

    if (!userId || !lessonId) {
      return res.status(400).json({ success: false, message: 'userId와 lessonId가 필요합니다.' });
    }

    const sessionKey = `${userId}_${courseId}_${lessonId}`;
    const session = serverWatchSessions[sessionKey];

    if (!session) {
      return res.json({
        success: true,
        exists: false,
        uniqueWatchedSeconds: 0,
        uniquePercent: 0,
        isCompleted: false,
        canComplete: false,
        intervals: [],
      });
    }

    return res.json({
      success: true,
      exists: true,
      uniqueWatchedSeconds: session.uniqueWatchedSeconds,
      uniquePercent: session.uniquePercent,
      isCompleted: session.isCompleted,
      canComplete: session.uniquePercent >= 90,
      lastPosition: session.lastPosition,
      intervals: session.intervals,
    });
  });

  // Serve public directory directly so brand assets are always served cleanly with correct headers and MIME types
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));

  // Vite middleware in dev or static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Initialize persistent server video storage
  loadVideosManifest();
  scanUploadsDirectory();
  syncVideosWithFirestore().catch((err) => {
    console.warn('[Server Startup] Initial Firestore video sync notice:', err);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TDSNTLMS Server running on port ${PORT}`);
  });
}

startServer();
