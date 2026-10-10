import React, { useState } from 'react';
import { storage } from '../../services/storage';
import { Course } from '../../types';
import { Badge } from '../../components/common/Badge';
import { CourseThumbnail } from '../../components/common/CourseThumbnail';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatCourseTotalDuration } from '../../utils/duration';
import {
  Plus,
  Search,
  BookOpen,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

import { LEGACY_CATEGORY_MAP } from '../../data/categoriesData';

interface AdminCoursesPageProps {
  onNavigate: (view: string, param?: string) => void;
}

export const AdminCoursesPage: React.FC<AdminCoursesPageProps> = ({ onNavigate }) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>(() => storage.getCourses(true));
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Bulk Selection State
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const categories = storage.getCategories();

  const reload = () => {
    setCourses(storage.getCourses(true));
  };

  const handleTogglePublish = (courseId: string, current: boolean) => {
    const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;
    storage.toggleCoursePublish(courseId, !current, actor);
    reload();
    showToast(`강의가 [${!current ? '공개' : '비공개'}] 로 전환되었습니다.`, 'info');
  };

  const handleDeleteCourse = (course: Course) => {
    setCourseToDelete(course);
  };

  const handleConfirmSingleDelete = () => {
    if (!courseToDelete) return;
    const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;
    storage.deleteCourse(courseToDelete.id, actor);
    showToast(`'${courseToDelete.title}' 강의가 성공적으로 영구 삭제되었습니다.`, 'success');
    setCourseToDelete(null);
    reload();
  };

  const filtered = courses.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.instructorName.toLowerCase().includes(search.toLowerCase());
    const courseCatId = LEGACY_CATEGORY_MAP[c.categoryId] || c.categoryId;
    const matchCat = categoryFilter === 'all' || courseCatId === categoryFilter;
    return matchSearch && matchCat;
  });

  // Bulk Selection Handlers
  const handleToggleSelectCourse = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleToggleSelectAll = () => {
    const filteredIds = filtered.map((c) => c.id);
    const areAllSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedCourseIds.includes(id));
    if (areAllSelected) {
      setSelectedCourseIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedCourseIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedCourseIds([]);
  };

  const handleBulkPublish = (publish: boolean) => {
    if (selectedCourseIds.length === 0) return;
    const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;
    const updatedCount = storage.bulkUpdateCoursePublish(selectedCourseIds, publish, actor);
    if (updatedCount > 0) {
      showToast(`${updatedCount}개 강의가 [${publish ? '공개' : '비공개'}]로 일괄 변경되었습니다.`, 'success');
    }
    reload();
    setSelectedCourseIds([]);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedCourseIds.length === 0) return;
    const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;
    const deletedCount = storage.bulkDeleteCourses(selectedCourseIds, actor);
    if (deletedCount > 0) {
      showToast(`${deletedCount}개 강의가 성공적으로 일괄 삭제되었습니다.`, 'success');
    }
    setIsBulkDeleteModalOpen(false);
    reload();
    setSelectedCourseIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">전체 강의 목록 관리</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            등록된 강의의 커리큘럼 편집, 영상 업로드, 퀴즈 출제 및 공개 상태를 관리합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('admin-courses-create')}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>신규 강의 개설하기</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            전체 카테고리
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="강의명, 강사명 검색..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedCourseIds.length > 0 && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              선택된 강의: <strong className="text-indigo-600 font-bold">{selectedCourseIds.length}개</strong>
            </span>
            <span className="text-indigo-300">|</span>
            <button
              type="button"
              id="btn-clear-course-selection"
              onClick={handleClearSelection}
              className="text-slate-500 hover:text-indigo-700 underline cursor-pointer"
            >
              선택 해제
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-bulk-publish-courses"
              onClick={() => handleBulkPublish(true)}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>일괄 공개 전환</span>
            </button>
            <button
              type="button"
              id="btn-bulk-unpublish-courses"
              onClick={() => handleBulkPublish(false)}
              className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>일괄 비공개 전환</span>
            </button>
            <button
              type="button"
              id="btn-bulk-delete-courses"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>일괄 강의 삭제</span>
            </button>
          </div>
        </div>
      )}

      {/* Courses List Table & Mobile Card View */}
      {filtered.length === 0 ? (
        <EmptyState
          title="등록된 강의가 없습니다"
          description="새로운 사내 교육 과정이 개설되면 이곳에 표시됩니다."
          showAction
          actionLabel="신규 강의 개설하기"
          onAction={() => onNavigate('admin-courses-create')}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Mobile Card List View (Visible on small screens) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {/* Mobile Select All Header */}
            <div className="p-3 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 &&
                    filtered.every((c) => selectedCourseIds.includes(c.id))
                  }
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>전체 선택 ({selectedCourseIds.length}/{filtered.length})</span>
              </label>
            </div>

            {filtered.map((course) => {
              const isSelected = selectedCourseIds.includes(course.id);
              return (
                <div
                  key={`mobile-${course.id}`}
                  className={`p-4 space-y-3 transition-colors ${
                    isSelected ? 'bg-indigo-50/30' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectCourse(course.id)}
                      className="w-4 h-4 mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <CourseThumbnail
                      src={course.thumbnail}
                      alt={course.title}
                      containerClassName="w-16 h-11 rounded-lg overflow-hidden border border-slate-200 shrink-0"
                      fallbackText={course.title.slice(0, 3)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {course.categoryName}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {course.level}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                        {course.title}
                      </h4>
                    </div>
                  </div>

                  {/* Course Details Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>강사: <strong className="text-slate-700 font-semibold">{course.instructorName}</strong></span>
                      <span>수강생: <strong className="text-slate-700 font-semibold">{course.enrolledCount}명</strong></span>
                      <span>총 {course.totalLessons}강</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePublish(course.id, course.isPublished)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10.5px] transition-colors cursor-pointer ${
                        course.isPublished
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {course.isPublished ? (
                        <>
                          <Eye className="w-3 h-3" /> 공개 중
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" /> 비공개
                        </>
                      )}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigate('admin-courses-edit', course.id)}
                      className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>커리큘럼 편집</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(course)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                      title="강의 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      id="checkbox-select-all-courses"
                      checked={
                        filtered.length > 0 &&
                        filtered.every((c) => selectedCourseIds.includes(c.id))
                      }
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="전체 강의 선택/해제"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold">강의 정보</th>
                  <th className="py-3 px-4 font-semibold">난이도</th>
                  <th className="py-3 px-4 font-semibold">강사</th>
                  <th className="py-3 px-4 font-semibold">수강생 수</th>
                  <th className="py-3 px-4 font-semibold">강의/콘텐츠</th>
                  <th className="py-3 px-4 font-semibold">공개 상태</th>
                  <th className="py-3 px-4 font-semibold">최근 수정</th>
                  <th className="py-3 px-4 font-semibold text-right">관리 / 편집</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((course) => {
                  const isSelected = selectedCourseIds.includes(course.id);
                  return (
                    <tr
                      key={course.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectCourse(course.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <CourseThumbnail
                            src={course.thumbnail}
                            alt={course.title}
                            containerClassName="w-14 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0"
                            fallbackText={course.title.slice(0, 3)}
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 line-clamp-1">{course.title}</span>
                            <span className="text-[11px] text-slate-400">{course.categoryName}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        <Badge variant="neutral" size="sm">
                          {course.level}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-900">{course.instructorName}</td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums">
                        {course.enrolledCount}명
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        총 {course.totalLessons}강 ({formatCourseTotalDuration(course.totalDurationSeconds, course.durationMinutes)})
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(course.id, course.isPublished)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] transition-colors cursor-pointer ${
                            course.isPublished
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {course.isPublished ? (
                            <>
                              <Eye className="w-3 h-3" /> 공개 중
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" /> 비공개 초안
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 tabular-nums">
                        {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString('ko-KR') : '-'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onNavigate('admin-courses-edit', course.id)}
                            className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-md text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>커리큘럼 편집</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCourse(course)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="강의 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="선택 강의 일괄 삭제 확인"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed">
              <p className="font-bold">선택하신 {selectedCourseIds.length}개 강의를 영구 삭제하시겠습니까?</p>
              <p className="mt-1 text-rose-700">
                삭제 시 강의에 속한 모든 섹션, 레슨 영상, 퀴즈/시험 문항 및 수강생 진도/이수 기록이 영구 파기되며 복구할 수 없습니다.
              </p>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
            {selectedCourseIds.map((id) => {
              const c = courses.find((item) => item.id === id);
              if (!c) return null;
              return (
                <div key={id} className="p-2.5 flex items-center justify-between bg-slate-50/50">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-slate-800 truncate">{c.title}</p>
                    <p className="text-[11px] text-slate-400">
                      강사: {c.instructorName} · 수강생: {c.enrolledCount}명
                    </p>
                  </div>
                  <Badge variant={c.isPublished ? 'success' : 'neutral'} size="sm">
                    {c.isPublished ? '공개 중' : '비공개'}
                  </Badge>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="px-4 py-2 font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              id="btn-confirm-bulk-delete-courses"
              onClick={handleConfirmBulkDelete}
              className="px-4 py-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>일괄 삭제 실행</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Single Course Delete Confirmation Modal */}
      <Modal
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        title="강의 영구 삭제 확인"
      >
        {courseToDelete && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">선택하신 강의를 영구 삭제하시겠습니까?</p>
                <p className="mt-1 text-rose-700 leading-relaxed">
                  삭제 시 해당 강의에 등록된 모든 커리큘럼(섹션, 레슨 영상), 퀴즈 및 시험 문항, 수강생들의 진도율, 수료증 및 학습 이력 데이터가 영구 파기되며 복구할 수 없습니다.
                </p>
              </div>
            </div>

            {/* Target Course Summary Box */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm truncate max-w-[320px]">{courseToDelete.title}</span>
                <Badge variant={courseToDelete.isPublished ? 'success' : 'neutral'} size="sm">
                  {courseToDelete.isPublished ? '공개 중' : '비공개'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 text-slate-500 text-[11px] pt-1">
                <span>카테고리: <strong className="text-slate-700">{courseToDelete.categoryName}</strong></span>
                <span>•</span>
                <span>강사: <strong className="text-slate-700">{courseToDelete.instructorName}</strong></span>
                <span>•</span>
                <span>수강생: <strong className="text-indigo-600 font-bold">{courseToDelete.enrolledCount}명</strong></span>
                <span>•</span>
                <span>총 <strong className="text-slate-700">{courseToDelete.totalLessons}강</strong></span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                className="px-4 py-2 font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                id="btn-confirm-delete-course"
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>영구 삭제 실행</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
