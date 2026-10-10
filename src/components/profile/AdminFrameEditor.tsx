import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { useToast } from '../../context/ToastContext';
import { Avatar } from '../common/Avatar';
import { CustomFrameConfig, GradientDirectionType, FrameAnimationType } from '../../types';
import { MelpecSettingsModal, MelpecSettings } from './MelpecSettingsModal';
import {
  Sparkles,
  Plus,
  Trash2,
  Save,
  Palette,
  Edit2,
  Sliders,
  Eye,
  X,
  Check,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  Layers,
  Wand2,
} from 'lucide-react';

interface AdminFrameEditorProps {
  onFrameSaved?: (frame: CustomFrameConfig) => void;
  onEquipFrame?: (frameId: string) => void;
}

const DEFAULT_CONFIG: CustomFrameConfig = {
  id: 'custom_default',
  name: '나만의 관리자 프레임',
  colors: ['#FF3B81', '#6C5CE7', '#00D4FF'],
  gradientType: 'linear',
  gradientDirection: 'diagonal',
  animationType: 'rainbow_wave',
  animationDuration: 3.5,
  colorChangeInterval: 3,
  blinkCount: 0,
  blinkIntensity: 'low',
  glowIntensity: 75,
  borderWidth: 3,
  sparkleEnabled: true,
  sparkleDensity: 'medium',
  sparkleSpeed: 'normal',
  sparkleSize: 'medium',
  sparkleColor: '#FBBF24',
  createdAt: new Date().toISOString(),
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 99, g: 102, b: 241 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export const AdminFrameEditor: React.FC<AdminFrameEditorProps> = ({
  onFrameSaved,
  onEquipFrame,
}) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  // Modals visibility states
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isMelpecModalOpen, setIsMelpecModalOpen] = useState(false);

  // Saved frames list
  const [savedFrames, setSavedFrames] = useState<CustomFrameConfig[]>(() => {
    return storage.getCustomFrames();
  });

  // Current working draft configuration inside the editor modal
  const [currentConfig, setCurrentConfig] = useState<CustomFrameConfig>(() => ({
    ...DEFAULT_CONFIG,
    id: `custom_${Date.now()}`,
  }));

  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Body Scroll Lock for Editor Modal
  useEffect(() => {
    if (!isEditorModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isEditorModalOpen]);

  // ESC key listener for Editor Modal (only when Melpec modal is not open)
  useEffect(() => {
    if (!isEditorModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isMelpecModalOpen) {
        setIsEditorModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorModalOpen, isMelpecModalOpen]);

  if (!isAdmin || !user) {
    return null;
  }

  const activeColor =
    currentConfig.colors[selectedColorIndex] ||
    currentConfig.colors[0] ||
    '#FF3B81';
  const rgb = hexToRgb(activeColor);

  const handleColorChange = (newHex: string) => {
    const updated = [...currentConfig.colors];
    updated[selectedColorIndex] = newHex;
    setCurrentConfig({ ...currentConfig, colors: updated });
  };

  const handleAddColor = () => {
    if (currentConfig.colors.length >= 8) {
      showToast('색상은 최대 8개까지 추가할 수 있습니다.', 'warning');
      return;
    }
    const defaultPalette = ['#F97316', '#FACC15', '#10B981', '#EC4899', '#8B5CF6'];
    const nextColor =
      defaultPalette[currentConfig.colors.length % defaultPalette.length];
    const updated = [...currentConfig.colors, nextColor];
    setCurrentConfig({ ...currentConfig, colors: updated });
    setSelectedColorIndex(updated.length - 1);
  };

  const handleRemoveColor = (idx: number) => {
    if (currentConfig.colors.length <= 2) {
      showToast('그라디언트 형성을 위해 최소 2개의 색상이 필요합니다.', 'warning');
      return;
    }
    const updated = currentConfig.colors.filter((_, i) => i !== idx);
    setCurrentConfig({ ...currentConfig, colors: updated });
    setSelectedColorIndex(Math.max(0, idx - 1));
  };

  const handleSaveFrame = async () => {
    if (!currentConfig.name.trim()) {
      showToast('프레임 이름을 입력해주세요.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const saved = storage.saveCustomFrame(user.id, currentConfig);
      // Sync to server
      try {
        await fetch('/api/me/custom-frames', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame: saved, role: user.role }),
        });
      } catch {}

      const updatedList = storage.getCustomFrames();
      setSavedFrames(updatedList);
      showToast(`'${saved.name}' 커스텀 프레임이 저장되었습니다.`, 'success');
      if (onFrameSaved) onFrameSaved(saved);
      setIsEditorModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFrame = async (id: string, name: string) => {
    if (!window.confirm(`'${name}' 커스텀 프레임을 삭제하시겠습니까?`)) return;
    storage.deleteCustomFrame(user.id, id);
    try {
      await fetch(`/api/me/custom-frames/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: user.role }),
      });
    } catch {}
    setSavedFrames(storage.getCustomFrames());
    showToast('커스텀 프레임이 삭제되었습니다.', 'info');
  };

  const handleLoadFrame = (frame: CustomFrameConfig) => {
    setCurrentConfig({ ...frame });
    setSelectedColorIndex(0);
    showToast(`'${frame.name}' 설정을 불러왔습니다.`, 'info');
  };

  const handleEquipCustom = (frameId: string) => {
    if (onEquipFrame) {
      onEquipFrame(`custom_frame_${frameId}`);
    }
  };

  const handleApplyMelpecSettings = (settings: MelpecSettings) => {
    setCurrentConfig((prev) => ({
      ...prev,
      sparkleEnabled: settings.sparkleEnabled,
      sparkleDensity: settings.sparkleDensity,
      sparkleSpeed: settings.sparkleSpeed,
      sparkleSize: settings.sparkleSize,
      sparkleColor: settings.sparkleColor,
    }));
    setIsMelpecModalOpen(false);
    showToast('멜펙 설정이 적용되었습니다. (프레임 저장 버튼을 눌러 확정)', 'info');
  };

  return (
    <>
      {/* =========================================================================
          PRIORITY 0-1: Concise Page Entry Point Card (No full settings exposed)
          ========================================================================= */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-3 bg-linear-to-tr from-amber-500 to-rose-500 text-white rounded-2xl shadow-xs shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                커스텀 프레임
              </h3>
              <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                관리자 전용
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              프로필 프레임을 직접 설정하세요.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditorModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Edit2 className="w-4 h-4" />
          <span>커스텀 프레임 편집</span>
        </button>
      </div>

      {/* =========================================================================
          PRIORITY 0-2: Large Center Modal Dialog (Desktop & Mobile)
          ========================================================================= */}
      {isEditorModalOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="커스텀 프레임 에디터"
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 select-none"
          >
            {/* Dimmed Overlay Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
              onClick={() => setIsEditorModalOpen(false)}
              aria-hidden="true"
            />

            {/* Modal Dialog Card */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-5xl h-[94dvh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 sm:px-7 py-4 bg-slate-50/80 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-linear-to-tr from-amber-400 to-rose-500 text-white rounded-xl shadow-2xs">
                    <Sliders className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        커스텀 프레임 에디터
                      </h2>
                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        관리자 전용
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      색상, 그라디언트 방향, 애니메이션 효과 및 멜펙 효과를 자유롭게 조합하여 고유한 테두리 프레임을 제작합니다.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditorModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  aria-label="에디터 닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="overflow-y-auto flex-1 p-4 sm:p-7 overscroll-contain">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                  {/* Left Column: Real-time Live Preview (Desktop: 4 cols sticky, Mobile: prominent top) */}
                  <div className="lg:col-span-4 bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 flex flex-col items-center justify-center space-y-4 lg:sticky lg:top-0">
                    <div className="w-full flex items-center justify-between text-xs font-bold text-slate-500 border-b border-slate-200/60 pb-2.5">
                      <span className="flex items-center gap-1.5 text-indigo-600 font-black">
                        <Eye className="w-3.5 h-3.5" />
                        <span>실시간 Preview</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black">
                        LIVE PREVIEW
                      </span>
                    </div>

                    {/* Real Profile Avatar rendered with current draft configuration */}
                    <div className="py-4 flex items-center justify-center">
                      <Avatar
                        user={user}
                        size="2xl"
                        customConfig={currentConfig}
                        showRoleBadge
                      />
                    </div>

                    {/* Frame Name Input */}
                    <div className="w-full space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        프레임 이름 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={currentConfig.name}
                        onChange={(e) =>
                          setCurrentConfig({ ...currentConfig, name: e.target.value })
                        }
                        placeholder="예: 네온 썬더 프레임"
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    {/* Color Breakdown in Preview Box */}
                    <div className="w-full bg-white rounded-xl p-3 border border-slate-200 space-y-2">
                      <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                        <span>배합 색상 ({currentConfig.colors.length}개)</span>
                        <span className="text-[10px] text-slate-400">클릭하여 선택</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentConfig.colors.map((c, idx) => {
                          const rgbVal = hexToRgb(c);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedColorIndex(idx)}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono cursor-pointer transition-all ${
                                selectedColorIndex === idx
                                  ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300"
                                style={{ backgroundColor: c }}
                              />
                              <span>{c}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Settings Hierarchical Form (8 cols) */}
                  <div className="lg:col-span-8 space-y-5">
                    {/* 1. 색상 (Color Picker & Palette) */}
                    <div className="bg-slate-50/60 rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-amber-600" />
                          <h3 className="text-sm font-black text-slate-900">
                            1. 색상 (Color)
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddColor}
                          disabled={currentConfig.colors.length >= 8}
                          className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>색상 추가</span>
                        </button>
                      </div>

                      {/* Color chips */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {currentConfig.colors.map((color, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedColorIndex(idx)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              selectedColorIndex === idx
                                ? 'bg-white border-amber-500 ring-2 ring-amber-400/20 shadow-xs'
                                : 'bg-white/70 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-slate-300 shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span>색상 {idx + 1}</span>
                            {currentConfig.colors.length > 2 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveColor(idx);
                                }}
                                className="text-slate-400 hover:text-rose-500 font-bold ml-1 p-0.5 rounded cursor-pointer"
                                title="색상 삭제"
                                aria-label={`색상 ${idx + 1} 삭제`}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Active Color Detail Box */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={activeColor}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 shrink-0"
                            aria-label={`선택 색상 ${selectedColorIndex + 1} 컬러 휠`}
                          />
                          <div>
                            <div className="text-[10px] font-bold text-slate-400">
                              선택 색상 {selectedColorIndex + 1}
                            </div>
                            <div className="text-xs font-bold text-slate-800">
                              컬러 휠 클릭
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-bold text-slate-400 mb-1">
                            HEX CODE
                          </div>
                          <input
                            type="text"
                            value={activeColor}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                            placeholder="#RRGGBB"
                          />
                        </div>

                        <div>
                          <div className="text-[10px] font-bold text-slate-400 mb-1">
                            RGB VALUE
                          </div>
                          <div className="px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                            {rgb.r} / {rgb.g} / {rgb.b}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Gradient 방향 (Gradient Direction) */}
                    <div className="bg-slate-50/60 rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-sm font-black text-slate-900">
                          2. 그라디언트 방향 (Gradient)
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'horizontal', label: '→ Horizontal', type: 'linear' },
                          { id: 'reverse_horizontal', label: '← Reverse', type: 'linear' },
                          { id: 'vertical', label: '↓ Vertical', type: 'linear' },
                          { id: 'reverse_vertical', label: '↑ Reverse', type: 'linear' },
                          { id: 'diagonal', label: '↘ Diagonal', type: 'linear' },
                          { id: 'reverse_diagonal', label: '↗ Diagonal', type: 'linear' },
                          { id: 'radial', label: '○ Radial', type: 'radial' },
                          { id: 'conic', label: '◎ Conic', type: 'conic' },
                        ].map((item) => {
                          const isSelected = currentConfig.gradientDirection === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                setCurrentConfig({
                                  ...currentConfig,
                                  gradientDirection: item.id as GradientDirectionType,
                                  gradientType: item.type as any,
                                })
                              }
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-2xs ring-2 ring-indigo-400/20'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Animation 효과 (Animation Effect) */}
                    <div className="bg-slate-50/60 rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-3">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-purple-600" />
                        <h3 className="text-sm font-black text-slate-900">
                          3. 애니메이션 효과 (Animation)
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                          { id: 'rainbow_wave', label: 'Rainbow Wave', desc: '테두리를 따라 빛이 부드럽게 흐릅니다.' },
                          { id: 'gradient_flow', label: 'Gradient Flow', desc: '그라디언트 색상이 순환합니다.' },
                          { id: 'neon_pulse', label: 'Neon Pulse', desc: '네온처럼 주기적으로 번쩍입니다.' },
                          { id: 'glow_pulse', label: 'Glow Pulse', desc: '광채가 숨쉬듯 팽창합니다.' },
                          { id: 'shine', label: 'Shine', desc: '빛줄기가 테두리를 훑고 지나갑니다.' },
                          { id: 'border_flow', label: 'Border Flow', desc: '테두리 선을 따라 빛이 회전합니다.' },
                          { id: 'rotate', label: 'Rotate', desc: '테두리 링이 회전합니다.' },
                          { id: 'sparkle', label: 'Sparkle', desc: '주변에 별빛 파티클이 반짝입니다.' },
                          { id: 'none', label: 'None', desc: '애니메이션 없이 정적입니다.' },
                        ].map((effect) => {
                          const isSelected = currentConfig.animationType === effect.id;
                          return (
                            <div
                              key={effect.id}
                              onClick={() =>
                                setCurrentConfig({
                                  ...currentConfig,
                                  animationType: effect.id as FrameAnimationType,
                                })
                              }
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-400/20 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="text-xs font-black text-slate-900">
                                {effect.label}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                                {effect.desc}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Speed / Thickness / Glow / Blink */}
                    <div className="bg-slate-50/60 rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-4">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-black text-slate-900">
                          4. 세부 수치 설정 (Speed / Thickness / Glow)
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span>속도 (Speed)</span>
                            <span className="text-indigo-600">
                              {currentConfig.animationDuration}초
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={currentConfig.animationDuration}
                            onChange={(e) =>
                              setCurrentConfig({
                                ...currentConfig,
                                animationDuration: parseFloat(e.target.value),
                              })
                            }
                            className="w-full accent-indigo-600 cursor-pointer"
                            aria-label="속도 조절"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span>프레임 두께</span>
                            <span className="text-indigo-600">
                              {currentConfig.borderWidth}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="8"
                            step="1"
                            value={currentConfig.borderWidth}
                            onChange={(e) =>
                              setCurrentConfig({
                                ...currentConfig,
                                borderWidth: parseInt(e.target.value, 10),
                              })
                            }
                            className="w-full accent-indigo-600 cursor-pointer"
                            aria-label="두께 조절"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span>Glow 강도</span>
                            <span className="text-indigo-600">
                              {currentConfig.glowIntensity}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={currentConfig.glowIntensity}
                            onChange={(e) =>
                              setCurrentConfig({
                                ...currentConfig,
                                glowIntensity: parseInt(e.target.value, 10),
                              })
                            }
                            className="w-full accent-indigo-600 cursor-pointer"
                            aria-label="Glow 강도 조절"
                          />
                        </div>
                      </div>

                      {/* Blink count pills */}
                      <div className="pt-3 border-t border-slate-200/60">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          깜빡임 횟수 (Blink Count)
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[0, 1, 2, 3, 5, 10].map((count) => (
                            <button
                              key={count}
                              type="button"
                              onClick={() =>
                                setCurrentConfig({ ...currentConfig, blinkCount: count })
                              }
                              className={`px-3 py-1 text-xs font-bold rounded-lg border cursor-pointer ${
                                currentConfig.blinkCount === count
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {count === 0 ? '없음' : `${count}회`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* =========================================================================
                        PRIORITY 0-4: 멜펙 프레임 Summary Card (Detailed settings separated)
                        ========================================================================= */}
                    <div className="bg-linear-to-r from-amber-50/70 via-purple-50/40 to-slate-50 border border-amber-200/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-amber-400 text-white rounded-lg shadow-2xs">
                            <Sparkles className="w-4 h-4" />
                          </span>
                          <h4 className="text-sm font-black text-slate-900">
                            ✨ 멜펙 프레임
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600">
                          프레임에 반짝임 효과를 추가합니다.
                        </p>
                        <div className="text-xs font-bold pt-1">
                          현재 상태:{' '}
                          {currentConfig.sparkleEnabled ? (
                            <span className="text-amber-600 font-black">
                              활성화 (
                              {currentConfig.sparkleDensity === 'low'
                                ? '낮음'
                                : currentConfig.sparkleDensity === 'high'
                                ? '높음'
                                : '보통'}
                              , {currentConfig.sparkleColor || '#FBBF24'})
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">비활성화</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsMelpecModalOpen(true)}
                        className="px-4 py-2 text-xs font-bold bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <span>설정 열기</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Saved Custom Frames Section */}
                    {savedFrames.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-slate-200/70">
                        <h4 className="text-sm font-black text-slate-900">
                          저장된 커스텀 프레임 ({savedFrames.length}개)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {savedFrames.map((f) => (
                            <div
                              key={f.id}
                              className="p-3 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between gap-2.5 shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg shrink-0 overflow-hidden flex items-center justify-center p-0.5">
                                  <Avatar user={user} size="xs" customConfig={f} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-slate-900 truncate">
                                    {f.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 capitalize truncate">
                                    {f.animationType}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => handleEquipCustom(f.id)}
                                  className="flex-1 py-1 text-[11px] font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer text-center"
                                >
                                  적용
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleLoadFrame(f)}
                                  className="py-1 px-2 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                                  title="에디터로 불러오기"
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFrame(f.id, f.name)}
                                  className="py-1 px-2 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer"
                                  title="삭제"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer: [취소] [프레임 저장] */}
              <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 bg-slate-50/90 border-t border-slate-100 shrink-0 pb-[calc(14px+env(safe-area-inset-bottom,0px))] sm:pb-3.5">
                <button
                  type="button"
                  onClick={() => setIsEditorModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  취소
                </button>

                <button
                  type="button"
                  onClick={handleSaveFrame}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? '저장 중...' : '프레임 저장'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =========================================================================
          PRIORITY 0-5: Melpec 2nd Modal (Opened from Summary Card [설정 열기])
          ========================================================================= */}
      <MelpecSettingsModal
        isOpen={isMelpecModalOpen}
        onClose={() => setIsMelpecModalOpen(false)}
        onApply={handleApplyMelpecSettings}
        currentSettings={{
          sparkleEnabled: currentConfig.sparkleEnabled,
          sparkleDensity: currentConfig.sparkleDensity,
          sparkleSpeed: currentConfig.sparkleSpeed,
          sparkleSize: currentConfig.sparkleSize,
          sparkleColor: currentConfig.sparkleColor,
        }}
        baseFrameConfig={currentConfig}
        user={user}
      />
    </>
  );
};
