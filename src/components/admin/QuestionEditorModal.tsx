import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Question, QuestionType } from '../../types';
import { Plus, Trash2, CheckCircle2, HelpCircle, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  question?: Question;
  courseId: string;
  lessonId: string;
  onSave: (question: Question) => void;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  question,
  courseId,
  lessonId,
  onSave,
}) => {
  const { showToast } = useToast();

  const [type, setType] = useState<QuestionType>(question?.type || 'SINGLE');
  const [title, setTitle] = useState(question?.title || '');
  const [description, setDescription] = useState(question?.description || '');
  const [options, setOptions] = useState<string[]>(
    question?.options && question.options.length > 0
      ? question.options
      : ['선택지 1', '선택지 2', '선택지 3', '선택지 4']
  );
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(
    question?.correctAnswers || ['0']
  );
  const [explanation, setExplanation] = useState(question?.explanation || '');
  const [points, setPoints] = useState(question?.points || 25);

  const handleTypeChange = (newType: QuestionType) => {
    setType(newType);
    if (newType === 'OX') {
      setOptions(['O', 'X']);
      setCorrectAnswers(['0']);
    } else if (newType === 'SHORT') {
      setOptions([]);
      setCorrectAnswers(['']);
    } else if (options.length === 0) {
      setOptions(['선택지 1', '선택지 2', '선택지 3', '선택지 4']);
      setCorrectAnswers(['0']);
    }
  };

  const handleAddOption = () => {
    setOptions([...options, `선택지 ${options.length + 1}`]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      showToast('최소 2개 이상의 보기가 필요합니다.', 'warning');
      return;
    }
    const nextOptions = options.filter((_, i) => i !== index);
    setOptions(nextOptions);
    // Reset correct answers index
    setCorrectAnswers(
      correctAnswers
        .filter((ans) => parseInt(ans) !== index)
        .map((ans) => (parseInt(ans) > index ? String(parseInt(ans) - 1) : ans))
    );
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const next = [...options];
    next[index] = text;
    setOptions(next);
  };

  const toggleCorrectAnswer = (optIndex: string) => {
    if (type === 'SINGLE' || type === 'OX') {
      setCorrectAnswers([optIndex]);
    } else if (type === 'MULTIPLE') {
      const exists = correctAnswers.includes(optIndex);
      if (exists) {
        if (correctAnswers.length <= 1) {
          showToast('최소 1개 이상의 정답이 지정되어야 합니다.', 'warning');
          return;
        }
        setCorrectAnswers(correctAnswers.filter((a) => a !== optIndex));
      } else {
        setCorrectAnswers([...correctAnswers, optIndex]);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('문제 제목을 입력해주세요.', 'error');
      return;
    }

    if (type === 'SHORT' && (!correctAnswers[0] || !correctAnswers[0].trim())) {
      showToast('주관식 정답을 1개 이상 입력해주세요.', 'error');
      return;
    }

    const newQuestion: Question = {
      id: question?.id || `q_${Date.now()}`,
      courseId,
      lessonId,
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      options: type === 'SHORT' ? [] : options,
      correctAnswers:
        type === 'SHORT'
          ? correctAnswers[0].split(',').map((s) => s.trim()).filter(Boolean)
          : correctAnswers,
      explanation: explanation.trim(),
      points: Number(points) || 10,
      order: question?.order || 1,
    };

    onSave(newQuestion);
    onClose();
    showToast('문제가 저장되었습니다.', 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={question ? '문제 수정' : '새 문제 출제'}
      subtitle="문제 유형, 보기, 정답, 배점 및 해설을 설정합니다."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">문제 유형 선택</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'SINGLE', label: '객관식 (단일선택)' },
              { id: 'MULTIPLE', label: '복수선택 (다중정답)' },
              { id: 'OX', label: 'OX 진위형' },
              { id: 'SHORT', label: '단답형 주관식' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTypeChange(t.id as QuestionType)}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                  type === t.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title & Points */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">문제 제목 / 지문 *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: React 19에서 새롭게 추가된 액션 훅의 이름은?"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">배점 (점수)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 10)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">추가 설명 / 보충 지문 (선택)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예: 2개 이상의 올바른 항목을 선택하세요."
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Options & Correct Answer Config */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              {type === 'SHORT' ? '정답 입력' : '보기 설정 및 정답 체크'}
            </span>
            {(type === 'SINGLE' || type === 'MULTIPLE') && (
              <button
                type="button"
                onClick={handleAddOption}
                className="py-1 px-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>보기 추가</span>
              </button>
            )}
          </div>

          {/* SINGLE or MULTIPLE */}
          {(type === 'SINGLE' || type === 'MULTIPLE') && (
            <div className="space-y-2">
              {options.map((opt, idx) => {
                const optKey = String(idx);
                const isChecked = correctAnswers.includes(optKey);

                return (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCorrectAnswer(optKey)}
                      className={`p-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-400 border-slate-300 hover:border-slate-400'
                      }`}
                      title={isChecked ? '정답 지정됨' : '정답으로 지정하기'}
                    >
                      {isChecked ? '✓ 정답' : '오답'}
                    </button>

                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      placeholder={`보기 ${idx + 1}`}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="보기 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* OX */}
          {type === 'OX' && (
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {['O (참/맞음)', 'X (거짓/틀림)'].map((label, idx) => {
                const optKey = String(idx);
                const isChecked = correctAnswers[0] === optKey;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCorrectAnswers([optKey])}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition-colors cursor-pointer ${
                      isChecked
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>{label}</div>
                    <div className="text-[11px] mt-1 font-semibold">{isChecked ? '✓ 정답 설정됨' : '선택'}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* SHORT Answer */}
          {type === 'SHORT' && (
            <div className="space-y-1.5">
              <input
                type="text"
                required
                value={correctAnswers[0] || ''}
                onChange={(e) => setCorrectAnswers([e.target.value])}
                placeholder="모범 정답 입력 (여러 개 허용 시 쉼표로 구분: 예: React, react, 리액트)"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500">
                사용자가 입력한 답안과 대소문자 무관하게 일치 여부를 채점합니다.
              </p>
            </div>
          )}
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            정답 해설 및 피드백 (수강생 채점 후 노출)
          </label>
          <textarea
            rows={3}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="수강생이 채점 후 오답을 이해할 수 있도록 명확한 해설을 적어주세요."
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            저장
          </button>
        </div>
      </form>
    </Modal>
  );
};
