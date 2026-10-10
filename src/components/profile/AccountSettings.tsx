import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { Avatar } from '../common/Avatar';
import { useToast } from '../../context/ToastContext';
import { getProfileDecoration, PROFILE_DECORATIONS } from '../../utils/profileDecorations';
import { getRoleLabel, getRoleMetadata } from '../../utils/rbac';
import { AchievementBadge, CustomFrameConfig } from '../../types';
import { MedallionBadge } from './MedallionBadge';
import { AdminFrameEditor } from './AdminFrameEditor';
import { BadgeTitleModal } from './BadgeTitleModal';
import { AchievementInsignia } from './AchievementInsignia';
import {
  User as UserIcon,
  Shield,
  BookOpen,
  Camera,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  Award,
  Lock,
  Phone,
  Mail,
  AlertCircle,
  Sparkles,
  Trophy,
  Palette,
  Check,
  RotateCcw,
  Edit2,
  Crown,
  Sliders,
} from 'lucide-react';

interface AccountSettingsProps {
  onNavigateToCourse?: (courseId: string) => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ onNavigateToCourse }) => {
  const { user, updateProfile, updateAvatar, equipAchievement, isSuperAdmin, isServiceOwner, isAdmin } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'decorations' | 'security' | 'stats'>('profile');

  // Filter for decorations tab
  const [decorationFilter, setDecorationFilter] = useState<'all' | 'earned' | 'locked' | 'admin'>('all');

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Decoration preview state (selected decoration before applying)
  const [previewDecorationId, setPreviewDecorationId] = useState<string | null>(
    user?.equippedAchievementId ?? null
  );
  const [isApplyingDecoration, setIsApplyingDecoration] = useState(false);

  // Badge title editing modal state
  const [editingBadge, setEditingBadge] = useState<AchievementBadge | null>(null);

  // Custom frames
  const [customFrames, setCustomFrames] = useState<CustomFrameConfig[]>(() => {
    return storage.getCustomFrames();
  });

  // Badge list version tracker to trigger re-renders upon rename
  const [badgeVersion, setBadgeVersion] = useState(0);

  // Keep preview in sync with current user equipped badge on initial load or user change
  useEffect(() => {
    if (user) {
      setPreviewDecorationId(user.equippedAchievementId ?? null);
      setName(user.name || '');
      setNickname(user.nickname || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Real learning stats from storage
  const learningStats = useMemo(() => {
    if (!user) return { totalEnrolled: 0, completedCoursesCount: 0, overallProgressPercent: 0, totalMinutes: 0, enrolledDetails: [] };
    return storage.getUserLearningStats(user.id);
  }, [user]);

  // Real badges belonging to this user (excluding removed badges per UI/UX specification)
  const userBadges = useMemo(() => {
    if (!user) return [];
    return storage
      .getUserBadges(user.id)
      .filter((b) => b.id !== 'badge_admin_system' && b.id !== 'badge_admin_security');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, badgeVersion]);

  // Current actually equipped badge
  const currentEquippedBadge = useMemo(() => {
    if (!user?.equippedAchievementId) return null;
    return userBadges.find((b) => b.id === user.equippedAchievementId) ?? null;
  }, [user?.equippedAchievementId, userBadges]);

  // Preview decoration metadata
  const previewDecoration = useMemo(() => {
    return getProfileDecoration(previewDecorationId, user?.role, customFrames);
  }, [previewDecorationId, user?.role, customFrames]);

  // Currently saved decoration metadata
  const currentSavedDecoration = useMemo(() => {
    return getProfileDecoration(user?.equippedAchievementId, user?.role, customFrames);
  }, [user?.equippedAchievementId, user?.role, customFrames]);

  // Categorize badges for decoration selector
  const standardBadges = useMemo(() => {
    return userBadges.filter((b) => !b.isAdminOnly);
  }, [userBadges]);

  const adminBadges = useMemo(() => {
    return userBadges.filter((b) => !!b.isAdminOnly);
  }, [userBadges]);

  // Filtered badges based on active filter
  const filteredBadges = useMemo(() => {
    let list = userBadges;
    if (decorationFilter === 'earned') {
      list = userBadges.filter((b) => (isAdmin ? true : (b.unlocked || b.earned)));
    } else if (decorationFilter === 'locked') {
      list = isAdmin ? [] : userBadges.filter((b) => !b.unlocked && !b.earned);
    } else if (decorationFilter === 'admin') {
      list = userBadges.filter((b) => b.isAdminOnly);
    }
    return list;
  }, [userBadges, decorationFilter, isAdmin]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <p className="text-slate-500">로그인이 필요한 페이지입니다.</p>
      </div>
    );
  }

  // Handle Avatar Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일(JPG, PNG, WebP)만 업로드할 수 있습니다.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('파일 크기는 5MB 이하만 가능합니다.', 'error');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        await updateAvatar(base64);
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('사진 처리 중 오류가 발생했습니다.', 'error');
      setIsUploadingAvatar(false);
    }
  };

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('성명(이름)을 입력해주세요.', 'error');
      return;
    }

    const canEditEmail = isSuperAdmin || isServiceOwner;
    if (canEditEmail && email.trim() && !email.includes('@')) {
      showToast('올바른 이메일 형식을 입력해주세요.', 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        nickname: nickname.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        ...(canEditEmail && email.trim() ? { email: email.trim().toLowerCase() } : {}),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('현재 비밀번호를 입력해주세요.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('새 비밀번호는 6자 이상이어야 합니다.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('비밀번호가 성공적으로 변경되었습니다.', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.message || '비밀번호 변경에 실패했습니다.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || '네트워크 오류가 발생했습니다.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Decoration Selection (Preview only)
  const handleSelectDecoration = (badgeId: string | null, isEarned: boolean, isAdminOnly: boolean) => {
    if (badgeId === null) {
      // Default (None) is always selectable
      setPreviewDecorationId(null);
      return;
    }

    // Admins auto-earn all badges
    if (!isEarned && !isAdmin) {
      showToast('아직 획득하지 않은 업적은 장식으로 선택할 수 없습니다.', 'warning', '미획득 업적');
      return;
    }

    if (isAdminOnly && !isAdmin) {
      showToast('관리자 전용 업적은 관리자 권한 계정만 사용할 수 있습니다.', 'error', '권한 제한');
      return;
    }

    setPreviewDecorationId(badgeId);
  };

  // Handle Decoration Apply (Save to backend/storage)
  const handleApplyDecoration = async () => {
    setIsApplyingDecoration(true);
    try {
      await equipAchievement(previewDecorationId ?? 'none');
    } finally {
      setIsApplyingDecoration(false);
    }
  };

  const hasDecorationChanges = previewDecorationId !== (user.equippedAchievementId ?? null);

  const handleFrameSaved = async (frame: CustomFrameConfig) => {
    const updated = storage.getCustomFrames();
    setCustomFrames(updated);
    setPreviewDecorationId(`custom_frame_${frame.id}`);
    await equipAchievement(`custom_frame_${frame.id}`);
  };

  const handleEquipCustomFrame = async (frameIdWithPrefix: string) => {
    setPreviewDecorationId(frameIdWithPrefix);
    setIsApplyingDecoration(true);
    try {
      await equipAchievement(frameIdWithPrefix);
    } finally {
      setIsApplyingDecoration(false);
    }
  };

  return (
    <div className="lms-container max-w-6xl space-y-6 py-8">
      {/* 1. Header Card: Profile Image + Decoration, Identity, Equipped Badge, Actions */}
      <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-6 sm:p-8">

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Profile Image with equipped Frame & Hover Change Camera */}
            <div className="relative group shrink-0">
              <Avatar
                user={user}
                size="2xl"
                showRoleBadge
                equippedAchievementId={user.equippedAchievementId}
                customFrames={customFrames}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 bg-black/45 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold cursor-pointer z-20"
                title="프로필 사진 변경"
                aria-label="프로필 사진 변경"
              >
                <Camera className="w-6 h-6 mb-1 text-white" />
                <span>사진 변경</span>
              </button>
            </div>

            {/* Profile Identity Details */}
            <div className="space-y-2">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  {user.name}
                </h1>
                <p className="text-sm font-semibold text-slate-400">
                  @{user.nickname || user.name}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user.email}</span>
                </p>
              </div>

              {/* Role Badge */}
              <div className="flex items-center gap-2 pt-0.5">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold tracking-wide flex items-center gap-1 ${
                    isSuperAdmin
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : isAdmin
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{getRoleLabel(user?.role)}</span>
                </span>
              </div>

              {/* Currently Equipped Achievement Banner */}
              <div className="pt-1">
                <div className="text-[11px] font-semibold text-slate-400 mb-1">현재 장착 업적</div>
                {currentSavedDecoration ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
                    <AchievementInsignia
                      badgeId={currentSavedDecoration.id}
                      icon={currentSavedDecoration.icon}
                      size="xs"
                    />
                    <span className="text-xs font-bold text-slate-900">{currentSavedDecoration.badgeTitle}</span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        currentSavedDecoration.isAdminOnly
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {currentSavedDecoration.tierName}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-medium">
                    <span>기본 테두리 장착 중</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Learning Stat Snapshot */}
          <div className="flex w-full shrink-0 items-center justify-around gap-4 rounded-lg border border-neutral-200 p-4 md:w-auto">
            <div className="text-center px-2">
              <div className="text-xs text-slate-500 font-semibold">수강 강의</div>
              <div className="text-lg font-bold text-neutral-900 mt-0.5 tabular-nums">{learningStats.totalEnrolled}개</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center px-2">
              <div className="text-xs text-slate-500 font-semibold">완료 강의</div>
              <div className="text-lg font-bold text-neutral-900 mt-0.5 tabular-nums">
                {learningStats.completedCoursesCount}개
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center px-2">
              <div className="text-xs text-slate-500 font-semibold">획득 업적</div>
              <div className="text-lg font-bold text-neutral-900 mt-0.5 tabular-nums">
                {userBadges.filter((b) => (isAdmin ? true : (b.unlocked || b.earned))).length}개
              </div>
            </div>
          </div>
        </div>

        {/* Hidden File Input for Avatar */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* 2. Section navigation (vertical on desktop) + content */}
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label="설정 메뉴"
          className="-mx-4 flex gap-1 overflow-x-auto border-b border-neutral-200 px-4 scrollbar-none lg:sticky lg:top-[88px] lg:mx-0 lg:flex-col lg:border-0 lg:px-0"
        >
          {(
            [
              { id: 'profile', domId: 'tab-profile-edit', label: '기본 정보', icon: UserIcon },
              { id: 'decorations', domId: 'tab-profile-decorations', label: '업적 · 장식', icon: Palette },
              { id: 'security', domId: 'tab-profile-security', label: '비밀번호 · 보안', icon: Shield },
              { id: 'stats', domId: 'tab-profile-stats', label: '학습 현황', icon: BookOpen },
            ] as const
          ).map(({ id, domId, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                id={domId}
                onClick={() => setActiveTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex shrink-0 items-center gap-2.5 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors cursor-pointer lg:rounded-lg lg:py-2.5 ${
                  active ? 'text-neutral-900 lg:bg-white lg:shadow-xs lg:ring-1 lg:ring-neutral-200' : 'text-neutral-500 hover:text-neutral-900 lg:hover:bg-neutral-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {id === 'decorations' && hasDecorationChanges && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-neutral-900 lg:hidden" />}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-6">
      {/* Tab 1: Profile Edit */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white border border-slate-200/80 rounded-xl p-6 sm:p-8"
          >
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">기본 정보 수정</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  TDSNTLMS에서 표시될 사용자 성명과 계정 프로필 정보를 관리합니다.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    성명 (이름) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-user-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    닉네임 (별칭)
                  </label>
                  <input
                    type="text"
                    id="input-user-nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="예: 코딩러버"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      이메일 계정
                    </label>
                    {isSuperAdmin || isServiceOwner ? (
                      <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200/90 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-600" />
                        <span>총괄 권한 (이메일 변경 가능)</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-normal">(수정 불가)</span>
                    )}
                  </div>
                  {isSuperAdmin || isServiceOwner ? (
                    <div className="relative">
                      <input
                        type="email"
                        id="input-user-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="eunyool100208@gmail.com"
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-amber-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-slate-900 shadow-2xs"
                      />
                      <Mail className="w-4 h-4 text-amber-500 absolute left-3 top-3" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3.5 py-2.5 text-sm bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{user.email}</span>
                    </div>
                  )}
                  {isSuperAdmin || isServiceOwner && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      총괄 계정의 로그인 및 알림 수신 이메일 주소를 변경할 수 있습니다.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    휴대폰 번호
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      id="input-user-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="예: 010-1234-5678"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  자기소개 (Bio)
                </label>
                <textarea
                  id="input-user-bio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="학습 목표나 자신에 대한 간단한 소개를 입력하세요."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('decorations')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>프로필 장식 관리하기 →</span>
                </button>

                <button
                  type="submit"
                  id="btn-save-profile"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingProfile ? '저장 중...' : '프로필 저장'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Quick Decoration Summary Card in Profile Tab */}
          <div className="bg-linear-to-r from-indigo-50/70 via-purple-50/50 to-white border border-indigo-100 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Avatar
                user={user}
                size="lg"
                equippedAchievementId={user.equippedAchievementId}
                customFrames={customFrames}
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>프로필 테두리 장식</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  {currentSavedDecoration && (
                    <AchievementInsignia
                      badgeId={currentSavedDecoration.id}
                      icon={currentSavedDecoration.icon}
                      size="xs"
                    />
                  )}
                  <h3 className="text-sm font-black text-slate-900 truncate">
                    {currentSavedDecoration
                      ? currentSavedDecoration.name
                      : '기본 프로필 테두리'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {currentSavedDecoration
                    ? currentSavedDecoration.description
                    : '획득한 학습 업적으로 프로필 이미지를 멋지게 장식해보세요.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('decorations')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              장식 변경
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Profile Decorations & Achievements Frame Selector */}
      {activeTab === 'decorations' && (
        <div className="space-y-8">
          {/* Real-time Preview Banner Card */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                    <Palette className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    프로필 장식 및 업적
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  획득한 업적과 관리자 커스텀 프레임을 프로필 장식으로 설정할 수 있습니다.
                </p>
              </div>

              {/* Apply / Cancel Controls */}
              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                {hasDecorationChanges && (
                  <button
                    type="button"
                    onClick={() => setPreviewDecorationId(user.equippedAchievementId ?? null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>원래대로</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-apply-decoration"
                  onClick={handleApplyDecoration}
                  disabled={isApplyingDecoration || !hasDecorationChanges}
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isApplyingDecoration ? '적용 중...' : '프로필에 장착하기'}</span>
                </button>
              </div>
            </div>

            {/* Interactive Shared Preview Container */}
            <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/70 flex flex-col sm:flex-row items-center gap-6 justify-between">
              <div className="flex items-center gap-5">
                <div className="shrink-0 p-2">
                  <Avatar
                    user={user}
                    size="2xl"
                    equippedAchievementId={previewDecorationId}
                    customFrames={customFrames}
                    showRoleBadge
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>실시간 미리보기 Live Preview</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-2">
                      {previewDecoration ? (
                        <>
                          <AchievementInsignia
                            badgeId={previewDecoration.id}
                            icon={previewDecoration.icon}
                            size="sm"
                          />
                          <span>{previewDecoration.name}</span>
                        </>
                      ) : (
                        '기본 장식 (테두리 없음)'
                      )}
                    </span>
                    {previewDecoration && previewDecoration.tierName !== 'CUSTOM ADMIN' && !previewDecoration.id.startsWith('custom_frame_') && (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          previewDecoration.isAdminOnly
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}
                      >
                        {previewDecoration.tierName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 max-w-md">
                    {previewDecoration
                      ? previewDecoration.description
                      : '특수 프레임 없이 깔끔한 기본 프로필 테두리를 적용합니다.'}
                  </p>
                  {hasDecorationChanges && (
                    <p className="text-[11px] text-amber-600 font-bold pt-1">
                      * 장식이 선택되었습니다. 우측 상단의 [프로필에 장착하기] 버튼을 눌러 확정하세요.
                    </p>
                  )}
                </div>
              </div>

              {previewDecorationId !== null && (
                <button
                  type="button"
                  onClick={() => handleSelectDecoration(null, true, false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0 cursor-pointer shadow-2xs"
                >
                  기본 테두리로 복원
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setDecorationFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  decorationFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                전체 업적 ({userBadges.length})
              </button>
              <button
                type="button"
                onClick={() => setDecorationFilter('earned')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  decorationFilter === 'earned'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                획득한 업적 ({userBadges.filter((b) => (isAdmin ? true : (b.unlocked || b.earned))).length})
              </button>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => setDecorationFilter('locked')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    decorationFilter === 'locked'
                      ? 'bg-white text-slate-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  미획득 업적 ({userBadges.filter((b) => !b.unlocked && !b.earned).length})
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setDecorationFilter('admin')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    decorationFilter === 'admin'
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  관리자 전용 ({adminBadges.length})
                </button>
              )}
            </div>

            <div className="text-xs text-slate-400 font-medium">
              * 카드를 클릭하면 상단에서 즉시 미리볼 수 있습니다.
            </div>
          </div>

          {/* Section A: Default Frame Option */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">기본 장식</h3>
            <div
              onClick={() => handleSelectDecoration(null, true, false)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                previewDecorationId === null
                  ? 'bg-indigo-50/60 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-2xl font-bold">
                  👤
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>기본 장식 (테두리 없음)</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      ✓ 기본 제공
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    모든 특수 프레임 장식을 해제하고 깔끔한 기본 테두리로 표시합니다.
                  </p>
                </div>
              </div>

              <div className="shrink-0 pl-2">
                {previewDecorationId === null ? (
                  <span className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-600 text-white flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>선택됨</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-xl text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200">
                    선택
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section B: Medallion Achievement Cards Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600" />
                <h3 className="text-base font-black text-slate-900">학습 업적 뱃지 및 프레임</h3>
                <span className="text-xs text-slate-400 font-semibold">
                  (총 {filteredBadges.length}개)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBadges.map((badge) => {
                const dec = PROFILE_DECORATIONS[badge.id];
                const isEarned = isAdmin ? true : (badge.unlocked || badge.earned);
                const isSelected = previewDecorationId === badge.id;
                const isEquipped = user.equippedAchievementId === badge.id;

                return (
                  <div
                    key={badge.id}
                    onClick={() => handleSelectDecoration(badge.id, isEarned, badge.isAdminOnly)}
                    className={`p-4 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                      !isEarned
                        ? 'bg-slate-50/60 border-slate-200 opacity-60 grayscale cursor-not-allowed'
                        : isSelected
                        ? 'bg-indigo-50/50 border-indigo-600 ring-2 ring-indigo-500/20 shadow-md cursor-pointer'
                        : badge.isAdminOnly
                        ? 'bg-amber-50/20 border-amber-200 hover:border-amber-400 cursor-pointer'
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-2xs cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* 6-Layer Medallion Badge Icon */}
                      <div className="shrink-0 p-1">
                        <MedallionBadge
                          badge={badge}
                          isEarned={isEarned}
                          isEquipped={isEquipped}
                          size="md"
                        />
                      </div>

                      {/* Badge Details */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {badge.title}
                          </h4>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBadge(badge);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="업적 명칭 수정"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="text-[11px] font-bold text-indigo-600 truncate">
                          프레임: {dec?.name || badge.title}
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {dec?.description || badge.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          badge.isAdminOnly
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : dec?.badgeClass || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {badge.isAdminOnly ? 'ADMIN ONLY' : dec?.tierName || badge.tier.toUpperCase()}
                      </span>

                      {isEquipped ? (
                        <span className="text-xs font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>장착 중</span>
                        </span>
                      ) : isSelected ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyDecoration();
                          }}
                          className="text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer transition-all hover:scale-105"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>즉시 장착</span>
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          {isEarned ? '장식 선택 →' : '미획득'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section C: Admin Custom Frame Editor (Requirement 17-26) */}
          {isAdmin && (
            <div className="pt-4">
              <AdminFrameEditor
                onFrameSaved={handleFrameSaved}
                onEquipFrame={handleEquipCustomFrame}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Security & Password Change */}
      {activeTab === 'security' && (
        <form
          onSubmit={handleChangePassword}
          className="bg-white border border-slate-200/80 rounded-xl p-6 sm:p-8"
        >
          <div className="max-w-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">비밀번호 변경</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                안전한 서비스 이용을 위해 비밀번호를 정기적으로 변경해주세요.
              </p>
            </div>

            {isSuperAdmin && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold">총괄 관리자 계정 보안 알림</p>
                  <p className="mt-0.5 text-amber-700">
                    관리자 비밀번호를 변경하면 서버의 인증 해시가 즉시 갱신되며, 다음 로그인 시 새 비밀번호가 적용됩니다.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                현재 비밀번호 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="input-current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 사용 중인 비밀번호"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  새 비밀번호 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="input-new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="최소 6자 이상"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  새 비밀번호 확인 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="input-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호 재입력"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                id="btn-submit-change-password"
                disabled={isChangingPassword}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span>{isChangingPassword ? '변경 중...' : '비밀번호 변경'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 4: Learning Stats & Enrolled Courses */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">수강 중인 강의</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{learningStats.totalEnrolled}개</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">완료한 강의</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{learningStats.completedCoursesCount}개</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">평균 진도율</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{learningStats.overallProgressPercent}%</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">총 학습 시간</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{learningStats.totalMinutes}분</p>
            </div>
          </div>

          {/* Enrolled Courses List */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              수강 신청 강의 목록 ({learningStats.enrolledDetails.length})
            </h2>

            {learningStats.enrolledDetails.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-sm">현재 수강 중인 강의가 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {learningStats.enrolledDetails.map((item) => (
                  <div
                    key={item.courseId}
                    className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      {item.courseThumbnail ? (
                        <img
                          src={item.courseThumbnail}
                          alt={item.courseTitle}
                          className="w-16 h-10 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-16 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                          <BookOpen className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{item.courseTitle}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          수강일: {new Date(item.enrolledAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="w-32">
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-500">진도율</span>
                          <span className="text-indigo-600">{item.progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${item.progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      {onNavigateToCourse && (
                        <button
                          type="button"
                          onClick={() => onNavigateToCourse(item.courseId)}
                          className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors shrink-0 cursor-pointer"
                        >
                          강의실 이동
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

        </div>
      </div>

      {/* Badge Title Edit Modal */}
      <BadgeTitleModal
        badge={editingBadge}
        isOpen={!!editingBadge}
        onClose={() => setEditingBadge(null)}
        actorId={user.id}
        actorRole={user.role}
        onTitleUpdated={(badgeId, newTitle) => {
          setBadgeVersion((v) => v + 1);
        }}
      />
    </div>
  );
};
