import React, { useMemo, useState } from 'react';
import { ChevronDown, Download, Mail, Search, UserPlus } from 'lucide-react';
import { storage } from '../../services/storage';
import { Course } from '../../types';
import { CourseCover } from '../common/CourseCover';
import { Avatar } from '../common/Avatar';
import { AssignCourseModal } from './AssignCourseModal';

interface Row {
  course: Course;
  enrolled: number;
  completed: number;
  rate: number;
  avgProgress: number;
  pending: Array<{ userId: string; name: string; email: string; progress: number; enrolledAt: string }>;
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

function downloadCsv(filename: string, lines: string[]) {
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Per-course completion overview for admins: who is enrolled, who has finished, and who still has to.
 * Not-completed learners can be exported or emailed (BCC) straight from the row.
 */
export const CourseCompletionReport: React.FC = () => {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [assignCourse, setAssignCourse] = useState<Course | null>(null);
  const [version, setVersion] = useState(0);

  const rows: Row[] = useMemo(() => {
    const users = storage.getUsers();
    const enrollments = storage.getEnrollments();
    return storage
      .getCourses(true)
      .map((course) => {
        const list = enrollments.filter((e) => e.courseId === course.id);
        const done = list.filter((e) => e.completedAt || e.progressPercentage >= 100);
        const pending = list
          .filter((e) => !(e.completedAt || e.progressPercentage >= 100))
          .map((e) => {
            const u = users.find((x) => x.id === e.userId);
            return {
              userId: e.userId,
              name: u?.name || e.userId,
              email: u?.email || '',
              progress: e.progressPercentage || 0,
              enrolledAt: e.enrolledAt,
            };
          })
          .sort((a, b) => a.progress - b.progress);
        return {
          course,
          enrolled: list.length,
          completed: done.length,
          rate: list.length ? Math.round((done.length / list.length) * 100) : 0,
          avgProgress: list.length ? Math.round(list.reduce((s, e) => s + (e.progressPercentage || 0), 0) / list.length) : 0,
          pending,
        };
      })
      .sort((a, b) => b.enrolled - a.enrolled);
  }, [version]);

  const q = query.trim().toLowerCase();
  const visible = rows.filter((r) => !q || r.course.title.toLowerCase().includes(q));

  const exportPending = (row: Row) =>
    downloadCsv(`미이수자_${row.course.title}.csv`, [
      ['이름', '이메일', '진도율(%)', '수강 시작일'].map(csvCell).join(','),
      ...row.pending.map((p) =>
        [p.name, p.email, p.progress, new Date(p.enrolledAt).toLocaleDateString('ko-KR')].map(csvCell).join(',')
      ),
    ]);

  const mailPending = (row: Row) => {
    const emails = row.pending.map((p) => p.email).filter(Boolean);
    const subject = `[TDSNT LMS] '${row.course.title}' 이수 안내`;
    const body = `안녕하세요.\n\n'${row.course.title}' 과정을 아직 이수하지 않으셨습니다.\nTDSNT LMS에 접속해 남은 강의를 완료해 주세요.\n\n감사합니다.`;
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">과정별 이수 현황</h2>
          <p className="mt-0.5 text-[13px] text-neutral-500">강의를 눌러 미이수자를 확인하고 배정·독려할 수 있습니다.</p>
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="강의명 검색"
            aria-label="강의명 검색"
            className="lms-input h-9 pl-9"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-neutral-500">표시할 강의가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {visible.map((row) => {
            const open = openId === row.course.id;
            return (
              <li key={row.course.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : row.course.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-neutral-50 cursor-pointer"
                >
                  <CourseCover
                    thumbnail={row.course.thumbnail}
                    title={row.course.title}
                    categoryId={row.course.categoryId}
                    compact
                    className="hidden aspect-video w-16 shrink-0 rounded-md sm:flex"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900">{row.course.title}</span>
                    <span className="block text-xs text-neutral-500">
                      수강 {row.enrolled}명 · 수료 {row.completed}명 · 미이수 {row.pending.length}명 · 평균 진도 {row.avgProgress}%
                    </span>
                  </span>
                  <span className="hidden w-40 items-center gap-2 md:flex">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <span
                        className={`block h-full rounded-full ${row.rate >= 80 ? 'bg-emerald-500' : row.rate >= 40 ? 'bg-brand-600' : 'bg-amber-500'}`}
                        style={{ width: `${row.rate}%` }}
                      />
                    </span>
                    <span className="w-10 text-right text-xs font-semibold tabular-nums text-neutral-700">{row.rate}%</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="space-y-3 bg-neutral-50 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-neutral-800">미이수자 {row.pending.length}명</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setAssignCourse(row.course)} className="lms-btn lms-btn-secondary lms-btn-sm">
                          <UserPlus className="h-4 w-4" />
                          수강 배정
                        </button>
                        <button
                          type="button"
                          onClick={() => mailPending(row)}
                          disabled={row.pending.length === 0}
                          className="lms-btn lms-btn-secondary lms-btn-sm"
                          title="메일 앱에서 미이수자를 숨은 참조로 넣은 안내 메일을 엽니다"
                        >
                          <Mail className="h-4 w-4" />
                          독려 메일
                        </button>
                        <button
                          type="button"
                          onClick={() => exportPending(row)}
                          disabled={row.pending.length === 0}
                          className="lms-btn lms-btn-secondary lms-btn-sm"
                        >
                          <Download className="h-4 w-4" />
                          CSV
                        </button>
                      </div>
                    </div>
                    {row.pending.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-neutral-300 bg-white py-6 text-center text-sm text-neutral-500">
                        {row.enrolled === 0 ? '아직 수강생이 없습니다. 수강 배정으로 직원을 등록하세요.' : '모든 수강생이 이수했습니다.'}
                      </p>
                    ) : (
                      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
                        {row.pending.map((p) => (
                          <li key={p.userId} className="flex items-center gap-3 px-3 py-2">
                            <Avatar user={{ id: p.userId, name: p.name }} size="xs" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-neutral-900">{p.name}</span>
                              <span className="block truncate text-xs text-neutral-500">{p.email}</span>
                            </span>
                            <span className="flex w-32 items-center gap-2">
                              <span className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-100">
                                <span className="block h-full rounded-full bg-brand-600" style={{ width: `${p.progress}%` }} />
                              </span>
                              <span className="w-8 text-right text-xs tabular-nums text-neutral-600">{p.progress}%</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AssignCourseModal
        course={assignCourse}
        isOpen={!!assignCourse}
        onClose={() => setAssignCourse(null)}
        onAssigned={() => setVersion((v) => v + 1)}
      />
    </section>
  );
};
