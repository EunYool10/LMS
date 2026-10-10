import React, { useState, useEffect } from 'react';
import { Lesson, Question, ExamConfig, QuizAttempt } from '../../types';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../common/Badge';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Award,
  ArrowRight,
  AlertCircle,
  FileQuestion,
  Sparkles,
} from 'lucide-react';

interface QuizViewerProps {
  lesson: Lesson;
  questions: Question[];
  examConfig?: ExamConfig;
  onCompleted?: () => void;
  onNextLesson?: () => void;
  hasNextLesson: boolean;
}

export const QuizViewer: React.FC<QuizViewerProps> = ({
  lesson,
  questions,
  examConfig,
  onCompleted,
  onNextLesson,
  hasNextLesson,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);

  // Load previous attempt if any
  useEffect(() => {
    if (!user) return;
    const attempts = storage.getQuizAttempts(user.id, lesson.id);
    if (attempts.length > 0) {
      setLatestAttempt(attempts[0]);
      setAnswers(attempts[0].answers);
      setSubmitted(true);
    } else {
      setLatestAttempt(null);
      setAnswers({});
      setSubmitted(false);
    }
  }, [lesson.id, user]);

  const handleSelectOption = (questionId: string, optionIndex: string, type: 'SINGLE' | 'OX' | 'MULTIPLE') => {
    if (submitted) return;

    setAnswers((prev) => {
      if (type === 'SINGLE' || type === 'OX') {
        return { ...prev, [questionId]: [optionIndex] };
      } else {
        // MULTIPLE
        const current = prev[questionId] || [];
        const exists = current.includes(optionIndex);
        const next = exists ? current.filter((i) => i !== optionIndex) : [...current, optionIndex];
        return { ...prev, [questionId]: next };
      }
    });
  };

  const handleShortAnswerChange = (questionId: string, text: string) => {
    if (submitted) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: [text],
    }));
  };

  // Grade calculation
  const evaluateAnswers = () => {
    let earnedPoints = 0;
    let maxPoints = 0;

    questions.forEach((q) => {
      const qPoints = q.points || 10;
      maxPoints += qPoints;
      const userAns = answers[q.id] || [];

      if (q.type === 'SINGLE' || q.type === 'OX') {
        if (userAns.length > 0 && userAns[0] === q.correctAnswers[0]) {
          earnedPoints += qPoints;
        }
      } else if (q.type === 'MULTIPLE') {
        const sortedUser = [...userAns].sort();
        const sortedCorrect = [...q.correctAnswers].sort();
        if (
          sortedUser.length === sortedCorrect.length &&
          sortedUser.every((val, idx) => val === sortedCorrect[idx])
        ) {
          earnedPoints += qPoints;
        }
      } else if (q.type === 'SHORT') {
        const userText = (userAns[0] || '').trim().toLowerCase();
        const isMatch = q.correctAnswers.some((ans) => ans.trim().toLowerCase() === userText);
        if (isMatch) {
          earnedPoints += qPoints;
        }
      }
    });

    const score = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;
    const passingScore = examConfig?.passingScore ?? 70;
    const passed = score >= passingScore;

    return { earnedPoints, maxPoints, score, passed, passingScore };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check if any unanswered question
    const unansweredCount = questions.filter((q) => !answers[q.id] || answers[q.id].length === 0).length;
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `아직 풀지 않은 문제가 ${unansweredCount}개 있습니다. 이대로 제출하시겠습니까?`
      );
      if (!confirmSubmit) return;
    }

    const { score, passed, passingScore } = evaluateAnswers();

    const attempt = storage.recordQuizAttempt(
      user.id,
      lesson.courseId,
      lesson.id,
      score,
      100,
      passed,
      answers
    );

    setLatestAttempt(attempt);
    setSubmitted(true);

    if (passed) {
      showToast(
        `축하합니다! ${score}점으로 ${lesson.type === 'exam' ? '시험' : '퀴즈'}에 합격하셨습니다.`,
        'success',
        '합격 완료'
      );
      if (onCompleted) onCompleted();
    } else {
      showToast(
        `점수: ${score}점 (합격 기준: ${passingScore}점). 해설을 확인 후 다시 도전해보세요!`,
        'warning',
        '불합격'
      );
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setLatestAttempt(null);
    showToast('퀴즈가 초기화되었습니다. 다시 도전해보세요!', 'info');
  };

  const isQuestionCorrect = (q: Question) => {
    const userAns = answers[q.id] || [];
    if (q.type === 'SINGLE' || q.type === 'OX') {
      return userAns.length > 0 && userAns[0] === q.correctAnswers[0];
    } else if (q.type === 'MULTIPLE') {
      const sortedUser = [...userAns].sort();
      const sortedCorrect = [...q.correctAnswers].sort();
      return (
        sortedUser.length === sortedCorrect.length &&
        sortedUser.every((val, idx) => val === sortedCorrect[idx])
      );
    } else if (q.type === 'SHORT') {
      const userText = (userAns[0] || '').trim().toLowerCase();
      return q.correctAnswers.some((ans) => ans.trim().toLowerCase() === userText);
    }
    return false;
  };

  const passingScore = examConfig?.passingScore ?? 70;
  const isExam = lesson.type === 'exam';

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700 mb-1">등록된 문제가 없습니다.</h3>
        <p className="text-xs text-slate-500">관리자 페이지에서 문제를 추가해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant={isExam ? 'purple' : 'primary'}>
              {isExam ? '최종 역량 평가 시험' : '섹션 이해도 퀴즈'}
            </Badge>
            <span className="text-xs text-slate-500 font-medium">총 {questions.length}문항</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{lesson.title}</h2>
          {lesson.contentSummary && <p className="text-xs text-slate-500 mt-1">{lesson.contentSummary}</p>}
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 shrink-0">
          <div className="font-semibold text-slate-900 mb-0.5">합격 기준: {passingScore}점 이상</div>
          <div className="text-slate-500">
            {isExam ? '70점 이상 획득 시 이수 완료 처리' : '각 문제별 배점 기반 채점'}
          </div>
        </div>
      </div>

      {/* Submitted Result Score Box */}
      {submitted && latestAttempt && (
        <div
          className={`p-6 rounded-2xl border transition-all animate-in fade-in ${
            latestAttempt.passed
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-amber-50/80 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm ${
                  latestAttempt.passed ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {latestAttempt.score}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">
                    {latestAttempt.passed ? '축하합니다! 합격하셨습니다.' : '아쉽지만 재도전이 필요합니다.'}
                  </h3>
                  <Badge variant={latestAttempt.passed ? 'success' : 'warning'}>
                    {latestAttempt.passed ? '합격 (PASSED)' : '재응시 필요'}
                  </Badge>
                </div>
                <p className="text-xs opacity-80 mt-1">
                  제출 일시: {new Date(latestAttempt.submittedAt).toLocaleString('ko-KR')} (응시 횟수:{' '}
                  {latestAttempt.attemptNumber}회)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="py-2 px-3.5 bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>다시 풀기</span>
              </button>

              {hasNextLesson && (
                <button
                  type="button"
                  onClick={onNextLesson}
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>다음 강의로 이동</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.map((q, idx) => {
          const userAns = answers[q.id] || [];
          const correct = submitted ? isQuestionCorrect(q) : null;

          return (
            <div
              key={q.id}
              className={`bg-white rounded-2xl p-6 border transition-all ${
                submitted
                  ? correct
                    ? 'border-emerald-200 shadow-emerald-500/5'
                    : 'border-rose-200 shadow-rose-500/5'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                        {q.type === 'SINGLE' && '객관식 (단일 선택)'}
                        {q.type === 'MULTIPLE' && '복수 선택'}
                        {q.type === 'OX' && 'OX 진위형'}
                        {q.type === 'SHORT' && '단답형 주관식'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">({q.points || 10}점)</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 leading-snug">{q.title}</h4>
                    {q.description && <p className="text-xs text-slate-500 mt-1">{q.description}</p>}
                  </div>
                </div>

                {submitted && (
                  <div>
                    {correct ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" /> 정답 (+{q.points || 10}점)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                        <XCircle className="w-4 h-4" /> 오답 (0점)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Options Render based on Type */}
              <div className="space-y-2 mt-4 ml-10">
                {/* 1. SINGLE / MULTIPLE Options */}
                {(q.type === 'SINGLE' || q.type === 'MULTIPLE') &&
                  q.options.map((option, optIdx) => {
                    const optKey = String(optIdx);
                    const isSelected = userAns.includes(optKey);
                    const isCorrectAnswer = q.correctAnswers.includes(optKey);

                    let itemStyle = 'border-slate-200 hover:bg-slate-50 text-slate-700';
                    if (submitted) {
                      if (isCorrectAnswer) {
                        itemStyle = 'border-emerald-500 bg-emerald-50/60 text-emerald-950 font-semibold';
                      } else if (isSelected && !isCorrectAnswer) {
                        itemStyle = 'border-rose-400 bg-rose-50/60 text-rose-950 line-through';
                      }
                    } else if (isSelected) {
                      itemStyle = 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold ring-1 ring-indigo-600';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={submitted}
                        onClick={() => handleSelectOption(q.id, optKey, q.type as any)}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer disabled:cursor-default ${itemStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-5 h-5 rounded-${q.type === 'SINGLE' ? 'full' : 'md'} border flex items-center justify-center text-[11px] font-bold ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-slate-300 text-slate-500'
                            }`}
                          >
                            {optIdx + 1}
                          </span>
                          <span>{option}</span>
                        </div>
                        {submitted && isCorrectAnswer && (
                          <span className="text-[11px] text-emerald-600 font-bold">정답</span>
                        )}
                      </button>
                    );
                  })}

                {/* 2. OX Options */}
                {q.type === 'OX' && (
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    {['O (그렇다)', 'X (아니다)'].map((label, optIdx) => {
                      const optKey = String(optIdx);
                      const isSelected = userAns.includes(optKey);
                      const isCorrectAnswer = q.correctAnswers.includes(optKey);

                      let itemStyle = 'border-slate-200 hover:bg-slate-50 text-slate-700';
                      if (submitted) {
                        if (isCorrectAnswer) {
                          itemStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold';
                        } else if (isSelected && !isCorrectAnswer) {
                          itemStyle = 'border-rose-400 bg-rose-50 text-rose-950';
                        }
                      } else if (isSelected) {
                        itemStyle = 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold ring-1 ring-indigo-600';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={submitted}
                          onClick={() => handleSelectOption(q.id, optKey, 'OX')}
                          className={`p-4 rounded-xl border text-center text-sm sm:text-base font-bold transition-all cursor-pointer disabled:cursor-default ${itemStyle}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. SHORT Answer Input */}
                {q.type === 'SHORT' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      disabled={submitted}
                      value={userAns[0] || ''}
                      onChange={(e) => handleShortAnswerChange(q.id, e.target.value)}
                      placeholder="정답 단어나 문장을 입력하세요..."
                      className={`w-full max-w-md p-3 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        submitted
                          ? correct
                            ? 'border-emerald-500 bg-emerald-50/50'
                            : 'border-rose-400 bg-rose-50/50'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                    {submitted && (
                      <div className="text-xs text-slate-600">
                        <span className="font-semibold text-emerald-700">모범 정답: </span>
                        <span>{q.correctAnswers.join(' / ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Explanation Reveal after submission */}
              {submitted && q.explanation && (
                <div className="mt-4 ml-10 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>해설 및 풀이</span>
                  </div>
                  <p className="leading-relaxed text-slate-600">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}

        {/* Submit Action Bar */}
        {!submitted && (
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-indigo-500" />
              <span>모든 문항의 답안을 선택한 후 제출해주세요.</span>
            </div>
            <button
              type="submit"
              className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              답안 제출 및 채점하기
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
