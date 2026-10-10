import React, { useState, useMemo, useEffect } from 'react';
import { storage } from '../../services/storage';
import { Course, Enrollment, User } from '../../types';
import {
  generateCertificateCode,
  formatCertificateDate,
  verifyCertificateCode,
  VerifiedCertificateResult,
} from '../../utils/certificate';
import { CourseCompletionModal } from '../../components/student/CourseCompletionModal';
import { Avatar } from '../../components/common/Avatar';
import { BookOpen, Check, CheckCircle2, Copy, Download, Eye, Printer, Search, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { AdminPageHeader, AdminPanel, AdminStatStrip } from '../../components/admin/AdminPageHeader';
import { useToast } from '../../context/ToastContext';

interface AdminCertificatesPageProps {
  onNavigate?: (view: string, param?: string) => void;
  initialQuery?: string;
}

export interface CertRecord {
  certCode: string;
  enrollment: Enrollment;
  course: Course;
  user: User | null;
  completionDate: string;
  totalLessons: number;
  isCompleted: boolean;
}

export const AdminCertificatesPage: React.FC<AdminCertificatesPageProps> = ({
  onNavigate,
  initialQuery = '',
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState(initialQuery);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'learning'>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCertForModal, setSelectedCertForModal] = useState<CertRecord | null>(null);
  const [modalInitialPrint, setModalInitialPrint] = useState<boolean>(false);

  // Dedicated Certificate Verification State
  const [verifyInput, setVerifyInput] = useState<string>(initialQuery.startsWith('TDSN') ? initialQuery : '');
  const [verificationResult, setVerificationResult] = useState<VerifiedCertificateResult | null>(null);
  const [hasValidated, setHasValidated] = useState<boolean>(false);

  useEffect(() => {
    if (initialQuery) {
      setSearch(initialQuery);
      if (initialQuery.toUpperCase().startsWith('TDSN')) {
        setVerifyInput(initialQuery);
        const res = verifyCertificateCode(initialQuery);
        setVerificationResult(res);
        setHasValidated(true);
      }
    }
  }, [initialQuery]);

  const enrollments = storage.getEnrollments();
  const courses = storage.getCourses(true);
  const users = storage.getUsers();

  // Aggregate certificate records
  const allCertificates: CertRecord[] = useMemo(() => {
    return enrollments
      .map((enr) => {
        const course = courses.find((c) => c.id === enr.courseId);
        if (!course) return null;

        const user = users.find((u) => u.id === enr.userId) || null;
        const certCode = generateCertificateCode(course.id, user?.id || enr.userId);
        const lessons = storage.getLessons(course.id);
        const isCompleted = Boolean(enr.completedAt || enr.progressPercentage >= 100);
        const completionDate = formatCertificateDate(enr.completedAt || enr.enrolledAt);

        return {
          certCode,
          enrollment: enr,
          course,
          user,
          completionDate,
          totalLessons: lessons.length,
          isCompleted,
        };
      })
      .filter((item): item is CertRecord => item !== null);
  }, [enrollments, courses, users]);

  // Handle Certificate Number Verification
  const handleRunVerification = (codeToVerify?: string) => {
    const targetCode = (codeToVerify || verifyInput).trim();
    if (!targetCode) {
      showToast('검증할 수료증 번호를 입력해주세요.', 'warning');
      return;
    }

    const result = verifyCertificateCode(targetCode);
    setVerificationResult(result);
    setHasValidated(true);

    if (result.isValid && result.isCompleted) {
      showToast('공식 수료증 진위 인증이 완료되었습니다.', 'success');
    } else if (result.isValid && !result.isCompleted) {
      showToast('해당 수료증은 현재 학습 진행 중인 강좌의 등록 번호입니다.', 'info');
    } else {
      showToast('일치하는 수료증 발급 기록이 없습니다.', 'error');
    }
  };

  // Reset verification
  const handleResetVerification = () => {
    setVerifyInput('');
    setVerificationResult(null);
    setHasValidated(false);
  };

  // Quick fill and verify sample code
  const handleQuickVerifySample = (code: string) => {
    setVerifyInput(code);
    handleRunVerification(code);
  };

  // Filtered records for directory table
  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();

    return allCertificates.filter((item) => {
      // Course filter
      if (selectedCourseId !== 'all' && item.course.id !== selectedCourseId) {
        return false;
      }

      // Status filter
      if (filterStatus === 'completed' && !item.isCompleted) return false;
      if (filterStatus === 'learning' && item.isCompleted) return false;

      // Query filter
      if (!q) return true;

      const codeMatch = item.certCode.toUpperCase().includes(q);
      const studentNameMatch = item.user?.name.toUpperCase().includes(q);
      const studentEmailMatch = item.user?.email.toUpperCase().includes(q);
      const courseTitleMatch = item.course.title.toUpperCase().includes(q);
      const instructorMatch = item.course.instructorName.toUpperCase().includes(q);

      return codeMatch || studentNameMatch || studentEmailMatch || courseTitleMatch || instructorMatch;
    });
  }, [allCertificates, search, filterStatus, selectedCourseId]);

  // Statistics
  const stats = useMemo(() => {
    const total = allCertificates.length;
    const completed = allCertificates.filter((c) => c.isCompleted).length;
    const learning = total - completed;
    return { total, completed, learning };
  }, [allCertificates]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast('수료증 인증번호가 복사되었습니다.', 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyVerificationStatement = (res: VerifiedCertificateResult) => {
    if (!res.course || !res.user) return;
    const instructorName = res.course.instructorName || '책임강사';
    const text = `[TDSN 아카데미 수료증 진위 검증 확인서]
----------------------------------------
■ 수료증 인증번호: ${res.certCode}
■ 성명: ${res.user.name} (${res.user.email})
■ 이수 교육과정: ${res.course.title}
■ 강의 제작 강사: ${instructorName} (강사 직인 날인)
■ 이수 진도율: ${res.progressPercentage}% (${res.isCompleted ? '수료 완료' : '학습 진행 중'})
■ 수료/발행 일자: ${res.completionDate}
■ 발행 기관: TDSN 교육혁신본부 아카데미
■ 검증 확인 일시: ${res.verifiedAt}
■ 검증 결과: 공식 등록 원본 일치 (Authentic)
----------------------------------------`;

    navigator.clipboard.writeText(text);
    showToast('공식 수료증 검증 확인서 텍스트가 클립보드에 복사되었습니다.', 'success');
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showToast('내보낼 수료증 데이터가 없습니다.', 'info');
      return;
    }

    const headers = [
      '수료증 인증번호',
      '수강생 성명',
      '이메일',
      '수강 강의명',
      '카테고리',
      '담당 강사',
      '진도율(%)',
      '이수 상태',
      '총 차시',
      '수료/발급 일자',
    ];

    const rows = filtered.map((item) => [
      item.certCode,
      `"${(item.user?.name || '익명 수강생').replace(/"/g, '""')}"`,
      `"${(item.user?.email || '').replace(/"/g, '""')}"`,
      `"${item.course.title.replace(/"/g, '""')}"`,
      `"${(item.course.categoryName || '').replace(/"/g, '""')}"`,
      `"${item.course.instructorName.replace(/"/g, '""')}"`,
      `${item.enrollment.progressPercentage}%`,
      item.isCompleted ? '수료 완료' : '학습 중',
      item.totalLessons,
      item.completionDate,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TDSN_수료증_발급대장_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('수료증 발급 대장 CSV를 다운로드했습니다.', 'success');
  };

  // Open modal from verification result
  const handleOpenVerifiedModal = (res: VerifiedCertificateResult, printNow = false) => {
    if (!res.course || !res.enrollment) return;
    setSelectedCertForModal({
      certCode: res.certCode,
      course: res.course,
      enrollment: res.enrollment,
      user: res.user || null,
      completionDate: res.completionDate || '',
      totalLessons: res.totalLessons || 0,
      isCompleted: res.isCompleted,
    });
    setModalInitialPrint(printNow);
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const codeChip = (code: string) => (
    <button
      type="button"
      onClick={() => handleCopyCode(code)}
      className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 font-mono text-xs font-semibold text-neutral-800 hover:bg-neutral-200 cursor-pointer"
      title="인증번호 복사"
    >
      {code}
      {copiedCode === code ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-neutral-400" />}
    </button>
  );

  const statusText = (done: boolean) => (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${done ? 'text-emerald-700' : 'text-neutral-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
      {done ? '수료' : '학습 중'}
    </span>
  );

  const verifyFromRow = (code: string) => {
    setVerifyInput(code);
    handleRunVerification(code);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="수료증 조회"
        description="수료증 인증번호(TDSN-XXXXXXXX)의 진위를 확인하고 발급 대장을 관리합니다."
        actions={
          <button type="button" onClick={handleExportCSV} className="lms-btn lms-btn-secondary">
            <Download className="h-4 w-4" />
            발급 대장 CSV
          </button>
        }
      />

      <AdminStatStrip
        stats={[
          { label: '전체 인증번호', value: `${stats.total}건` },
          { label: '수료', value: `${stats.completed}건` },
          { label: '학습 중', value: `${stats.learning}건` },
          { label: '수료율', value: `${completionRate}%` },
        ]}
      />

      {/* Verification */}
      <AdminPanel title="진위 확인" bodyClassName="p-5 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunVerification();
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              id="input-admin-verify-code"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder="수료증 인증번호 입력 (예: TDSN-XXXXXXXX)"
              aria-label="수료증 인증번호"
              className="lms-input h-10 pl-9 pr-9 font-mono tracking-wide"
            />
            {verifyInput && (
              <button
                type="button"
                onClick={handleResetVerification}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                aria-label="입력 지우기"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button type="submit" className="lms-btn lms-btn-primary">
            확인
          </button>
        </form>

        {allCertificates.length > 0 && !hasValidated && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
            최근 발급:
            {allCertificates.slice(0, 3).map((item) => (
              <button
                key={item.certCode}
                type="button"
                onClick={() => handleQuickVerifySample(item.certCode)}
                className="rounded-md border border-neutral-200 px-2 py-0.5 font-mono text-[11px] text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                title={`${item.user?.name || '수강생'} · ${item.course.title}`}
              >
                {item.certCode}
              </button>
            ))}
          </div>
        )}

        {hasValidated && verificationResult && (
          verificationResult.isValid ? (
            <div className="rounded-lg border border-neutral-200">
              <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {verificationResult.isCompleted ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="text-neutral-900">정상 발급된 수료증입니다</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-5 w-5 text-amber-500" />
                      <span className="text-neutral-900">아직 수료 전인 수강 기록입니다 (진도 {verificationResult.progressPercentage}%)</span>
                    </>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleCopyVerificationStatement(verificationResult)} className="lms-btn lms-btn-ghost lms-btn-sm">
                    <Copy className="h-4 w-4" />
                    확인서 복사
                  </button>
                  <button type="button" onClick={() => handleOpenVerifiedModal(verificationResult, true)} className="lms-btn lms-btn-secondary lms-btn-sm">
                    <Printer className="h-4 w-4" />
                    인쇄 · PDF
                  </button>
                  <button type="button" onClick={() => handleOpenVerifiedModal(verificationResult, false)} className="lms-btn lms-btn-primary lms-btn-sm">
                    <Eye className="h-4 w-4" />
                    수료증 보기
                  </button>
                </div>
              </div>
              <dl className="grid gap-4 p-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-neutral-500">수료자</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <Avatar src={verificationResult.user?.avatar} name={verificationResult.user?.name || '수강생'} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-neutral-900">{verificationResult.user?.name || '알 수 없음'}</span>
                      <span className="block truncate text-xs text-neutral-500">{verificationResult.user?.email || '-'}</span>
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">과정</dt>
                  <dd className="mt-1">
                    <span className="block truncate font-medium text-neutral-900" title={verificationResult.course?.title}>
                      {verificationResult.course?.title}
                    </span>
                    <span className="block truncate text-xs text-neutral-500">
                      {verificationResult.course?.instructorName} · {verificationResult.course?.categoryName}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">이수 정보</dt>
                  <dd className="mt-1">
                    <span className="block font-medium text-neutral-900">
                      {verificationResult.completedLessons || 0} / {verificationResult.totalLessons}강 · {verificationResult.progressPercentage}%
                    </span>
                    <span className="block text-xs text-neutral-500">{verificationResult.completionDate}</span>
                  </dd>
                </div>
              </dl>
              <p className="border-t border-neutral-100 px-4 py-2.5 font-mono text-xs text-neutral-500">
                {verificationResult.certCode} · 확인 시각 {verificationResult.verifiedAt}
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div className="text-sm">
                <p className="font-medium text-rose-900">발급 기록이 없는 인증번호입니다</p>
                <p className="mt-1 text-rose-800">
                  <span className="font-mono">{verificationResult.certCode}</span>와 일치하는 수료 기록이 없습니다. 형식(TDSN-XXXXXXXX)과 오타를 확인해 주세요.
                </p>
              </div>
            </div>
          )
        )}
      </AdminPanel>

      {/* Ledger */}
      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              id="input-admin-certificate-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="인증번호, 이름, 이메일, 강의명"
              aria-label="발급 대장 검색"
              className="lms-input h-9 pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-neutral-100 p-0.5" role="group" aria-label="수료 상태">
              {(
                [
                  { id: 'all', label: `전체 ${allCertificates.length}` },
                  { id: 'completed', label: `수료 ${stats.completed}` },
                  { id: 'learning', label: `학습 중 ${stats.learning}` },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={filterStatus === s.id}
                  onClick={() => setFilterStatus(s.id)}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                    filterStatus === s.id ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              aria-label="강의"
              className="lms-input h-9 w-auto max-w-[240px] pr-8"
            >
              <option value="all">전체 강의</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[13px] tabular-nums text-neutral-500 lg:ml-auto">{filtered.length}건</span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-neutral-500">
            {allCertificates.length === 0 ? '아직 발급된 수료증이 없습니다.' : '조건에 맞는 기록이 없습니다.'}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-neutral-100 md:hidden">
              {filtered.map((item) => (
                <li key={`m_${item.course.id}_${item.enrollment.userId}`} className="space-y-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    {codeChip(item.certCode)}
                    {statusText(item.isCompleted)}
                  </div>
                  <p className="truncate text-sm font-medium text-neutral-900">{item.course.title}</p>
                  <p className="text-xs text-neutral-500">
                    {item.user?.name || '알 수 없음'} · 진도 {item.enrollment.progressPercentage}% · {item.completionDate}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => verifyFromRow(item.certCode)} className="lms-btn lms-btn-secondary lms-btn-sm">
                      <ShieldCheck className="h-4 w-4" />
                      확인
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCertForModal(item);
                        setModalInitialPrint(false);
                      }}
                      className="lms-btn lms-btn-secondary lms-btn-sm"
                    >
                      <Eye className="h-4 w-4" />
                      보기
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">인증번호</th>
                    <th className="px-3 py-2.5 font-medium">수강생</th>
                    <th className="px-3 py-2.5 font-medium">강의</th>
                    <th className="px-3 py-2.5 text-right font-medium">진도</th>
                    <th className="px-3 py-2.5 font-medium">상태</th>
                    <th className="px-3 py-2.5 font-medium">수료일</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  {filtered.map((item) => (
                    <tr key={`${item.course.id}_${item.enrollment.userId}`} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">{codeChip(item.certCode)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={item.user?.avatar} name={item.user?.name || '수강생'} size="sm" />
                          <div>
                            <div className="font-medium text-neutral-900">{item.user?.name || '알 수 없음'}</div>
                            <div className="text-xs text-neutral-500">{item.user?.email || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[260px] px-3 py-3">
                        <div className="truncate font-medium text-neutral-900" title={item.course.title}>
                          {item.course.title}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {item.course.instructorName} · {item.totalLessons}강
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{item.enrollment.progressPercentage}%</td>
                      <td className="px-3 py-3">{statusText(item.isCompleted)}</td>
                      <td className="px-3 py-3 tabular-nums text-neutral-500">{item.completionDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" onClick={() => verifyFromRow(item.certCode)} className="lms-btn lms-btn-ghost lms-btn-sm" title="진위 확인">
                            <ShieldCheck className="h-4 w-4" />
                            확인
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCertForModal(item);
                              setModalInitialPrint(false);
                            }}
                            className="lms-btn lms-btn-secondary lms-btn-sm"
                          >
                            <Eye className="h-4 w-4" />
                            수료증
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {selectedCertForModal && (
        <CourseCompletionModal
          isOpen={Boolean(selectedCertForModal)}
          onClose={() => {
            setSelectedCertForModal(null);
            setModalInitialPrint(false);
          }}
          course={selectedCertForModal.course}
          lessonsCount={selectedCertForModal.totalLessons}
          user={selectedCertForModal.user}
          certificateCode={selectedCertForModal.certCode}
          issueDate={selectedCertForModal.completionDate}
          progressPercentage={selectedCertForModal.enrollment.progressPercentage}
          initialPrint={modalInitialPrint}
        />
      )}
    </div>
  );
};
