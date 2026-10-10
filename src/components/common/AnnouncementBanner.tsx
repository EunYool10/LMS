import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Megaphone,
  Edit3,
  X,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Clock,
  Pin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { storage } from '../../services/storage';
import { SystemAnnouncement, UserRole } from '../../types';
import { VerifiedBadge } from './VerifiedBadge';
import { AnnouncementDetailModal } from './AnnouncementDetailModal';

interface AnnouncementBannerProps {
  className?: string;
  onUpdated?: () => void;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  className = '',
  onUpdated,
}) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState(() => storage.getSettings());
  const [systemAnnouncements, setSystemAnnouncements] = useState<SystemAnnouncement[]>(() =>
    storage.getSystemAnnouncements()
  );
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form states in modal
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formPriority, setFormPriority] = useState<'normal' | 'important' | 'urgent'>('important');
  const [formVisible, setFormVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Active announcement resolution
  const activeAnnouncement = useMemo(() => {
    const active = systemAnnouncements.find((a) => a.isActive);
    if (active) return active;
    // Fallback: if settings has an announcement but no active announcement in array
    if (settings.showAnnouncement !== false && settings.announcement && settings.announcement.trim()) {
      return {
        id: 'sys_ann_fallback',
        title: 'TDSNTLMS 전사 공지',
        content: settings.announcement,
        priority: 'important' as const,
        isActive: true,
        createdAt: settings.announcementUpdatedAt || new Date().toISOString(),
        authorName: '서비스 총괄',
        authorRole: 'SERVICE_OWNER' as UserRole,
      };
    }
    return null;
  }, [systemAnnouncements, settings]);

  const refreshData = () => {
    const latestSettings = storage.getSettings();
    setSettings(latestSettings);
    const latestAnnouncements = storage.getSystemAnnouncements();
    setSystemAnnouncements(latestAnnouncements);

    const active = latestAnnouncements.find((a) => a.isActive);
    if (active) {
      setFormTitle(active.title);
      setFormText(active.content);
      setFormPriority(active.priority || 'important');
      setFormVisible(true);
    } else {
      setFormTitle('TDSNTLMS 전사 공지');
      setFormText(latestSettings.announcement || '');
      setFormPriority('important');
      setFormVisible(latestSettings.showAnnouncement !== false);
    }
  };

  useEffect(() => {
    refreshData();

    const handleAnnouncementChange = () => {
      refreshData();
    };

    window.addEventListener('tdsnt_announcement_change', handleAnnouncementChange);
    window.addEventListener('storage', handleAnnouncementChange);

    return () => {
      window.removeEventListener('tdsnt_announcement_change', handleAnnouncementChange);
      window.removeEventListener('storage', handleAnnouncementChange);
    };
  }, []);

  const handleOpenEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    refreshData();
    setIsEditModalOpen(true);
  };

  const handleOpenDetail = () => {
    if (activeAnnouncement) {
      setIsDetailModalOpen(true);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim()) return;
    setIsSaving(true);
    try {
      const finalTitle = formTitle.trim() || 'TDSNTLMS 전사 공지';
      const existingActive = systemAnnouncements.find((a) => a.isActive);

      const targetId = existingActive?.id || `sys_ann_${Date.now()}`;
      const payload: SystemAnnouncement = {
        id: targetId,
        title: finalTitle,
        content: formText.trim(),
        priority: formPriority,
        isActive: formVisible,
        createdAt: existingActive?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorName: user?.name || existingActive?.authorName || '운영진',
        authorRole: (user?.role as UserRole) || existingActive?.authorRole || 'SUPER_ADMIN',
      };

      storage.saveSystemAnnouncement(payload);

      // Also ensure settings is synced
      const updatedSettings = {
        ...settings,
        announcement: formText.trim(),
        showAnnouncement: formVisible,
        announcementUpdatedAt: new Date().toISOString(),
      };
      storage.saveSettings(updatedSettings);

      refreshData();
      setIsEditModalOpen(false);
      showToast('사내 공지사항이 성공적으로 반영되었습니다.', 'success', '공지사항 저장 완료');
      if (onUpdated) onUpdated();
    } catch {
      showToast('공지사항을 저장하는 중 오류가 발생했습니다.', 'error', '저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (!window.confirm('현재 게시된 공지사항을 비활성화하고 숨기시겠습니까?')) return;
    if (activeAnnouncement) {
      storage.toggleSystemAnnouncementActive(activeAnnouncement.id, false);
    }
    const updated = {
      ...settings,
      announcement: '',
      showAnnouncement: false,
      announcementUpdatedAt: new Date().toISOString(),
    };
    storage.saveSettings(updated);
    refreshData();
    setIsEditModalOpen(false);
    showToast('공지사항이 비활성화되고 숨김 처리되었습니다.', 'info', '공지사항 숨김');
    if (onUpdated) onUpdated();
  };

  const isVisible =
    !isDismissed &&
    activeAnnouncement !== null &&
    (settings.showAnnouncement !== false || activeAnnouncement.isActive);

  // If dismissed or no active announcement for general users
  if (!isVisible) {
    if (isAdmin) {
      // Admin placeholder allowing quick announcement creation
      return (
        <>
          <div className={`border-b border-neutral-200 bg-neutral-50 ${className}`}>
            <div className="lms-container flex h-10 items-center gap-3 text-[13px] text-neutral-500">
              <Megaphone className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="min-w-0 flex-1 truncate">게시 중인 전사 공지가 없습니다.</span>
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex shrink-0 items-center gap-1 font-medium text-neutral-700 hover:text-neutral-900 cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                공지 등록
              </button>
            </div>
          </div>

          {isEditModalOpen && renderModal()}
        </>
      );
    }
    return null;
  }

  // Priority styling
  const priority = activeAnnouncement?.priority || 'important';
  const theme =
    priority === 'urgent'
      ? { strip: 'bg-rose-50 border-rose-100', pill: 'bg-rose-600 text-white', label: '긴급' }
      : priority === 'important'
      ? { strip: 'bg-amber-50 border-amber-100', pill: 'bg-amber-500 text-white', label: '중요' }
      : { strip: 'bg-brand-50 border-brand-100', pill: 'bg-brand-600 text-white', label: '공지' };

  function renderModal() {
    if (typeof document === 'undefined') return null;

    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-modal-title"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      >
        <div
          style={{ width: 'min(100%, 540px)', maxHeight: '90vh' }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 my-auto"
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4.5 bg-gradient-to-r from-indigo-50/80 to-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h3 id="announcement-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                  전사 메인 공지사항 설정
                </h3>
                <p className="text-[11px] text-slate-500">포털 메인 최상단에 수강생에게 즉시 노출됩니다.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body - scrollable */}
          <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4.5 overflow-y-auto flex-1">
            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="announcement-title" className="text-xs font-bold text-slate-800">
                  공지 제목 <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">{formTitle.length} / 60자</span>
              </div>
              <input
                id="announcement-title"
                type="text"
                maxLength={60}
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="예: 2026년 TDSNTLMS 정기 시스템 점검 및 사내 교육 오픈 안내"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
              />
            </div>

            {/* Priority Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">공지 중요도</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: '일반 안내', color: 'border-slate-300 text-slate-700' },
                  { id: 'important', label: '중요 공지', color: 'border-amber-400 text-amber-800 bg-amber-50/60' },
                  { id: 'urgent', label: '긴급 공지', color: 'border-rose-400 text-rose-800 bg-rose-50/60' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormPriority(p.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formPriority === p.id
                        ? `${p.color} ring-2 ring-indigo-500/30 font-black shadow-xs`
                        : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content text */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="announcement-text" className="text-xs font-bold text-slate-800">
                  공지 본문 내용 <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">{formText.length} / 500자</span>
              </div>
              <textarea
                id="announcement-text"
                rows={4}
                maxLength={500}
                required
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="수강생에게 전달할 상세 공지 내용을 입력하세요. 줄바꿈과 단락 구분이 지원됩니다."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    formVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {formVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">메인 포털 배너 게시 상태</p>
                  <p className="text-[11px] text-slate-500">
                    {formVisible ? '포털 홈 최상단에 실시간으로 표시됩니다.' : '현재 게시를 일시 중단합니다.'}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formVisible}
                  onChange={(e) => setFormVisible(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>추천 템플릿 빠른 적용:</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    title: '2026년 하반기 전사 직무 역량 강화 필수 교육과정 오픈',
                    text: '2026년 하반기 전사 직무 역량 강화 필수 교육과정이 오픈되었습니다. 각 부서별 지정 필수 과정을 확인하고 기한 내에 이수해 주시기 바랍니다.',
                    priority: 'important' as const,
                  },
                  {
                    title: '2026년 상반기 법정의무교육 이수 기한 및 수강 안내',
                    text: '이번 분기 법정의무교육(개인정보보호, 직장 내 성희롱 예방 등) 이수 기한은 이달 말까지입니다. 전 임직원은 반드시 수료를 완료하시기 바랍니다.',
                    priority: 'urgent' as const,
                  },
                  {
                    title: 'TDSNTLMS 플랫폼 안정화를 위한 주말 정기 시스템 점검 안내',
                    text: '안정적인 학습 서비스 제공을 위해 이번 주말 심야(토 02:00~06:00) 정기 서버 점검이 진행될 예정입니다. 점검 시간 동안 수강 및 퀴즈 응시가 일시 제한됩니다.',
                    priority: 'normal' as const,
                  },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormTitle(preset.title);
                      setFormText(preset.text);
                      setFormPriority(preset.priority);
                    }}
                    className="p-2 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 rounded-xl text-left transition-colors cursor-pointer text-xs"
                  >
                    <p className="font-bold text-slate-800 truncate">{preset.title}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{preset.text}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>공지 숨기기</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formText.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? '저장 중...' : '저장 및 클라우드 동기화'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <>
      <aside aria-label="사내 공지사항" className={`border-b ${theme.strip} ${className}`}>
        <div className="lms-container flex h-11 items-center gap-3">
          <button
            type="button"
            onClick={handleOpenDetail}
            className="group flex min-w-0 flex-1 items-center gap-2.5 text-left cursor-pointer"
          >
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${theme.pill}`}>{theme.label}</span>
            <span className="truncate text-sm font-medium text-neutral-900 group-hover:underline">{activeAnnouncement.title}</span>
            <span className="hidden min-w-0 flex-1 truncate text-[13px] text-neutral-500 lg:block">{activeAnnouncement.content}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenEdit}
              className="shrink-0 rounded-md p-1.5 text-neutral-500 hover:bg-black/5 hover:text-neutral-800 cursor-pointer"
              title="공지 수정"
              aria-label="공지 수정"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="shrink-0 rounded-md p-1.5 text-neutral-500 hover:bg-black/5 hover:text-neutral-800 cursor-pointer"
            title="공지 닫기"
            aria-label="공지 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Admin Edit Modal */}
      {isEditModalOpen && renderModal()}

      {/* Detail Reading Modal */}
      <AnnouncementDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        announcement={activeAnnouncement}
        onEdit={isAdmin ? () => setIsEditModalOpen(true) : undefined}
      />
    </>
  );
};
