import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { CourseThumbnail } from '../../components/common/CourseThumbnail';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { AdminGlobalSearch } from '../../components/admin/AdminGlobalSearch';
import { AdminActivityLog } from '../../components/admin/AdminActivityLog';
import { Course, Enrollment, AuditLog, SystemAnnouncement } from '../../types';
import { getRoleLabel } from '../../utils/rbac';
import {
  Users,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Award,
  PlusCircle,
  FileQuestion,
  ArrowRight,
  Clock,
  Activity,
  Megaphone,
  Database,
  ExternalLink,
  Shield,
  Sparkles,
  Layers,
  ChevronRight,
  Search,
} from 'lucide-react';

interface AdminDashboardPageProps {
  onNavigate: (view: string, param?: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { user, isSuperAdmin } = useAuth();
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
    const activeOne = systemAnnouncements.find((a) => a.isActive) || null;
    setActiveAnnouncement(activeOne);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
      setIsLoading(false);
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  // Recent combined activities
  const recentActivities = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      timestamp: string;
      type: 'enrollment' | 'audit' | 'course';
    }> = [];

    auditLogs.slice(0, 4).forEach((log) => {
      list.push({
        id: log.id,
        title: `${log.actorName}: ${log.action}`,
        subtitle: log.details,
        timestamp: log.timestamp,
        type: 'audit',
      });
    });

    enrollments.slice(0, 4).forEach((enr) => {
      list.push({
        id: enr.id,
        title: `수강 신청 (진도 ${enr.progressPercentage}%)`,
        subtitle: `회원 ID: ${enr.userId}`,
        timestamp: enr.enrolledAt,
        type: 'enrollment',
      });
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
  }, [auditLogs, enrollments]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none min-w-0">
      {/* Top Welcome Enterprise Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-5 min-w-0">
        <div className="space-y-2 min-w-0 w-full md:w-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[10px] sm:text-[11px] text-indigo-300 font-bold tracking-wider uppercase">
              TDSNTLMS Enterprise Admin Control
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Shield className="w-3 h-3" />
              <span>{isSuperAdmin ? '서비스 총괄 콘솔' : `${getRoleLabel(user?.role)} 콘솔`}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>시스템 정상</span>
            </span>
          </div>

          <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
            <span>{user?.name || '관리자'}님, 환영합니다.</span>
            {user && <VerifiedBadge role={user.role} size="sm" />}
          </h1>

          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            강의 커리큘럼, 평가 퀴즈 출제, 전사 공지사항 및 수강생 진도를 실시간으로 모니터링하고 제어합니다.
          </p>
        </div>

        {/* Action Buttons - Stacked on mobile, row on tablet/desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto shrink-0 pt-1 md:pt-0">
          <button
            type="button"
            id="btn-admin-dash-create-course"
            onClick={() => onNavigate('admin-courses-create')}
            className="w-full sm:w-auto py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>신규 강의 제작</span>
          </button>

          <button
            type="button"
            id="btn-admin-dash-announcements"
            onClick={() => onNavigate('admin-announcements')}
            className="w-full sm:w-auto py-2.5 px-4 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xs"
          >
            <Megaphone className="w-4 h-4 text-indigo-300" />
            <span>공지사항 관리</span>
          </button>
        </div>
      </div>

      {/* Global Admin Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 min-w-0">
        <div className="w-full min-w-0">
          <AdminGlobalSearch onNavigate={onNavigate} />
        </div>
      </div>

      {/* Live System Announcement Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              activeAnnouncement
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            <Megaphone className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900">현재 메인 포털 노출 공지:</span>
              {activeAnnouncement ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  실시간 게시 중
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                  게시된 공지 없음
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 truncate max-w-2xl mt-0.5 font-medium">
              {activeAnnouncement ? activeAnnouncement.content : '현재 메인 상단에 게시된 전사 공지가 없습니다.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('admin-announcements')}
          className="w-full sm:w-auto justify-center text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-2 sm:py-1.5 rounded-xl border border-indigo-200 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <span>공지사항 편집 및 등록</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Core Metrics Grid - Unified Card Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Users */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-2.5 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">총 등록 회원</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
              {analytics.totalUsers}명
            </div>
          )}
          <div className="text-[11px] text-slate-500 font-medium">
            수강생 {analytics.studentCount}명 · 관리자 {analytics.adminCount}명
          </div>
        </div>

        {/* Metric 2: Total Courses */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-2.5 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">개설된 강의</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
              {analytics.totalCourses}개
            </div>
          )}
          <div className="text-[11px] text-emerald-600 font-semibold">
            공개 운영 중: {analytics.publishedCoursesCount}개 과정
          </div>
        </div>

        {/* Metric 3: Total Enrollments */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-2.5 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">누적 수강 건수</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
              {analytics.totalEnrollments}건
            </div>
          )}
          <div className="text-[11px] text-slate-500 font-medium">
            수료 완료: <strong className="text-slate-800">{analytics.completedEnrollmentsCount}건</strong>
          </div>
        </div>

        {/* Metric 4: Average Quiz Score */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-2.5 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">평균 퀴즈 점수</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Award className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg" />
          ) : analytics.totalAttempts === 0 ? (
            <div className="text-xl font-bold text-slate-400">데이터 없음</div>
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
              {analytics.averageScore}점
            </div>
          )}
          <div className="text-[11px] text-slate-500 font-medium">
            {analytics.totalAttempts === 0
              ? '아직 응시한 퀴즈 기록이 없습니다.'
              : `총 퀴즈 응시 ${analytics.totalAttempts}회`}
          </div>
        </div>
      </div>

      {/* Unified Quick Access Navigation Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Hub Item 1 */}
        <div
          onClick={() => onNavigate('admin-courses')}
          className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            강의 커리큘럼 관리
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            섹션 목차, 차시 영상 및 공개 상태 전환 관리
          </p>
        </div>

        {/* Hub Item 2 */}
        <div
          onClick={() => onNavigate('admin-questions')}
          className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileQuestion className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
            문제 및 퀴즈 출제
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            객관식/OX 문항 등록, 배점 및 정답 해설 작성
          </p>
        </div>

        {/* Hub Item 3 */}
        <div
          onClick={() => onNavigate('admin-announcements')}
          className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Megaphone className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
            공지사항 통합 관리
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            전사 상단 배너 및 강의별 주요 공지 CRUD 제어
          </p>
        </div>

        {/* Hub Item 4 */}
        <div
          onClick={() => onNavigate('admin-analytics')}
          className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
            수강생 학습 기록 & 통계
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            실시간 진도율, 수료 내역 및 퀴즈 통계 모니터링
          </p>
        </div>

        {/* Hub Item 5: Certificates Lookup */}
        <div
          onClick={() => onNavigate('admin-certificates')}
          className="p-5 bg-white rounded-2xl border border-amber-200/80 hover:border-amber-400 hover:shadow-sm transition-all cursor-pointer group space-y-2 bg-gradient-to-br from-white to-amber-50/20"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-amber-200/60">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-200/60">
              진위 검증
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
            수료증 번호 조회 센터
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            발급 번호(TDSN-...) 진위 조회 및 공식 수료증 즉시 인쇄
          </p>
        </div>
      </div>

      {/* Main Content Split: Recent Courses & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Recent Courses Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">최근 개설된 강의 현황</h3>
              <p className="text-[11px] text-slate-500">실시간 등록된 강의 목록 및 최신 수정 일시</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('admin-courses')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>전체 목록 보기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Course Cards (Visible on mobile) */}
          <div className="block sm:hidden p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : courses.length === 0 ? (
              <EmptyState
                title="등록된 강의가 없습니다"
                description="신규 강의를 제작하여 사내 교육 콘텐츠를 제공해보세요."
                showAction
                actionLabel="신규 강의 제작"
                onAction={() => onNavigate('admin-courses-create')}
              />
            ) : (
              <div className="space-y-3">
                {courses.slice(0, 5).map((course) => (
                  <div
                    key={course.id}
                    className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-2.5"
                  >
                    <div className="flex items-start gap-3">
                      <CourseThumbnail
                        src={course.thumbnail}
                        alt={course.title}
                        containerClassName="w-14 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0"
                        fallbackText={course.title.slice(0, 3)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-xs line-clamp-1" title={course.title}>
                          {course.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {course.instructorName || '-'} · {course.categoryName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/50">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            course.isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {course.isPublished ? '공개 중' : '비공개'}
                        </span>
                        <span className="text-slate-500">수강생 {course.enrolledCount}명</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigate('admin-courses-edit', course.id)}
                        className="py-1 px-2.5 bg-indigo-600 active:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                      >
                        수정/관리
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table (Hidden on mobile) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">강의 정보</th>
                  <th className="py-3.5 px-4">강사</th>
                  <th className="py-3.5 px-4">차시 수</th>
                  <th className="py-3.5 px-4">수강생</th>
                  <th className="py-3.5 px-4">상태</th>
                  <th className="py-3.5 px-4">최근 수정</th>
                  <th className="py-3.5 px-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="py-4 px-4">
                        <div className="h-8 bg-slate-100 animate-pulse rounded-xl" />
                      </td>
                    </tr>
                  ))
                ) : courses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 px-4">
                      <EmptyState
                        title="등록된 강의가 없습니다"
                        description="신규 강의를 제작하여 사내 교육 콘텐츠를 제공해보세요."
                        showAction
                        actionLabel="신규 강의 제작"
                        onAction={() => onNavigate('admin-courses-create')}
                      />
                    </td>
                  </tr>
                ) : (
                  courses.slice(0, 5).map((course) => (
                    <tr key={course.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <CourseThumbnail
                            src={course.thumbnail}
                            alt={course.title}
                            containerClassName="w-12 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0"
                            fallbackText={course.title.slice(0, 3)}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 line-clamp-1 max-w-[200px]" title={course.title}>
                              {course.title}
                            </div>
                            <div className="text-[11px] text-slate-400">{course.categoryName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{course.instructorName || '-'}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-semibold">{course.totalLessons}개</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums">{course.enrolledCount}명</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            course.isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {course.isPublished ? '공개 중' : '비공개'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 tabular-nums">
                        {formatDate(course.updatedAt || course.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigate('admin-courses-edit', course.id)}
                          className="py-1 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs cursor-pointer transition-colors"
                        >
                          수정/관리
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1/3): Real Recent Activity Stream */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">최근 시스템 활동</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">실시간 기록</span>
          </div>

          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              기록된 최근 시스템 활동이 없습니다.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map((act) => (
                <div key={act.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 line-clamp-1">{act.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{formatDate(act.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{act.subtitle}</p>
                </div>
              ))}
            </div>
          )}

          {/* Quick Integrity Snapshot */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => onNavigate('admin-diagnostic')}
              className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>DB 무결성 센터 검사하기</span>
            </button>
          </div>
        </div>
      </div>

      {/* Activity Logging Section */}
      <AdminActivityLog
        limit={8}
        showFilters={true}
        onNavigate={onNavigate}
      />
    </div>
  );
};
