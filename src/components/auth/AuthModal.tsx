import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { isAdminRole } from '../../utils/rbac';
import { newAgreements, rememberSocialConsent } from '../../services/consent';
import { ConsentChecklist, ConsentValue } from './ConsentChecklist';
import { Mail, Lock, User as UserIcon, X, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  onNavigate?: (view: string, param?: string) => void;
}

const ADMIN_LOGIN_IDS = ['tdsntlms', 'admin_teamdevstudiont'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTER_DOMAINS = ['@gmail.com', '@naver.com', '@kakao.com', '@daum.net', '@hanmail.net'];

const isAllowedRegisterDomain = (val: string) => {
  const lower = val.trim().toLowerCase();
  return REGISTER_DOMAINS.some((d) => lower.endsWith(d));
};

const editDistance = (a: string, b: string) => {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
};

// The address the user most likely meant when the domain is one or two keystrokes away from a
// supported one (e.g. gmaol.com → gmail.com); empty when nothing is close.
const suggestEmail = (val: string) => {
  const trimmed = val.trim();
  const at = trimmed.lastIndexOf('@');
  if (at < 1) return '';
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (!domain.includes('.') || REGISTER_DOMAINS.includes(`@${domain}`)) return '';
  let best = '';
  let bestDistance = 3;
  for (const d of REGISTER_DOMAINS) {
    const distance = editDistance(domain, d.slice(1));
    if (distance < bestDistance) {
      best = d.slice(1);
      bestDistance = distance;
    }
  }
  return best ? `${trimmed.slice(0, at)}@${best}` : '';
};

export const AuthModal: React.FC<AuthModalProps> = ({ onNavigate }) => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    openAuthModal,
    login,
    register,
    loginWithKakao,
    loginWithNaver,
    loginWithGoogle,
    isKakaoLoading,
    isNaverLoading,
    isGoogleLoading,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [consent, setConsent] = useState<ConsentValue>({ terms: false, privacy: false });
  const [consentError, setConsentError] = useState(false);
  const [formError, setFormError] = useState('');

  const allowRegistration = storage.getSettings()?.allowRegistration !== false;
  const isRegister = authModalMode === 'register' && allowRegistration;
  const hasConsent = consent.terms && consent.privacy;

  // Reset validation state when the modal opens or the tab changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setTouched({});
      setShowPassword(false);
      setConsentError(false);
      setFormError('');
    }
  }, [isAuthModalOpen, authModalMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) closeAuthModal();
    };
    if (isAuthModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const isAnySocialLoading = isKakaoLoading || isNaverLoading || isGoogleLoading;

  const goAfterLogin = (role?: string) => onNavigate?.(isAdminRole(role as any) ? 'admin-dashboard' : 'dashboard');

  const validateEmail = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return isRegister ? '이메일 주소를 입력해 주세요.' : '이메일 주소 또는 아이디를 입력해 주세요.';
    if (!isRegister && ADMIN_LOGIN_IDS.includes(trimmed.toLowerCase())) return '';
    if (!EMAIL_RE.test(trimmed)) return isRegister ? '올바른 이메일 주소 형식이 아니에요.' : '올바른 이메일 주소 또는 아이디를 입력해 주세요.';
    if (isRegister && !isAllowedRegisterDomain(trimmed)) return 'Gmail, 네이버, 카카오(다음·한메일) 이메일로만 가입할 수 있어요.';
    return '';
  };
  const validatePassword = (val: string) => {
    if (!val) return '비밀번호를 입력해 주세요.';
    if (isRegister && val.length < 8) return '비밀번호는 8자 이상이어야 해요.';
    return '';
  };
  const validateName = (val: string) => {
    if (!val.trim()) return '이름을 입력해 주세요.';
    if (val.trim().length < 2) return '이름은 2자 이상이어야 해요.';
    return '';
  };

  const errors = {
    name: isRegister ? validateName(name) : '',
    email: validateEmail(email),
    password: validatePassword(password),
  };
  const showError = (field: keyof typeof errors) => touched[field] && errors[field];
  const emailSuggestion = touched.email ? suggestEmail(email) : '';

  const handleSocial = async (provider: 'kakao' | 'naver' | 'google') => {
    if (isRegister) {
      if (!hasConsent) {
        setConsentError(true);
        return;
      }
      rememberSocialConsent();
    }
    try {
      const fn = provider === 'kakao' ? loginWithKakao : provider === 'naver' ? loginWithNaver : loginWithGoogle;
      const loggedUser = await fn();
      if (loggedUser) goAfterLogin(loggedUser.role);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (errors.name || errors.email || errors.password) return;
    if (isRegister && !hasConsent) {
      setConsentError(true);
      return;
    }

    // A failed attempt empties the password field; it is marked untouched again so the empty field
    // is not reported as "비밀번호를 입력해 주세요", which hid the real reason the sign-in failed.
    const clearPassword = () => {
      setPassword('');
      setTouched((t) => ({ ...t, password: false }));
    };

    setFormError('');
    setLoading(true);
    try {
      if (isRegister) {
        const ok = await register(name, email, password, newAgreements());
        if (ok) onNavigate?.('dashboard');
        else clearPassword();
      } else {
        const loggedInUser = await login(email, password);
        if (loggedInUser) goAfterLogin(loggedInUser.role);
        else {
          clearPassword();
          setFormError('로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }
      }
    } catch (err: any) {
      clearPassword();
      setFormError(err?.message || '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: keyof typeof errors) =>
    `lms-input h-11 pl-10 ${showError(field) ? 'border-rose-400 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgb(244_63_94/0.12)]' : ''}`;

  const FieldError: React.FC<{ field: keyof typeof errors }> = ({ field }) =>
    showError(field) ? (
      <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {errors[field]}
      </p>
    ) : null;

  const socialButtons = [
    {
      key: 'kakao' as const,
      label: '카카오',
      loading: isKakaoLoading,
      className: 'bg-[#FEE500] hover:bg-[#FDD835] text-[#381E1F]',
      spinner: 'border-[#381E1F]',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <path d="M16 4.5c-6.627 0-12 4.253-12 9.5 0 3.328 2.19 6.25 5.54 7.846l-1.42 5.253c-.12.445.385.807.75.541l6.234-4.14c.294.03.593.05.896.05 6.627 0 12-4.253 12-9.5s-5.373-9.5-12-9.5z" />
        </svg>
      ),
    },
    {
      key: 'naver' as const,
      label: '네이버',
      loading: isNaverLoading,
      className: 'bg-[#03C75A] hover:bg-[#02b351] text-white',
      spinner: 'border-white',
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.273 12.845L7.37 0H0v24h7.727V11.155L16.63 24H24V0h-7.727v12.845z" />
        </svg>
      ),
    },
    {
      key: 'google' as const,
      label: 'Google',
      loading: isGoogleLoading,
      className: 'bg-white hover:bg-neutral-50 border border-neutral-300',
      spinner: 'border-neutral-500',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-neutral-950/50" onClick={closeAuthModal} aria-hidden="true" />

      <div
        className="relative z-10 flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-[420px] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 id="auth-modal-title" className="text-xl font-bold text-neutral-900">
              {isRegister ? '회원가입' : '로그인'}
            </h2>
            <p className="mt-1 text-[13px] text-neutral-500">
              {isRegister ? '사내 학습 계정을 만들고 바로 수강을 시작하세요.' : '등록된 계정으로 로그인해 학습을 이어가세요.'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="-mr-2 -mt-1 rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6 pt-5">
          {allowRegistration && (
            <div className="mb-5 grid grid-cols-2 rounded-lg bg-neutral-100 p-1" role="tablist">
              {(['login', 'register'] as const).map((mode) => {
                const active = (mode === 'register') === isRegister;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => openAuthModal(mode)}
                    className={`h-9 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                      active ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    {mode === 'login' ? '로그인' : '회원가입'}
                  </button>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="auth-name" className="mb-1.5 block text-[13px] font-medium text-neutral-800">
                  이름
                </label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    placeholder="홍길동"
                    autoComplete="name"
                    className={inputClass('name')}
                  />
                </div>
                <FieldError field="name" />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-[13px] font-medium text-neutral-800">
                {isRegister ? '이메일' : '이메일 또는 아이디'}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="auth-email"
                  type={isRegister ? 'email' : 'text'}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFormError('');
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder={isRegister ? 'name@gmail.com' : '이메일 또는 관리자 아이디'}
                  autoComplete={isRegister ? 'email' : 'username'}
                  className={inputClass('email')}
                />
              </div>
              <FieldError field="email" />
              {emailSuggestion && (
                <p className="mt-1.5 text-xs text-neutral-600">
                  혹시{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(emailSuggestion);
                      setFormError('');
                    }}
                    className="font-medium text-brand-700 underline underline-offset-2 cursor-pointer"
                  >
                    {emailSuggestion}
                  </button>
                  을(를) 입력하려고 하셨나요?
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="auth-password" className="block text-[13px] font-medium text-neutral-800">
                  비밀번호
                </label>
                {isRegister && <span className="text-xs text-neutral-400">8자 이상</span>}
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormError('');
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="비밀번호"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  className={`${inputClass('password')} pr-10`}
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
              <FieldError field="password" />
            </div>

            {isRegister && (
              <ConsentChecklist
                value={consent}
                onChange={(v) => {
                  setConsent(v);
                  if (v.terms && v.privacy) setConsentError(false);
                }}
                invalid={consentError}
              />
            )}

            {formError && !isRegister && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="lms-btn lms-btn-primary h-11 w-full text-[15px]">
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {isRegister ? '가입하는 중…' : '로그인하는 중…'}
                </>
              ) : isRegister ? (
                '동의하고 가입하기'
              ) : (
                '로그인'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-x-0 top-1/2 border-t border-neutral-200" />
              <span className="relative bg-white px-3 text-xs text-neutral-400">
                {isRegister ? 'SNS 계정으로 가입' : 'SNS 계정으로 로그인'}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              {socialButtons.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => handleSocial(b.key)}
                  disabled={isAnySocialLoading || loading}
                  title={`${b.label} 계정으로 ${isRegister ? '가입' : '로그인'}`}
                  aria-label={`${b.label} 계정으로 ${isRegister ? '가입' : '로그인'}`}
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${b.className}`}
                >
                  {b.loading ? <span className={`h-5 w-5 animate-spin rounded-full border-2 border-t-transparent ${b.spinner}`} /> : b.icon}
                </button>
              ))}
            </div>
            {isRegister && <p className="mt-3 text-center text-xs text-neutral-500">SNS로 가입할 때도 위 약관 동의가 필요해요.</p>}
          </div>

          {allowRegistration && (
            <p className="mt-6 border-t border-neutral-100 pt-4 text-center text-[13px] text-neutral-500">
              {isRegister ? '이미 계정이 있나요?' : '아직 계정이 없나요?'}{' '}
              <button
                type="button"
                onClick={() => openAuthModal(isRegister ? 'login' : 'register')}
                className="font-medium text-brand-700 hover:underline cursor-pointer"
              >
                {isRegister ? '로그인' : '회원가입'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
