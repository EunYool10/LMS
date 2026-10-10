import React, { useState } from 'react';
import { AchievementBadge } from '../../types';
import { storage } from '../../services/storage';
import { useToast } from '../../context/ToastContext';
import { X, Check, Edit2 } from 'lucide-react';
import { AchievementInsignia } from './AchievementInsignia';

interface BadgeTitleModalProps {
  badge: AchievementBadge | null;
  isOpen: boolean;
  onClose: () => void;
  onTitleUpdated: (badgeId: string, newTitle: string) => void;
  actorId?: string;
  actorRole?: string;
}

export const BadgeTitleModal: React.FC<BadgeTitleModalProps> = ({
  badge,
  isOpen,
  onClose,
  onTitleUpdated,
  actorId,
  actorRole,
}) => {
  if (!isOpen || !badge) return null;

  const [title, setTitle] = useState(badge.title);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('업적 명칭을 입력해주세요.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const success = storage.setBadgeTitle(badge.id, title.trim(), actorId);
      if (!success) {
        throw new Error('관리자 권한이 없거나 저장에 실패했습니다.');
      }

      // Sync with server
      try {
        await fetch(`/api/achievements/${badge.id}/title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), role: actorRole }),
        });
      } catch {}

      showToast(`'${badge.title}' 명칭이 '${title.trim()}'(으)로 변경되었습니다.`, 'success');
      onTitleUpdated(badge.id, title.trim());
      onClose();
    } catch (err: any) {
      showToast(err.message || '업적 명칭 변경 실패', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Edit2 className="w-4 h-4" />
            </span>
            <h3 className="text-base font-black text-slate-900">업적 명칭 수정</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">기존 명칭</label>
            <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2">
              <AchievementInsignia badgeId={badge.id} icon={badge.icon} size="xs" />
              <span>{badge.title}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              새로운 업적 명칭 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              placeholder="표시될 업적 명칭을 입력하세요"
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              * 업적 명칭을 변경해도 고유 ID 및 획득 조건은 안전하게 유지됩니다.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? '저장 중...' : '명칭 저장'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
