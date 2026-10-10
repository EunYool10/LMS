import React, { useState } from 'react';
import { StudentAnalyticsTable } from '../../components/admin/StudentAnalyticsTable';
import { CourseCompletionReport } from '../../components/admin/CourseCompletionReport';
import { storage } from '../../services/storage';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  CheckCircle2,
  Award,
  BarChart2,
  Layers,
  FileText,
  AlertCircle,
  TrendingUp,
  Download,
  Search,
} from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'completion' | 'records' | 'statistics'>('completion');
  const analytics = storage.getPlatformAnalytics();
  const enrollments = storage.getEnrollments();
  const courses = storage.getCourses(true);

  const handleExportCSV = () => {
    try {
      const users = storage.getUsers();
      const attempts = storage.getAllQuizAttempts();

      // Section 1: Course Completion Statistics
      const courseHeaders = [
        '강의 ID',
        '강의명',
        '카테고리',
        '담당 강사',
        '난이도',
        '총 차시(강)',
        '강의 분량(분)',
        '수강생 수',
        '수료자 수',
        '이수 완료율(%)',
        '공개 상태',
        '최근 수정일시',
      ];

      const courseRows = courses.map((course) => {
        const courseEnrollments = enrollments.filter((e) => e.courseId === course.id);
        const completed = courseEnrollments.filter(
          (e) => e.completedAt || e.progressPercentage >= 100
        ).length;
        const compRate =
          courseEnrollments.length > 0
            ? Math.round((completed / courseEnrollments.length) * 100)
            : 0;

        return [
          course.id,
          `"${course.title.replace(/"/g, '""')}"`,
          `"${(course.categoryName || '').replace(/"/g, '""')}"`,
          `"${course.instructorName.replace(/"/g, '""')}"`,
          course.level,
          course.totalLessons,
          course.durationMinutes,
          courseEnrollments.length,
          completed,
          `${compRate}%`,
          course.isPublished ? '공개' : '비공개',
          course.updatedAt ? new Date(course.updatedAt).toLocaleDateString('ko-KR') : '-',
        ].join(',');
      });

      // Section 2: User Engagement & Learning Records
      const userHeaders = [
        '등록 번호',
        '수강생 ID',
        '수강생 성명',
        '이메일',
        '수강 강의명',
        '카테고리',
        '진도율(%)',
        '이수 상태',
        '수강 시작일시',
        '이수 완료일시',
        '평가 시험 응시 수',
        '최고 시험 점수',
      ];

      const userRows = enrollments.map((enr) => {
        const student = users.find((u) => u.id === enr.userId);
        const course = courses.find((c) => c.id === enr.courseId);
        const userAttempts = attempts.filter(
          (a) => a.userId === enr.userId && a.courseId === enr.courseId
        );
        const maxScore =
          userAttempts.length > 0 ? Math.max(...userAttempts.map((a) => a.score)) : '-';
        const isCompleted = enr.completedAt || enr.progressPercentage >= 100;

        return [
          enr.id,
          enr.userId,
          `"${(student?.name || '탈퇴 사용자').replace(/"/g, '""')}"`,
          `"${(student?.email || '-').replace(/"/g, '""')}"`,
          `"${(course?.title || '삭제된 강의').replace(/"/g, '""')}"`,
          `"${(course?.categoryName || '-').replace(/"/g, '""')}"`,
          `${enr.progressPercentage}%`,
          isCompleted ? '이수 완료' : '학습 진행 중',
          enr.enrolledAt ? new Date(enr.enrolledAt).toLocaleDateString('ko-KR') : '-',
          enr.completedAt ? new Date(enr.completedAt).toLocaleDateString('ko-KR') : '-',
          userAttempts.length,
          maxScore,
        ].join(',');
      });

      // Combine with BOM for Excel Korean support
      const csvSections = [
        '# [TDSN LMS] 강의별 이수 및 수료 통계 보고서',
        `생성일시: ${new Date().toLocaleString('ko-KR')}`,
        courseHeaders.join(','),
        ...courseRows,
        '',
        '# [TDSN LMS] 수강생별 학습 진행 및 활동 지표',
        userHeaders.join(','),
        ...userRows,
      ];

      const csvString = '\uFEFF' + csvSections.join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      link.setAttribute('href', url);
      link.setAttribute('download', `TDSNTLMS_학습통계보고서_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('학습 통계 CSV 보고서가 성공적으로 다운로드되었습니다.', 'success');
    } catch (err) {
      showToast('보고서 생성 중 오류가 발생했습니다.', 'error');
    }
  };

  // Real statistical calculations (No fake data, no simulated charts)
  const progressDistribution = React.useMemo(() => {
    if (enrollments.length === 0) return null;

    let tier1 = 0; // 0-25%
    let tier2 = 0; // 26-50%
    let tier3 = 0; // 51-75%
    let tier4 = 0; // 76-99%
    let completed = 0; // 100%

    enrollments.forEach((e) => {
      if (e.completedAt || e.progressPercentage >= 100) completed++;
      else if (e.progressPercentage >= 76) tier4++;
      else if (e.progressPercentage >= 51) tier3++;
      else if (e.progressPercentage >= 26) tier2++;
      else tier1++;
    });

    return {
      tier1,
      tier2,
      tier3,
      tier4,
      completed,
      completionRate: Math.round((completed / enrollments.length) * 100),
    };
  }, [enrollments]);

  // Real Category breakdown
  const categoryStats = React.useMemo(() => {
    if (enrollments.length === 0 || courses.length === 0) return [];

    const catMap: Record<string, { name: string; count: number }> = {};

    courses.forEach((c) => {
      const catName = c.categoryName || '기타';
      if (!catMap[catName]) {
        catMap[catName] = { name: catName, count: 0 };
      }
    });

    enrollments.forEach((e) => {
      const course = courses.find((c) => c.id === e.courseId);
      const catName = course?.categoryName || '기타';
      if (catMap[catName]) {
        catMap[catName].count += 1;
      }
    });

    return Object.values(catMap).sort((a, b) => b.count - a.count);
  }, [enrollments, courses]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">학습 현황</h1>
          <p className="mt-1 text-sm text-neutral-500">
            과정별 이수율과 수강생 진도, 평가 결과를 확인합니다.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            id="btn-export-analytics-csv"
            onClick={handleExportCSV}
            className="lms-btn lms-btn-secondary lms-btn-sm"
            title="강의별 이수율 및 수강생 활동 지표 CSV 다운로드"
          >
            <Download className="w-4 h-4" />
            <span>CSV 내보내기</span>
          </button>

          <div className="inline-flex rounded-lg bg-neutral-100 p-1" role="tablist">
            {(
              [
                { id: 'completion', label: '과정별 이수' },
                { id: 'records', label: '수강생 기록' },
                { id: 'statistics', label: '통계' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setActiveTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                  activeTab === t.id ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">총 수강 등록</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {analytics.totalEnrollments}건
          </div>
          <div className="text-[11px] text-slate-400">누적 수강 등록 건수</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">과정 이수 완료</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">
            {analytics.completedEnrollmentsCount}건
          </div>
          <div className="text-[11px] text-slate-400">
            {analytics.totalEnrollments > 0
              ? `이수율 ${Math.round((analytics.completedEnrollmentsCount / analytics.totalEnrollments) * 100)}%`
              : '수강 등록 대기'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">총 퀴즈 응시</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {analytics.totalAttempts}회
          </div>
          <div className="text-[11px] text-slate-400">평가 시험 및 퀴즈 응시</div>
        </div>

        {/* Average score adhering strictly to No-Data Rule */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">평균 시험 성적</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          {analytics.totalAttempts === 0 ? (
            <div className="text-xl font-bold text-slate-400">데이터 없음</div>
          ) : (
            <div className="text-2xl font-bold text-purple-600 tabular-nums">
              {analytics.averageScore}점
            </div>
          )}
          <div className="text-[11px] text-slate-400">
            {analytics.totalAttempts === 0 ? '퀴즈 응시 데이터가 없습니다.' : '전체 응시자 평균 점수'}
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'completion' ? (
        <CourseCompletionReport />
      ) : activeTab === 'records' ? (
        <StudentAnalyticsTable />
      ) : (
        <div className="space-y-6">
          {enrollments.length === 0 || !progressDistribution ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">분석 데이터가 충분하지 않습니다.</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                아직 수강생의 학습 진도 및 응시 기록이 등록되지 않았습니다. 수강생이 강의를 수강하면 실시간 통계가 집계됩니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Real Progress Tier Distribution */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">학습 진도율 분포</h3>
                  <span className="text-xs font-semibold text-indigo-600">
                    완료율: {progressDistribution.completionRate}%
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>수료 완료 (100%)</span>
                      <span className="font-bold">{progressDistribution.completed}건</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${(progressDistribution.completed / enrollments.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>상위 진행 (76% ~ 99%)</span>
                      <span className="font-bold">{progressDistribution.tier4}건</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${(progressDistribution.tier4 / enrollments.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>중위 진행 (51% ~ 75%)</span>
                      <span className="font-bold">{progressDistribution.tier3}건</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${(progressDistribution.tier3 / enrollments.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>기초 진행 (26% ~ 50%)</span>
                      <span className="font-bold">{progressDistribution.tier2}건</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{ width: `${(progressDistribution.tier2 / enrollments.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>학습 시작 (0% ~ 25%)</span>
                      <span className="font-bold">{progressDistribution.tier1}건</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-400 h-full rounded-full transition-all"
                        style={{ width: `${(progressDistribution.tier1 / enrollments.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Real Category Enrollment Distribution */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">카테고리별 수강 현황</h3>
                  <span className="text-xs text-slate-400">실제 등록 강의 기준</span>
                </div>

                {categoryStats.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">등록된 수강 데이터가 없습니다.</div>
                ) : (
                  <div className="space-y-3 text-xs">
                    {categoryStats.map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-800">{cat.name}</span>
                        <span className="font-bold text-slate-900 tabular-nums">{cat.count}명 수강</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
