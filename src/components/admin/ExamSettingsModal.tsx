import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ExamConfig } from '../../types';
import { Award, Clock, RotateCcw, Shuffle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface ExamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  courseId: string;
  config?: ExamConfig;
  onSave: (config: ExamConfig) => void;
}

export const ExamSettingsModal: React.FC<ExamSettingsModalProps> = ({
  isOpen,
  onClose,
  lessonId,
  courseId,
  config,
  onSave,
}) => {
  const { showToast } = useToast();

  const [passingScore, setPassingScore] = useState(config?.passingScore ?? 70);
  const [totalPoints, setTotalPoints] = useState(config?.totalPoints ?? 100);
  const [retakeAllowed, setRetakeAllowed] = useState(config?.retakeAllowed ?? true);
  const [maxAttempts, setMaxAttempts] = useState(config?.maxAttempts ?? 5);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(config?.timeLimitMinutes ?? 20);
  const [shuffleQuestions, setShuffleQuestions] = useState(config?.shuffleQuestions ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newConfig: ExamConfig = {
      id: config?.id || `exam_${Date.now()}`,
      lessonId,
      courseId,
      passingScore: Number(passingScore) || 70,
      totalPoints: Number(totalPoints) || 100,
      retakeAllowed,
      maxAttempts: Number(maxAttempts) || 3,
      timeLimitMinutes: Number(timeLimitMinutes) || 20,
      shuffleQuestions,
      shuffleOptions: false,
    };

    onSave(newConfig);
    onClose();
    showToast('평가 시험 규칙이 저장되었습니다.', 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="시험 및 평가 기준 설정"
      subtitle="합격 점수, 재응시 횟수, 제한 시간을 설정합니다."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">합격 기준 점수 (점)</label>
            <div className="relative">
              <Award className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
              <input
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">예: 70점 이상 시 합격</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">제한 시간 (분)</label>
            <div className="relative">
              <Clock className="w-4 h-4 text-indigo-600 absolute left-3 top-2.5" />
              <input
                type="number"
                min="1"
                max="180"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value) || 10)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <div className="font-semibold text-slate-800">재응시 허용</div>
              <div className="text-slate-500">불합격 시 다시 풀기를 허용합니다.</div>
            </div>
            <input
              type="checkbox"
              checked={retakeAllowed}
              onChange={(e) => setRetakeAllowed(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
          </div>

          {retakeAllowed && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">최대 응시 가능 횟수</label>
              <input
                type="number"
                min="1"
                max="20"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
            <div className="text-xs">
              <div className="font-semibold text-slate-800">문제 순서 랜덤 출제</div>
              <div className="text-slate-500">응시할 때마다 문항 배치를 무작위로 섞습니다.</div>
            </div>
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="submit"
            className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            설정 저장
          </button>
        </div>
      </form>
    </Modal>
  );
};
