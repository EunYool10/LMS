import React, { useState } from 'react';
import { StudentAnalyticsTable } from '../../components/admin/StudentAnalyticsTable';
import { CourseCompletionReport } from '../../components/admin/CourseCompletionReport';
import { AdminPageHeader, AdminPanel, AdminStatStrip } from '../../components/admin/AdminPageHeader';
import { storage } from '../../services/storage';
import { useToast } from '../../context/ToastContext';
import { Download } from 'lucide-react';

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

  const completionRate =
    analytics.totalEnrollments > 0 ? Math.round((analytics.completedEnrollmentsCount / analytics.totalEnrollments) * 100) : 0;
  const tiers = progressDistribution
    ? [
        { label: '수료 (100%)', value: progressDistribution.completed, color: 'bg-emerald-500' },
        { label: '76–99%', value: progressDistribution.tier4, color: 'bg-brand-600' },
        { label: '51–75%', value: progressDistribution.tier3, color: 'bg-brand-400' },
        { label: '26–50%', value: progressDistribution.tier2, color: 'bg-amber-400' },
        { label: '0–25%', value: progressDistribution.tier1, color: 'bg-neutral-300' },
      ]
    : [];
  const maxCategory = Math.max(1, ...categoryStats.map((c) => c.count));

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="학습 현황"
        description="과정별 이수율과 수강생 진도, 평가 결과를 확인합니다."
        actions={
          <button
            type="button"
            id="btn-export-analytics-csv"
            onClick={handleExportCSV}
            className="lms-btn lms-btn-secondary"
            title="강의별 이수율과 수강생 기록 CSV 다운로드"
          >
            <Download className="h-4 w-4" />
            CSV 내보내기
          </button>
        }
      />

      <AdminStatStrip
        stats={[
          { label: '수강 등록', value: `${analytics.totalEnrollments}건` },
          { label: '수료', value: `${analytics.completedEnrollmentsCount}건`, hint: `이수율 ${completionRate}%` },
          { label: '퀴즈 · 평가 응시', value: `${analytics.totalAttempts}회` },
          {
            label: '평균 점수',
            value: analytics.totalAttempts === 0 ? '-' : `${analytics.averageScore}점`,
            hint: analytics.totalAttempts === 0 ? '응시 기록 없음' : undefined,
          },
        ]}
      />

      <div role="tablist" className="flex gap-1 border-b border-neutral-200">
        {(
          [
            { id: 'completion', label: '과정별 이수' },
            { id: 'records', label: '수강생 기록' },
            { id: 'statistics', label: '분포' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`relative px-3 pb-3 pt-1 text-sm font-medium cursor-pointer ${
              activeTab === t.id ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t.label}
            {activeTab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-neutral-900" />}
          </button>
        ))}
      </div>

      {activeTab === 'completion' ? (
        <CourseCompletionReport />
      ) : activeTab === 'records' ? (
        <StudentAnalyticsTable />
      ) : enrollments.length === 0 || !progressDistribution ? (
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-neutral-800">아직 집계할 학습 기록이 없습니다.</p>
          <p className="mt-1 text-[13px] text-neutral-500">직원들이 강의를 수강하면 진도 분포와 카테고리별 수강 현황이 표시됩니다.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanel title="진도 분포" action={<span className="text-[13px] text-neutral-500">수강 {enrollments.length}건 기준</span>}>
            <div className="flex h-3 overflow-hidden rounded-full bg-neutral-100">
              {tiers.map((t) =>
                t.value > 0 ? (
                  <div key={t.label} className={t.color} style={{ width: `${(t.value / enrollments.length) * 100}%` }} title={`${t.label}: ${t.value}건`} />
                ) : null
              )}
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {tiers.map((t) => (
                <li key={t.label} className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-sm ${t.color}`} />
                  <span className="flex-1 text-neutral-700">{t.label}</span>
                  <span className="tabular-nums text-neutral-500">{Math.round((t.value / enrollments.length) * 100)}%</span>
                  <span className="w-12 text-right font-medium tabular-nums text-neutral-900">{t.value}건</span>
                </li>
              ))}
            </ul>
          </AdminPanel>

          <AdminPanel title="카테고리별 수강" action={<span className="text-[13px] text-neutral-500">수강생 수</span>}>
            {categoryStats.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">수강 기록이 없습니다.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {categoryStats.map((cat) => (
                  <li key={cat.name} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-neutral-700">{cat.name}</span>
                      <span className="font-medium tabular-nums text-neutral-900">{cat.count}명</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${(cat.count / maxCategory) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </div>
      )}
    </div>
  );
};
