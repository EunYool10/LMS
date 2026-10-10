import React, { useState, useEffect } from 'react';
import { Course, CourseLevel, CourseSection, Lesson } from '../../types';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CurriculumManager } from '../../components/admin/CurriculumManager';
import { CourseThumbnail } from '../../components/common/CourseThumbnail';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Save,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Layers,
  Settings,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  Tag,
  ImageIcon,
  Video,
  FileQuestion,
  Sparkles,
  Award,
  UploadCloud,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface AdminCourseEditorPageProps {
  courseId?: string;
  onNavigate: (view: string, param?: string) => void;
}

const WIZARD_STEPS = [
  { id: 1, label: '기본 정보', desc: '제목·설명·강사' },
  { id: 2, label: '강의 이미지', desc: '썸네일 등록' },
  { id: 3, label: '커리큘럼', desc: '섹션 목차 구성' },
  { id: 4, label: '동영상 / 콘텐츠', desc: '영상·강의 레슨' },
  { id: 5, label: '퀴즈 & 평가', desc: '평가 문항 출제' },
  { id: 6, label: '수강 설정', desc: '수료기준·태그' },
  { id: 7, label: '미리보기', desc: '수강생 관점 검토' },
  { id: 8, label: '게시 & 저장', desc: '공개 설정 및 완료' },
];

export const AdminCourseEditorPage: React.FC<AdminCourseEditorPageProps> = ({
  courseId,
  onNavigate,
}) => {
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

  // Sections and lessons for step 3, 4, 5, 7
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const reloadCurriculumData = () => {
    setSections(storage.getSections(course.id));
    setLessons(storage.getLessons(course.id));
    const refreshed = storage.getCourseById(course.id);
    if (refreshed) {
      setCourse(refreshed);
    }
  };

  const handleConfirmDelete = () => {
    const actor = user ? { id: user.id, name: user.name } : undefined;
    storage.deleteCourse(course.id, actor);
    showToast(`'${course.title || '강의'}'가 성공적으로 영구 삭제되었습니다.`, 'success');
    setIsDeleteModalOpen(false);
    onNavigate('admin-courses');
  };

  useEffect(() => {
    reloadCurriculumData();
  }, [course.id]);

  // Save current course state
  const handleSaveDraft = (silent = false) => {
    const cat = categories.find((c) => c.id === course.categoryId);
    const updated: Course = {
      ...course,
      categoryName: cat?.name || course.categoryName,
      updatedAt: new Date().toISOString(),
    };

    storage.saveCourse(updated);
    setCourse(updated);
    if (!silent) {
      showToast('강의 정보가 성공적으로 저장되었습니다.', 'success');
    }
  };

  // Step Validation
  const validateCurrentStep = (step: number): boolean => {
    if (step === 1) {
      if (!course.title.trim()) {
        showToast('강의 제목을 입력해주세요.', 'error');
        return false;
      }
      if (!course.instructorName.trim()) {
        showToast('강사 성명을 입력해주세요.', 'error');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateCurrentStep(currentStep)) return;
    handleSaveDraft(true);
    if (currentStep < 8) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddTag = (tagToAdd?: string) => {
    const raw = tagToAdd || tagInput;
    const clean = raw.trim().replace(/^#/, '');
    if (!clean) return;

    const existingTags = course.tags || [];
    if (existingTags.includes(clean)) {
      showToast('이미 등록된 태그입니다.', 'info');
      setTagInput('');
      return;
    }

    setCourse({
      ...course,
      tags: [...existingTags, clean],
    });
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCourse({
      ...course,
      tags: (course.tags || []).filter((t) => t !== tagToRemove),
    });
  };

  const handleAddObjective = () => {
    if (!objectiveInput.trim()) return;
    setCourse({
      ...course,
      learningObjectives: [...(course.learningObjectives || []), objectiveInput.trim()],
    });
    setObjectiveInput('');
  };

  const handleRemoveObjective = (idx: number) => {
    setCourse({
      ...course,
      learningObjectives: course.learningObjectives?.filter((_, i) => i !== idx),
    });
  };

  const handleAddRequirement = () => {
    if (!requirementInput.trim()) return;
    setCourse({
      ...course,
      requirements: [...(course.requirements || []), requirementInput.trim()],
    });
    setRequirementInput('');
  };

  const handleRemoveRequirement = (idx: number) => {
    setCourse({
      ...course,
      requirements: course.requirements?.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('admin-courses')}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            title="목록으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {isEditing ? `강의 편집: ${course.title || '제목 미지정'}` : '신규 강의 제작 스튜디오'}
              </h2>
              <Badge variant={course.isPublished ? 'success' : 'neutral'} size="sm">
                {course.isPublished ? '공개 중' : '비공개 초안'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              8단계 가이드를 따라 완성도 높은 엔터프라이즈 강의를 제작하세요.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSaveDraft()}
            className="py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>임시 저장</span>
          </button>
          {isEditing && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('course-detail', course.id)}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                <span>수강생 화면 보기</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                title="강의 영구 삭제"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>강의 삭제</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 8-Step Progress Bar / Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[720px] gap-2">
          {WIZARD_STEPS.map((step) => {
            const isCurrent = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (validateCurrentStep(currentStep)) {
                    handleSaveDraft(true);
                    setCurrentStep(step.id);
                  }
                }}
                className={`flex-1 flex items-center gap-2 p-2 rounded-xl transition-all cursor-pointer text-left ${
                  isCurrent
                    ? 'bg-indigo-50/80 border border-indigo-200'
                    : isCompleted
                    ? 'bg-slate-50 hover:bg-slate-100 border border-slate-100'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-xs font-bold truncate ${
                      isCurrent ? 'text-indigo-900' : 'text-slate-800'
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{step.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wizard Step Content Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        {/* STEP 01: 기본 정보 */}
        {currentStep === 1 && (
          <div className="space-y-6 max-w-3xl">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Step 01. 기본 정보 설정</h3>
              <p className="text-xs text-slate-500 mt-0.5">강의 제목, 카테고리, 난이도 및 강사 정보를 입력합니다.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  강의 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={course.title}
                  onChange={(e) => setCourse({ ...course, title: e.target.value })}
                  placeholder="예: [실무 완성] TypeScript & React 19 엔터프라이즈 아키텍처"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    카테고리 분류 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={course.categoryId}
                    onChange={(e) => {
                      const selected = categories.find((c) => c.id === e.target.value);
                      setCourse({
                        ...course,
                        categoryId: e.target.value,
                        categoryName: selected?.name || course.categoryName,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">권장 난이도</label>
                  <select
                    value={course.level}
                    onChange={(e) => setCourse({ ...course, level: e.target.value as CourseLevel })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="초급">초급 (입문자)</option>
                    <option value="중급">중급 (실무 1~3년차)</option>
                    <option value="고급">고급 (전문가 및 아키텍트)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    담당 강사 성명 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={course.instructorName}
                    onChange={(e) => setCourse({ ...course, instructorName: e.target.value })}
                    placeholder="강사 성명"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">강사 직책 / 소속</label>
                  <input
                    type="text"
                    value={course.instructorRole || ''}
                    onChange={(e) => setCourse({ ...course, instructorRole: e.target.value })}
                    placeholder="예: TDS 테크 리드 / 수석 엔지니어"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">한 줄 요약 (목록 및 카드 노출용)</label>
                <input
                  type="text"
                  value={course.shortDescription}
                  onChange={(e) => setCourse({ ...course, shortDescription: e.target.value })}
                  placeholder="강의 핵심 내용을 한 문장으로 간결하게 설명하세요."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">상세 강의 소개</label>
                <textarea
                  rows={4}
                  value={course.description}
                  onChange={(e) => setCourse({ ...course, description: e.target.value })}
                  placeholder="강의 전반의 목표, 학습 커리큘럼, 완강 후 습득 가능한 역량을 상세히 작성하세요."
                  className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* 강의 공식 공지사항 등록 (관리자/강사 직접 등록) */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-indigo-950">
                    강의 공식 공지사항 (Notice)
                  </label>
                  <span className="text-[11px] text-slate-500">선택 사항 (비워두면 공지가 노출되지 않음)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  강의 상세 페이지 및 수강 화면의 개요 탭 최상단에 강조 노출됩니다. 등록된 공지가 없으면 배너가 노출되지 않습니다.
                </p>
                <textarea
                  rows={3}
                  value={course.notice || ''}
                  onChange={(e) => setCourse({ ...course, notice: e.target.value })}
                  placeholder="수강생에게 전달할 주요 공지사항, 실습 환경 안내, 평가 주의사항 등을 입력하세요. (비워둘 시 공지 배너 미노출)"
                  className="w-full p-3 text-xs bg-white border border-indigo-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              {/* 강사 지정 학습 완료 인정 기준 % */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900">
                    강사 지정 학습 완료 인정 시청률 (%)
                  </label>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    현재: {course.completionThresholdPercent ?? 80}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  일반 수강생이 동영상 강의를 최소 몇 % 이상 시청해야 '학습 완료' 버튼을 클릭할 수 있는지 설정합니다. (기본값: 80%)
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={course.completionThresholdPercent ?? 80}
                    onChange={(e) =>
                      setCourse({ ...course, completionThresholdPercent: Number(e.target.value) })
                    }
                    className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={course.completionThresholdPercent ?? 80}
                      onChange={(e) => {
                        const val = Math.max(10, Math.min(100, Number(e.target.value) || 80));
                        setCourse({ ...course, completionThresholdPercent: val });
                      }}
                      className="w-16 px-2 py-1 text-xs text-center font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-slate-600">% 이상</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 02: 강의 이미지 */}
        {currentStep === 2 && (
          <div className="space-y-6 max-w-3xl">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Step 02. 대표 썸네일 이미지 등록</h3>
              <p className="text-xs text-slate-500 mt-0.5">강의 목록 및 상세 페이지에 사용될 공식 썸네일을 설정합니다.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">이미지 URL 입력</label>
                  <input
                    type="url"
                    value={course.thumbnail || ''}
                    onChange={(e) => setCourse({ ...course, thumbnail: e.target.value })}
                    placeholder="https://example.com/course-thumbnail.png"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    URL을 비워두거나 로드 실패 시 공식 TDSNTLMS 브랜드 썸네일로 자동 처리됩니다.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>이미지 가이드라인 (Phase 6 준수)</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px]">
                    <li>권장 해상도: 1280 x 720 px (16:9 비율)</li>
                    <li>지원 포맷: PNG, JPG, WebP</li>
                    <li>깨진 이미지나 로드 실패 시 무한 루프 없이 공식 TDS fallback으로 전환</li>
                  </ul>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-700">썸네일 실시간 미리보기</div>
                <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
                  <CourseThumbnail
                    src={course.thumbnail}
                    alt={course.title || '강의 썸네일'}
                    containerClassName="w-full h-full"
                    fallbackText={course.title.slice(0, 4)}
                  />
                </div>
                <div className="text-[11px] text-slate-400 text-center">
                  {course.thumbnail ? '사용자 등록 이미지' : '공식 TDS 기본 썸네일 적용'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 03: 커리큘럼 섹션 구성 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Step 03. 커리큘럼 섹션 및 목차 구성</h3>
              <p className="text-xs text-slate-500 mt-0.5">강의를 구성할 주요 학습 섹션(대단원)을 생성하고 순서를 배치합니다.</p>
            </div>

            <CurriculumManager course={course} onUpdated={reloadCurriculumData} />
          </div>
        )}

        {/* STEP 04: 동영상 / 콘텐츠 */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Step 04. 동영상 및 학습 콘텐츠 등록</h3>
              <p className="text-xs text-slate-500 mt-0.5">각 섹션에 영상 레슨, YouTube 링크, 첨부 문서를 추가하고 재생 시간을 설정합니다.</p>
            </div>

            <CurriculumManager course={course} onUpdated={reloadCurriculumData} />
          </div>
        )}

        {/* STEP 05: 퀴즈 & 평가 */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Step 05. 문제 및 퀴즈 출제</h3>
              <p className="text-xs text-slate-500 mt-0.5">수강생의 이해도를 검증할 퀴즈 및 평가 시험 문항(객관식/OX/주관식)을 출제합니다.</p>
            </div>

            <CurriculumManager course={course} onUpdated={reloadCurriculumData} />
          </div>
        )}

        {/* STEP 06: 수강 설정 */}
        {currentStep === 6 && (
          <div className="space-y-6 max-w-3xl">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Step 06. 수강 설정 및 태그</h3>
              <p className="text-xs text-slate-500 mt-0.5">수강료, 학습 목표, 선수 지식 및 검색 태그를 설정합니다.</p>
            </div>

            <div className="space-y-5">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">수강료 설정 (원)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={course.price || 0}
                  onChange={(e) => setCourse({ ...course, price: parseInt(e.target.value) || 0 })}
                  className="w-full max-w-xs px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">0원 입력 시 전 수강생 무료 공개 강의로 운영됩니다.</p>
              </div>

              {/* Learning Objectives */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">학습 목표 항목</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={objectiveInput}
                    onChange={(e) => setObjectiveInput(e.target.value)}
                    placeholder="예: React 19 Actions와 폼 상태 관리 완벽 정복"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddObjective}
                    className="py-2 px-3 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>추가</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(course.learningObjectives || []).map((obj, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{obj}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveObjective(idx)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">선수 지식 및 준비물</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={requirementInput}
                    onChange={(e) => setRequirementInput(e.target.value)}
                    placeholder="예: JavaScript ES6+ 문법 기본 이해"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddRequirement}
                    className="py-2 px-3 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>추가</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(course.requirements || []).map((req, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <span>{req}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(idx)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">검색 태그</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="#React #TypeScript #FullStack"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag()}
                    className="py-2 px-3 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>추가</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(course.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 07: 미리보기 */}
        {currentStep === 7 && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Step 07. 수강생 관점 미리보기</h3>
              <p className="text-xs text-slate-500 mt-0.5">실제 수강생에게 표시될 강의 카드 및 상세 구성을 확인합니다.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Preview Card */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <CourseThumbnail
                  src={course.thumbnail}
                  alt={course.title}
                  containerClassName="w-full aspect-video border-b border-slate-100"
                  fallbackText={course.title.slice(0, 4)}
                />
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-600">{course.categoryName}</span>
                    <Badge variant="neutral" size="sm">
                      {course.level}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-2">{course.title || '강의 제목 미지정'}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">{course.shortDescription || '한 줄 요약이 없습니다.'}</p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span>{course.instructorName} 강사</span>
                    <span className="font-bold text-slate-900">{course.price === 0 ? '무료' : `${course.price?.toLocaleString()}원`}</span>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="md:col-span-2 space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800">커리큘럼 구성 현황</h4>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                      <div className="text-slate-400 text-[11px]">등록 섹션</div>
                      <div className="text-lg font-bold text-slate-900">{sections.length}개</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                      <div className="text-slate-400 text-[11px]">총 레슨 수</div>
                      <div className="text-lg font-bold text-slate-900">{lessons.length}개</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                      <div className="text-slate-400 text-[11px]">평가 퀴즈</div>
                      <div className="text-lg font-bold text-indigo-600">
                        {lessons.filter((l) => l.type === 'quiz' || l.type === 'exam').length}개
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <h4 className="font-bold text-slate-800">학습 목표 ({course.learningObjectives?.length || 0}개)</h4>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    {(course.learningObjectives || []).map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 08: 게시 & 저장 */}
        {currentStep === 8 && (
          <div className="space-y-6 max-w-2xl">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Step 08. 최종 검토 및 게시</h3>
              <p className="text-xs text-slate-500 mt-0.5">강의 공개 상태를 확인하고 최종 개설을 완료합니다.</p>
            </div>

            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">공개 운영 여부</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    [공개 중]으로 설정하면 전체 수강생 홈 및 검색 목록에 즉시 노출됩니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCourse({ ...course, isPublished: !course.isPublished })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    course.isPublished
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                  }`}
                >
                  {course.isPublished ? '공개 운영 중' : '비공개 초안'}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200 text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>강의 제목:</span>
                  <span className="font-bold text-slate-900">{course.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>카테고리:</span>
                  <span className="font-medium text-slate-800">{course.categoryName}</span>
                </div>
                <div className="flex justify-between">
                  <span>총 레슨:</span>
                  <span className="font-medium text-slate-800">{lessons.length}강</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleSaveDraft();
                  onNavigate('admin-courses');
                }}
                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>강의 제작 완료 및 목록으로 이동</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSaveDraft();
                  onNavigate('course-detail', course.id);
                }}
                className="py-3 px-5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <span>수강 화면 바로가기</span>
              </button>
            </div>
          </div>
        )}

        {/* Wizard Footer Step Navigation Controls */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className={`py-2 px-4 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
              currentStep === 1
                ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>이전 단계</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveDraft()}
              className="py-2 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>임시 저장</span>
            </button>

            {currentStep < 8 && (
              <button
                type="button"
                onClick={handleNextStep}
                className="py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <span>다음 단계</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Course Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="강의 영구 삭제 확인"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">현재 편집 중인 강의를 영구 삭제하시겠습니까?</p>
              <p className="mt-1 text-rose-700 leading-relaxed">
                삭제 시 해당 강의에 등록된 모든 커리큘럼(섹션, 레슨 영상), 퀴즈 및 시험 문항, 수강생들의 진도율, 수료증 및 학습 이력 데이터가 영구 파기되며 복구할 수 없습니다.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm truncate max-w-[320px]">{course.title || '제목 미지정 강의'}</span>
              <Badge variant={course.isPublished ? 'success' : 'neutral'} size="sm">
                {course.isPublished ? '공개 중' : '비공개'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-slate-500 text-[11px] pt-1">
              <span>강사: <strong className="text-slate-700">{course.instructorName}</strong></span>
              <span>•</span>
              <span>수강생: <strong className="text-indigo-600 font-bold">{course.enrolledCount}명</strong></span>
              <span>•</span>
              <span>총 <strong className="text-slate-700">{course.totalLessons}강</strong></span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              id="btn-confirm-delete-editor-course"
              onClick={handleConfirmDelete}
              className="px-4 py-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>영구 삭제 실행</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
