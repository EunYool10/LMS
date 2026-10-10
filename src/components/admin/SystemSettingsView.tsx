import React, { useState } from 'react';
import { storage } from '../../services/storage';
import { SystemSettings } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/authApi';
import { openPolicyModal } from '../common/PolicyModal';
import { AdminPageHeader } from './AdminPageHeader';
import { BaseModal } from '../common/BaseModal';
import { AlertTriangle, Check, Copy, Database, ExternalLink, Eye, EyeOff, KeyRound, Lock, LogIn, Save, Settings, ShieldCheck } from 'lucide-react';

type Section = 'general' | 'access' | 'social' | 'admins' | 'data';

const SECTIONS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: '일반', icon: Settings },
  { id: 'access', label: '접근 · 보안', icon: ShieldCheck },
  { id: 'social', label: '소셜 로그인', icon: LogIn },
  { id: 'admins', label: '관리자 계정', icon: KeyRound },
  { id: 'data', label: '데이터 관리', icon: Database },
];

const RESET_CONFIRM_WORD = '초기화';

const Field: React.FC<{ label: string; hint?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }> = ({
  label,
  hint,
  action,
  children,
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] font-medium text-neutral-800">{label}</span>
      {action}
    </div>
    {children}
    {hint && <p className="text-xs text-neutral-500">{hint}</p>}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; danger?: boolean }> = ({
  checked,
  onChange,
  label,
  danger,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
      checked ? (danger ? 'bg-rose-500' : 'bg-brand-600') : 'bg-neutral-300'
    }`}
  >
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
  </button>
);

const SettingRow: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div className="flex items-center justify-between gap-6 py-4">
    <div>
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      <p className="mt-0.5 text-[13px] text-neutral-500">{desc}</p>
    </div>
    {children}
  </div>
);

export const SystemSettingsView: React.FC = () => {
  const { showToast } = useToast();
  const { user, isSuperAdmin } = useAuth();
  const [section, setSection] = useState<Section>('general');
  const [settings, setSettings] = useState<SystemSettings>(() => storage.getSettings());
  const [isDirty, setIsDirty] = useState(false);

  const [targetAdminEmail, setTargetAdminEmail] = useState(user?.email || 'teamdevstudiont@gmail.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const allowedAdmins = [
    { email: 'teamdevstudiont@gmail.com', name: 'TDSNTLMS' },
    { email: 'eunyool100208@gmail.com', name: '은율' },
    { email: 'deer123424@gmail.com', name: '은율' },
    { email: 'ayun24song@gmail.com', name: '윤아' },
  ];

  const update = (patch: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const handleSave = async () => {
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
    setIsDirty(false);
    showToast('설정을 저장했습니다.', 'success');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) return showToast('현재 비밀번호를 입력해 주세요.', 'error');
    if (newPassword.length < 6) return showToast('새 비밀번호는 6자 이상이어야 합니다.', 'error');
    if (newPassword !== confirmPassword) return showToast('새 비밀번호 확인이 일치하지 않습니다.', 'error');

    setIsChangingPw(true);
    try {
      const res = await authApi.changePassword(targetAdminEmail, currentPassword, newPassword);
      showToast(res.message || '비밀번호를 변경했습니다.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || '비밀번호 변경에 실패했습니다.', 'error');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleResetLearningData = async () => {
    if (resetConfirmText.trim() !== RESET_CONFIRM_WORD || !user) return;
    setIsResetting(true);
    try {
      const res = await storage.resetAllLearningData({ id: user.id, name: user.name });
      setSettings(storage.getSettings());
      showToast(`수강 ${res.enrollments}건, 진도 ${res.progress}건, 수료증 ${res.certificates}건을 초기화했습니다.`, 'success');
      setIsResetOpen(false);
      setResetConfirmText('');
    } catch (err: any) {
      showToast(err?.message || '초기화에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('복사했습니다.', 'success');
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const showSaveBar = section === 'general' || section === 'access' || section === 'social';
  const current = SECTIONS.find((s) => s.id === section)!;

  const socialBlocks = [
    {
      key: 'kakao',
      name: '카카오',
      badge: 'bg-[#FEE500] text-black',
      enabled: settings.kakaoLoginEnabled !== false,
      setEnabled: (v: boolean) => update({ kakaoLoginEnabled: v }),
      callback: `${origin}/api/auth/kakao/callback`,
      guide: (
        <>
          <a href="https://developers.kakao.com" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
            Kakao Developers
          </a>{' '}
          → 내 애플리케이션 → 앱 키의 <b>REST API 키</b>를 입력하고, 카카오 로그인을 켠 뒤 아래 Redirect URI를 등록하세요.
        </>
      ),
      fields: [
        { label: 'Client ID (REST API 키)', value: settings.kakaoClientId || '', set: (v: string) => update({ kakaoClientId: v }), secret: false },
        { label: 'Client Secret (선택)', value: settings.kakaoClientSecret || '', set: (v: string) => update({ kakaoClientSecret: v }), secret: true },
      ],
    },
    {
      key: 'naver',
      name: '네이버',
      badge: 'bg-[#03C75A] text-white',
      enabled: settings.naverLoginEnabled !== false,
      setEnabled: (v: boolean) => update({ naverLoginEnabled: v }),
      callback: `${origin}/api/auth/naver/callback`,
      guide: (
        <>
          <a href="https://developers.naver.com" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
            Naver Developers
          </a>{' '}
          → 애플리케이션 등록에서 Client ID와 Secret을 발급받고, 아래 Callback URL을 등록하세요.
        </>
      ),
      fields: [
        { label: 'Client ID', value: settings.naverClientId || '', set: (v: string) => update({ naverClientId: v }), secret: false },
        { label: 'Client Secret', value: settings.naverClientSecret || '', set: (v: string) => update({ naverClientSecret: v }), secret: true },
      ],
    },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader title="환경설정" description="플랫폼 운영 정책과 로그인 연동, 관리자 계정, 데이터를 관리합니다." />

      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start">
        <nav aria-label="설정 메뉴" className="-mx-4 flex gap-1 overflow-x-auto px-4 scrollbar-none lg:sticky lg:top-[88px] lg:mx-0 lg:flex-col lg:px-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  active ? 'bg-white text-neutral-900 shadow-xs ring-1 ring-neutral-200' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                } ${id === 'data' ? 'lg:mt-4' : ''}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </nav>

        <section className="min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-neutral-900">{current.label}</h2>
          </div>

          <div className="p-5 sm:p-6">
            {section === 'general' && (
              <div className="max-w-2xl space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="플랫폼 이름">
                    <input type="text" value={settings.platformName} onChange={(e) => update({ platformName: e.target.value })} className="lms-input" />
                  </Field>
                  <Field label="문의 이메일" hint="푸터와 안내 문구에 표시됩니다.">
                    <input type="email" value={settings.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })} className="lms-input" />
                  </Field>
                </div>
                {(
                  [
                    { label: '운영 규정 링크', key: 'termsUrl', modal: 'terms' },
                    { label: '개인정보처리방침 링크', key: 'privacyUrl', modal: 'privacy' },
                  ] as const
                ).map((f) => (
                  <Field
                    key={f.key}
                    label={f.label}
                    action={
                      <span className="flex items-center gap-3 text-xs">
                        <button type="button" onClick={() => openPolicyModal(f.modal)} className="font-medium text-brand-700 hover:underline cursor-pointer">
                          미리보기
                        </button>
                        {settings[f.key] && (
                          <a href={settings[f.key]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-neutral-500 hover:text-neutral-800">
                            열기 <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </span>
                    }
                  >
                    <input
                      type="url"
                      value={settings[f.key] || ''}
                      onChange={(e) => update({ [f.key]: e.target.value } as Partial<SystemSettings>)}
                      placeholder="https://"
                      className="lms-input font-mono text-[13px]"
                    />
                  </Field>
                ))}
              </div>
            )}

            {section === 'access' && (
              <div className="max-w-2xl divide-y divide-neutral-100">
                <SettingRow title="신규 회원가입 허용" desc="끄면 새 직원이 직접 가입할 수 없습니다.">
                  <Toggle checked={settings.allowRegistration} onChange={(v) => update({ allowRegistration: v })} label="신규 회원가입 허용" />
                </SettingRow>
                <SettingRow title="점검 모드" desc="켜면 관리자를 제외한 사용자의 접속이 제한됩니다.">
                  <Toggle checked={settings.maintenanceMode} onChange={(v) => update({ maintenanceMode: v })} label="점검 모드" danger />
                </SettingRow>
              </div>
            )}

            {section === 'social' && (
              <div className="space-y-6">
                {socialBlocks.map((b) => (
                  <div key={b.key} className="rounded-lg border border-neutral-200">
                    <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
                      <span className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${b.badge}`}>{b.name[0] === '카' ? 'K' : 'N'}</span>
                        {b.name} 로그인
                      </span>
                      <Toggle checked={b.enabled} onChange={b.setEnabled} label={`${b.name} 로그인 사용`} />
                    </div>
                    <div className="space-y-4 p-4">
                      <p className="text-[13px] leading-relaxed text-neutral-600">{b.guide}</p>
                      <Field
                        label="Redirect / Callback URL"
                        action={
                          <button type="button" onClick={() => copy(b.callback)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline cursor-pointer">
                            <Copy className="h-3 w-3" /> 복사
                          </button>
                        }
                      >
                        <input type="text" readOnly value={b.callback} className="lms-input bg-neutral-50 font-mono text-[13px]" />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {b.fields.map((f) => (
                          <Field key={f.label} label={f.label}>
                            <input
                              type={f.secret ? 'password' : 'text'}
                              value={f.value}
                              onChange={(e) => f.set(e.target.value)}
                              className="lms-input font-mono text-[13px]"
                              autoComplete="off"
                            />
                          </Field>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 text-[10px] font-black text-brand-600">G</span>
                      구글 로그인
                    </p>
                    <p className="mt-0.5 text-[13px] text-neutral-500">Firebase Authentication으로 동작해 별도 키 입력이 필요 없습니다.</p>
                  </div>
                  <Toggle checked={settings.googleLoginEnabled !== false} onChange={(v) => update({ googleLoginEnabled: v })} label="구글 로그인 사용" />
                </div>
              </div>
            )}

            {section === 'admins' && (
              <div className="space-y-8">
                <div>
                  <p className="mb-2 text-[13px] font-medium text-neutral-800">관리자로 지정된 계정</p>
                  <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                    {allowedAdmins.map((adm) => {
                      const isCurrent = user?.email.toLowerCase() === adm.email.toLowerCase();
                      return (
                        <li key={adm.email} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                          <span className="min-w-0">
                            <span className="font-medium text-neutral-900">{adm.name}</span>
                            <span className="ml-2 font-mono text-[13px] text-neutral-500">{adm.email}</span>
                          </span>
                          {isCurrent && (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-700">
                              <Check className="h-3.5 w-3.5" />
                              현재 계정
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                  <div>
                    <p className="text-[13px] font-medium text-neutral-800">관리자 비밀번호 변경</p>
                    <p className="mt-0.5 text-xs text-neutral-500">처음 받은 비밀번호로 로그인했다면 바로 변경하세요.</p>
                  </div>
                  <Field label="대상 계정">
                    <select value={targetAdminEmail} onChange={(e) => setTargetAdminEmail(e.target.value)} className="lms-input font-mono text-[13px]">
                      {allowedAdmins.map((adm) => (
                        <option key={adm.email} value={adm.email}>
                          {adm.email} ({adm.name})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="현재 비밀번호">
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        className="lms-input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="새 비밀번호 (6자 이상)">
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        className="lms-input"
                      />
                    </Field>
                    <Field label="새 비밀번호 확인">
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        className="lms-input"
                      />
                    </Field>
                  </div>
                  <button type="submit" disabled={isChangingPw} className="lms-btn lms-btn-primary">
                    <Lock className="h-4 w-4" />
                    {isChangingPw ? '변경 중…' : '비밀번호 변경'}
                  </button>
                </form>
              </div>
            )}

            {section === 'data' && (
              <div className="max-w-2xl space-y-4">
                <div className="rounded-lg border border-rose-200">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">학습 기록 초기화</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
                        모든 직원의 수강 등록, 강의 진도, 퀴즈 응시 기록과 수료증을 지웁니다. 강의·사용자·공지는 그대로 남습니다.
                        다른 직원의 기기에 남은 기록도 다음 접속 때 함께 지워집니다.
                      </p>
                      {settings.learningDataResetAt && (
                        <p className="mt-1.5 text-xs text-neutral-400">
                          마지막 초기화: {new Date(settings.learningDataResetAt).toLocaleString('ko-KR')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsResetOpen(true)}
                      disabled={!isSuperAdmin}
                      title={!isSuperAdmin ? '서비스 총괄 권한이 필요합니다.' : undefined}
                      className="lms-btn shrink-0 border border-rose-300 bg-white text-rose-600 hover:bg-rose-50"
                    >
                      초기화
                    </button>
                  </div>
                </div>
                {!isSuperAdmin && <p className="text-xs text-neutral-500">데이터 초기화는 서비스 총괄 권한이 있어야 할 수 있습니다.</p>}
              </div>
            )}
          </div>

          {showSaveBar && (
            <div className="flex items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-3 sm:px-6">
              <span className="text-[13px] text-neutral-500">{isDirty ? '저장하지 않은 변경 사항이 있습니다.' : '변경 사항이 없습니다.'}</span>
              <button type="button" onClick={handleSave} disabled={!isDirty} className="lms-btn lms-btn-primary lms-btn-sm">
                <Save className="h-4 w-4" />
                저장
              </button>
            </div>
          )}
        </section>
      </div>

      <BaseModal
        isOpen={isResetOpen}
        onClose={() => !isResetting && setIsResetOpen(false)}
        title="학습 기록 초기화"
        maxWidth="md"
        footerContent={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsResetOpen(false)} disabled={isResetting} className="lms-btn lms-btn-secondary">
              취소
            </button>
            <button
              type="button"
              onClick={handleResetLearningData}
              disabled={resetConfirmText.trim() !== RESET_CONFIRM_WORD || isResetting}
              className="lms-btn bg-rose-600 text-white hover:bg-rose-700"
            >
              {isResetting ? '초기화 중…' : '초기화'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p className="leading-relaxed">모든 직원의 수강 기록, 진도, 퀴즈 기록, 수료증이 영구 삭제되며 되돌릴 수 없습니다.</p>
          </div>
          <Field label={`계속하려면 '${RESET_CONFIRM_WORD}'를 입력하세요`}>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              className="lms-input"
              autoFocus
              aria-label="확인 문구"
            />
          </Field>
        </div>
      </BaseModal>
    </div>
  );
};
