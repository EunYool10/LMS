import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, signOut } from 'firebase/auth';
import resetConfig from '../../firebase-password-reset-config.json';

// Forgotten passwords. Firebase Auth emails the address a one-time sign-in link; opening it gives a
// Firebase ID token with a verified email, which the server accepts as proof before storing a new password.
// This uses the team's own Firebase project (TDSHQ); app data and Google sign-in stay on the applet project.
const RESET_APP_NAME = 'password-reset';
const auth = getAuth(getApps().some((a) => a.name === RESET_APP_NAME) ? getApp(RESET_APP_NAME) : initializeApp(resetConfig, RESET_APP_NAME));

const EMAIL_KEY = 'lms_password_reset_email';
const LINK_PARAM = 'pwreset';

const firebaseMessage = (e: any): string => {
  switch (e?.code) {
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return '비밀번호 찾기 메일 기능이 아직 켜져 있지 않습니다. 관리자에게 문의해 주세요.';
    case 'auth/unauthorized-continue-uri':
    case 'auth/unauthorized-domain':
    case 'auth/invalid-continue-uri':
      return '이 주소에서는 비밀번호 찾기 메일을 보낼 수 없습니다. 관리자에게 문의해 주세요.';
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return '링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 요청해 주세요.';
    case 'auth/invalid-email':
      return '링크를 요청한 이메일 주소와 다릅니다. 주소를 다시 확인해 주세요.';
    case 'auth/quota-exceeded':
    case 'auth/too-many-requests':
      return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    case 'auth/network-request-failed':
      return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
    default:
      return '메일 인증 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.';
  }
};

async function postJson(url: string, body: unknown): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new Error('네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  return data;
}

/** Emails a password reset link to the address, once the server confirms it has a password account. */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  await postJson('/api/auth/password-reset/check', { email });
  auth.languageCode = 'ko';
  try {
    await sendSignInLinkToEmail(auth, email, { url: `${window.location.origin}/?${LINK_PARAM}=1`, handleCodeInApp: true });
  } catch (e) {
    console.warn('[PasswordReset] Sending the link failed:', e);
    throw new Error(firebaseMessage(e));
  }
  try {
    localStorage.setItem(EMAIL_KEY, email);
  } catch {}
}

/** Whether this page was opened from a password reset email. */
export const isPasswordResetLink = () => isSignInWithEmailLink(auth, window.location.href);

/** The address the link was requested for in this browser (empty when opened elsewhere). */
export const rememberedResetEmail = () => {
  try {
    return localStorage.getItem(EMAIL_KEY) || '';
  } catch {
    return '';
  }
};

/** Thrown when the typed address is not the one the link was sent to (the link is still usable). */
export class ResetEmailMismatchError extends Error {}

/** Uses up the emailed link and returns the Firebase ID token that proves the address. */
export async function confirmPasswordResetLink(rawEmail: string): Promise<string> {
  try {
    const credential = await signInWithEmailLink(auth, rawEmail.trim().toLowerCase(), window.location.href);
    return await credential.user.getIdToken();
  } catch (e: any) {
    console.warn('[PasswordReset] Opening the link failed:', e);
    if (e?.code === 'auth/invalid-email') throw new ResetEmailMismatchError(firebaseMessage(e));
    throw new Error(firebaseMessage(e));
  }
}

/** Stores the new password; returns the account's email so the caller can sign in with it. */
export async function completePasswordReset(idToken: string, newPassword: string): Promise<string> {
  const data = await postJson('/api/auth/password-reset/complete', { idToken, newPassword });
  try {
    localStorage.removeItem(EMAIL_KEY);
  } catch {}
  // The Firebase sign-in only proved the address; the app's own session comes from the normal login.
  signOut(auth).catch(() => {});
  return data.email;
}

/** Removes the one-time link parameters from the address bar. */
export function clearPasswordResetLink() {
  window.history.replaceState(null, '', window.location.pathname);
}
