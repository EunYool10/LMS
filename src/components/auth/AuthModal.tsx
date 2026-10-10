import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { isAdminRole } from '../../utils/rbac';
import { openPolicyModal } from '../common/PolicyModal';
import {
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';

interface AuthModalProps {
  onNavigate?: (view: string, param?: string) => void;
}

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

  // Field validation states & touched trackers
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens or mode changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setTouched({});
      setErrors({});
      setShowPassword(false);
    }
  }, [isAuthModalOpen, authModalMode]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
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

  const isAnySocialLoading = isKakaoLoading || isNaverLoading || isGoogleLoading;

  const handleKakaoClick = async () => {
    try {
      const loggedUser = await loginWithKakao();
      if (loggedUser) {
        if (isAdminRole(loggedUser.role)) {
          onNavigate?.('admin-dashboard');
        } else {
          onNavigate?.('dashboard');
        }
      }
    } catch {}
  };

  const handleNaverClick = async () => {
    try {
      const loggedUser = await loginWithNaver();
      if (loggedUser) {
        if (isAdminRole(loggedUser.role)) {
          onNavigate?.('admin-dashboard');
        } else {
          onNavigate?.('dashboard');
        }
      }
    } catch {}
  };

  const handleGoogleClick = async () => {
    try {
      const loggedUser = await loginWithGoogle();
      if (loggedUser) {
        if (isAdminRole(loggedUser.role)) {
          onNavigate?.('admin-dashboard');
        } else {
          onNavigate?.('dashboard');
        }
      }
    } catch {}
  };

  if (!isAuthModalOpen) return null;

  const isAllowedRegisterDomain = (val: string) => {
    const lower = val.trim().toLowerCase();
    return (
      lower.endsWith('@gmail.com') ||
      lower.endsWith('@naver.com') ||
      lower.endsWith('@kakao.com') ||
      lower.endsWith('@daum.net') ||
      lower.endsWith('@hanmail.net')
    );
  };

  const validateEmail = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return authModalMode === 'login' ? '이메일 주소 또는 아이디를 입력해주세요.' : '이메일 주소를 입력해주세요.';
    if (authModalMode === 'login' && (trimmed.toLowerCase() === 'tdsntlms' || trimmed.toLowerCase() === 'admin_teamdevstudiont')) {
      return '';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return authModalMode === 'login' ? '올바른 이메일 주소 또는 아이디(TDSNTLMS)를 입력해주세요.' : '올바른 이메일 주소 형식을 입력해주세요.';
    }
    if (authModalMode === 'register' && !isAllowedRegisterDomain(trimmed)) {
      return '회원가입은 구글(@gmail.com), 네이버(@naver.com), 카카오(@kakao.com) 이메일만 가능합니다.';
    }
    return '';
  };

  const validatePassword = (val: string) => {
    if (!val) return '비밀번호를 입력해주세요.';
    if (val.length < 6) return '비밀번호는 최소 6자 이상이어야 합니다.';
    return '';
  };

  const validateName = (val: string) => {
    if (!val.trim()) return '성명 또는 닉네임을 입력해주세요.';
    if (val.trim().length < 2) return '이름은 최소 2자 이상이어야 합니다.';
    return '';
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let err = '';
    if (field === 'email') err = validateEmail(email);
    if (field === 'password') err = validatePassword(password);
    if (field === 'name' && authModalMode === 'register') err = validateName(name);

    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const isEmailValid =
    email.trim().length > 0 &&
    (authModalMode === 'login'
      ? email.trim().toLowerCase() === 'tdsntlms' ||
        email.trim().toLowerCase() === 'admin_teamdevstudiont' ||
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && isAllowedRegisterDomain(email));
  const isPasswordValid = password.length >= 6;
  const isNameValid = name.trim().length >= 2;

  const isFormValid =
    authModalMode === 'login'
      ? isEmailValid && password.length > 0
      : isNameValid && isEmailValid && isPasswordValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched for validation feedback
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    const nameErr = authModalMode === 'register' ? validateName(name) : '';

    const newErrors: Record<string, string> = {
      email: emailErr,
      password: passErr,
    };
    if (authModalMode === 'register') {
      newErrors.name = nameErr;
    }
    setErrors(newErrors);
    setTouched({ email: true, password: true, name: true });

    if (emailErr || passErr || nameErr) {
      return;
    }

    setLoading(true);
    try {
      if (authModalMode === 'login') {
        const loggedInUser = await login(email, password);
        if (loggedInUser) {
          if (isAdminRole(loggedInUser.role)) {
            onNavigate?.('admin-dashboard');
          } else {
            onNavigate?.('dashboard');
          }
        } else {
          // On login failure, clear password only and retain email for user convenience
          setPassword('');
        }
      } else {
        const ok = await register(name, email, password);
        if (ok) {
          onNavigate?.('dashboard');
        } else {
          setPassword('');
        }
      }
    } catch {
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
      {/* Darkened Backdrop with Blur */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={closeAuthModal}
        aria-hidden="true"
      />

      {/* Centered Modal Card without subpixel transform jitter */}
      <div
        className="relative z-10 w-full max-w-md max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 sm:px-7 sm:pt-7 sm:pb-4 flex items-start justify-between border-b border-slate-100 bg-white shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {authModalMode === 'login' ? '로그인' : '회원가입'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {authModalMode === 'login'
                ? '등록된 계정으로 로그인하여 학습을 이어가세요.'
                : '계정을 생성하고 TDSNTLMS 서비스를 시작하세요.'}
            </p>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={closeAuthModal}
            className="p-2 -mr-1.5 -mt-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-7 space-y-5 max-h-[calc(90vh-7rem)] overflow-y-auto">
          {/* Login / Register Tab Switch */}
          <div className="grid grid-cols-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className={`py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
                authModalMode === 'login'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className={`py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
                authModalMode === 'register'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
              }`}
            >
              신규 회원가입
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name input (Register only) */}
            {authModalMode === 'register' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  성명 / 닉네임 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (touched.name) setErrors((prev) => ({ ...prev, name: validateName(e.target.value) }));
                    }}
                    onBlur={() => handleBlur('name')}
                    placeholder="이름을 입력하세요"
                    className={`w-full h-11 pl-10 pr-3 text-xs sm:text-sm border rounded-xl bg-white transition-all focus:outline-none ${
                      touched.name && errors.name
                        ? 'border-rose-400 focus:ring-2 focus:ring-rose-200 focus:border-rose-500'
                        : touched.name && isNameValid
                        ? 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                        : 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                    }`}
                  />
                  {touched.name && isNameValid && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3.5 pointer-events-none" />
                  )}
                </div>
                {touched.name && errors.name && (
                  <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.name}</span>
                  </p>
                )}
              </div>
            )}

            {/* Email / ID input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {authModalMode === 'login' ? '이메일 주소 또는 아이디' : '이메일 주소'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={authModalMode === 'login' ? 'text' : 'email'}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) setErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
                  }}
                  onBlur={() => handleBlur('email')}
                  placeholder={
                    authModalMode === 'login'
                      ? '이메일 또는 아이디(TDSNTLMS)를 입력하세요'
                      : '이메일 주소를 입력하세요'
                  }
                  className={`w-full h-11 pl-10 pr-9 text-xs sm:text-sm border rounded-xl bg-white transition-all focus:outline-none ${
                    touched.email && errors.email
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-200 focus:border-rose-500'
                      : touched.email && isEmailValid
                      ? 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                      : 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                />
                {touched.email && isEmailValid && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3.5 pointer-events-none" />
                )}
              </div>
              {touched.email && errors.email && (
                <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  비밀번호 <span className="text-rose-500">*</span>
                </label>
                {authModalMode === 'register' && (
                  <span className="text-[10px] text-slate-400 font-medium">최소 6자 이상</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) setErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
                  }}
                  onBlur={() => handleBlur('password')}
                  placeholder="비밀번호를 입력하세요"
                  className={`w-full h-11 pl-10 pr-10 text-xs sm:text-sm border rounded-xl bg-white transition-all focus:outline-none ${
                    touched.password && errors.password
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-200 focus:border-rose-500'
                      : touched.password && isPasswordValid
                      ? 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                      : 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-2.5 rounded-lg transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && errors.password && (
                <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full h-11 sm:h-12 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{authModalMode === 'login' ? '로그인 중...' : '회원가입 처리 중...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{authModalMode === 'login' ? '로그인' : '회원가입 완료'}</span>
                  </>
                )}
              </button>

              {authModalMode === 'register' && (
                <p className="text-[11px] text-center text-slate-400 leading-tight">
                  가입 시 TDSNTLMS의{' '}
                  <button
                    type="button"
                    onClick={() => openPolicyModal('terms')}
                    className="text-indigo-600 underline font-semibold hover:text-indigo-700 cursor-pointer"
                  >
                    운영 규정
                  </button>{' '}
                  및{' '}
                  <button
                    type="button"
                    onClick={() => openPolicyModal('privacy')}
                    className="text-indigo-600 underline font-semibold hover:text-indigo-700 cursor-pointer"
                  >
                    개인정보처리방침
                  </button>
                  에 동의하게 됩니다.
                </p>
              )}
            </div>
          </form>

          {/* Social Auth (간편 가입 / 간편 로그인) - 로고만 보여주는 원형 형태 */}
          <div className="pt-1">
            <div className="relative flex items-center justify-center my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-semibold text-slate-400">
                {authModalMode === 'login' ? 'SNS 계정으로 간편 로그인' : 'SNS 계정으로 간편 가입'}
              </span>
            </div>

            {/* Social Logo Buttons Row */}
            <div className="flex items-center justify-center gap-4 py-1">
              {/* Kakao Logo Button */}
              <button
                type="button"
                onClick={handleKakaoClick}
                disabled={isAnySocialLoading || loading}
                title={authModalMode === 'login' ? '카카오 계정으로 간편 로그인' : '카카오 계정으로 간편 가입'}
                aria-label={authModalMode === 'login' ? '카카오 간편 로그인' : '카카오 간편 가입'}
                className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#FEE500] hover:bg-[#FDD835] active:scale-95 shadow-xs hover:shadow-md transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#FEE500]/60"
              >
                {isKakaoLoading ? (
                  <span className="w-5 h-5 border-2 border-[#381E1F] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-[#381E1F] transition-transform group-hover:scale-110" viewBox="0 0 32 32" fill="currentColor">
                    <path d="M16 4.5c-6.627 0-12 4.253-12 9.5 0 3.328 2.19 6.25 5.54 7.846l-1.42 5.253c-.12.445.385.807.75.541l6.234-4.14c.294.03.593.05.896.05 6.627 0 12-4.253 12-9.5s-5.373-9.5-12-9.5z" />
                  </svg>
                )}
                <span className="sr-only">카카오</span>
              </button>

              {/* Naver Logo Button */}
              <button
                type="button"
                onClick={handleNaverClick}
                disabled={isAnySocialLoading || loading}
                title={authModalMode === 'login' ? '네이버 계정으로 간편 로그인' : '네이버 계정으로 간편 가입'}
                aria-label={authModalMode === 'login' ? '네이버 간편 로그인' : '네이버 간편 가입'}
                className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#03C75A] hover:bg-[#02b351] active:scale-95 shadow-xs hover:shadow-md transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#03C75A]/60"
              >
                {isNaverLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-white transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.273 12.845L7.37 0H0v24h7.727V11.155L16.63 24H24V0h-7.727v12.845z" />
                  </svg>
                )}
                <span className="sr-only">네이버</span>
              </button>

              {/* Google Logo Button */}
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isAnySocialLoading || loading}
                title={authModalMode === 'login' ? 'Google 계정으로 간편 로그인' : 'Google 계정으로 간편 가입'}
                aria-label={authModalMode === 'login' ? 'Google 간편 로그인' : 'Google 간편 가입'}
                className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white hover:bg-slate-50 active:scale-95 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {isGoogleLoading ? (
                  <span className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                )}
                <span className="sr-only">Google</span>
              </button>
            </div>
          </div>

          {/* Bottom Switch Link */}
          <div className="pt-1 text-center text-xs text-slate-500 border-t border-slate-100">
            {authModalMode === 'login' ? (
              <p>
                계정이 아직 없으신가요?{' '}
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="text-indigo-600 font-bold hover:underline cursor-pointer ml-1"
                >
                  신규 회원가입
                </button>
              </p>
            ) : (
              <p>
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="text-indigo-600 font-bold hover:underline cursor-pointer ml-1"
                >
                  로그인
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
