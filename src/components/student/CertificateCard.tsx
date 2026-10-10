import React, { useState } from 'react';
import { Course, Enrollment, User } from '../../types';
import { Badge } from '../common/Badge';
import { generateCertificateCode, formatCertificateDate } from '../../utils/certificate';
import {
  Award,
  Download,
  Eye,
  Check,
  Copy,
  Printer,
  Calendar,
  BookOpen,
  User as UserIcon,
  PlayCircle,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface CertificateCardProps {
  course: Course;
  enrollment: Enrollment;
  totalLessons: number;
  user?: User | null;
  onPreview: (course: Course) => void;
  onDownload: (course: Course) => void;
  onReviewCourse?: (courseId: string) => void;
  className?: string;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  course,
  enrollment,
  totalLessons,
  user,
  onPreview,
  onDownload,
  onReviewCourse,
  className = '',
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  const certCode = generateCertificateCode(course.id, user?.id);
  const completionDate = formatCertificateDate(enrollment.completedAt || enrollment.enrolledAt);
  const studentName = user?.name || '수강생';

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(certCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      id={`certificate-card-${course.id}`}
      className={`group bg-white rounded-3xl border border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${className}`}
    >
      {/* Top Banner Ribbon */}
      <div className="px-5 py-3 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-amber-50 flex items-center justify-between border-b border-amber-950/20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
            <Award className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black tracking-wide uppercase font-serif">
            공식 교육 수료증
          </span>
        </div>

        <Badge variant="success" size="sm" className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30">
          인증 완료
        </Badge>
      </div>

      {/* Mini Certificate Visual Frame */}
      <div
        onClick={() => onPreview(course)}
        className="p-4 sm:p-5 bg-gradient-to-b from-slate-50 to-[#FAF9F5] border-b border-slate-200/80 cursor-pointer relative overflow-hidden group-hover:bg-[#F6F4ED] transition-colors"
        title="클릭하여 수료증 전체화면 미리보기"
      >
        {/* Certificate Outer Sheet */}
        <div className="relative bg-[#FAF7F0] border-2 border-[#B89748] rounded-sm p-1.5 shadow-sm text-slate-900">
          {/* Delicate Inner Frame */}
          <div className="relative border border-[#C5A059]/70 rounded-none p-3 sm:p-3.5 bg-transparent text-center overflow-hidden">
            {/* 4 Corner Engraved Accents */}
            <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#8C6D3B]" />
            <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#8C6D3B]" />
            <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#8C6D3B]" />
            <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#8C6D3B]" />

            {/* Mini Header */}
            <div className="text-center space-y-0.5 pb-1.5 border-b border-[#D4C4A8]">
              <div className="text-[9px] tracking-[0.22em] uppercase font-serif font-bold text-[#8C6D3B]">
                TDSN Global Academy
              </div>
              <h4 className="text-base font-serif font-black tracking-[0.35em] text-[#0F172A] pl-1">
                수 료 증
              </h4>
              <div className="text-[8px] font-serif font-semibold tracking-[0.2em] text-[#8C6D3B] uppercase">
                Certificate of Completion
              </div>
              <div className="pt-0.5">
                <span className="inline-block text-[8px] font-mono text-slate-600 px-1.5 py-0.2 border border-[#D4C4A8] bg-[#F4EFE6]/70">
                  NO. {certCode}
                </span>
              </div>
            </div>

            {/* Mini Body */}
            <div className="py-2 text-center space-y-0.5">
              <div className="text-[8.5px] text-[#8C6D3B] font-semibold tracking-wider uppercase">수료자</div>
              <div className="text-sm font-bold font-serif text-[#0F172A] tracking-wide">
                {studentName}
              </div>
              <div className="w-8 h-px bg-[#B89748]/50 mx-auto my-1" />
              <div className="text-[10.5px] font-bold font-serif text-[#0F172A] truncate px-2" title={course.title}>
                {course.title}
              </div>
            </div>

            {/* Mini 3-Item Equal Width Ledger */}
            <div className="my-1.5 border-y border-[#D4C4A8] bg-[#F5F0E6]/50 py-1 grid grid-cols-3 divide-x divide-[#D4C4A8] text-center text-[8.5px]">
              <div className="px-0.5">
                <span className="block text-[7px] text-[#7A623A] font-semibold">총 이수 차시</span>
                <span className="font-bold font-serif text-[#0F172A] text-[9.5px]">{totalLessons}강</span>
              </div>
              <div className="px-0.5">
                <span className="block text-[7px] text-[#7A623A] font-semibold">이수 진도율</span>
                <span className="font-bold font-serif text-emerald-700 text-[9.5px]">100%</span>
              </div>
              <div className="px-0.5">
                <span className="block text-[7px] text-[#7A623A] font-semibold">수료 일자</span>
                <span className="font-bold font-serif text-[#0F172A] text-[8px] truncate block">{completionDate}</span>
              </div>
            </div>

            {/* Mini Stamp & Seal (강의 제작 강사 직인) */}
            <div className="pt-1.5 flex items-center justify-between text-[8.5px] text-slate-500">
              <div className="text-left font-serif">
                <div className="font-bold text-[#0F172A] text-[9px]">TDSN 아카데미</div>
                <div className="text-[7.5px] text-slate-600 truncate max-w-[85px]">
                  강사 {course.instructorName || '책임강사'}
                </div>
              </div>

              {/* Circular Red Stamp Seal - Course Creator Instructor Seal */}
              <div
                className="w-8 h-8 rounded-full border border-rose-700/90 flex flex-col items-center justify-center text-rose-700 rotate-[-5deg] select-none bg-rose-50/30 relative shrink-0"
                title={`강의 제작 강사 ${course.instructorName || ''} 직인`}
              >
                <div className="absolute inset-0.5 rounded-full border border-rose-700/60 pointer-events-none" />
                <span className="text-[4px] font-black leading-none tracking-tighter text-rose-800">강의제작</span>
                <span className="text-[6.5px] font-black font-serif border-y border-rose-700/80 py-0.2 my-0.2 leading-none max-w-[26px] truncate text-center text-rose-900">
                  {course.instructorName || '강사'}
                </span>
                <span className="text-[4px] font-black leading-none tracking-tighter text-rose-800">강사직인</span>
              </div>
            </div>
          </div>

          {/* Hover Preview Overlay */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-sm flex items-center justify-center gap-2 text-white font-bold text-xs">
            <Eye className="w-4 h-4 text-amber-300" />
            <span>수료증 미리보기</span>
          </div>
        </div>
      </div>

      {/* Course & Completion Details */}
      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 mb-1">
              <span>{course.categoryName || '전체'}</span>
              <span>·</span>
              <span className="text-slate-500 font-normal">전체 {totalLessons}강 완주</span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug line-clamp-2">
              {course.title}
            </h3>
          </div>

          {/* Meta Information List */}
          <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 rounded-2xl p-3 border border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>수료 일자</span>
              </span>
              <span className="font-semibold text-slate-800 text-[11px]">{completionDate}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>이수 진도율</span>
              </span>
              <span className="font-bold text-emerald-600 text-[11px]">100% (완강)</span>
            </div>

            {course.instructorName && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>지도 강사</span>
                </span>
                <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[120px]">
                  {course.instructorName}
                </span>
              </div>
            )}

            {/* Cert code copy row */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="text-[10.5px] text-slate-400 font-mono">인증번호</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="font-mono text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                title="인증번호 복사"
              >
                <span>{certCode}</span>
                {copiedCode ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Button Row */}
        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Preview Button */}
            <button
              type="button"
              onClick={() => onPreview(course)}
              className="py-2.5 px-3 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>수료증 미리보기</span>
            </button>

            {/* Download/Print Button */}
            <button
              type="button"
              onClick={() => onDownload(course)}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>다운로드 / 인쇄</span>
            </button>
          </div>

          {/* Optional Review Course Button */}
          {onReviewCourse && (
            <button
              type="button"
              onClick={() => onReviewCourse(course.id)}
              className="py-1.5 px-3 text-slate-500 hover:text-slate-800 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <PlayCircle className="w-3 h-3" />
              <span>강의 내용 복습하기</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
