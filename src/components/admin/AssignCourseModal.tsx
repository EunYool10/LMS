import React, { useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { Avatar } from '../common/Avatar';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Course } from '../../types';
import { isAdminRole } from '../../utils/rbac';

interface AssignCourseModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: (count: number) => void;
}

/**
 * Enrolls selected employees in a course (e.g. mandatory training).
 * Enrollments are written to Firestore by storage.enroll, so they appear on the learner's devices.
 */
export const AssignCourseModal: React.FC<AssignCourseModalProps> = ({ course, isOpen, onClose, onAssigned }) => {
  const { user: actor } = useAuth();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [includeStaff, setIncludeStaff] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const users = useMemo(
    () =>
      storage
        .getUsers()
        .filter((u) => !['DELETED', 'INACTIVE', 'SUSPENDED', 'suspended'].includes(u.status as string))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [isOpen]
  );
  const enrolledIds = useMemo(
    () => new Set(course ? storage.getEnrollments().filter((e) => e.courseId === course.id).map((e) => e.userId) : []),
    [course, isOpen]
  );

  const q = query.trim().toLowerCase();
  const visible = users.filter(
    (u) =>
      (includeStaff || !isAdminRole(u.role)) &&
      (!q || u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
  );
  const assignable = visible.filter((u) => !enrolledIds.has(u.id));
  const allVisibleSelected = assignable.length > 0 && assignable.every((u) => selected.has(u.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) assignable.forEach((u) => next.delete(u.id));
      else assignable.forEach((u) => next.add(u.id));
      return next;
    });

  const close = () => {
    setSelected(new Set());
    setQuery('');
    onClose();
  };

  const handleAssign = () => {
    if (!course || selected.size === 0) return;
    const ids = Array.from(selected);
    ids.forEach((id) => storage.enroll(id, course.id));
    if (actor) {
      storage.addAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        targetCourseId: course.id,
        targetCourseTitle: course.title,
        action: 'COURSE_ASSIGN',
        details: `'${course.title}' 강의를 ${ids.length}명에게 배정`,
      });
    }
    showToast(`${ids.length}명에게 '${course.title}' 강의를 배정했습니다.`, 'success');
    onAssigned?.(ids.length);
    close();
  };

  return (
    <BaseModal
      isOpen={isOpen && !!course}
      onClose={close}
      title="수강 배정"
      subtitle={course ? `'${course.title}'을(를) 수강할 직원을 선택하세요.` : undefined}
      maxWidth="lg"
      noPadding
      footerContent={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-neutral-500">
            <strong className="font-semibold text-neutral-900">{selected.size}</strong>명 선택
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={close} className="lms-btn lms-btn-secondary">
              취소
            </button>
            <button type="button" onClick={handleAssign} disabled={selected.size === 0} className="lms-btn lms-btn-primary">
              <UserPlus className="h-4 w-4" />
              배정하기
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 border-b border-neutral-200 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 또는 이메일 검색"
            aria-label="직원 검색"
            className="lms-input pl-9"
          />
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <label className="flex items-center gap-2 text-neutral-700 cursor-pointer">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} disabled={assignable.length === 0} className="accent-brand-600" />
            표시된 직원 모두 선택 ({assignable.length})
          </label>
          <label className="flex items-center gap-2 text-neutral-500 cursor-pointer">
            <input type="checkbox" checked={includeStaff} onChange={(e) => setIncludeStaff(e.target.checked)} className="accent-brand-600" />
            관리자 포함
          </label>
        </div>
      </div>

      <ul className="max-h-[50vh] divide-y divide-neutral-100 overflow-y-auto">
        {visible.length === 0 && <li className="px-4 py-10 text-center text-sm text-neutral-500">조건에 맞는 직원이 없습니다.</li>}
        {visible.map((u) => {
          const already = enrolledIds.has(u.id);
          return (
            <li key={u.id}>
              <label
                className={`flex items-center gap-3 px-4 py-2.5 ${already ? 'opacity-60' : 'hover:bg-neutral-50 cursor-pointer'}`}
              >
                <input
                  type="checkbox"
                  checked={already || selected.has(u.id)}
                  disabled={already}
                  onChange={() => toggle(u.id)}
                  className="accent-brand-600"
                />
                <Avatar user={u} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-900">{u.name}</span>
                  <span className="block truncate text-xs text-neutral-500">{u.email}</span>
                </span>
                {already && <span className="shrink-0 text-xs text-neutral-500">수강 중</span>}
              </label>
            </li>
          );
        })}
      </ul>
    </BaseModal>
  );
};
