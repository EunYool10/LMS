import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { CourseCover } from '../../components/common/CourseCover';
import { EmptyState } from '../../components/common/EmptyState';
import { AdminGlobalSearch } from '../../components/admin/AdminGlobalSearch';
import { AdminPageHeader, AdminPanel, AdminStatStrip } from '../../components/admin/AdminPageHeader';
import { Course, Enrollment, AuditLog, SystemAnnouncement } from '../../types';
import { getRoleLabel } from '../../utils/rbac';
import { useInquirySummary } from '../../services/inquiries';
import { Activity, ChevronRight, Megaphone, PlusCircle } from 'lucide-react';

interface AdminDashboardPageProps {
  onNavigate: (view: string, param?: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { user, isSuperAdmin } = useAuth();
  const { openCount: openInquiries } = useInquirySummary(user);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState(() => storage.getPlatformAnalytics());
  const [courses, setCourses] = useState<Course[]>(() => storage.getCourses(true));
  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => storage.getEnrollments());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => storage.getAuditLogs());
  const [activeAnnouncement, setActiveAnnouncement] = useState<SystemAnnouncement | null>(null);

  const loadData = () => {
    setAnalytics(storage.getPlatformAnalytics());
    setCourses(storage.getCourses(true));
    setEnrollments(storage.getEnrollments());
    setAuditLogs(storage.getAuditLogs());
    const systemAnnouncements = storage.getSystemAnnouncements();
    setActiveAnnouncement(systemAnnouncements.find((a) => a.isActive) || null);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
      setIsLoading(false);
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return '-';
    }
  };

  // Recent audit + enrollment events, newest first
  const recentActivities = useMemo(() => {
    const list: Array<{ id: string; title: string; subtitle: string; timestamp: string }> = [];
    auditLogs.slice(0, 4).forEach((log) => {
      list.push({ id: log.id, title: `${log.actorName}: ${log.action}`, subtitle: log.details, timestamp: log.timestamp });
    });
    enrollments.slice(0, 4).forEach((enr) => {
      list.push({
        id: enr.id,
        title: `수강 신청 (진도 ${enr.progressPercentage}%)`,
        subtitle: `회원 ID: ${enr.userId}`,
        timestamp: enr.enrolledAt,
      });
    });
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
  }, [auditLogs, enrollments]);

  const statusPill = (published: boolean) => (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${published ? 'text-emerald-700' : 'text-neutral-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${published ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
      {published ? '공개' : '비공개'}
    </span>
  );

  const linkButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-0.5 text-[13px] font-medium text-neutral-500 hover:text-neutral-900 cursor-pointer"
    >
      {label} <ChevronRight className="h-4 w-4" />
    </button>
  );

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="대시보드"
        description={`${user?.name || '관리자'}님 · ${isSuperAdmin ? '서비스 총괄' : getRoleLabel(user?.role)}`}
        actions={
          <>
            <button
              type="button"
              id="btn-admin-dash-announcements"
              onClick={() => onNavigate('admin-announcements')}
              className="lms-btn lms-btn-secondary"
            >
              <Megaphone className="h-4 w-4" />
              공지 관리
            </button>
            <button
              type="button"
              id="btn-admin-dash-create-course"
              onClick={() => onNavigate('admin-courses-create')}
              className="lms-btn lms-btn-primary"
            >
              <PlusCircle className="h-4 w-4" />새 강의 만들기
            </button>
          </>
        }
      />

      <AdminGlobalSearch onNavigate={onNavigate} />

      <AdminStatStrip
        loading={isLoading}
        stats={[
          {
            label: '전체 회원',
            value: `${analytics.totalUsers}명`,
            hint: `수강생 ${analytics.studentCount} · 관리자 ${analytics.adminCount}`,
          },
          { label: '개설 강의', value: `${analytics.totalCourses}개`, hint: `공개 ${analytics.publishedCoursesCount}개` },
          { label: '누적 수강', value: `${analytics.totalEnrollments}건`, hint: `수료 ${analytics.completedEnrollmentsCount}건` },
          {
            label: '평균 퀴즈 점수',
            value: analytics.totalAttempts === 0 ? '-' : `${analytics.averageScore}점`,
            hint: analytics.totalAttempts === 0 ? '응시 기록 없음' : `응시 ${analytics.totalAttempts}회`,
          },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <span className={`h-2 w-2 shrink-0 rounded-full ${activeAnnouncement ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
          <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">
            <span className="text-[13px] font-medium text-neutral-500">홈 상단 공지 · </span>
            {activeAnnouncement ? activeAnnouncement.title || activeAnnouncement.content : '게시 중인 공지가 없습니다.'}
          </p>
          {linkButton('편집', () => onNavigate('admin-announcements'))}
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <span className={`h-2 w-2 shrink-0 rounded-full ${openInquiries > 0 ? 'bg-amber-500' : 'bg-neutral-300'}`} />
          <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">
            <span className="text-[13px] font-medium text-neutral-500">문의 · </span>
            {openInquiries > 0 ? `답변을 기다리는 문의 ${openInquiries}건` : '답변 대기 중인 문의가 없습니다.'}
          </p>
          {linkButton(openInquiries > 0 ? '답변하기' : '보기', () => onNavigate('admin-inquiries'))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminPanel
          className="xl:col-span-2"
          bodyClassName=""
          title="최근 강의"
          action={linkButton('전체 보기', () => onNavigate('admin-courses'))}
        >
          {isLoading ? (
            <div className="space-y-2 p-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="등록된 강의가 없습니다"
                description="새 강의를 만들어 사내 교육을 시작하세요."
                showAction
                actionLabel="새 강의 만들기"
                onAction={() => onNavigate('admin-courses-create')}
              />
            </div>
          ) : (
            <>
              <ul className="divide-y divide-neutral-100 sm:hidden">
                {courses.slice(0, 5).map((course) => (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate('admin-courses-edit', course.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer"
                    >
                      <CourseCover
                        thumbnail={course.thumbnail}
                        title={course.title}
                        categoryId={course.categoryId}
                        compact
                        className="aspect-video w-16 shrink-0 rounded-md"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-neutral-900">{course.title}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                          {statusPill(course.isPublished)}
                          <span>수강생 {course.enrolledCount}명</span>
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-neutral-300" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">강의</th>
                      <th className="px-3 py-2.5 font-medium">강사</th>
                      <th className="px-3 py-2.5 text-right font-medium">수강생</th>
                      <th className="px-3 py-2.5 font-medium">상태</th>
                      <th className="px-3 py-2.5 font-medium">수정일</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    {courses.slice(0, 5).map((course) => (
                      <tr key={course.id} className="hover:bg-neutral-50">
                        <td className="max-w-[320px] px-5 py-3">
                          <div className="flex items-center gap-3">
                            <CourseCover
                              thumbnail={course.thumbnail}
                              title={course.title}
                              categoryId={course.categoryId}
                              compact
                              className="aspect-video w-14 shrink-0 rounded-md"
                            />
                            <div className="min-w-0">
                              <div className="truncate font-medium text-neutral-900" title={course.title}>
                                {course.title}
                              </div>
                              <div className="truncate text-xs text-neutral-500">{course.categoryName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">{course.instructorName || '-'}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{course.enrolledCount}</td>
                        <td className="px-3 py-3">{statusPill(course.isPublished)}</td>
                        <td className="px-3 py-3 tabular-nums text-neutral-500">{formatDate(course.updatedAt || course.createdAt)}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onNavigate('admin-courses-edit', course.id)}
                            className="lms-btn lms-btn-ghost lms-btn-sm"
                          >
                            관리
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </AdminPanel>

        <AdminPanel
          title="최근 활동"
          bodyClassName=""
        >
          {recentActivities.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-500">최근 활동이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recentActivities.map((act) => (
                <li key={act.id} className="flex items-start gap-3 px-5 py-3">
                  <Activity className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">{act.title}</p>
                    <p className="truncate text-xs text-neutral-500">{act.subtitle}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-neutral-400">{formatDate(act.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>

    </div>
  );
};
