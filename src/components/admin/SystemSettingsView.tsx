import React, { useEffect, useState } from 'react';
import { storage } from '../../services/storage';
import { PolicyOverride, SystemSettings } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/authApi';
import { openPolicyModal } from '../common/PolicyModal';
import { getDiscordStatus, sendDiscordTest } from '../../services/discordNotify';
import { defaultPolicy, formatKoreanDate, overrideToDocument, parsePolicyText, POLICY_LABELS, policyToText, PolicyType } from '../../services/policies';
import { AdminPageHeader } from './AdminPageHeader';
import { BaseModal } from '../common/BaseModal';
import { AlertTriangle, Bell, Check, Copy, Database, Eye, EyeOff, FileText, KeyRound, Lock, LogIn, Mail, RotateCcw, Save, Send, Settings, ShieldCheck } from 'lucide-react';

type Section = 'general' | 'access' | 'policies' | 'notifications' | 'mail' | 'social' | 'admins' | 'data';

const SECTIONS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: '일반', icon: Settings },
  { id: 'access', label: '접근 · 보안', icon: ShieldCheck },
  { id: 'policies', label: '약관 · 정책', icon: FileText },
  { id: 'notifications', label: '알림 (Discord)', icon: Bell },
  { id: 'mail', label: '메일 발송 점검', icon: Mail },
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

  const [policyTab, setPolicyTab] = useState<PolicyType>('terms');
  const [discordConfigured, setDiscordConfigured] = useState<boolean | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    if (section !== 'notifications') return;
    setDiscordConfigured(null);
    getDiscordStatus().then((s) => setDiscordConfigured(s ? s.configured : false));
  }, [section]);

  type MailLogEntry = { at: string; to: string; type: 'reset' | 'test'; ok: boolean; note: string };
  const [mailStatus, setMailStatus] = useState<{ transport: string | null; entries: MailLogEntry[] } | null>(null);
  const [mailTestTo, setMailTestTo] = useState(user?.email || '');
  const [isSendingMail, setIsSendingMail] = useState(false);

  const loadMailStatus = () =>
    fetch('/api/admin/mail/status')
      .then((r) => r.json())
      .then((d) => setMailStatus(d.success ? { transport: d.transport, entries: d.entries || [] } : { transport: null, entries: [] }))
      .catch(() => setMailStatus({ transport: null, entries: [] }));

  useEffect(() => {
    if (section !== 'mail') return;
    setMailStatus(null);
    loadMailStatus();
  }, [section]);

  const handleMailTest = async () => {
    setIsSendingMail(true);
    try {
      const res = await fetch('/api/admin/mail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: mailTestTo }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) showToast(`테스트 메일을 보냈습니다 (${((data.ms || 0) / 1000).toFixed(1)}초). 메일함을 확인해 주세요.`, 'success');
      else showToast(data.message || '테스트 메일을 보내지 못했습니다.', 'error');
    } catch {
      showToast('서버에 연결하지 못했습니다.', 'error');
    } finally {
      setIsSendingMail(false);
      loadMailStatus();
    }
  };

  const discordOn = (key: 'enrollment' | 'completion' | 'inquiry' | 'security') => settings.discordNotify?.[key] !== false;
  const setDiscordOn = (key: 'enrollment' | 'completion' | 'inquiry' | 'security', on: boolean) =>
    update({ discordNotify: { ...settings.discordNotify, [key]: on } });

  const handleDiscordTest = async () => {
    setIsSendingTest(true);
    const res = await sendDiscordTest(user?.name || '관리자');
    setIsSendingTest(false);
    if (res.sent) return showToast('테스트 알림을 보냈습니다. Discord 채널을 확인해 주세요.', 'success');
    const reasons: Record<string, string> = {
      not_configured: '서버에 DISCORD_WEBHOOK_URL이 설정되지 않았습니다.',
      webhook_error: 'Discord가 요청을 거절했습니다. 웹후크 URL이 맞는지, 삭제되지 않았는지 확인해 주세요.',
      rate_limited: '잠시 후 다시 시도해 주세요.',
    };
    showToast(reasons[res.reason || ''] || '테스트 알림을 보내지 못했습니다.', 'error');
  };

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

  /** The policy as it currently stands in the form: the edited version, or the built-in text. */
  const policyDraft = (type: PolicyType): PolicyOverride => {
    const saved = settings.policies?.[type];
    if (saved && saved.body?.trim()) return saved;
    const d = defaultPolicy(type);
    return { effectiveDate: d.effectiveDate, overview: d.overview, body: policyToText(d.articles), updatedAt: '' };
  };

  const updatePolicy = (type: PolicyType, patch: Partial<PolicyOverride>) => {
    update({
      policies: {
        ...settings.policies,
        [type]: { ...policyDraft(type), ...patch, updatedAt: new Date().toISOString(), updatedByName: user?.name },
      },
    });
  };

  const resetPolicy = (type: PolicyType) => update({ policies: { ...settings.policies, [type]: null } });

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
  const showSaveBar = section === 'general' || section === 'access' || section === 'policies' || section === 'notifications' || section === 'social';
  const draft = policyDraft(policyTab);
  const draftArticles = parsePolicyText(draft.body);
  const isCustomPolicy = !!settings.policies?.[policyTab]?.body?.trim();
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
                  <Field label="문의 이메일" hint="문의하기 화면과 푸터에 ‘급한 문의’ 연락처로 표시됩니다.">
                    <input type="email" value={settings.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })} className="lms-input" />
                  </Field>
                </div>
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

            {section === 'policies' && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex self-start rounded-lg bg-neutral-100 p-1" role="tablist">
                    {(['terms', 'privacy'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="tab"
                        aria-selected={policyTab === t}
                        onClick={() => setPolicyTab(t)}
                        className={`h-8 rounded-md px-3 text-[13px] font-medium transition-colors cursor-pointer ${
                          policyTab === t ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        {POLICY_LABELS[t]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {isCustomPolicy
                      ? `직접 수정한 문구 · ${formatKoreanDate(draft.updatedAt)}${draft.updatedByName ? ` ${draft.updatedByName}` : ''}`
                      : '기본 문구를 사용하고 있어요.'}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-[240px_minmax(0,1fr)]">
                  <Field label="시행일">
                    <input
                      type="text"
                      value={draft.effectiveDate}
                      onChange={(e) => updatePolicy(policyTab, { effectiveDate: e.target.value })}
                      placeholder="2026년 1월 1일"
                      className="lms-input"
                    />
                  </Field>
                </div>

                <Field label="개요" hint="문서 맨 위에 요약으로 표시됩니다.">
                  <textarea
                    value={draft.overview}
                    onChange={(e) => updatePolicy(policyTab, { overview: e.target.value })}
                    rows={3}
                    className="lms-input h-auto resize-y py-2.5 leading-relaxed"
                  />
                </Field>

                <Field
                  label="본문"
                  action={
                    <span className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => openPolicyModal(policyTab, overrideToDocument(policyTab, { ...draft, updatedAt: draft.updatedAt || new Date().toISOString() }))}
                        className="font-medium text-brand-700 hover:underline cursor-pointer"
                      >
                        미리보기
                      </button>
                      {isCustomPolicy && (
                        <button type="button" onClick={() => resetPolicy(policyTab)} className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-900 cursor-pointer">
                          <RotateCcw className="h-3 w-3" />
                          기본 문구로 되돌리기
                        </button>
                      )}
                    </span>
                  }
                  hint={
                    <>
                      ‘## 제1조 목적’처럼 <code className="rounded bg-neutral-100 px-1">##</code>로 시작하는 줄이 조항 제목이 되고, 나머지 줄은 한 줄이 한 문단이 됩니다. 현재{' '}
                      {draftArticles.length}개 조항
                    </>
                  }
                >
                  <textarea
                    value={draft.body}
                    onChange={(e) => updatePolicy(policyTab, { body: e.target.value })}
                    rows={20}
                    spellCheck={false}
                    className="lms-input h-auto resize-y py-3 text-[13px] leading-relaxed"
                  />
                </Field>

                <p className="rounded-lg bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
                  저장하면 바로 모든 사용자에게 적용됩니다. 내용이 바뀌면 운영 규정 제3조에 따라 시행 7일 전(불리한 변경은 30일 전)까지 공지사항으로 알려 주세요.
                </p>
              </div>
            )}

            {section === 'notifications' && (
              <div className="max-w-2xl space-y-6">
                <div
                  className={`rounded-lg border px-4 py-4 ${
                    discordConfigured ? 'border-emerald-200 bg-emerald-50/60' : discordConfigured === false ? 'border-amber-200 bg-amber-50/60' : 'border-neutral-200'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          discordConfigured ? 'bg-emerald-500' : discordConfigured === false ? 'bg-amber-500' : 'bg-neutral-300'
                        }`}
                      />
                      {discordConfigured === null
                        ? '연결 상태를 확인하는 중…'
                        : discordConfigured
                          ? 'Discord 웹후크가 연결되어 있습니다.'
                          : 'Discord 웹후크가 아직 연결되지 않았습니다.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleDiscordTest}
                      disabled={!discordConfigured || isSendingTest}
                      className="lms-btn lms-btn-secondary lms-btn-sm shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      테스트 알림 보내기
                    </button>
                  </div>
                  {discordConfigured === false && (
                    <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-neutral-700">
                      <li>
                        Discord에서 알림을 받을 채널의 <b>채널 편집 → 연동 → 웹후크 → 새 웹후크</b>를 만들고 <b>웹후크 URL 복사</b>를 누릅니다.
                      </li>
                      <li>
                        Render 대시보드의 LMS 서비스 → <b>Environment</b>에 이름 <code className="rounded bg-white px-1">DISCORD_WEBHOOK_URL</code>로 붙여 넣고
                        저장합니다.
                      </li>
                      <li>재배포가 끝나면 이 화면에서 ‘테스트 알림 보내기’로 확인합니다.</li>
                    </ol>
                  )}
                  <p className="mt-3 text-xs text-neutral-500">
                    웹후크 URL을 가진 사람은 누구나 채널에 글을 올릴 수 있어서, URL은 이 화면이나 데이터베이스가 아닌 서버 환경 변수에만 저장합니다.
                  </p>
                </div>

                <div className="divide-y divide-neutral-100">
                  <SettingRow title="수강 신청 · 배정" desc="직원이 강의를 수강 신청하거나 관리자가 수강을 배정하면 알립니다.">
                    <Toggle checked={discordOn('enrollment')} onChange={(v) => setDiscordOn('enrollment', v)} label="수강 신청 · 배정 알림" />
                  </SettingRow>
                  <SettingRow title="수료" desc="직원이 과정을 수료하면 알립니다.">
                    <Toggle checked={discordOn('completion')} onChange={(v) => setDiscordOn('completion', v)} label="수료 알림" />
                  </SettingRow>
                  <SettingRow title="문의 접수" desc="새 문의(로그인하지 않은 방문자의 문의 포함)가 들어오면 알립니다.">
                    <Toggle checked={discordOn('inquiry')} onChange={(v) => setDiscordOn('inquiry', v)} label="문의 접수 알림" />
                  </SettingRow>
                  <SettingRow
                    title="보안 · 이상 행동"
                    desc="관리자 로그인, 관리자 로그인 실패 반복, 정지된 계정의 로그인 시도, 진도 조작 의심, 영상 건너뛰기 반복 시도, 그리고 권한 변경 · 사용자 삭제 · 강의 삭제 · 학습 기록 초기화 같은 관리 작업을 알립니다."
                  >
                    <Toggle checked={discordOn('security')} onChange={(v) => setDiscordOn('security', v)} label="보안 알림" />
                  </SettingRow>
                </div>

                <p className="text-xs leading-relaxed text-neutral-500">
                  알림에는 직원 이름, 강의명, 문의 제목과 문의에 첨부된 사진(최대 4장)이 들어가고, 문의 본문과 사진이 아닌 첨부파일은 이름만 보냅니다. 보안 경고에는 확인에 필요한 계정과 접속 IP가 포함됩니다. 켜고 끈 설정은
                  저장 후 1분 안에 적용됩니다.
                </p>
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

            {section === 'mail' && (
              <div className="max-w-2xl space-y-6">
                <div
                  className={`rounded-lg border px-4 py-4 ${
                    mailStatus?.transport ? 'border-emerald-200 bg-emerald-50/60' : mailStatus ? 'border-amber-200 bg-amber-50/60' : 'border-neutral-200'
                  }`}
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${mailStatus?.transport ? 'bg-emerald-500' : mailStatus ? 'bg-amber-500' : 'bg-neutral-300'}`}
                    />
                    {!mailStatus
                      ? '메일 설정을 확인하는 중…'
                      : mailStatus.transport
                        ? `메일 발송이 설정되어 있습니다 (${mailStatus.transport === 'relay' ? 'Apps Script 중계' : 'Gmail SMTP'}).`
                        : '메일 발송이 설정되지 않았습니다. Render 환경 변수 MAIL_RELAY_SECRET을 확인해 주세요.'}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      value={mailTestTo}
                      onChange={(e) => setMailTestTo(e.target.value)}
                      placeholder="받을 메일 주소"
                      className="lms-input flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleMailTest}
                      disabled={!mailStatus?.transport || isSendingMail || !mailTestTo.trim()}
                      className="lms-btn lms-btn-secondary lms-btn-sm shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {isSendingMail ? '보내는 중…' : '테스트 메일 보내기'}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-neutral-500">
                    비밀번호 찾기 메일과 같은 경로로 보냅니다. 보냈는데 받은편지함에 없으면 스팸함과 프로모션 탭을 확인해 주세요.
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-900">최근 발송 기록</p>
                    <button type="button" onClick={loadMailStatus} className="lms-btn lms-btn-secondary lms-btn-sm">
                      <RotateCcw className="h-3.5 w-3.5" />
                      새로고침
                    </button>
                  </div>
                  {mailStatus && mailStatus.entries.length === 0 ? (
                    <p className="rounded-lg border border-neutral-200 px-4 py-6 text-center text-[13px] text-neutral-500">아직 기록이 없습니다.</p>
                  ) : (
                    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                      {(mailStatus?.entries || []).map((e, i) => (
                        <li key={i} className="flex flex-col gap-0.5 px-4 py-2.5 text-[13px] sm:flex-row sm:items-center sm:gap-3">
                          <span className="w-36 shrink-0 text-xs text-neutral-500">{new Date(e.at).toLocaleString('ko-KR')}</span>
                          <span className="w-16 shrink-0 text-xs text-neutral-500">{e.type === 'reset' ? '비번 찾기' : '테스트'}</span>
                          <span className="min-w-0 flex-1 truncate font-mono text-neutral-800">{e.to}</span>
                          <span className={`text-xs font-medium ${e.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{e.note}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-neutral-400">
                    최근 50건까지 남습니다. 주소는 앞 두 글자만 보입니다. 기록이 아예 없으면 요청이 서버까지 오지 않은 것입니다.
                  </p>
                </div>
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
