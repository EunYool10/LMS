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
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import {
  Award,
  Search,
  CheckCircle2,
  Calendar,
  BookOpen,
  Copy,
  Check,
  Eye,
  X,
  Printer,
  ShieldCheck,
  Download,
  Filter,
  Layers,
  ArrowUpDown,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-indigo-300 font-bold tracking-wider uppercase">
              TDSN LMS Official Certification System
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <ShieldCheck className="w-3 h-3" />
              진위 검증 센터
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Award className="w-6 h-6 text-amber-400 shrink-0" />
            <span>수료증 인증번호 및 발급 관리</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            발급된 공식 수료증의 인증번호(TDSN-XXXXXXXX)를 실시간으로 조회하고, 원본 발급 내역 및 진위를 즉시 검증할 수 있습니다.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>발급 대장 CSV 다운로드</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          FEATURE 1: CERTIFICATE VERIFICATION (수료증 진위 검증 시스템)
          Allows administrators to search for and validate certificates by entering
          a unique certificate number, retrieving original certificate data.
          ========================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-indigo-100 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-950/90 via-slate-900 to-indigo-900 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  수료증 진위 검증 (Certificate Verification)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  공식 검증 모듈
                </span>
              </div>
              <p className="text-xs text-slate-300">
                수료증에 기재된 고유 인증번호(예: TDSN-XXXXXXXX)를 입력하면 데이터베이스의 원본 발급 내역과 대조하여 진위 여부를 즉시 검증하고 원본 문서를 호출합니다.
              </p>
            </div>

            {/* Quick Sample Buttons */}
            {allCertificates.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-[11px] text-slate-400 mr-1">빠른 테스트 샘플:</span>
                {allCertificates.slice(0, 3).map((item) => (
                  <button
                    key={item.certCode}
                    type="button"
                    onClick={() => handleQuickVerifySample(item.certCode)}
                    className="font-mono text-[11px] font-bold px-2 py-1 bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white rounded-lg border border-white/10 transition-colors cursor-pointer"
                    title={`${item.user?.name || '수강생'} - ${item.course.title}`}
                  >
                    {item.certCode}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Verification Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunVerification();
            }}
            className="mt-5 flex flex-col sm:flex-row items-stretch gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                id="input-admin-verify-code"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="검증할 수료증 고유 인증번호를 입력하세요 (예: TDSN-XXXXXXXX)..."
                className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm bg-slate-900/90 text-white placeholder:text-slate-400 border border-indigo-500/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono tracking-wider font-bold"
              />
              {verifyInput && (
                <button
                  type="button"
                  onClick={handleResetVerification}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="초기화"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="py-3 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>진위 검증하기</span>
              </button>

              {hasValidated && (
                <button
                  type="button"
                  onClick={handleResetVerification}
                  className="py-3 px-3 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer whitespace-nowrap"
                  title="검증 결과 초기화"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Verification Result Display Area */}
        {hasValidated && verificationResult && (
          <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200 animate-fadeIn">
            {verificationResult.isValid ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
                {/* Result Header Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        verificationResult.isCompleted
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}
                    >
                      {verificationResult.isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <BookOpen className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          {verificationResult.isCompleted
                            ? '공식 수료증 원본 발급 확인 완료'
                            : '학습 진행 중인 등록 인증번호'}
                        </h3>
                        {verificationResult.isCompleted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            공식 인증 유효 (Valid)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            학습 진행 중 (진도율 {verificationResult.progressPercentage}%)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        시스템 검증 일시: <strong className="text-slate-700">{verificationResult.verifiedAt}</strong> · 고유 식별 해시 매칭 성공
                      </p>
                    </div>
                  </div>

                  {/* Actions for Verified Result */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCopyVerificationStatement(verificationResult)}
                      className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>검증 확인서 복사</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenVerifiedModal(verificationResult, false)}
                      className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>공식 수료증 원본 보기</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenVerifiedModal(verificationResult, true)}
                      className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>인쇄 / PDF 출력</span>
                    </button>
                  </div>
                </div>

                {/* Original Certificate Data Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Recipient info */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      수료자 인적사항
                    </span>
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={verificationResult.user?.avatar}
                        name={verificationResult.user?.name || '수강생'}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {verificationResult.user?.name || '익명 수강생'}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {verificationResult.user?.email || '이메일 정보 없음'}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          UID: {verificationResult.user?.id || verificationResult.enrollment?.userId}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Course info */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      이수 교육과정 정보
                    </span>
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-slate-900 line-clamp-1" title={verificationResult.course?.title}>
                        {verificationResult.course?.title}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <span>담당 교수: <strong>{verificationResult.course?.instructorName}</strong></span>
                        <span>·</span>
                        <span>{verificationResult.course?.categoryName || '전문 역량'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        과정 고유 ID: {verificationResult.course?.id}
                      </div>
                    </div>
                  </div>

                  {/* Completion Ledger */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      학습 및 이수 통계
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">이수 진도율:</span>
                        <strong
                          className={`text-sm ${
                            verificationResult.isCompleted ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {verificationResult.progressPercentage}%
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">이수 차시:</span>
                        <strong className="text-slate-900 text-sm">
                          {verificationResult.completedLessons || 0} / {verificationResult.totalLessons}강
                        </strong>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">수료/등록 일자:</span>
                        <span className="font-semibold text-slate-800">
                          {verificationResult.completionDate}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Digital Signature Footer */}
                <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#D4C4A8] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#8C6D3B]" />
                    <span className="text-slate-700 font-serif">
                      발행 기관: <strong className="text-[#0F172A]">TDSN 교육혁신본부 아카데미</strong> · 강의 제작 강사: <strong className="text-rose-800 font-bold">{verificationResult.course?.instructorName || '책임강사'} (강사 직인 날인)</strong> · 인증번호: <strong className="font-mono text-[#0F172A]">{verificationResult.certCode}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8C6D3B] font-mono hidden sm:inline-block">
                    강의 제작 강사 직인 및 위변조 방지 전자 인증
                  </span>
                </div>
              </div>
            ) : (
              /* Invalid Certificate Number Notice */
              <div className="bg-white rounded-2xl border border-rose-200 p-6 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="text-base font-bold text-rose-900">
                    유효하지 않거나 등록되지 않은 수료증 번호입니다.
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    입력하신 번호 <strong className="font-mono text-rose-700">{verificationResult.certCode}</strong> 에 해당하는 공식 수료증 발급 내역이 TDSN 아카데미 데이터베이스에 존재하지 않습니다.
                  </p>
                  <div className="pt-2 text-xs text-slate-500 space-y-0.5">
                    <p>• 인증번호 형식이 올바른지 확인해주세요 (표준 형식: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700">TDSN-XXXXXXXX</code>).</p>
                    <p>• 오타가 없거나 앞뒤 공백이 포함되지 않았는지 다시 한 번 점검해주세요.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">총 발급 가능/연계 건수</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
            {stats.total}건
          </div>
          <div className="text-[11px] text-slate-400">
            전체 수강 등록 연계 인증번호
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">수료 완료 (공식 발급)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums">
            {stats.completed}건
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            전 과정 완주(100%) 및 공식 인증서 효력 보유
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">학습 진행 중</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 tabular-nums">
            {stats.learning}건
          </div>
          <div className="text-[11px] text-slate-400">
            완강 시 즉시 수료증 활성화
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Main Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="input-admin-certificate-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="수료증 번호(예: TDSN-XXXXXXXX), 수강생 성명, 이메일, 강의명으로 검색..."
              className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                title="입력 내용 지우기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                전체 ({allCertificates.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterStatus === 'completed'
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                수료 완료 ({stats.completed})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('learning')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterStatus === 'learning'
                    ? 'bg-white text-amber-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                학습 중 ({stats.learning})
              </button>
            </div>

            {/* Course select */}
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 cursor-pointer"
            >
              <option value="all">전체 강의 목록</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Certificates Data Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">수료증 발급 대장 목록</h2>
            <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60">
              총 {filtered.length}건
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline-block">
            * 인증번호를 클릭하면 복사되며, '검증' 버튼으로 상단 진위 검증 창을 즉시 호출할 수 있습니다.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4">수료증 고유 인증번호</th>
                <th className="py-3.5 px-4">수강생</th>
                <th className="py-3.5 px-4">이수 강의</th>
                <th className="py-3.5 px-4">진도율</th>
                <th className="py-3.5 px-4">이수 상태</th>
                <th className="py-3.5 px-4">수료 일자</th>
                <th className="py-3.5 px-4 text-right">관리 / 검증</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">일치하는 수료증 번호나 발급 내역이 없습니다.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      검색 조건을 변경하거나 상단 검색창에 다른 키워드를 입력해보세요.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={`${item.course.id}_${item.enrollment.userId}`} className="hover:bg-slate-50/80 transition-colors">
                    {/* Cert Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(item.certCode)}
                          className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200/70 transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="인증번호 복사"
                        >
                          <span>{item.certCode}</span>
                          {copiedCode === item.certCode ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-indigo-400" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Student */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={item.user?.avatar}
                          name={item.user?.name || '수강생'}
                          size="sm"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{item.user?.name || '익명 수강생'}</div>
                          <div className="text-[11px] text-slate-400">{item.user?.email || '이메일 없음'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Course */}
                    <td className="py-3.5 px-4">
                      <div className="max-w-[220px]">
                        <div className="font-semibold text-slate-900 truncate" title={item.course.title}>
                          {item.course.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{item.course.instructorName}</span>
                          <span>·</span>
                          <span>총 {item.totalLessons}강</span>
                        </div>
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="py-3.5 px-4 font-bold tabular-nums">
                      <span className={item.enrollment.progressPercentage === 100 ? 'text-emerald-700' : 'text-slate-700'}>
                        {item.enrollment.progressPercentage}%
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {item.isCompleted ? (
                        <Badge variant="success" size="sm">
                          <CheckCircle2 className="w-3 h-3" />
                          수료 완료
                        </Badge>
                      ) : (
                        <Badge variant="primary" size="sm">
                          학습 중
                        </Badge>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {item.completionDate}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Instant Verify Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyInput(item.certCode);
                            handleRunVerification(item.certCode);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="진위 검증 패널에서 대조"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>검증</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCertForModal(item);
                            setModalInitialPrint(false);
                          }}
                          className="py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="공식 원본 수료증 열기"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>수료증 보기</span>
                        </button>

                        {onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate('admin-courses-edit', item.course.id)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="강의 상세 편집으로 이동"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate Viewer Modal (Gold-Navy-Ivory Enterprise Theme) */}
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

