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

  const iconBtn =
    'rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer';

  return (
    <div className="space-y-5">
      {activeUpload && activeUpload.isUploading && (
        <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/50 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">
                {activeUpload.lessonTitle || activeUpload.fileName} 업로드 중
              </p>
              <p className="truncate text-xs text-neutral-500">
                {activeUpload.fileName}
                {activeUpload.bytesInfo ? ` · ${activeUpload.bytesInfo}` : ''}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-brand-700">{activeUpload.progress}%</span>
            <button type="button" onClick={activeUpload.onCancel} className="lms-btn lms-btn-secondary lms-btn-sm text-rose-600">
              <X className="h-3.5 w-3.5" />
              취소
            </button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full rounded-full bg-brand-600 transition-all duration-150" style={{ width: `${Math.max(4, activeUpload.progress)}%` }} />
          </div>
          <p className="text-xs text-neutral-500">업로드가 끝나면 영상의 첫 장면이 썸네일로 자동 지정됩니다.</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          섹션 <strong className="font-semibold text-neutral-900">{sections.length}</strong>개 · 항목{' '}
          <strong className="font-semibold text-neutral-900">{lessons.length}</strong>개
        </p>
        <button type="button" onClick={() => setIsAddingSection(true)} className="lms-btn lms-btn-secondary lms-btn-sm">
          <Plus className="h-4 w-4" />
          섹션 추가
        </button>
      </div>

      {isAddingSection && (
        <form onSubmit={handleAddSection} className="flex flex-col gap-2 rounded-lg border border-brand-200 p-3 sm:flex-row">
          <input
            type="text"
            required
            autoFocus
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="새 섹션 제목 (예: 시작하기)"
            aria-label="새 섹션 제목"
            className="lms-input flex-1"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsAddingSection(false)} className="lms-btn lms-btn-ghost">
              취소
            </button>
            <button type="submit" className="lms-btn lms-btn-primary">
              추가
            </button>
          </div>
        </form>
      )}

      {sections.length === 0 && !isAddingSection && (
        <div className="rounded-lg border border-dashed border-neutral-300 py-12 text-center">
          <p className="text-sm text-neutral-600">아직 섹션이 없습니다.</p>
          <p className="mt-1 text-xs text-neutral-500">섹션을 만든 뒤 그 안에 영상, 퀴즈, 평가를 추가하세요.</p>
          <button type="button" onClick={() => setIsAddingSection(true)} className="lms-btn lms-btn-primary lms-btn-sm mt-4">
            <Plus className="h-4 w-4" />첫 섹션 만들기
          </button>
        </div>
      )}

      <div className="space-y-3">
        {sections.map((section, secIdx) => {
          const secLessons = lessons.filter((l) => l.sectionId === section.id).sort((a, b) => a.order - b.order);

          return (
            <div key={section.id} className="overflow-hidden rounded-lg border border-neutral-200">
              <div className="flex items-center gap-2 bg-neutral-50 px-3 py-2.5">
                <span className="text-xs font-semibold tabular-nums text-neutral-400">{secIdx + 1}</span>
                <h4 className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900">{section.title}</h4>
                <span className="text-xs text-neutral-500">{secLessons.length}개</span>
                <div className="flex items-center">
                  <button type="button" disabled={secIdx === 0} onClick={() => handleMoveSection(secIdx, 'up')} className={iconBtn} title="위로" aria-label="섹션 위로">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={secIdx === sections.length - 1}
                    onClick={() => handleMoveSection(secIdx, 'down')}
                    className={iconBtn}
                    title="아래로"
                    aria-label="섹션 아래로"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(section.id)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                    title="섹션 삭제"
                    aria-label="섹션 삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <ul className="divide-y divide-neutral-100">
                {secLessons.length === 0 && (
                  <li className="px-4 py-5 text-center text-xs text-neutral-500">이 섹션에 아직 항목이 없습니다.</li>
                )}
                {secLessons.map((lesson, lesIdx) => {
                  const questions = storage.getQuestions(lesson.id);
                  const isAssessment = lesson.type === 'quiz' || lesson.type === 'exam';
                  return (
                    <li key={lesson.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
                          {lesson.type === 'video' && <Video className="h-4 w-4" />}
                          {lesson.type === 'quiz' && <FileQuestion className="h-4 w-4" />}
                          {lesson.type === 'exam' && <Award className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-neutral-900">{lesson.title}</span>
                            {lesson.isFreePreview && (
                              <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">미리보기</span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500">
                            {lesson.type === 'video'
                              ? `영상 · ${formatDuration(lesson.durationSeconds, lesson.durationStatus)}`
                              : `${lesson.type === 'exam' ? '평가' : '퀴즈'} · 문제 ${questions.length}개`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 pl-10 sm:pl-0">
                        {isAssessment && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLessonForQuestion(lesson);
                              setIsQuestionModalOpen(true);
                            }}
                            className="lms-btn lms-btn-secondary lms-btn-sm"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            문제 추가
                          </button>
                        )}
                        {lesson.type === 'exam' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLessonForExam(lesson);
                              setIsExamModalOpen(true);
                            }}
                            className={iconBtn}
                            title="합격 기준 설정"
                            aria-label="합격 기준 설정"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                        )}
                        {lesson.type === 'video' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLesson(lesson);
                              setIsVideoModalOpen(true);
                            }}
                            className="lms-btn lms-btn-secondary lms-btn-sm"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            영상 편집
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={lesIdx === 0}
                          onClick={() => handleMoveLesson(lesson.id, section.id, 'up')}
                          className={iconBtn}
                          aria-label="위로"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={lesIdx === secLessons.length - 1}
                          onClick={() => handleMoveLesson(lesson.id, section.id, 'down')}
                          className={iconBtn}
                          aria-label="아래로"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="삭제"
                          aria-label="항목 삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-wrap gap-1 border-t border-neutral-100 px-2 py-2">
                <button type="button" onClick={() => handleCreateVideoLesson(section.id)} className="lms-btn lms-btn-ghost lms-btn-sm">
                  <Video className="h-4 w-4 text-neutral-500" />
                  영상 추가
                </button>
                <button type="button" onClick={() => handleCreateQuizLesson(section.id, 'quiz')} className="lms-btn lms-btn-ghost lms-btn-sm">
                  <FileQuestion className="h-4 w-4 text-neutral-500" />
                  퀴즈 추가
                </button>
                <button type="button" onClick={() => handleCreateQuizLesson(section.id, 'exam')} className="lms-btn lms-btn-ghost lms-btn-sm">
                  <Award className="h-4 w-4 text-neutral-500" />
                  평가 추가
                </button>
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
        title={deleteConfirm?.type === 'section' ? '섹션 삭제' : '항목 삭제'}
      >
        {deleteConfirm && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <p className="leading-relaxed">
                <strong className="font-semibold">'{deleteConfirm.title}'</strong>
                {deleteConfirm.type === 'section'
                  ? ' 섹션과 그 안의 영상, 퀴즈, 문제, 수강생 진도가 함께 삭제됩니다.'
                  : ' 항목과 영상·문제 데이터가 삭제되며 복구할 수 없습니다.'}
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="lms-btn lms-btn-secondary">
                취소
              </button>
              <button type="button" onClick={handleExecuteDelete} className="lms-btn bg-rose-600 text-white hover:bg-rose-700">
                <Trash2 className="h-4 w-4" />
                삭제
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
