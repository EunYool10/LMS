import { User, UserAgreements } from '../types';
import { storage } from './storage';

/**
 * Accounts created from this moment (2026-10-11 00:00 KST, when sign-up consent was introduced)
 * must have agreed before using the service. Older accounts are not asked again.
 */
export const CONSENT_REQUIRED_SINCE = '2026-10-10T15:00:00.000Z';

const PENDING_KEY = 'tdsnt_pending_consent_v1';
const PENDING_TTL_MS = 30 * 60 * 1000;

export const newAgreements = (): UserAgreements => {
  const now = new Date().toISOString();
  return { terms: now, privacy: now };
};

const isComplete = (a?: UserAgreements) => !!(a?.terms && a?.privacy);

export function needsConsent(user: User | null): boolean {
  if (!user) return false;
  // The session object from an email login always carries "now" as createdAt and may use a different id
  // than the stored account, so judge by every stored record for the same id or email.
  const email = (user.email || '').toLowerCase();
  const records = [user, ...storage.getUsers().filter((u) => u.id === user.id || (!!email && (u.email || '').toLowerCase() === email))];
  if (records.some((r) => isComplete(r.agreements))) return false;
  const created = Math.min(...records.map((r) => Date.parse(r.createdAt || '')).filter((n) => !Number.isNaN(n)));
  return Number.isFinite(created) && created >= Date.parse(CONSENT_REQUIRED_SINCE);
}

/** Called when someone ticks the boxes on the sign-up tab and then continues with an SNS account. */
export function rememberSocialConsent(): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...newAgreements(), savedAt: Date.now() }));
  } catch {}
}

/** Returns (and clears) the consent given on the sign-up tab right before an SNS sign-up. */
export function takeSocialConsent(): UserAgreements | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.terms || !parsed?.privacy || Date.now() - (parsed.savedAt || 0) > PENDING_TTL_MS) return null;
    return { terms: parsed.terms, privacy: parsed.privacy };
  } catch {
    return null;
  }
}
