import crypto from 'crypto';

// Verifies Firebase Authentication ID tokens without the Admin SDK, as described in
// https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
// The server must never trust a uid or email sent by the browser; only claims from a token that
// Google signed for this project are used.

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const CLOCK_SKEW_SECONDS = 60;

/** The token itself is invalid (as opposed to the certificates being unreachable). */
export class InvalidIdTokenError extends Error {}

export interface FirebaseIdTokenClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  firebase?: { sign_in_provider?: string };
  [claim: string]: unknown;
}

export type CertificateMap = Record<string, string>;

let certCache: { certs: CertificateMap; expiresAt: number } | null = null;

async function fetchGoogleCertificates(): Promise<CertificateMap> {
  if (certCache && certCache.expiresAt > Date.now()) return certCache.certs;
  const res = await fetch(CERTS_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Firebase signing certificates could not be loaded (HTTP ${res.status})`);
  const certs = (await res.json()) as CertificateMap;
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1] || 3600);
  certCache = { certs, expiresAt: Date.now() + maxAge * 1000 };
  return certs;
}

const decodeSegment = (segment: string) => JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));

export async function verifyFirebaseIdToken(
  idToken: unknown,
  projectId: string,
  getCertificates: () => Promise<CertificateMap> = fetchGoogleCertificates
): Promise<FirebaseIdTokenClaims> {
  const segments = typeof idToken === 'string' ? idToken.split('.') : [];
  if (segments.length !== 3) throw new InvalidIdTokenError('malformed token');

  let header: any;
  let payload: any;
  try {
    header = decodeSegment(segments[0]);
    payload = decodeSegment(segments[1]);
  } catch {
    throw new InvalidIdTokenError('malformed token');
  }
  if (header?.alg !== 'RS256' || typeof header.kid !== 'string') throw new InvalidIdTokenError('unexpected token header');

  const certificate = (await getCertificates())[header.kid];
  if (!certificate) throw new InvalidIdTokenError('unknown signing key');
  const signatureOk = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${segments[0]}.${segments[1]}`),
    new crypto.X509Certificate(certificate).publicKey,
    Buffer.from(segments[2], 'base64url')
  );
  if (!signatureOk) throw new InvalidIdTokenError('bad signature');

  const now = Math.floor(Date.now() / 1000);
  if (payload?.aud !== projectId) throw new InvalidIdTokenError('token was issued for another project');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new InvalidIdTokenError('unexpected issuer');
  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) throw new InvalidIdTokenError('missing subject');
  if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_SECONDS < now) throw new InvalidIdTokenError('token expired');
  if (typeof payload.iat !== 'number' || payload.iat - CLOCK_SKEW_SECONDS > now) throw new InvalidIdTokenError('token issued in the future');
  if (typeof payload.auth_time === 'number' && payload.auth_time - CLOCK_SKEW_SECONDS > now) {
    throw new InvalidIdTokenError('authenticated in the future');
  }
  return payload as FirebaseIdTokenClaims;
}
