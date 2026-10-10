import 'dotenv/config'; // imports are hoisted above server.ts's dotenv.config(), so load .env here too
import crypto from 'crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import firebaseConfigJson from './firebase-applet-config.json';

// Firebase Storage (Admin SDK) for persistent upload storage.
// Hosts like Render's free plan wipe the local disk on every restart, so uploaded
// videos and avatars are pushed to the bucket and served from Firebase download URLs.
// Without FIREBASE_SERVICE_ACCOUNT the server keeps using the local uploads/ directory.

function loadServiceAccount(): Record<string, any> | null {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) return null;
  try {
    // Accept either the raw JSON key or its base64 encoding
    const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (err) {
    console.error('[CloudStorage] FIREBASE_SERVICE_ACCOUNT is not valid JSON or base64 JSON:', err);
    return null;
  }
}

const serviceAccount = loadServiceAccount();
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket;

const bucket = serviceAccount
  ? getStorage(
      getApps().find((a) => a.name === 'cloud-storage') ||
        initializeApp({ credential: cert(serviceAccount as any), storageBucket: bucketName }, 'cloud-storage')
    ).bucket(bucketName)
  : null;

export const isCloudStorageEnabled = bucket !== null;

if (isCloudStorageEnabled) {
  console.log(`[CloudStorage] Uploads will be stored in Firebase Storage bucket "${bucketName}".`);
} else {
  console.warn('[CloudStorage] FIREBASE_SERVICE_ACCOUNT not set. Uploads are stored on local disk (lost on redeploy).');
}

function buildDownloadUrl(storagePath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

// Upload a local file to the bucket and return a public tokenized download URL
export async function uploadToCloud(localPath: string, storagePath: string, contentType: string): Promise<string> {
  if (!bucket) throw new Error('Firebase Storage is not configured.');
  const token = crypto.randomUUID();
  await bucket.upload(localPath, {
    destination: storagePath,
    resumable: false,
    metadata: {
      contentType,
      cacheControl: 'public, max-age=86400',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return buildDownloadUrl(storagePath, token);
}

export async function deleteFromCloud(storagePath: string): Promise<void> {
  if (!bucket) return;
  await bucket.file(storagePath).delete({ ignoreNotFound: true });
}
