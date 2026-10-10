import React, { useMemo, useState } from 'react';
import { storage } from '../../services/storage';
import { Course } from '../../types';
import { CourseCover } from '../../components/common/CourseCover';
import { AssignCourseModal } from '../../components/admin/AssignCourseModal';
import { AdminPageHeader, AdminStatStrip } from '../../components/admin/AdminPageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatCourseTotalDuration } from '../../utils/duration';
import { AlertTriangle, Edit2, Eye, EyeOff, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { LEGACY_CATEGORY_MAP } from '../../data/categoriesData';

interface AdminCoursesPageProps {
  onNavigate: (view: string, param?: string) => void;
}

type StatusFilter = 'all' | 'published' | 'draft';
type SortKey = 'updated' | 'enrolled' | 'title';

/** Small on/off switch used for the publish state. */
const PublishSwitch: React.FC<{ on: boolean; onToggle: () => void; label: string }> = ({ on, onToggle, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onToggle}
    className="group inline-flex items-center gap-2 cursor-pointer"
  >
    <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-neutral-300'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </span>
    <span className={`text-xs font-medium ${on ? 'text-emerald-700' : 'text-neutral-500'}`}>{on ? '공개' : '비공개'}</span>
  </button>
);

export const AdminCoursesPage: React.FC<AdminCoursesPageProps> = ({ onNavigate }) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [assignTarget, setAssignTarget] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>(() => storage.getCourses(true));
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('updated');

  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const categories = storage.getCategories();
  const actor = currentUser ? { id: currentUser.id, name: currentUser.name } : undefined;

  const reload = () => setCourses(storage.getCourses(true));

  const handleTogglePublish = (course: Course) => {
    storage.toggleCoursePublish(course.id, !course.isPublished, actor);
    reload();
    showToast(`'${course.title}'을(를) ${!course.isPublished ? '공개' : '비공개'}로 바꿨습니다.`, 'info');
  };

  const handleConfirmSingleDelete = () => {
    if (!courseToDelete) return;
    storage.deleteCourse(courseToDelete.id, actor);
    showToast(`'${courseToDelete.title}' 강의를 삭제했습니다.`, 'success');
    setSelectedCourseIds((prev) => prev.filter((id) => id !== courseToDelete.id));
    setCourseToDelete(null);
    reload();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = courses.filter((c) => {
      const matchSearch = !q || c.title.toLowerCase().includes(q) || c.instructorName.toLowerCase().includes(q);
      const courseCatId = LEGACY_CATEGORY_MAP[c.categoryId] || c.categoryId;
      const matchCat = categoryFilter === 'all' || courseCatId === categoryFilter;
      const matchStatus = statusFilter === 'all' || (statusFilter === 'published' ? c.isPublished : !c.isPublished);
      return matchSearch && matchCat && matchStatus;
    });
    return list.sort((a, b) => {
      if (sortKey === 'enrolled') return (b.enrolledCount || 0) - (a.enrolledCount || 0);
      if (sortKey === 'title') return a.title.localeCompare(b.title, 'ko');
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [courses, search, categoryFilter, statusFilter, sortKey]);

  const publishedCount = courses.filter((c) => c.isPublished).length;
  const totalEnrolled = courses.reduce((s, c) => s + (c.enrolledCount || 0), 0);
  const hasFilter = !!search.trim() || categoryFilter !== 'all' || statusFilter !== 'all';

  const allSelected = filtered.length > 0 && filtered.every((c) => selectedCourseIds.includes(c.id));
  const toggleOne = (id: string) =>
    setSelectedCourseIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () => {
    const ids = filtered.map((c) => c.id);
    setSelectedCourseIds((prev) => (allSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))));
  };

  const handleBulkPublish = (publish: boolean) => {
    if (selectedCourseIds.length === 0) return;
    const count = storage.bulkUpdateCoursePublish(selectedCourseIds, publish, actor);
    if (count > 0) showToast(`${count}개 강의를 ${publish ? '공개' : '비공개'}로 바꿨습니다.`, 'success');
    reload();
    setSelectedCourseIds([]);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedCourseIds.length === 0) return;
    const count = storage.bulkDeleteCourses(selectedCourseIds, actor);
    if (count > 0) showToast(`${count}개 강의를 삭제했습니다.`, 'success');
    setIsBulkDeleteModalOpen(false);
    reload();
    setSelectedCourseIds([]);
  };

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  const iconDelete = (course: Course) => (
    <button
      type="button"
      onClick={() => setCourseToDelete(course)}
      className="rounded-md p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
      title="강의 삭제"
      aria-label={`${course.title} 삭제`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="강의 관리"
        description="강의를 만들고 커리큘럼을 편집하거나 직원에게 수강을 배정합니다."
        actions={
          <button type="button" onClick={() => onNavigate('admin-courses-create')} className="lms-btn lms-btn-primary">
            <Plus className="h-4 w-4" />새 강의
          </button>
        }
      />

      <AdminStatStrip
        stats={[
          { label: '전체 강의', value: `${courses.length}개` },
          { label: '공개', value: `${publishedCount}개` },
          { label: '비공개', value: `${courses.length - publishedCount}개` },
          { label: '누적 수강', value: `${totalEnrolled.toLocaleString()}건` },
        ]}
      />

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {/* Toolbar or bulk-action bar */}
        {selectedCourseIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-brand-50/60 px-4 py-3">
            <span className="text-sm font-medium text-neutral-900">{selectedCourseIds.length}개 선택</span>
            <button
              type="button"
              id="btn-clear-course-selection"
              onClick={() => setSelectedCourseIds([])}
              className="inline-flex items-center gap-1 text-[13px] text-neutral-500 hover:text-neutral-900 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              선택 해제
            </button>
            <div className="ml-auto flex flex-wrap gap-2">
              <button type="button" id="btn-bulk-publish-courses" onClick={() => handleBulkPublish(true)} className="lms-btn lms-btn-secondary lms-btn-sm">
                <Eye className="h-4 w-4" />
                공개
              </button>
              <button type="button" id="btn-bulk-unpublish-courses" onClick={() => handleBulkPublish(false)} className="lms-btn lms-btn-secondary lms-btn-sm">
                <EyeOff className="h-4 w-4" />
                비공개
              </button>
              <button
                type="button"
                id="btn-bulk-delete-courses"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="lms-btn lms-btn-sm border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-3 lg:flex-row lg:items-center">
            <div className="relative lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="강의명, 강사 검색"
                aria-label="강의 검색"
                className="lms-input h-9 pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="카테고리"
                className="lms-input h-9 w-auto pr-8"
              >
                <option value="all">전체 카테고리</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="inline-flex rounded-lg bg-neutral-100 p-0.5" role="group" aria-label="공개 상태">
                {(
                  [
                    { id: 'all', label: '전체' },
                    { id: 'published', label: '공개' },
                    { id: 'draft', label: '비공개' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={statusFilter === s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                      statusFilter === s.id ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 lg:ml-auto">
              <span className="text-[13px] tabular-nums text-neutral-500">{filtered.length}개</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                aria-label="정렬"
                className="lms-input h-9 w-auto pr-8"
              >
                <option value="updated">최근 수정순</option>
                <option value="enrolled">수강생 많은 순</option>
                <option value="title">이름순</option>
              </select>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="p-6">
            {hasFilter ? (
              <EmptyState
                title="조건에 맞는 강의가 없습니다"
                description="검색어나 필터를 바꿔 보세요."
                showAction
                actionLabel="필터 초기화"
                onAction={resetFilters}
              />
            ) : (
              <EmptyState
                title="아직 강의가 없습니다"
                description="첫 강의를 만들어 사내 교육을 시작하세요."
                showAction
                actionLabel="새 강의 만들기"
                onAction={() => onNavigate('admin-courses-create')}
              />
            )}
          </div>
        ) : (
          <>
            {/* Mobile list */}
            <ul className="divide-y divide-neutral-100 md:hidden">
              <li className="flex items-center gap-2 bg-neutral-50 px-4 py-2 text-[13px] text-neutral-600">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-brand-600" aria-label="전체 선택" />
                전체 선택
              </li>
              {filtered.map((course) => {
                const isSelected = selectedCourseIds.includes(course.id);
                return (
                  <li key={course.id} className={`space-y-3 px-4 py-3.5 ${isSelected ? 'bg-brand-50/40' : ''}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(course.id)}
                        className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                        aria-label={`${course.title} 선택`}
                      />
                      <CourseCover
                        thumbnail={course.thumbnail}
                        title={course.title}
                        categoryId={course.categoryId}
                        compact
                        className="aspect-video w-20 shrink-0 rounded-md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-neutral-900">{course.title}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {course.categoryName} · {course.level} · {course.instructorName}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {course.totalLessons}강 · 수강생 {course.enrolledCount}명
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pl-7">
                      <PublishSwitch on={course.isPublished} onToggle={() => handleTogglePublish(course)} label={`${course.title} 공개 여부`} />
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setAssignTarget(course)} className="lms-btn lms-btn-secondary lms-btn-sm">
                          <UserPlus className="h-4 w-4" />
                          배정
                        </button>
                        <button type="button" onClick={() => onNavigate('admin-courses-edit', course.id)} className="lms-btn lms-btn-secondary lms-btn-sm">
                          <Edit2 className="h-4 w-4" />
                          편집
                        </button>
                        {iconDelete(course)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
                  <tr>
                    <th className="w-10 px-4 py-2.5">
                      <input
                        type="checkbox"
                        id="checkbox-select-all-courses"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="h-4 w-4 accent-brand-600"
                        aria-label="전체 선택"
                      />
                    </th>
                    <th className="px-3 py-2.5 font-medium">강의</th>
                    <th className="px-3 py-2.5 font-medium">강사</th>
                    <th className="px-3 py-2.5 font-medium">구성</th>
                    <th className="px-3 py-2.5 text-right font-medium">수강생</th>
                    <th className="px-3 py-2.5 font-medium">공개</th>
                    <th className="px-3 py-2.5 font-medium">수정일</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  {filtered.map((course) => {
                    const isSelected = selectedCourseIds.includes(course.id);
                    return (
                      <tr key={course.id} className={isSelected ? 'bg-brand-50/40' : 'hover:bg-neutral-50'}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(course.id)}
                            className="h-4 w-4 accent-brand-600"
                            aria-label={`${course.title} 선택`}
                          />
                        </td>
                        <td className="max-w-[360px] px-3 py-3">
                          <button
                            type="button"
                            onClick={() => onNavigate('admin-courses-edit', course.id)}
                            className="group flex w-full items-center gap-3 text-left cursor-pointer"
                          >
                            <CourseCover
                              thumbnail={course.thumbnail}
                              title={course.title}
                              categoryId={course.categoryId}
                              compact
                              className="aspect-video w-16 shrink-0 rounded-md"
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-neutral-900 group-hover:text-brand-700" title={course.title}>
                                {course.title}
                              </span>
                              <span className="block truncate text-xs text-neutral-500">
                                {course.categoryName} · {course.level}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3">{course.instructorName}</td>
                        <td className="px-3 py-3 text-neutral-500">
                          {course.totalLessons}강 · {formatCourseTotalDuration(course.totalDurationSeconds, course.durationMinutes)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{course.enrolledCount.toLocaleString()}</td>
                        <td className="px-3 py-3">
                          <PublishSwitch on={course.isPublished} onToggle={() => handleTogglePublish(course)} label={`${course.title} 공개 여부`} />
                        </td>
                        <td className="px-3 py-3 tabular-nums text-neutral-500">
                          {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString('ko-KR') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button" onClick={() => setAssignTarget(course)} className="lms-btn lms-btn-secondary lms-btn-sm" title="직원에게 수강 배정">
                              <UserPlus className="h-4 w-4" />
                              배정
                            </button>
                            <button type="button" onClick={() => onNavigate('admin-courses-edit', course.id)} className="lms-btn lms-btn-secondary lms-btn-sm">
                              <Edit2 className="h-4 w-4" />
                              편집
                            </button>
                            {iconDelete(course)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Bulk delete */}
      <Modal isOpen={isBulkDeleteModalOpen} onClose={() => setIsBulkDeleteModalOpen(false)} title={`강의 ${selectedCourseIds.length}개 삭제`}>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p className="leading-relaxed">선택한 강의의 섹션, 영상, 퀴즈와 수강생 진도·수료 기록이 모두 삭제되며 되돌릴 수 없습니다.</p>
          </div>
          <ul className="max-h-48 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200 text-sm">
            {selectedCourseIds.map((id) => {
              const c = courses.find((item) => item.id === id);
              if (!c) return null;
              return (
                <li key={id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-neutral-800">{c.title}</span>
                  <span className="shrink-0 text-xs text-neutral-500">수강생 {c.enrolledCount}명</span>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
            <button type="button" onClick={() => setIsBulkDeleteModalOpen(false)} className="lms-btn lms-btn-secondary">
              취소
            </button>
            <button type="button" id="btn-confirm-bulk-delete-courses" onClick={handleConfirmBulkDelete} className="lms-btn bg-rose-600 text-white hover:bg-rose-700">
              <Trash2 className="h-4 w-4" />
              삭제
            </button>
          </div>
        </div>
      </Modal>

      {/* Single delete */}
      <Modal isOpen={!!courseToDelete} onClose={() => setCourseToDelete(null)} title="강의 삭제">
        {courseToDelete && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <p className="leading-relaxed">
                <strong className="font-semibold">'{courseToDelete.title}'</strong>를 삭제하면 커리큘럼, 퀴즈, 수강생 진도와 수료 기록이 모두 지워지며
                되돌릴 수 없습니다.
              </p>
            </div>
            <p className="text-[13px] text-neutral-500">
              {courseToDelete.categoryName} · 강사 {courseToDelete.instructorName} · 수강생 {courseToDelete.enrolledCount}명 ·{' '}
              {courseToDelete.totalLessons}강
            </p>
            <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
              <button type="button" onClick={() => setCourseToDelete(null)} className="lms-btn lms-btn-secondary">
                취소
              </button>
              <button type="button" id="btn-confirm-delete-course" onClick={handleConfirmSingleDelete} className="lms-btn bg-rose-600 text-white hover:bg-rose-700">
                <Trash2 className="h-4 w-4" />
                삭제
              </button>
            </div>
          </div>
        )}
      </Modal>

      <AssignCourseModal course={assignTarget} isOpen={!!assignTarget} onClose={() => setAssignTarget(null)} onAssigned={() => reload()} />
    </div>
  );
};
