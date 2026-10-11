import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  clearPasswordResetLink,
  completePasswordReset,
  confirmPasswordResetLink,
  isPasswordResetLink,
  rememberedResetEmail,
  ResetEmailMismatchError,
} from '../../services/passwordReset';
import { isAdminRole } from '../../utils/rbac';
import { AlertCircle, Eye, EyeOff, Lock, Mail, X } from 'lucide-react';

interface PasswordResetModalProps {
  onNavigate?: (view: string, param?: string) => void;
}

type Step = 'email' | 'verifying' | 'password' | 'failed';

// Opened from the password reset email: confirms the link, then lets the person choose a new password
// and signs them in with it.
export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ onNavigate }) => {
  const { login, openAuthModal } = useAuth();
  const [open, setOpen] = useState(() => isPasswordResetLink());
  const [step, setStep] = useState<Step>(() => (rememberedResetEmail() ? 'verifying' : 'email'));
  const [email, setEmail] = useState(() => rememberedResetEmail());
  const [idToken, setIdToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async (address: string) => {
    setStep('verifying');
    setError('');
    try {
      setIdToken(await confirmPasswordResetLink(address));
      setStep('password');
    } catch (err: any) {
      setError(err?.message || '링크를 확인하지 못했습니다.');
      // A mistyped address can be corrected; any other failure means the link itself is unusable.
      setStep(err instanceof ResetEmailMismatchError ? 'email' : 'failed');
    }
  };

  // The address was remembered when the link was requested in this browser: check the link right away.
  useEffect(() => {
    if (open && step === 'verifying' && email) verify(email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  const close = () => {
    clearPasswordResetLink();
    setOpen(false);
  };

  const requestAgain = () => {
    close();
    openAuthModal('login');
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('비밀번호 찾기를 요청한 이메일 주소를 입력해 주세요.');
      return;
    }
    verify(email);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 해요.');
      return;
    }
    if (password !== confirm) {
      setError('두 비밀번호가 서로 달라요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const accountEmail = await completePasswordReset(idToken, password);
      close();
      const user = await login(accountEmail, password).catch(() => null);
      if (user) onNavigate?.(isAdminRole(user.role as any) ? 'admin-dashboard' : 'dashboard');
      else openAuthModal('login');
    } catch (err: any) {
      setError(err?.message || '비밀번호를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const ErrorBox = () =>
    error ? (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-neutral-950/50" aria-hidden="true" />
      <div
        className="relative z-10 w-full overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-[420px] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-reset-title"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 id="password-reset-title" className="text-xl font-bold text-neutral-900">
              새 비밀번호 설정
            </h2>
            <p className="mt-1 text-[13px] text-neutral-500">
              {step === 'password' ? (
                <>
                  <span className="font-medium text-neutral-800">{email.trim().toLowerCase()}</span> 계정의 새 비밀번호를 정해 주세요.
                </>
              ) : (
                '메일로 받은 링크를 확인하고 있어요.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="-mr-2 -mt-1 rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-5">
          {step === 'verifying' && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-neutral-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              링크 확인 중…
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} noValidate className="space-y-4">
              <p className="text-[13px] text-neutral-600">다른 기기나 브라우저에서 링크를 열었다면, 비밀번호 찾기를 요청한 이메일을 한 번 더 입력해 주세요.</p>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="name@gmail.com"
                  autoComplete="email"
                  autoFocus
                  aria-label="이메일"
                  className="lms-input h-11 pl-10"
                />
              </div>
              <ErrorBox />
              <button type="submit" className="lms-btn lms-btn-primary h-11 w-full text-[15px]">
                확인
              </button>
            </form>
          )}

          {step === 'failed' && (
            <div className="space-y-4">
              <ErrorBox />
              <button type="button" onClick={requestAgain} className="lms-btn lms-btn-primary h-11 w-full text-[15px]">
                비밀번호 찾기 다시 요청하기
              </button>
            </div>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
              {[
                { id: 'reset-new-password', label: '새 비밀번호', value: password, set: setPassword, hint: '8자 이상' },
                { id: 'reset-confirm-password', label: '새 비밀번호 확인', value: confirm, set: setConfirm, hint: '' },
              ].map((f) => (
                <div key={f.id}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor={f.id} className="block text-[13px] font-medium text-neutral-800">
                      {f.label}
                    </label>
                    {f.hint && <span className="text-xs text-neutral-400">{f.hint}</span>}
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      id={f.id}
                      type={showPassword ? 'text' : 'password'}
                      value={f.value}
                      onChange={(e) => {
                        f.set(e.target.value);
                        setError('');
                      }}
                      autoComplete="new-password"
                      className="lms-input h-11 pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <ErrorBox />
              <button type="submit" disabled={loading} className="lms-btn lms-btn-primary h-11 w-full text-[15px]">
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    저장하는 중…
                  </>
                ) : (
                  '비밀번호 바꾸고 로그인'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
