import React, { useState } from 'react';
import { storage } from '../../services/storage';
import { Course, Lesson, Question } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { QuestionEditorModal } from '../../components/admin/QuestionEditorModal';
import { ExamSettingsModal } from '../../components/admin/ExamSettingsModal';
import { useToast } from '../../context/ToastContext';
import {
  FileQuestion,
  Plus,
  Edit2,
  Trash2,
  Settings,
  CheckCircle2,
  Award,
  Layers,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface AdminQuestionsPageProps {
  onNavigate?: (view: string, param?: string) => void;
}

export const AdminQuestionsPage: React.FC<AdminQuestionsPageProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const courses = storage.getCourses(true);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const lessons = selectedCourseId ? storage.getLessons(selectedCourseId) : [];
  const quizLessons = lessons.filter((l) => l.type === 'quiz' || l.type === 'exam');

  const [selectedLessonId, setSelectedLessonId] = useState<string>(quizLessons[0]?.id || '');

  // Modal states
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isExamSettingsOpen, setIsExamSettingsOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

  const activeLesson = quizLessons.find((l) => l.id === selectedLessonId) || quizLessons[0];
  const questions = activeLesson ? storage.getQuestions(activeLesson.id) : [];
  const examConfig = activeLesson ? storage.getExamConfig(activeLesson.id) : undefined;

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const newLessons = storage.getLessons(courseId).filter((l) => l.type === 'quiz' || l.type === 'exam');
    setSelectedLessonId(newLessons[0]?.id || '');
  };

  const handleDeleteQuestion = (question: Question) => {
    setQuestionToDelete(question);
  };

  const handleConfirmDeleteQuestion = () => {
    if (!questionToDelete) return;
    storage.deleteQuestion(questionToDelete.id);
    showToast('문제가 성공적으로 삭제되었습니다.', 'info');
    setQuestionToDelete(null);
    setSelectedLessonId((prev) => prev);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">문제 및 퀴즈 은행 관리</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            강의별 퀴즈와 평가 시험 문항(객관식/복수선택/OX/주관식), 배점 및 합격 기준을 통합 관리합니다.
          </p>
        </div>

        {activeLesson && (
          <div className="flex items-center gap-2">
            {activeLesson.type === 'exam' && (
              <button
                type="button"
                onClick={() => setIsExamSettingsOpen(true)}
                className="py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>시험 규칙 설정</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingQuestion(null);
                setIsQuestionModalOpen(true);
              }}
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>새 문제 출제하기</span>
            </button>
          </div>
        )}
      </div>

      {/* Selectors Filter */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">대상 강의 선택</label>
          <select
            value={selectedCourseId}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">퀴즈 / 시험 세트 선택</label>
          <select
            value={selectedLessonId}
            disabled={quizLessons.length === 0}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:opacity-50"
          >
            {quizLessons.length === 0 ? (
              <option value="">(이 강의에 등록된 퀴즈/시험이 없습니다)</option>
            ) : (
              quizLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  [{l.type === 'exam' ? '평가 시험' : '섹션 퀴즈'}] {l.title}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Questions list */}
      {!activeLesson ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400 space-y-3">
          <FileQuestion className="w-10 h-10 mx-auto opacity-50" />
          <p>선택된 강의에 퀴즈나 평가 시험이 없습니다. 강의 커리큘럼에서 먼저 퀴즈 레슨을 추가해주세요.</p>
          {onNavigate && selectedCourseId && (
            <button
              type="button"
              onClick={() => onNavigate('admin-courses-edit', selectedCourseId)}
              className="py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>강의 커리큘럼에서 퀴즈 추가하기</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-900">{activeLesson.title}</span>
              <Badge variant={activeLesson.type === 'exam' ? 'purple' : 'primary'} size="sm">
                {activeLesson.type === 'exam' ? '종합 역량 평가' : '섹션 퀴즈'}
              </Badge>
              <span className="text-slate-500">총 {questions.length}문항</span>
            </div>

            {examConfig && (
              <div className="text-slate-600 font-medium">
                합격 기준 점수: <strong className="text-indigo-600">{examConfig.passingScore}점</strong> (제한시간:{' '}
                {examConfig.timeLimitMinutes}분)
              </div>
            )}
          </div>

          {/* List of questions */}
          {questions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <FileQuestion className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700 mb-1">등록된 문제가 없습니다.</h3>
              <p className="text-xs text-slate-500 mb-4">상단의 [새 문제 출제하기] 버튼을 눌러 문항을 추가하세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600">
                        {q.type === 'SINGLE' && '객관식 (단일선택)'}
                        {q.type === 'MULTIPLE' && '복수선택'}
                        {q.type === 'OX' && 'OX 진위형'}
                        {q.type === 'SHORT' && '단답형 주관식'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">({q.points || 10}점)</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 pl-8">{q.title}</h4>

                    {/* Options Preview */}
                    {q.options && q.options.length > 0 && (
                      <div className="pl-8 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctAnswers.includes(String(optIdx));
                          return (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-50 text-emerald-950 font-semibold border border-emerald-200'
                                  : 'bg-slate-50 text-slate-600'
                              }`}
                            >
                              <span className="text-[10px] font-bold">{optIdx + 1}.</span>
                              <span className="truncate">{opt}</span>
                              {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Short Answer Preview */}
                    {q.type === 'SHORT' && (
                      <div className="pl-8 text-xs text-slate-600 pt-1">
                        <span className="font-semibold text-emerald-700">모범 정답: </span>
                        <span>{q.correctAnswers.join(', ')}</span>
                      </div>
                    )}

                    {/* Explanation preview */}
                    {q.explanation && (
                      <div className="pl-8 text-[11px] text-slate-500 pt-1">
                        <strong>해설:</strong> {q.explanation}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuestion(q);
                        setIsQuestionModalOpen(true);
                      }}
                      className="min-w-[40px] min-h-[40px] p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 border border-slate-200/80 transition-colors cursor-pointer flex items-center justify-center"
                      title="문항 수정"
                      aria-label="문항 수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q)}
                      className="min-w-[40px] min-h-[40px] p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200/80 transition-colors cursor-pointer flex items-center justify-center"
                      title="문항 삭제"
                      aria-label="문항 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Question Modal */}
      {isQuestionModalOpen && activeLesson && (
        <QuestionEditorModal
          isOpen={isQuestionModalOpen}
          onClose={() => {
            setIsQuestionModalOpen(false);
            setEditingQuestion(null);
          }}
          question={editingQuestion || undefined}
          courseId={selectedCourseId}
          lessonId={activeLesson.id}
          onSave={(q) => {
            storage.saveQuestion(q);
            // trigger update
            setSelectedLessonId((prev) => prev);
          }}
        />
      )}

      {/* Exam Settings Modal */}
      {isExamSettingsOpen && activeLesson && (
        <ExamSettingsModal
          isOpen={isExamSettingsOpen}
          onClose={() => setIsExamSettingsOpen(false)}
          lessonId={activeLesson.id}
          courseId={selectedCourseId}
          config={examConfig}
          onSave={(cfg) => {
            storage.saveExamConfig(cfg);
            setSelectedLessonId((prev) => prev);
          }}
        />
      )}

      {/* Question Delete Confirmation Modal */}
      <Modal
        isOpen={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        title="문제 문항 삭제 확인"
      >
        {questionToDelete && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">선택하신 문제 문항을 삭제하시겠습니까?</p>
                <p className="mt-1 text-rose-700 leading-relaxed">
                  삭제 시 해당 문항과 보기 선택지 및 채점 기준이 영구 파기되며 복구할 수 없습니다.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <p className="text-slate-500 text-[11px]">문제 내용:</p>
              <p className="font-bold text-slate-900">{questionToDelete.title}</p>
              <p className="text-[11px] text-slate-500 pt-1">배점: <strong>{questionToDelete.points || 10}점</strong></p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                className="px-4 py-2 font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                id="btn-confirm-delete-question"
                onClick={handleConfirmDeleteQuestion}
                className="px-4 py-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>문항 삭제 실행</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
