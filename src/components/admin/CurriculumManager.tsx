import React, { useState } from 'react';
import { Course, CourseSection, Lesson, Question, ExamConfig } from '../../types';
import { storage } from '../../services/storage';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { VideoUploadModal, ActiveUploadProgress } from './VideoUploadModal';
import { QuestionEditorModal } from './QuestionEditorModal';
import { ExamSettingsModal } from './ExamSettingsModal';
import { useToast } from '../../context/ToastContext';
import { formatDuration } from '../../utils/duration';
import {
  Plus,
  Trash2,
  Edit2,
  Video,
  FileQuestion,
  Award,
  ChevronUp,
  ChevronDown,
  Clock,
  Eye,
  Settings,
  ListOrdered,
  FileText,
  Loader2,
  Film,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface CurriculumManagerProps {
  course: Course;
  onUpdated: () => void;
}

export const CurriculumManager: React.FC<CurriculumManagerProps> = ({ course, onUpdated }) => {
  const { showToast } = useToast();

  const [sections, setSections] = useState<CourseSection[]>(() => storage.getSections(course.id));
  const [lessons, setLessons] = useState<Lesson[]>(() => storage.getLessons(course.id));

  // Modals state
  const [activeSectionForLesson, setActiveSectionForLesson] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [activeLessonForQuestion, setActiveLessonForQuestion] = useState<Lesson | null>(null);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [activeLessonForExam, setActiveLessonForExam] = useState<Lesson | null>(null);

  // Active in-progress video upload state for Curriculum page progress bar
  const [activeUpload, setActiveUpload] = useState<ActiveUploadProgress | null>(null);

  // Section title creation state
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'section' | 'lesson';
    id: string;
    title: string;
  } | null>(null);

  const reload = () => {
    setSections(storage.getSections(course.id));
    setLessons(storage.getLessons(course.id));
    onUpdated();
  };

  // Section CRUD
  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    const newSec: CourseSection = {
      id: `sec_${Date.now()}`,
      courseId: course.id,
      title: newSectionTitle.trim(),
      order: sections.length + 1,
    };
    storage.saveSection(newSec);
    setNewSectionTitle('');
    setIsAddingSection(false);
    reload();
    showToast('새 섹션이 추가되었습니다.', 'success');
  };

  const handleDeleteSection = (secId: string) => {
    const sec = sections.find((s) => s.id === secId);
    setDeleteConfirm({
      type: 'section',
      id: secId,
      title: sec?.title || '선택한 섹션',
    });
  };

  const handleExecuteDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'section') {
      storage.deleteSection(deleteConfirm.id);
      showToast(`'${deleteConfirm.title}' 섹션이 삭제되었습니다.`, 'info');
    } else {
      storage.deleteLesson(deleteConfirm.id);
      showToast(`'${deleteConfirm.title}' 항목이 삭제되었습니다.`, 'info');
    }
    setDeleteConfirm(null);
    reload();
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const copy = [...sections];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    copy.forEach((s, idx) => {
      s.order = idx + 1;
      storage.saveSection(s);
    });

    reload();
  };

  // Lesson actions
  const handleCreateVideoLesson = (sectionId: string) => {
    setActiveSectionForLesson(sectionId);
    setEditingLesson(null);
    setIsVideoModalOpen(true);
  };

  const handleCreateQuizLesson = (sectionId: string, type: 'quiz' | 'exam') => {
    const newLes: Lesson = {
      id: `les_${Date.now()}`,
      sectionId,
      courseId: course.id,
      title: type === 'exam' ? '최종 역량 평가 시험' : '섹션 이해도 퀴즈',
      type,
      order: lessons.filter((l) => l.sectionId === sectionId).length + 1,
      durationSeconds: type === 'exam' ? 1200 : 300,
      contentSummary: type === 'exam' ? '과정 이수 자격을 위한 종합 평가' : '핵심 개념 점검 퀴즈',
      isFreePreview: false,
    };
    storage.saveLesson(newLes);
    reload();

    // Automatically open question editor for newly created quiz
    setActiveLessonForQuestion(newLes);
    setIsQuestionModalOpen(true);
    showToast(`${type === 'exam' ? '시험' : '퀴즈'} 강의가 생성되었습니다. 문제를 추가하세요!`, 'success');
  };

  const handleSaveVideoLesson = (videoData: any, setAsCourseThumbnail?: boolean) => {
    if (editingLesson) {
      const updated: Lesson = {
        ...editingLesson,
        ...videoData,
      };
      storage.saveLesson(updated);
    } else if (activeSectionForLesson) {
      const newLes: Lesson = {
        id: `les_${Date.now()}`,
        sectionId: activeSectionForLesson,
        courseId: course.id,
        ...videoData,
        type: 'video',
        order: lessons.filter((l) => l.sectionId === activeSectionForLesson).length + 1,
      };
      storage.saveLesson(newLes);
    }

    if (setAsCourseThumbnail && videoData.videoThumbnail) {
      course.thumbnail = videoData.videoThumbnail;
      storage.saveCourse(course);
      showToast('추출된 첫 프레임 썸네일이 코스 대표 이미지로도 함께 설정되었습니다.', 'success');
    }

    reload();
  };

  const handleDeleteLesson = (lessonId: string) => {
    const les = lessons.find((l) => l.id === lessonId);
    setDeleteConfirm({
      type: 'lesson',
      id: lessonId,
      title: les?.title || '선택한 강의/문제',
    });
  };

  const handleMoveLesson = (lessonId: string, sectionId: string, direction: 'up' | 'down') => {
    const secLessons = lessons.filter((l) => l.sectionId === sectionId).sort((a, b) => a.order - b.order);
    const index = secLessons.findIndex((l) => l.id === lessonId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= secLessons.length) return;

    const temp = secLessons[index];
    secLessons[index] = secLessons[targetIndex];
    secLessons[targetIndex] = temp;

    secLessons.forEach((l, idx) => {
      l.order = idx + 1;
      storage.saveLesson(l);
    });

    reload();
  };

  return (
    <div className="space-y-6">
      {/* Visual Upload Progress Bar on Lecture Editing Page */}
      {activeUpload && activeUpload.isUploading && (
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-300 rounded-2xl shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Film className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-950 truncate max-w-xs sm:max-w-md">
                    {activeUpload.lessonTitle || activeUpload.fileName}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-600" />
                    서버 청크 분할 전송 중
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  파일명: <b className="font-mono text-slate-700">{activeUpload.fileName}</b> {activeUpload.bytesInfo ? `• ${activeUpload.bytesInfo}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-bold text-indigo-700 tabular-nums">
                {activeUpload.progress}%
              </span>
              <button
                type="button"
                onClick={activeUpload.onCancel}
                className="py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>업로드 취소</span>
              </button>
            </div>
          </div>

          {/* Visual Progress Track */}
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden p-0.5 shadow-inner">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-150 relative overflow-hidden"
              style={{ width: `${Math.max(4, activeUpload.progress)}%` }}
            >
              <div className="absolute inset-0 bg-white/25 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>청크 단위 분할 전송 (100MB 이하 검사 완료)</span>
            <span>업로드 완료 시 첫 프레임이 대표 썸네일로 자동 추출됩니다 ✨</span>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900">커리큘럼 목차 및 콘텐츠 구성</h3>
          <p className="text-xs text-slate-500">
            총 {sections.length}개 섹션 • {lessons.length}개 콘텐츠
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingSection(true)}
          className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>새 섹션 추가</span>
        </button>
      </div>

      {/* Add Section Form */}
      {isAddingSection && (
        <form onSubmit={handleAddSection} className="p-4 bg-white rounded-xl border-2 border-indigo-200 space-y-3">
          <label className="block text-xs font-bold text-indigo-950">새 섹션 제목</label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              autoFocus
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="예: 섹션 3: 심화 컴포넌트 패턴과 커스텀 훅"
              className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setIsAddingSection(false)}
              className="py-2 px-3 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200"
            >
              취소
            </button>
            <button
              type="submit"
              className="py-2 px-4 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-indigo-700"
            >
              생성
            </button>
          </div>
        </form>
      )}

      {/* Sections List */}
      <div className="space-y-4">
        {sections.map((section, secIdx) => {
          const secLessons = lessons.filter((l) => l.sectionId === section.id).sort((a, b) => a.order - b.order);

          return (
            <div key={section.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              {/* Section Header */}
              <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">#{secIdx + 1}</span>
                  <h4 className="text-sm font-bold text-slate-900">{section.title}</h4>
                  <span className="text-[11px] text-slate-500">({secLessons.length}개 항목)</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={secIdx === 0}
                    onClick={() => handleMoveSection(secIdx, 'up')}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    title="위로 이동"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={secIdx === sections.length - 1}
                    onClick={() => handleMoveSection(secIdx, 'down')}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    title="아래로 이동"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  <div className="w-px h-4 bg-slate-200 mx-1" />

                  <button
                    type="button"
                    onClick={() => handleDeleteSection(section.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="섹션 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Section Content / Lessons */}
              <div className="p-4 space-y-2.5">
                {secLessons.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    등록된 강의가 없습니다. 아래 버튼으로 영상이나 퀴즈를 추가하세요.
                  </div>
                ) : (
                  secLessons.map((lesson, lesIdx) => {
                    const questions = storage.getQuestions(lesson.id);

                    return (
                      <div
                        key={lesson.id}
                        className="p-3 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-500 shrink-0">
                            {lesIdx + 1}
                          </span>

                          <div className="shrink-0">
                            {lesson.type === 'video' && <Video className="w-4 h-4 text-indigo-600" />}
                            {lesson.type === 'quiz' && <FileQuestion className="w-4 h-4 text-emerald-600" />}
                            {lesson.type === 'exam' && <Award className="w-4 h-4 text-purple-600" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 truncate">{lesson.title}</span>
                              {lesson.isFreePreview && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  무료체험
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              {lesson.type === 'video' && (
                                <span>{formatDuration(lesson.durationSeconds, lesson.durationStatus)} 영상</span>
                              )}
                              {(lesson.type === 'quiz' || lesson.type === 'exam') && (
                                <span className="font-semibold text-indigo-600">
                                  문제 {questions.length}문항 등록됨
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons per lesson */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* If Quiz or Exam: Questions Builder button */}
                          {(lesson.type === 'quiz' || lesson.type === 'exam') && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveLessonForQuestion(lesson);
                                  setIsQuestionModalOpen(true);
                                }}
                                className="py-1 px-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 rounded-md font-semibold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>문제 출제 ({questions.length})</span>
                              </button>

                              {lesson.type === 'exam' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveLessonForExam(lesson);
                                    setIsExamModalOpen(true);
                                  }}
                                  className="py-1 px-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md font-semibold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                                  title="시험 합격점수 및 규칙 설정"
                                >
                                  <Settings className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}

                          {/* If Video: Edit Video button */}
                          {lesson.type === 'video' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLesson(lesson);
                                setIsVideoModalOpen(true);
                              }}
                              className="py-1 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md font-semibold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3 text-slate-500" />
                              <span>영상 수정</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={lesIdx === 0}
                            onClick={() => handleMoveLesson(lesson.id, section.id, 'up')}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={lesIdx === secLessons.length - 1}
                            onClick={() => handleMoveLesson(lesson.id, section.id, 'down')}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="강의 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Add Lesson Actions inside section */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateVideoLesson(section.id)}
                    className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>+ 영상 강의 추가</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCreateQuizLesson(section.id, 'quiz')}
                    className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileQuestion className="w-3.5 h-3.5" />
                    <span>+ 퀴즈 추가</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCreateQuizLesson(section.id, 'exam')}
                    className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>+ 최종 평가 시험 추가</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <VideoUploadModal
          isOpen={isVideoModalOpen}
          onClose={() => {
            setIsVideoModalOpen(false);
            setEditingLesson(null);
          }}
          lesson={editingLesson || undefined}
          existingLessons={lessons}
          onProgressUpdate={setActiveUpload}
          onSave={handleSaveVideoLesson}
        />
      )}

      {/* Question Modal */}
      {isQuestionModalOpen && activeLessonForQuestion && (
        <QuestionEditorModal
          isOpen={isQuestionModalOpen}
          onClose={() => {
            setIsQuestionModalOpen(false);
            setActiveLessonForQuestion(null);
          }}
          courseId={course.id}
          lessonId={activeLessonForQuestion.id}
          onSave={(q) => {
            storage.saveQuestion(q);
            reload();
          }}
        />
      )}

      {/* Exam Modal */}
      {isExamModalOpen && activeLessonForExam && (
        <ExamSettingsModal
          isOpen={isExamModalOpen}
          onClose={() => {
            setIsExamModalOpen(false);
            setActiveLessonForExam(null);
          }}
          courseId={course.id}
          lessonId={activeLessonForExam.id}
          config={storage.getExamConfig(activeLessonForExam.id)}
          onSave={(cfg) => {
            storage.saveExamConfig(cfg);
            reload();
          }}
        />
      )}

      {/* Delete Confirmation Modal (Section & Lesson) */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={deleteConfirm?.type === 'section' ? '섹션 삭제 확인' : '강의 항목 삭제 확인'}
      >
        {deleteConfirm && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {deleteConfirm.type === 'section'
                    ? '해당 섹션과 포함된 모든 강의 및 문제를 영구 삭제하시겠습니까?'
                    : '해당 강의 항목을 삭제하시겠습니까?'}
                </p>
                <p className="mt-1 text-rose-700 leading-relaxed">
                  {deleteConfirm.type === 'section'
                    ? '섹션에 속한 동영상 강의, 퀴즈, 시험 문항 및 수강생 진도 데이터가 함께 정리됩니다.'
                    : '삭제된 레슨 및 영상/평가 문항 데이터는 복구할 수 없습니다.'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <p className="text-slate-500 text-[11px]">삭제 대상:</p>
              <p className="font-bold text-slate-900 mt-0.5">{deleteConfirm.title}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제 실행</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
