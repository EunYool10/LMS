import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Check, RotateCcw } from 'lucide-react';
import { CustomFrameConfig, User } from '../../types';
import { Avatar } from '../common/Avatar';

export interface MelpecSettings {
  sparkleEnabled: boolean;
  sparkleDensity: 'low' | 'medium' | 'high';
  sparkleSpeed: 'slow' | 'normal' | 'fast';
  sparkleSize: 'small' | 'medium' | 'large';
  sparkleColor: string;
}

interface MelpecSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: MelpecSettings) => void;
  currentSettings: {
    sparkleEnabled: boolean;
    sparkleDensity?: 'low' | 'medium' | 'high';
    sparkleSpeed?: 'slow' | 'normal' | 'fast';
    sparkleSize?: 'small' | 'medium' | 'large';
    sparkleColor?: string;
  };
  baseFrameConfig: CustomFrameConfig;
  user: User;
}

const PRESET_SPARKLE_COLORS = [
  { label: '골드', hex: '#FBBF24' },
  { label: '시안', hex: '#22D3EE' },
  { label: '핑크', hex: '#EC4899' },
  { label: '퍼플', hex: '#A855F7' },
  { label: '민트', hex: '#10B981' },
  { label: '화이트', hex: '#FFFFFF' },
];

export const MelpecSettingsModal: React.FC<MelpecSettingsModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentSettings,
  baseFrameConfig,
  user,
}) => {
  // Temporary draft state inside the Melpec modal
  const [draft, setDraft] = useState<MelpecSettings>({
    sparkleEnabled: currentSettings.sparkleEnabled ?? true,
    sparkleDensity: currentSettings.sparkleDensity ?? 'medium',
    sparkleSpeed: currentSettings.sparkleSpeed ?? 'normal',
    sparkleSize: currentSettings.sparkleSize ?? 'medium',
    sparkleColor: currentSettings.sparkleColor ?? '#FBBF24',
  });

  // Reset to current settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraft({
        sparkleEnabled: currentSettings.sparkleEnabled ?? true,
        sparkleDensity: currentSettings.sparkleDensity ?? 'medium',
        sparkleSpeed: currentSettings.sparkleSpeed ?? 'normal',
        sparkleSize: currentSettings.sparkleSize ?? 'medium',
        sparkleColor: currentSettings.sparkleColor ?? '#FBBF24',
      });
    }
  }, [isOpen, currentSettings]);

  // Escape key listener specifically for Melpec Modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build a preview config with the temporary draft sparkle values
  const previewConfig: CustomFrameConfig = {
    ...baseFrameConfig,
    sparkleEnabled: draft.sparkleEnabled,
    sparkleDensity: draft.sparkleDensity,
    sparkleSpeed: draft.sparkleSpeed,
    sparkleSize: draft.sparkleSize,
    sparkleColor: draft.sparkleColor,
  };

  const handleApply = () => {
    onApply(draft);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="멜펙 프레임 설정"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 select-none"
    >
      {/* Dimmed Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-50/80 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-linear-to-tr from-amber-400 to-rose-500 text-white rounded-xl shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                ✨ 멜펙 프레임 설정
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                프레임 주변의 반짝임 및 파티클 효과를 상세 조정합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="멜펙 설정 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* Live Preview Inside Melpec Modal */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3">
            <div className="text-[11px] font-bold text-slate-400">
              멜펙 효과 실시간 미리보기
            </div>
            <div className="py-2 flex items-center justify-center">
              <Avatar
                user={user}
                size="xl"
                customConfig={previewConfig}
                showRoleBadge
              />
            </div>
            <div className="text-[11px] font-semibold text-slate-500 text-center">
              {draft.sparkleEnabled ? (
                <span className="text-amber-600 font-bold">
                  ✨ 반짝임 파티클이 활성화되어 있습니다
                </span>
              ) : (
                <span className="text-slate-400">
                  반짝임 효과가 비활성화되었습니다
                </span>
              )}
            </div>
          </div>

          {/* Toggle: 효과 사용 */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
            <div>
              <div className="text-xs font-black text-slate-900">효과 사용</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                프레임 상단 및 모서리에 반짝이는 별빛 파티클을 켭니다.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, sparkleEnabled: !prev.sparkleEnabled }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                draft.sparkleEnabled ? 'bg-amber-500' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={draft.sparkleEnabled}
              aria-label="효과 사용 토글"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  draft.sparkleEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sparkle 빈도 (Density) */}
          <div className={`space-y-2 ${draft.sparkleEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Sparkle 빈도 (밀도)</span>
              <span className="text-indigo-600 font-black">
                {draft.sparkleDensity === 'low' ? '낮음 (2개)' : draft.sparkleDensity === 'medium' ? '보통 (4개)' : '높음 (6개)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'low', label: '낮음' },
                { value: 'medium', label: '보통' },
                { value: 'high', label: '높음' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, sparkleDensity: opt.value as any }))}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                    draft.sparkleDensity === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-2 ring-indigo-400/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sparkle 크기 (Size) */}
          <div className={`space-y-2 ${draft.sparkleEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Sparkle 크기</span>
              <span className="text-indigo-600 font-black">
                {draft.sparkleSize === 'small' ? '작게' : draft.sparkleSize === 'medium' ? '보통' : '크게'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'small', label: '작게' },
                { value: 'medium', label: '보통' },
                { value: 'large', label: '크게' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, sparkleSize: opt.value as any }))}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                    draft.sparkleSize === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-2 ring-indigo-400/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sparkle 속도 (Speed) */}
          <div className={`space-y-2 ${draft.sparkleEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Sparkle 반짝임 속도</span>
              <span className="text-indigo-600 font-black">
                {draft.sparkleSpeed === 'slow' ? '느림' : draft.sparkleSpeed === 'normal' ? '보통' : '빠름'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'slow', label: '느림' },
                { value: 'normal', label: '보통' },
                { value: 'fast', label: '빠름' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, sparkleSpeed: opt.value as any }))}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                    draft.sparkleSpeed === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-2 ring-indigo-400/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sparkle 색상 (Color) */}
          <div className={`space-y-2.5 ${draft.sparkleEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Sparkle 색상</span>
              <span className="font-mono text-[11px] text-slate-500 font-bold">
                {draft.sparkleColor}
              </span>
            </div>

            {/* Color chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_SPARKLE_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, sparkleColor: c.hex }))}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    draft.sparkleColor.toUpperCase() === c.hex.toUpperCase()
                      ? 'bg-white border-amber-500 ring-2 ring-amber-400/25 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.label}</span>
                </button>
              ))}

              {/* Native color picker for custom hex */}
              <div className="relative flex items-center">
                <input
                  type="color"
                  value={draft.sparkleColor}
                  onChange={(e) => setDraft((prev) => ({ ...prev, sparkleColor: e.target.value }))}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                  title="직접 색상 선택"
                  aria-label="직접 색상 선택"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer: [취소] [적용하기] */}
        <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>적용하기</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
