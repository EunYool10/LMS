import crypto from 'crypto';

// Session tokens, stored student passwords and role grants are all keyed by AUTH_SECRET, a server-only
// value (Render environment). Firestore is publicly readable and writable, so anything kept there must be
// useless without this secret: a copied or overwritten record cannot be turned into a working session,
// password or role.

let cachedSecret: string | null = null;
let ephemeralSecret = '';

/** Read lazily: dotenv runs after module imports have been evaluated. */
function configuredSecret(): string {
  if (cachedSecret === null) {
    const fromEnv = (process.env.AUTH_SECRET || '').trim();
    cachedSecret = fromEnv.length >= 32 ? fromEnv : '';
    if (!cachedSecret) {
      console.warn(
        '[Auth] AUTH_SECRET is missing or shorter than 32 characters — sessions end on every restart and stored passwords cannot be set or checked.'
      );
    }
  }
  return cachedSecret;
}

export const isAuthSecretConfigured = () => !!configuredSecret();

function signingKey(): string {
  const secret = configuredSecret();
  if (secret) return secret;
  if (!ephemeralSecret) ephemeralSecret = crypto.randomBytes(32).toString('hex');
  return ephemeralSecret;
}

const hmac = (purpose: string, value: string) =>
  crypto.createHmac('sha256', signingKey()).update(`${purpose}\n${value}`).digest('base64url');

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

// ---------------------------------------------------------------------------------------------
// Session tokens: lms1.<payload>.<signature>. Stateless, so they survive server restarts.
// ---------------------------------------------------------------------------------------------

export interface SessionClaims {
  id: string;
  email: string;
  name: string;
  role: string;
  exp: number;
}

const TOKEN_PREFIX = 'lms1';
export const SESSION_TTL_SECONDS = 7 * 24 * 3600;

export function issueSessionToken(user: { id: string; email: string; name: string; role: string }, ttlSeconds = SESSION_TTL_SECONDS): string {
  const claims: SessionClaims = {
    id: user.id,
    email: (user.email || '').toLowerCase(),
    name: user.name || '',
    role: user.role || 'USER',
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${TOKEN_PREFIX}.${payload}.${hmac('session', payload)}`;
}

export function verifySessionToken(token: unknown): SessionClaims | null {
  if (typeof token !== 'string') return null;
  const [prefix, payload, signature, ...rest] = token.split('.');
  if (prefix !== TOKEN_PREFIX || !payload || !signature || rest.length) return null;
  if (!safeEqual(signature, hmac('session', payload))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionClaims;
    if (typeof claims.id !== 'string' || !claims.id || typeof claims.exp !== 'number') return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Account passwords (students, and admins once they change theirs). The password is first keyed with
// AUTH_SECRET and the email, so a leaked record cannot be brute-forced offline and a record copied onto
// another account matches no password.
// ---------------------------------------------------------------------------------------------

export interface PasswordRecord {
  salt: string;
  hash: string;
  iterations: number;
}

const PASSWORD_ITERATIONS = 210_000;

const pbkdf2 = (password: Buffer, salt: string, iterations: number) =>
  new Promise<Buffer>((resolve, reject) =>
    crypto.pbkdf2(password, salt, iterations, 32, 'sha256', (err, key) => (err ? reject(err) : resolve(key)))
  );

function pepper(email: string, password: string): Buffer {
  const secret = configuredSecret();
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return crypto.createHmac('sha256', secret).update(`password\n${email.toLowerCase()}\n${password}`).digest();
}

export async function hashAccountPassword(email: string, password: string): Promise<PasswordRecord> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await pbkdf2(pepper(email, password), salt, PASSWORD_ITERATIONS)).toString('base64url');
  return { salt, hash, iterations: PASSWORD_ITERATIONS };
}

export async function verifyAccountPassword(email: string, password: string, record: Partial<PasswordRecord> | null | undefined): Promise<boolean> {
  if (!record?.salt || !record.hash || !record.iterations) return false;
  const hash = (await pbkdf2(pepper(email, password), record.salt, record.iterations)).toString('base64url');
  return safeEqual(hash, record.hash);
}

/** Firestore doc id (system_settings) for an email's password record; the email itself is not stored. */
export const credentialDocId = (email: string) =>
  `cred_${crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 40)}`;

// ---------------------------------------------------------------------------------------------
// Password reset links: pr1.<payload>.<signature>, mailed to the address. The payload carries a stamp of
// the password in force when the link was made, so the link stops working once any new password is set.
// ---------------------------------------------------------------------------------------------

const RESET_PREFIX = 'pr1';
export const PASSWORD_RESET_TTL_SECONDS = 30 * 60;

/** Short fingerprint of the current password record ('initial' when none is stored). */
export const passwordStamp = (record: Partial<PasswordRecord> | null | undefined) =>
  record?.hash ? crypto.createHash('sha256').update(record.hash).digest('base64url').slice(0, 16) : 'initial';

export function issuePasswordResetToken(email: string, stamp: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email: email.toLowerCase(), stamp, exp: Math.floor(Date.now() / 1000) + PASSWORD_RESET_TTL_SECONDS })
  ).toString('base64url');
  return `${RESET_PREFIX}.${payload}.${hmac('password-reset', payload)}`;
}

/** The email and password stamp of a valid, unexpired reset link; null otherwise. */
export function verifyPasswordResetToken(token: unknown): { email: string; stamp: string } | null {
  if (typeof token !== 'string' || !configuredSecret()) return null;
  const [prefix, payload, signature, ...rest] = token.split('.');
  if (prefix !== RESET_PREFIX || !payload || !signature || rest.length) return null;
  if (!safeEqual(signature, hmac('password-reset', payload))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof claims.email !== 'string' || typeof claims.stamp !== 'string' || typeof claims.exp !== 'number') return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: claims.email, stamp: claims.stamp };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Role grants: an admin-assigned role is only honoured when signed by this server.
// ---------------------------------------------------------------------------------------------

export const roleGrantDocId = (userId: string) => `rolegrant_${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 40)}`;

export const signRoleGrant = (userId: string, role: string) => hmac('role', `${userId}\n${role}`);

export function isValidRoleGrant(grant: any, userId: string): grant is { role: string; sig: string } {
  return (
    !!grant &&
    grant.userId === userId &&
    typeof grant.role === 'string' &&
    typeof grant.sig === 'string' &&
    !!configuredSecret() &&
    safeEqual(grant.sig, signRoleGrant(userId, grant.role))
  );
}

// ---------------------------------------------------------------------------------------------
// Sealed settings: seal1.<ephemeral key>.<iv>.<ciphertext>, for secrets that have to live in the public
// repository because they cannot be put in the Render environment. Anyone can seal a value to
// sealPublicKey() (X25519 + AES-256-GCM); only a server holding the same AUTH_SECRET can open it.
// ---------------------------------------------------------------------------------------------

const SEAL_PREFIX = 'seal1';
// PKCS#8 wrapping of a raw 32-byte X25519 private key.
const X25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b656e04220420', 'hex');

let sealKeys: { privateKey: crypto.KeyObject; publicKey: string } | null = null;

function serverSealKeys() {
  const secret = configuredSecret();
  if (!secret) return null;
  if (!sealKeys) {
    const seed = Buffer.from(crypto.hkdfSync('sha256', secret, '', 'lms-seal-x25519', 32));
    const privateKey = crypto.createPrivateKey({ key: Buffer.concat([X25519_PKCS8_PREFIX, seed]), format: 'der', type: 'pkcs8' });
    sealKeys = { privateKey, publicKey: crypto.createPublicKey(privateKey).export({ format: 'jwk' }).x as string };
  }
  return sealKeys;
}

const x25519PublicKey = (raw: string) => crypto.createPublicKey({ key: { kty: 'OKP', crv: 'X25519', x: raw }, format: 'jwk' });

const sealCipherKey = (shared: Buffer, ephemeral: string, recipient: string) =>
  Buffer.from(crypto.hkdfSync('sha256', shared, `${ephemeral}.${recipient}`, 'lms-seal-v1', 32));

/** This server's sealing key (base64url), or null without AUTH_SECRET. Safe to publish. */
export const sealPublicKey = () => serverSealKeys()?.publicKey ?? null;

/** Seals a value so that only the server with the given sealing key can open it. */
export function sealValue(value: string, recipient: string): string {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('x25519');
  const ephemeral = publicKey.export({ format: 'jwk' }).x as string;
  const shared = crypto.diffieHellman({ privateKey, publicKey: x25519PublicKey(recipient) });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sealCipherKey(shared, ephemeral, recipient), iv);
  const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return [SEAL_PREFIX, ephemeral, iv.toString('base64url'), body.toString('base64url')].join('.');
}

/** The value inside a sealed setting; null when it was sealed for another AUTH_SECRET or has been altered. */
export function openSealed(sealed: string): string | null {
  const keys = serverSealKeys();
  const [prefix, ephemeral, iv, body, ...rest] = sealed.split('.');
  if (!keys || prefix !== SEAL_PREFIX || !ephemeral || !iv || !body || rest.length) return null;
  try {
    const shared = crypto.diffieHellman({ privateKey: keys.privateKey, publicKey: x25519PublicKey(ephemeral) });
    const data = Buffer.from(body, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', sealCipherKey(shared, ephemeral, keys.publicKey), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(data.subarray(data.length - 16));
    return Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
