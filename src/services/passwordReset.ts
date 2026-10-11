// Forgotten passwords. The server mails a one-time link (?pwreset=<token>) from the LMS team's Gmail
// account; the page opened from it checks the token and stores the new password.

const LINK_PARAM = 'pwreset';

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

/** Mails a password reset link to the address (the server checks it has a password account). */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  await postJson('/api/auth/password-reset/request', { email: rawEmail.trim().toLowerCase() });
}

/** The reset token when this page was opened from the email, else ''. */
export const passwordResetToken = () => new URLSearchParams(window.location.search).get(LINK_PARAM) || '';

/** The account email the link is for; throws when the link is expired or already used. */
export async function verifyPasswordResetLink(token: string): Promise<string> {
  return (await postJson('/api/auth/password-reset/verify', { token })).email;
}

/** Stores the new password; returns the account's email so the caller can sign in with it. */
export async function completePasswordReset(token: string, newPassword: string): Promise<string> {
  return (await postJson('/api/auth/password-reset/complete', { token, newPassword })).email;
}

/** Removes the one-time link from the address bar. */
export function clearPasswordResetLink() {
  window.history.replaceState(null, '', window.location.pathname);
}
