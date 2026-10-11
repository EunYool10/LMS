import nodemailer, { type Transporter } from 'nodemailer';

// Password reset mail, sent through the LMS team's Gmail account (tdshqlms@gmail.com) with a Gmail app
// password. Env: SMTP_USER (the Gmail address) and SMTP_PASS (16-character app password, spaces allowed).

let transporter: Transporter | null = null;

const smtpUser = () => (process.env.SMTP_USER || '').trim();
const smtpPass = () => (process.env.SMTP_PASS || '').replace(/\s+/g, '');

export const isMailerConfigured = () => !!smtpUser() && !!smtpPass();

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: smtpUser(), pass: smtpPass() },
    });
  }
  return transporter;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function sendPasswordResetMail(to: string, link: string, minutes: number): Promise<void> {
  const safeTo = escapeHtml(to);
  const safeLink = escapeHtml(link);
  const html = `<!doctype html>
<html lang="ko"><body style="margin:0;background:#f4f6f9;font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1f2937">
  <div style="max-width:480px;margin:0 auto;padding:32px 16px">
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:32px 28px">
      <div style="font-size:15px;font-weight:800;letter-spacing:2px;color:#0f1f3d">TDSNT <span style="font-weight:500;color:#6b7280;letter-spacing:0">LMS</span></div>
      <h1 style="margin:24px 0 8px;font-size:20px;color:#111827">비밀번호 재설정</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4b5563">
        <strong style="color:#111827">${safeTo}</strong> 계정의 비밀번호 재설정을 요청하셨어요.<br>
        아래 버튼을 눌러 새 비밀번호를 정해 주세요.
      </p>
      <a href="${safeLink}" style="display:block;text-align:center;background:#1d6ae5;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 0;border-radius:10px">새 비밀번호 설정하기</a>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.7;color:#6b7280">
        링크는 ${minutes}분 동안, 한 번만 쓸 수 있어요.<br>
        직접 요청하지 않았다면 이 메일은 무시하셔도 됩니다. 비밀번호는 바뀌지 않아요.
      </p>
    </div>
    <p style="margin:16px 0 0;text-align:center;font-size:11px;color:#9ca3af">TDSNT LMS 관리팀 · 발신 전용 메일입니다</p>
  </div>
</body></html>`;
  const text = [
    `${to} 계정의 비밀번호 재설정을 요청하셨어요.`,
    '아래 링크를 열어 새 비밀번호를 정해 주세요.',
    '',
    link,
    '',
    `링크는 ${minutes}분 동안, 한 번만 쓸 수 있어요.`,
    '직접 요청하지 않았다면 이 메일은 무시하셔도 됩니다.',
    '',
    'TDSNT LMS 관리팀',
  ].join('\n');

  await getTransporter().sendMail({
    from: { name: 'TDSNT LMS 관리팀', address: smtpUser() },
    to,
    subject: '[TDSNT LMS] 비밀번호 재설정 안내',
    text,
    html,
  });
}
