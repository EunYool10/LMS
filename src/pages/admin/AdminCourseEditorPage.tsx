import React, { useState, useEffect } from 'react';
import { Course, CourseLevel, CourseSection, Lesson } from '../../types';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CurriculumManager } from '../../components/admin/CurriculumManager';
import { CourseCover } from '../../components/common/CourseCover';
import { CourseCard } from '../../components/student/CourseCard';
import { Modal } from '../../components/common/Modal';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Eye, Plus, Save, Trash2, X } from 'lucide-react';

interface AdminCourseEditorPageProps {
  courseId?: string;
  onNavigate: (view: string, param?: string) => void;
}

const STEPS = [
  { id: 1, label: '기본 정보', desc: '제목, 분류, 강사, 썸네일' },
  { id: 2, label: '커리큘럼', desc: '섹션, 영상, 퀴즈' },
  { id: 3, label: '수강 설정', desc: '완료 기준, 학습 목표, 태그' },
  { id: 4, label: '검토 · 게시', desc: '미리보기와 공개 설정' },
] as const;
const LAST_STEP = STEPS.length;

/** Label + optional hint wrapper for form controls. */
const Field: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode }> = ({
  label,
  required,
  hint,
  children,
}) => (
  <label className="block space-y-1.5">
    <span className="block text-[13px] font-medium text-neutral-800">
      {label}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </span>
    {children}
    {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
  </label>
);

/** Add/remove list of short strings (objectives, requirements, tags). */
const ListEditor: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  items: string[];
  onRemove: (idx: number) => void;
  placeholder: string;
  chip?: boolean;
}> = ({ value, onChange, onAdd, items, onRemove, placeholder, chip }) => (
  <div className="space-y-2">
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
        className="lms-input flex-1"
      />
      <button type="button" onClick={onAdd} className="lms-btn lms-btn-secondary shrink-0">
        <Plus className="h-4 w-4" />
        추가
      </button>
    </div>
    {items.length > 0 &&
      (chip ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, idx) => (
            <span key={it} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
              #{it}
              <button type="button" onClick={() => onRemove(idx)} aria-label={`${it} 삭제`} className="text-neutral-400 hover:text-rose-600 cursor-pointer">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-800">
              <Check className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="min-w-0 flex-1">{it}</span>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                aria-label="삭제"
                className="rounded p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ))}
  </div>
);

export const AdminCourseEditorPage: React.FC<AdminCourseEditorPageProps> = ({ courseId, onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isEditing = !!courseId;
  const categories = storage.getCategories();

  const [currentStep, setCurrentStep] = useState<number>(1);

  const [course, setCourse] = useState<Course>(() => {
    if (courseId) {
      const existing = storage.getCourseById(courseId);
      if (existing) return existing;
    }
    return {
      id: `course_${Date.now()}`,
      slug: `course-${Date.now()}`,
      title: '',
      shortDescription: '',
      description: '',
      thumbnail: '',
      categoryId: categories[0]?.id || 'dev-it',
      categoryName: categories[0]?.name || '개발 · IT',
      instructorId: user?.id || '',
      instructorName: user?.name || '강의 관리자',
      instructorRole: '강의 담당',
      instructorAvatar: user?.avatar,
      level: '초급',
      durationMinutes: 0,
      totalLessons: 0,
      enrolledCount: 0,
      rating: 0,
      reviewsCount: 0,
      isPublished: true,
      price: 0,
      learningObjectives: [],
      requirements: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [objectiveInput, setObjectiveInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const [sections, setSections] = useState<CourseSection[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const reloadCurriculumData = () => {
    setSections(storage.getSections(course.id));
    setLessons(storage.getLessons(course.id));
    const refreshed = storage.getCourseById(course.id);
    if (refreshed) setCourse(refreshed);
  };

  const handleConfirmDelete = () => {
    const actor = user ? { id: user.id, name: user.name } : undefined;
    storage.deleteCourse(course.id, actor);
    showToast(`'${course.title || '강의'}'가 삭제되었습니다.`, 'success');
    setIsDeleteModalOpen(false);
    onNavigate('admin-courses');
  };

  useEffect(() => {
    reloadCurriculumData();
  }, [course.id]);

  const handleSaveDraft = (silent = false) => {
    const cat = categories.find((c) => c.id === course.categoryId);
    const updated: Course = { ...course, categoryName: cat?.name || course.categoryName, updatedAt: new Date().toISOString() };
    storage.saveCourse(updated);
    setCourse(updated);
    if (!silent) showToast('강의 정보를 저장했습니다.', 'success');
  };

  const validateCurrentStep = (step: number): boolean => {
    if (step === 1) {
      if (!course.title.trim()) {
        showToast('강의 제목을 입력해 주세요.', 'error');
        return false;
      }
      if (!course.instructorName.trim()) {
        showToast('강사 이름을 입력해 주세요.', 'error');
        return false;
      }
    }
    return true;
  };

  const goToStep = (step: number) => {
    if (step === currentStep) return;
    if (step > currentStep && !validateCurrentStep(currentStep)) return;
    handleSaveDraft(true);
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (!clean) return;
    const existingTags = course.tags || [];
    if (existingTags.includes(clean)) {
      showToast('이미 등록된 태그입니다.', 'info');
    } else {
      setCourse({ ...course, tags: [...existingTags, clean] });
    }
    setTagInput('');
  };

  const handleAddObjective = () => {
    if (!objectiveInput.trim()) return;
    setCourse({ ...course, learningObjectives: [...(course.learningObjectives || []), objectiveInput.trim()] });
    setObjectiveInput('');
  };

  const handleAddRequirement = () => {
    if (!requirementInput.trim()) return;
    setCourse({ ...course, requirements: [...(course.requirements || []), requirementInput.trim()] });
    setRequirementInput('');
  };

  const threshold = course.completionThresholdPercent ?? 80;
  const quizCount = lessons.filter((l) => l.type === 'quiz' || l.type === 'exam').length;
  const videoCount = lessons.filter((l) => l.type === 'video').length;
  const checklist = [
    { ok: !!course.title.trim(), label: '강의 제목' },
    { ok: !!course.shortDescription.trim(), label: '한 줄 요약' },
    { ok: sections.length > 0, label: '섹션 1개 이상' },
    { ok: lessons.length > 0, label: '강의(레슨) 1개 이상' },
    { ok: (course.learningObjectives || []).length > 0, label: '학습 목표' },
  ];

  return (
    <div className="min-w-0 space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('admin-courses')}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"
            title="강의 목록으로"
            aria-label="강의 목록으로"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold text-neutral-900">
                {isEditing ? course.title || '제목 없는 강의' : '새 강의 만들기'}
              </h1>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${
                  course.isPublished ? 'text-emerald-700' : 'text-neutral-500'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${course.isPublished ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                {course.isPublished ? '공개' : '비공개'}
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-neutral-500">
              {STEPS.length}단계 중 {currentStep}단계 · {STEPS[currentStep - 1].label}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {isEditing && (
            <>
              <button type="button" onClick={() => onNavigate('course-detail', course.id)} className="lms-btn lms-btn-ghost lms-btn-sm">
                <Eye className="h-4 w-4" />
                수강생 화면
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="lms-btn lms-btn-ghost lms-btn-sm text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </button>
            </>
          )}
          <button type="button" onClick={() => handleSaveDraft()} className="lms-btn lms-btn-secondary lms-btn-sm">
            <Save className="h-4 w-4" />
            저장
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        {/* Step navigation */}
        <nav aria-label="편집 단계" className="lg:sticky lg:top-[88px]">
          <ol className="-mx-4 flex gap-1 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:flex-col lg:px-0">
            {STEPS.map((step) => {
              const isCurrent = currentStep === step.id;
              const isDone = currentStep > step.id;
              return (
                <li key={step.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => goToStep(step.id)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      isCurrent ? 'bg-white shadow-xs ring-1 ring-neutral-200' : 'hover:bg-neutral-100'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isCurrent
                          ? 'bg-brand-600 text-white'
                          : isDone
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : step.id}
                    </span>
                    <span className="min-w-0">
                      <span className={`block whitespace-nowrap text-sm font-medium ${isCurrent ? 'text-neutral-900' : 'text-neutral-600'}`}>
                        {step.label}
                      </span>
                      <span className="hidden truncate text-xs text-neutral-400 lg:block">{step.desc}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Step content */}
        <section className="min-w-0 rounded-xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-neutral-900">{STEPS[currentStep - 1].label}</h2>
            <p className="mt-0.5 text-[13px] text-neutral-500">{STEPS[currentStep - 1].desc}</p>
          </div>

          <div className="p-5 sm:p-6">
            {currentStep === 1 && (
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-5">
                  <Field label="강의 제목" required>
                    <input
                      type="text"
                      required
                      value={course.title}
                      onChange={(e) => setCourse({ ...course, title: e.target.value })}
                      placeholder="예: 신입사원 온보딩 - TDS의 일하는 방식"
                      className="lms-input"
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="카테고리" required>
                      <select
                        value={course.categoryId}
                        onChange={(e) => {
                          const selected = categories.find((c) => c.id === e.target.value);
                          setCourse({ ...course, categoryId: e.target.value, categoryName: selected?.name || course.categoryName });
                        }}
                        className="lms-input"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="난이도">
                      <select
                        value={course.level}
                        onChange={(e) => setCourse({ ...course, level: e.target.value as CourseLevel })}
                        className="lms-input"
                      >
                        <option value="초급">초급</option>
                        <option value="중급">중급</option>
                        <option value="고급">고급</option>
                      </select>
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="강사 이름" required>
                      <input
                        type="text"
                        required
                        value={course.instructorName}
                        onChange={(e) => setCourse({ ...course, instructorName: e.target.value })}
                        className="lms-input"
                      />
                    </Field>
                    <Field label="강사 직책 · 소속">
                      <input
                        type="text"
                        value={course.instructorRole || ''}
                        onChange={(e) => setCourse({ ...course, instructorRole: e.target.value })}
                        placeholder="예: 인사팀 리드"
                        className="lms-input"
                      />
                    </Field>
                  </div>
                  <Field label="한 줄 요약" hint="강의 카드와 상세 화면 상단에 표시됩니다.">
                    <input
                      type="text"
                      value={course.shortDescription}
                      onChange={(e) => setCourse({ ...course, shortDescription: e.target.value })}
                      placeholder="강의 핵심을 한 문장으로 적어 주세요."
                      className="lms-input"
                    />
                  </Field>
                  <Field label="상세 소개">
                    <textarea
                      rows={5}
                      value={course.description}
                      onChange={(e) => setCourse({ ...course, description: e.target.value })}
                      placeholder="강의 목표, 다루는 내용, 수강 후 할 수 있게 되는 것을 적어 주세요."
                      className="lms-input h-auto resize-y py-2.5 leading-relaxed"
                    />
                  </Field>
                </div>

                <div className="space-y-3">
                  <Field label="썸네일 이미지 URL" hint="16:9 비율 권장. 비워 두면 카테고리 표지가 자동으로 쓰입니다.">
                    <input
                      type="url"
                      value={course.thumbnail || ''}
                      onChange={(e) => setCourse({ ...course, thumbnail: e.target.value })}
                      placeholder="https://"
                      className="lms-input"
                    />
                  </Field>
                  <CourseCover
                    thumbnail={course.thumbnail}
                    title={course.title || '강의 썸네일'}
                    categoryId={course.categoryId}
                    className="aspect-video w-full rounded-lg border border-neutral-200"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && <CurriculumManager course={course} onUpdated={reloadCurriculumData} />}

            {currentStep === 3 && (
              <div className="max-w-2xl space-y-8">
                <Field
                  label={`학습 완료 기준: 영상 ${threshold}% 이상 시청`}
                  hint="수강생이 이 비율 이상 영상을 봐야 '학습 완료'를 누를 수 있습니다. (기본 80%)"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={threshold}
                      onChange={(e) => setCourse({ ...course, completionThresholdPercent: Number(e.target.value) })}
                      className="h-2 flex-1 cursor-pointer accent-brand-600"
                    />
                    <span className="w-12 text-right text-sm font-semibold tabular-nums text-neutral-900">{threshold}%</span>
                  </div>
                </Field>

                <Field label="학습 목표" hint="강의 상세의 '이 과정에서 배우는 것'에 표시됩니다.">
                  <ListEditor
                    value={objectiveInput}
                    onChange={setObjectiveInput}
                    onAdd={handleAddObjective}
                    items={course.learningObjectives || []}
                    onRemove={(idx) => setCourse({ ...course, learningObjectives: course.learningObjectives?.filter((_, i) => i !== idx) })}
                    placeholder="예: 사내 보안 정책을 업무에 적용할 수 있다"
                  />
                </Field>

                <Field label="수강 전 준비">
                  <ListEditor
                    value={requirementInput}
                    onChange={setRequirementInput}
                    onAdd={handleAddRequirement}
                    items={course.requirements || []}
                    onRemove={(idx) => setCourse({ ...course, requirements: course.requirements?.filter((_, i) => i !== idx) })}
                    placeholder="예: 사내 계정"
                  />
                </Field>

                <Field label="검색 태그" hint="'필수교육', '보안' 태그가 있으면 홈의 필수 교육에도 표시됩니다.">
                  <ListEditor
                    value={tagInput}
                    onChange={setTagInput}
                    onAdd={handleAddTag}
                    items={course.tags || []}
                    onRemove={(idx) => setCourse({ ...course, tags: (course.tags || []).filter((_, i) => i !== idx) })}
                    placeholder="태그 입력 후 Enter"
                    chip
                  />
                </Field>

                <Field label="강의 공지" hint="입력하면 강의 상세와 학습 화면 상단에 표시됩니다. 비워 두면 표시되지 않습니다.">
                  <textarea
                    rows={3}
                    value={course.notice || ''}
                    onChange={(e) => setCourse({ ...course, notice: e.target.value })}
                    placeholder="실습 환경 안내, 평가 일정 등"
                    className="lms-input h-auto resize-y py-2.5 leading-relaxed"
                  />
                </Field>
              </div>
            )}

            {currentStep === 4 && (
              <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <p className="text-[13px] font-medium text-neutral-500">강의 카드 미리보기</p>
                  <div className="pointer-events-none">
                    <CourseCard course={{ ...course, totalLessons: lessons.length }} onSelect={() => {}} />
                  </div>
                </div>

                <div className="space-y-6">
                  <dl className="grid grid-cols-3 divide-x divide-neutral-200 rounded-lg border border-neutral-200">
                    {[
                      { label: '섹션', value: sections.length },
                      { label: '영상', value: videoCount },
                      { label: '퀴즈 · 평가', value: quizCount },
                    ].map((s) => (
                      <div key={s.label} className="px-4 py-3 text-center">
                        <dd className="text-xl font-bold tabular-nums text-neutral-900">{s.value}</dd>
                        <dt className="text-xs text-neutral-500">{s.label}</dt>
                      </div>
                    ))}
                  </dl>

                  <div>
                    <p className="mb-2 text-[13px] font-medium text-neutral-800">게시 전 점검</p>
                    <ul className="space-y-1.5">
                      {checklist.map((c) => (
                        <li key={c.label} className="flex items-center gap-2 text-sm">
                          {c.ok ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                          <span className={c.ok ? 'text-neutral-700' : 'text-neutral-500'}>{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">수강생에게 공개</p>
                      <p className="mt-0.5 text-[13px] text-neutral-500">켜면 홈과 검색 결과에 바로 표시됩니다.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={course.isPublished}
                      onClick={() => setCourse({ ...course, isPublished: !course.isPublished })}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
                        course.isPublished ? 'bg-brand-600' : 'bg-neutral-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-all ${
                          course.isPublished ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                      <span className="sr-only">공개 여부</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveDraft();
                        onNavigate('admin-courses');
                      }}
                      className="lms-btn lms-btn-primary"
                    >
                      <Check className="h-4 w-4" />
                      저장하고 목록으로
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveDraft(true);
                        onNavigate('course-detail', course.id);
                      }}
                      className="lms-btn lms-btn-secondary"
                    >
                      수강생 화면에서 보기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3.5 sm:px-6">
            <button
              type="button"
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep === 1}
              className="lms-btn lms-btn-ghost lms-btn-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              이전
            </button>
            {currentStep < LAST_STEP && (
              <button type="button" onClick={() => goToStep(currentStep + 1)} className="lms-btn lms-btn-primary lms-btn-sm">
                다음
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      </div>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="강의 삭제">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p className="leading-relaxed">
              <strong className="font-semibold">'{course.title || '제목 없는 강의'}'</strong>를 삭제하면 커리큘럼, 퀴즈, 수강생 진도와
              수료 기록이 모두 지워지며 되돌릴 수 없습니다.
            </p>
          </div>
          <p className="text-[13px] text-neutral-500">
            강사 {course.instructorName} · 수강생 {course.enrolledCount}명 · {course.totalLessons}강
          </p>
          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="lms-btn lms-btn-secondary">
              취소
            </button>
            <button
              type="button"
              id="btn-confirm-delete-editor-course"
              onClick={handleConfirmDelete}
              className="lms-btn bg-rose-600 text-white hover:bg-rose-700"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
