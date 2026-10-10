import React, { useState } from 'react';
import { storage } from '../../services/storage';
import { SystemSettings } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/authApi';
import { openPolicyModal } from '../common/PolicyModal';
import {
  Settings,
  Bell,
  Database,
  Save,
  RotateCcw,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  FileText,
  ExternalLink,
} from 'lucide-react';

export const SystemSettingsView: React.FC = () => {
  const { showToast } = useToast();
  const { user, isSuperAdmin } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(() => storage.getSettings());

  // Password change form state
  const [targetAdminEmail, setTargetAdminEmail] = useState(user?.email || 'teamdevstudiont@gmail.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  const allowedAdmins = [
    { email: 'teamdevstudiont@gmail.com', name: 'TDSNTLMS', role: 'SUPER_ADMIN' },
    { email: 'eunyool100208@gmail.com', name: '은율', role: 'SUPER_ADMIN' },
    { email: 'ayun24song@gmail.com', name: '윤아', role: 'SUPER_ADMIN' },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveSettings(settings);
    try {
      await authApi.saveKakaoSettings({
        clientId: settings.kakaoClientId,
        clientSecret: settings.kakaoClientSecret,
        redirectUri: settings.kakaoRedirectUri || `${window.location.origin}/api/auth/kakao/callback`,
      });
    } catch {}
    try {
      await authApi.saveNaverSettings({
        clientId: settings.naverClientId,
        clientSecret: settings.naverClientSecret,
        redirectUri: settings.naverRedirectUri || `${window.location.origin}/api/auth/naver/callback`,
      });
    } catch {}
    showToast('시스템 설정이 성공적으로 저장되었습니다.', 'success');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('현재 비밀번호를 입력해주세요.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('새 비밀번호는 최소 6자 이상이어야 합니다.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('새 비밀번호 확인이 일치하지 않습니다.', 'error');
      return;
    }

    setIsChangingPw(true);
    try {
      const res = await authApi.changePassword(targetAdminEmail, currentPassword, newPassword);
      showToast(res.message || '관리자 비밀번호가 성공적으로 변경되었습니다.', 'success', '비밀번호 변경 완료');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || '비밀번호 변경에 실패했습니다.', 'error', '변경 오류');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleClearData = () => {
    if (!isSuperAdmin) {
      showToast('데이터베이스 초기화는 슈퍼 관리자 권한이 필요합니다.', 'error');
      return;
    }

    if (
      window.confirm(
        '주의: 등록된 모든 강의, 커리큘럼, 평가 시험 및 수강 진도 데이터가 완전히 삭제됩니다. 계속하시겠습니까?'
      )
    ) {
      storage.clearAllData();
      showToast('모든 강의 및 학습 데이터가 초기화되었습니다.', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">플랫폼 시스템 및 운영 설정</h3>
            <p className="text-xs text-slate-500">SUPER_ADMIN만 접근 가능한 전역 운영 제어판입니다.</p>
          </div>
          <button
            type="submit"
            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>설정 저장</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* General Platform Info */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">기본 정보</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">플랫폼 명칭</label>
                <input
                  type="text"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">고객 지원 이메일</label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Policy Links (Notion & External) */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>운영 규정 및 개인정보처리방침 링크 (Notion)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">운영 규정 링크 (URL)</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openPolicyModal('terms')}
                      className="text-[11px] text-indigo-600 hover:underline font-bold cursor-pointer inline-flex items-center gap-0.5"
                    >
                      <span>내부 모달 미리보기</span>
                    </button>
                    {settings.termsUrl && (
                      <a
                        href={settings.termsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-slate-500 hover:text-slate-800 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>외부(Notion)</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
                <input
                  type="url"
                  value={settings.termsUrl || ''}
                  onChange={(e) => setSettings({ ...settings, termsUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">개인정보처리방침 링크 (URL)</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openPolicyModal('privacy')}
                      className="text-[11px] text-indigo-600 hover:underline font-bold cursor-pointer inline-flex items-center gap-0.5"
                    >
                      <span>내부 모달 미리보기</span>
                    </button>
                    {settings.privacyUrl && (
                      <a
                        href={settings.privacyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-slate-500 hover:text-slate-800 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>외부(Notion)</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
                <input
                  type="url"
                  value={settings.privacyUrl || ''}
                  onChange={(e) => setSettings({ ...settings, privacyUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Policy & RBAC settings */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">회원가입 및 보안 정책</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">신규 회원가입 허용</div>
                  <div className="text-[11px] text-slate-500">일반 수강생의 회원가입을 활성화합니다.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowRegistration}
                  onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">점검 모드 (Maintenance)</div>
                  <div className="text-[11px] text-slate-500">관리자 외 일반 수강생의 접근을 제한합니다.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Kakao Social Login OAuth Settings */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#FEE500] inline-flex items-center justify-center text-[10px] font-black text-black">
                  K
                </span>
                <span>카카오 소셜 로그인 연동 (OAuth 2.0)</span>
              </h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.kakaoLoginEnabled !== false}
                  onChange={(e) => setSettings({ ...settings, kakaoLoginEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>카카오 로그인 활성화</span>
              </label>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 mb-4 text-xs text-amber-900 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <span>💡 카카오 개발자 콘솔 연동 안내</span>
              </div>
              <p className="text-[11px] text-amber-800">
                1. <a href="https://developers.kakao.com" target="_blank" rel="noopener noreferrer" className="underline font-bold text-indigo-700">Kakao Developers 콘솔</a> 접속 후 <strong>[내 애플리케이션] &gt; [앱 키]</strong>에서 <strong>REST API 키</strong>를 복사하여 아래에 입력하세요.
                <br />
                2. <strong>[카카오 로그인]</strong> 메뉴에서 <strong>활성화 설정(ON)</strong>으로 변경하고, 아래의 <strong>Redirect URI</strong>를 등록하세요.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">카카오 콘솔 등록용 Redirect URI</label>
                  <button
                    type="button"
                    onClick={() => {
                      const uri = `${window.location.origin}/api/auth/kakao/callback`;
                      navigator.clipboard.writeText(uri);
                      showToast('Redirect URI가 클립보드에 복사되었습니다.', 'success');
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer underline flex items-center gap-1"
                  >
                    <span>URI 복사하기</span>
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/kakao/callback`}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-mono select-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    카카오 Client ID (REST API 키)
                  </label>
                  <input
                    type="text"
                    value={settings.kakaoClientId || ''}
                    onChange={(e) => setSettings({ ...settings, kakaoClientId: e.target.value })}
                    placeholder="예: 46a1b2c3d4e5f6... (환경변수 KAKAO_CLIENT_ID도 지원)"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">환경변수(VITE_KAKAO_CLIENT_ID) 또는 여기에 직접 키를 입력하여 저장할 수 있습니다.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    카카오 Client Secret (선택 사항)
                  </label>
                  <input
                    type="password"
                    value={settings.kakaoClientSecret || ''}
                    onChange={(e) => setSettings({ ...settings, kakaoClientSecret: e.target.value })}
                    placeholder="카카오 보안 비밀키 (설정한 경우에만 입력)"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">카카오 개발자센터 [보안] 메뉴에서 Secret 코드를 활성화한 경우 입력하세요.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Naver Social Login OAuth Settings */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#03C75A] inline-flex items-center justify-center text-[10px] font-black text-white">
                  N
                </span>
                <span>네이버 소셜 로그인 연동 (OAuth 2.0)</span>
              </h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.naverLoginEnabled !== false}
                  onChange={(e) => setSettings({ ...settings, naverLoginEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>네이버 로그인 활성화</span>
              </label>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 mb-4 text-xs text-emerald-900 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                <span>💡 네이버 개발자 센터 연동 안내</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                1. <a href="https://developers.naver.com" target="_blank" rel="noopener noreferrer" className="underline font-bold text-emerald-700">Naver Developers 콘솔</a> 접속 후 <strong>[Application] &gt; [애플리케이션 등록]</strong>에서 <strong>Client ID</strong> 및 <strong>Client Secret</strong>을 발급받아 입력하세요.
                <br />
                2. <strong>[API 설정]</strong> 메뉴의 로그인 오픈 API 서비스 환경에서 <strong>서비스 URL</strong>과 아래의 <strong>Callback URL</strong>을 등록하세요.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">네이버 콘솔 등록용 Callback URL</label>
                  <button
                    type="button"
                    onClick={() => {
                      const uri = `${window.location.origin}/api/auth/naver/callback`;
                      navigator.clipboard.writeText(uri);
                      showToast('Callback URL이 클립보드에 복사되었습니다.', 'success');
                    }}
                    className="text-[11px] text-emerald-600 hover:text-emerald-800 font-bold cursor-pointer underline flex items-center gap-1"
                  >
                    <span>URL 복사</span>
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/naver/callback`}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-mono select-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    네이버 Client ID
                  </label>
                  <input
                    type="text"
                    value={settings.naverClientId || ''}
                    onChange={(e) => setSettings({ ...settings, naverClientId: e.target.value })}
                    placeholder="예: WX89abcde... (환경변수 NAVER_CLIENT_ID도 지원)"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">환경변수(NAVER_CLIENT_ID) 또는 여기에 직접 키를 입력하여 저장할 수 있습니다.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    네이버 Client Secret
                  </label>
                  <input
                    type="password"
                    value={settings.naverClientSecret || ''}
                    onChange={(e) => setSettings({ ...settings, naverClientSecret: e.target.value })}
                    placeholder="네이버 Client Secret 키 입력"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">네이버 개발자센터 애플리케이션 상세 정보의 Client Secret을 입력하세요.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Google Social Login Settings */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-white border border-slate-200 inline-flex items-center justify-center text-[10px] font-black text-blue-600">
                  G
                </span>
                <span>구글 소셜 로그인 연동 (Google Auth / Firebase)</span>
              </h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.googleLoginEnabled !== false}
                  onChange={(e) => setSettings({ ...settings, googleLoginEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>구글 로그인 활성화</span>
              </label>
            </div>

            <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-200/80 text-xs text-sky-900 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-sky-950">
                <span>⚡ Firebase Authentication 자동 연동 활성화됨</span>
              </div>
              <p className="text-[11px] text-sky-800">
                Google 로그인은 TDSNTLMS Firebase Authentication 인프라와 즉시 연동되어 작동합니다.
                사용자가 Google 계정으로 로그인/가입하면 자동으로 LMS 회원 프로필 및 세션 토큰이 생성되고 Firestore에 안전하게 보관됩니다.
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Admin Security & Password Management Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">관리자 인증 및 비밀번호 관리</h3>
              <p className="text-xs text-slate-500">
                TDSNTLMS 관리자 계정 보안 설정 및 비밀번호 변경 (서버 PBKDF2 암호화 검증)
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Allowed Admin Accounts Display */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              인가된 TDSNTLMS 관리자 계정 (3개)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {allowedAdmins.map((adm) => {
                const isCurrent = user?.email.toLowerCase() === adm.email.toLowerCase();
                return (
                  <div
                    key={adm.email}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-200'
                        : 'bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900">{adm.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                        {adm.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-mono break-all">{adm.email}</div>
                    {isCurrent && (
                      <div className="mt-2 text-[11px] text-indigo-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>현재 로그인된 계정</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Password Change Form */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span>관리자 비밀번호 변경</span>
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              최초 비밀번호(STAFF0606)로 로그인 후 보안 강화를 위해 안전한 신규 비밀번호로 변경하세요.
            </p>

            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">대상 관리자 이메일</label>
                <select
                  value={targetAdminEmail}
                  onChange={(e) => setTargetAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-mono"
                >
                  {allowedAdmins.map((adm) => (
                    <option key={adm.email} value={adm.email}>
                      {adm.email} ({adm.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">현재 비밀번호</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="현재 비밀번호 입력"
                    className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">새 비밀번호 (6자 이상)</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="새 비밀번호"
                      className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">새 비밀번호 확인</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호 확인"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPw}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isChangingPw ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>서버 암호화 처리 중...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>비밀번호 변경 적용</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Database Management Section */}
      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>데이터베이스 관리</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            시스템 내 등록된 모든 강의 및 학습 진도 데이터를 비우고 초기 상태로 정리합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleClearData}
            disabled={!isSuperAdmin}
            title={!isSuperAdmin ? '슈퍼 관리자 권한이 필요합니다.' : undefined}
            className={`py-2 px-3.5 border text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
              isSuperAdmin
                ? 'bg-white border-slate-300 hover:bg-rose-50 hover:border-rose-300 text-rose-700 cursor-pointer'
                : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>강의 및 진도 데이터 전체 비우기</span>
          </button>
          {!isSuperAdmin && (
            <span className="text-[11px] text-slate-400">※ 슈퍼 관리자 권한 필요</span>
          )}
        </div>
      </div>
    </div>
  );
};

