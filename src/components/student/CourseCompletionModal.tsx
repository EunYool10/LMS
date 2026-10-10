import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  CheckCircle2,
  Calendar,
  BookOpen,
  Star,
  Home,
  X,
  Printer,
  FileCheck,
  Check,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { Course, User } from '../../types';
import { VerifiedBadge } from '../common/VerifiedBadge';
import tdsOfficialLogo from '../../assets/branding/tds-official-logo.png';
import { formatCertificateDate } from '../../utils/certificate';

interface CourseCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  lessonsCount: number;
  user?: User | null;
  onReviewClick?: () => void;
  onNavigateHome?: () => void;
  initialPrint?: boolean;
  certificateCode?: string;
  issueDate?: string;
  progressPercentage?: number;
}

export const CourseCompletionModal: React.FC<CourseCompletionModalProps> = ({
  isOpen,
  onClose,
  course,
  lessonsCount,
  user,
  onReviewClick,
  onNavigateHome,
  initialPrint = false,
  certificateCode,
  issueDate,
  progressPercentage = 100,
}) => {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'certificate' | 'summary'>('certificate');
  const [completionDate, setCompletionDate] = useState<string>('');
  const [completionTimestamp, setCompletionTimestamp] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [logoFailed, setLogoFailed] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Course creator instructor details for official instructor seal
  const instructorName = (course.instructorName || '').trim() || '책임강사';

  const formattedSealName = useMemo(() => {
    if (instructorName.length === 2) {
      return `${instructorName[0]} ${instructorName[1]}`;
    }
    return instructorName;
  }, [instructorName]);

  // Use provided certificateCode or compute deterministic hash code
  const certCode = React.useMemo(() => {
    if (certificateCode) return certificateCode;
    const certIdSeed = `${course.id}_${user?.id || 'guest'}`;
    let hash = 0;
    for (let i = 0; i < certIdSeed.length; i++) {
      hash = (hash << 5) - hash + certIdSeed.charCodeAt(i);
      hash |= 0;
    }
    return `TDSN-${Math.abs(hash).toString(36).toUpperCase().padStart(8, '0').slice(0, 8)}`;
  }, [certificateCode, course.id, user?.id]);

  useEffect(() => {
    if (isOpen) {
      if (issueDate) {
        setCompletionDate(formatCertificateDate(issueDate));
        try {
          const d = new Date(issueDate);
          setCompletionTimestamp(
            isNaN(d.getTime())
              ? new Date().toISOString().split('T')[0]
              : d.toISOString().split('T')[0]
          );
        } catch {
          setCompletionTimestamp(new Date().toISOString().split('T')[0]);
        }
      } else {
        const now = new Date();
        setCompletionDate(
          now.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        );
        setCompletionTimestamp(now.toISOString().split('T')[0]);
      }
      document.body.style.overflow = 'hidden';
      document.body.classList.add('certificate-modal-open');
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('certificate-modal-open');
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('certificate-modal-open');
    };
  }, [isOpen, issueDate]);

  // Handle Initial Auto-Print if requested
  useEffect(() => {
    if (isOpen && initialPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialPrint]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(certCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-y-auto select-none p-2 sm:p-4 md:p-6 flex items-center justify-center print:static print:inset-auto print:p-0 print:m-0 print:overflow-visible print:block print:w-full print:h-auto">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity duration-300 print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Modal Card Container */}
      <div
        className="relative z-50 w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] print:static print:inset-auto print:max-w-none print:w-full print:shadow-none print:border-none print:m-0 print:p-0 print:max-h-none print:overflow-visible print:bg-transparent animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Action Bar (Official Certification Header) */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug truncate">
                공식 교육 수료증 발급 완료
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                TDSN 전문 인재 양성 아카데미 인증
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Segmented Tab Switch */}
            <div className="bg-slate-800/90 border border-slate-700/60 p-0.5 rounded-lg flex items-center text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('certificate')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === 'certificate'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                수료증
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                학습 리포트
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-0.5"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-3 sm:p-6 lg:p-7 overflow-y-auto max-h-[calc(96vh-8.5rem)] bg-slate-100/80 print:p-0 print:max-h-none print:overflow-visible print:bg-white">
          {activeTab === 'certificate' ? (
            /* ========================================================
               OFFICIAL CERTIFICATE OF COMPLETION (Enterprise Academic Grade)
               Gold - Navy - Ivory Formal Single-Document Structure
               ======================================================== */
            <div
              ref={printRef}
              className="certificate-printable-sheet relative bg-[#FAF7F0] text-slate-900 max-w-[620px] mx-auto overflow-hidden rounded-none p-6 sm:p-8 md:p-10 border-[3px] border-[#B89748] outline outline-1 outline-[#D4AF37]/80 outline-offset-[-6px] shadow-lg print:border-[2.5pt] print:border-[#B89748] print:shadow-none print:rounded-none print:p-8 print:m-0 print:w-full print:max-w-[185mm] print:outline-[1pt] print:outline-[#D4AF37] print:outline-offset-[-6pt]"
            >
              {/* Corner Classical Ornamental Accents */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#8C6D3B] pointer-events-none" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#8C6D3B] pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#8C6D3B] pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#8C6D3B] pointer-events-none" />

              {/* Subtle Watermark Logo Background */}
              {!logoFailed && (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
                  <img
                    src={tdsOfficialLogo || '/assets/branding/tds-official-logo.png'}
                    alt=""
                    className="w-64 h-64 sm:w-72 sm:h-72 object-contain grayscale"
                    onError={() => setLogoFailed(true)}
                  />
                </div>
              )}

              {/* Top Authority Header & Title */}
              <div className="relative z-10 flex flex-col items-center justify-center space-y-1 pb-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  {!logoFailed && (
                    <img
                      src={tdsOfficialLogo || '/assets/branding/tds-official-logo.png'}
                      alt="TDSN"
                      className="h-6 sm:h-7 w-auto object-contain block"
                      onError={() => setLogoFailed(true)}
                    />
                  )}
                  <span className="text-[11px] sm:text-xs font-serif font-bold text-[#8C6D3B] tracking-[0.28em] uppercase">
                    TDSN Global Academy
                  </span>
                </div>

                {/* Main Title: 수 료 증 (Deep Navy Bold Serif) */}
                <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-[0.45em] text-[#0F172A] pt-2 pb-0.5 pl-2 leading-none">
                  수 료 증
                </h1>

                {/* Subtitle: Certificate of Completion (Gold/Bronze Serif) */}
                <p className="text-[10.5px] sm:text-[11.5px] font-serif font-bold tracking-[0.25em] text-[#8C6D3B] uppercase">
                  Certificate of Completion
                </p>

                {/* Official Certificate Serial Number Badge */}
                <div className="pt-2">
                  <div className="inline-flex items-center gap-2 px-3.5 py-0.5 text-[10.5px] font-mono text-slate-700 border border-[#D4C4A8] bg-[#F4EFE6]/70">
                    <span className="text-[#8C6D3B] font-sans font-semibold tracking-wider text-[10px]">CERTIFICATE NO.</span>
                    <span className="font-bold text-[#0F172A] tracking-wider">{certCode}</span>
                  </div>
                </div>
              </div>

              {/* Recipient Section (수 료 자) */}
              <div className="relative z-10 my-4 sm:my-5 text-center space-y-1">
                <div className="text-[11px] font-serif font-semibold tracking-[0.25em] text-[#8C6D3B] uppercase">
                  수 료 자
                </div>
                <div className="text-2xl sm:text-[30px] font-serif font-black text-[#0F172A] tracking-wider">
                  {user?.name || '수강생'}
                </div>
                <div className="w-16 h-0.5 bg-[#B89748]/60 mx-auto mt-2" />
              </div>

              {/* Course Title Section (이수 교육과정) */}
              <div className="relative z-10 my-3 sm:my-4 text-center space-y-1">
                <div className="text-[11px] font-serif font-semibold tracking-[0.25em] text-[#8C6D3B] uppercase">
                  이수 교육과정
                </div>
                <div className="text-base sm:text-lg md:text-xl font-serif font-bold text-[#0F172A] px-4 max-w-lg mx-auto leading-snug break-keep">
                  {course.title}
                </div>
              </div>

              {/* Formal Statement of Completion (수료 공인 문구) */}
              <p className="relative z-10 text-xs sm:text-[13px] font-serif text-slate-700 leading-relaxed max-w-md sm:max-w-lg mx-auto px-2 sm:px-4 my-4 break-keep text-center">
                위 사람은 TDSN 아카데미에서 주관하는 전문 인재 역량 강화 과정의 전 커리큘럼을 성실히 이수하고,
                소정의 학습 및 평가 기준을 우수하게 충족하였으므로 본 수료증을 수여합니다.
              </p>

              {/* 3-Item Equal Width Grid Ledger ('총 이수 차시', '이수 진도율', '수료 일자') */}
              <div className="relative z-10 my-5 border border-[#D4C4A8] bg-[#F5F0E6]/70 max-w-lg mx-auto overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-[#D4C4A8] w-full text-center">
                  {/* Ledger Item 1: 총 이수 차시 */}
                  <div className="w-full py-3 sm:py-3.5 px-2 flex flex-col items-center justify-center col-span-1 min-w-0">
                    <span className="text-[10.5px] sm:text-xs font-sans font-bold tracking-wider text-[#8C6D3B] uppercase mb-1.5">
                      총 이수 차시
                    </span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-xl sm:text-2xl font-serif font-black text-[#0F172A] tracking-tight">
                        {lessonsCount}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-700">
                        강 완주
                      </span>
                    </div>
                  </div>

                  {/* Ledger Item 2: 이수 진도율 */}
                  <div className="w-full py-3 sm:py-3.5 px-2 flex flex-col items-center justify-center col-span-1 min-w-0">
                    <span className="text-[10.5px] sm:text-xs font-sans font-bold tracking-wider text-[#8C6D3B] uppercase mb-1.5">
                      이수 진도율
                    </span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-xl sm:text-2xl font-serif font-black text-emerald-800 tracking-tight">
                        {progressPercentage}%
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-700">
                        완료
                      </span>
                    </div>
                  </div>

                  {/* Ledger Item 3: 수료 일자 */}
                  <div className="w-full py-3 sm:py-3.5 px-2 flex flex-col items-center justify-center col-span-1 min-w-0">
                    <span className="text-[10.5px] sm:text-xs font-sans font-bold tracking-wider text-[#8C6D3B] uppercase mb-1.5">
                      수료 일자
                    </span>
                    <div className="flex items-baseline justify-center">
                      <span className="text-xs sm:text-sm md:text-[15px] font-serif font-bold text-[#0F172A] tracking-tight whitespace-nowrap">
                        {completionDate || '오늘'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Certificate Footer / Issuing Authority & Official Seal */}
              <div className="relative z-10 pt-4 sm:pt-5 border-t border-[#D4C4A8] flex items-center justify-between gap-4 text-left">
                <div className="space-y-1.5">
                  <div>
                    <div className="text-[10.5px] font-serif font-bold text-[#8C6D3B] tracking-wider uppercase">
                      발행 기관 및 강의 책임
                    </div>
                    <div className="text-sm sm:text-base font-serif font-bold text-[#0F172A] tracking-tight">
                      TDSN 교육혁신본부 아카데미
                    </div>
                    <div className="text-xs sm:text-sm font-serif font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <span className="text-slate-500 font-medium">강의 제작 강사</span>
                      <strong className="text-slate-900 font-black">{instructorName}</strong>
                      <span className="text-[10.5px] font-sans font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        (강사 직인 날인)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>전자 서명 인증일: {completionTimestamp} · 식별코드: {certCode}</span>
                  </div>
                </div>

                {/* Official Vermilion Seal (강의 제작 강사 직인) */}
                <div className="relative flex items-center justify-center shrink-0 pr-1 select-none">
                  <div
                    className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-rose-700/95 flex flex-col items-center justify-center text-rose-700 rotate-[-4deg] bg-rose-50/30 shadow-2xs relative"
                    title={`강의 제작 강사 ${instructorName} 직인`}
                  >
                    {/* Concentric inner border */}
                    <div className="absolute inset-1 rounded-full border border-rose-700/70 pointer-events-none" />
                    <span className="text-[7.5px] sm:text-[8px] font-black tracking-wider leading-none text-rose-800">
                      강의제작
                    </span>
                    <span className="text-[11px] sm:text-[13px] font-black font-serif tracking-widest border-y border-rose-700/85 py-0.5 my-0.5 leading-none px-1 text-center max-w-[70px] sm:max-w-[78px] truncate text-rose-900">
                      {formattedSealName}
                    </span>
                    <span className="text-[7.5px] sm:text-[8px] font-black tracking-widest leading-none text-rose-800">
                      강사직인
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               SUMMARY & ACHIEVEMENT REPORT VIEW
               ======================================================== */
            <div className="space-y-4 max-w-xl mx-auto">
              {/* Course Overview Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                    완주 완료 강좌
                  </span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    진도율 100%
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{course.title}</h3>
                <p className="text-xs text-slate-500">{course.shortDescription || '강의의 모든 커리큘럼을 완료했습니다.'}</p>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>완료 레슨: <strong className="text-slate-900">{lessonsCount}개 차시</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>완주일: <strong className="text-slate-900">{completionDate}</strong></span>
                  </div>
                  {course.instructorName && (
                    <div className="flex items-center gap-2 text-slate-600 col-span-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>담당 강사: <strong className="text-slate-900">{course.instructorName}</strong></span>
                      <VerifiedBadge role="INSTRUCTOR" size="xs" showLabel />
                    </div>
                  )}
                </div>
              </div>

              {/* Official Recognition Note */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <span>수료 기준 충족 내역</span>
                </div>
                <ul className="space-y-1.5 pl-5 list-disc text-slate-600">
                  <li>전 차시 동영상 필수 학습 시간 충족 (강사 설정 기준 이상)</li>
                  <li>각 섹션별 핵심 요점 학습 및 이해도 점검 완료</li>
                  <li>TDSN 학습자 시스템에 공식 이수 내역 영구 기록 및 반영</li>
                </ul>
              </div>

              {/* Certificate Verification Code Bar */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">수료 인증 코드</div>
                  <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">{certCode}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>코드 복사</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Controls */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0 print:hidden">
          {/* Left Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 sm:flex-initial">
            {activeTab === 'certificate' && (
              <button
                type="button"
                onClick={handlePrint}
                className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs flex-1 sm:flex-initial whitespace-nowrap"
                title="수료증 인쇄 또는 PDF 저장"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>수료증 인쇄 / PDF 저장</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyCode}
              className="h-10 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs flex-1 sm:flex-initial whitespace-nowrap"
              title="수료 인증 번호 복사"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 font-bold">인증번호 복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>인증번호 복사</span>
                </>
              )}
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-1 sm:flex-initial">
            {onReviewClick && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReviewClick();
                }}
                className="h-10 px-3.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 text-xs font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs flex-1 sm:flex-initial whitespace-nowrap"
              >
                <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500 shrink-0" />
                <span>수강평 남기기</span>
              </button>
            )}

            {onNavigateHome && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateHome();
                }}
                className="h-10 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs flex-1 sm:flex-initial whitespace-nowrap"
              >
                <Home className="w-3.5 h-3.5 shrink-0" />
                <span>홈으로</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
