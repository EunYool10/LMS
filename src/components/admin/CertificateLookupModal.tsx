import React, { useState, useMemo } from 'react';
import { storage } from '../../services/storage';
import { Course, Enrollment, User } from '../../types';
import { generateCertificateCode, formatCertificateDate } from '../../utils/certificate';
import { CourseCompletionModal } from '../student/CourseCompletionModal';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import {
  Award,
  Search,
  CheckCircle2,
  Calendar,
  BookOpen,
  User as UserIcon,
  Copy,
  Check,
  Eye,
  X,
  Printer,
  ShieldCheck,
  ArrowRight,
  Filter,
  FileCheck,
  HelpCircle,
} from 'lucide-react';

interface CertificateLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
  onNavigateToCourse?: (courseId: string) => void;
}

export interface EnrichedCertificateItem {
  certCode: string;
  enrollment: Enrollment;
  course: Course;
  user: User | null;
  completionDate: string;
  totalLessons: number;
  isCompleted: boolean;
}

export const CertificateLookupModal: React.FC<CertificateLookupModalProps> = ({
  isOpen,
  onClose,
  initialCode = '',
  onNavigateToCourse,
}) => {
  const [searchInput, setSearchInput] = useState(initialCode);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedItemForCert, setSelectedItemForCert] = useState<EnrichedCertificateItem | null>(null);
  const [filterCompletedOnly, setFilterCompletedOnly] = useState<boolean>(false);

  // Sync initialCode if provided and modal opens
  React.useEffect(() => {
    if (initialCode) {
      setSearchInput(initialCode);
    }
  }, [initialCode, isOpen]);

  // Aggregate all possible certificates across enrollments
  const certificatesData: EnrichedCertificateItem[] = useMemo(() => {
    const enrollments = storage.getEnrollments();
    const courses = storage.getCourses(true);
    const users = storage.getUsers();

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
      .filter((item): item is EnrichedCertificateItem => item !== null);
  }, [isOpen]);

  const cleanQuery = searchInput.trim().toUpperCase();

  // Filter items based on certCode or search term
  const filteredItems = useMemo(() => {
    let list = certificatesData;

    if (filterCompletedOnly) {
      list = list.filter((item) => item.isCompleted);
    }

    if (!cleanQuery) {
      return list;
    }

    return list.filter((item) => {
      const codeMatch = item.certCode.toUpperCase().includes(cleanQuery);
      const studentNameMatch = item.user?.name.toUpperCase().includes(cleanQuery);
      const studentEmailMatch = item.user?.email.toUpperCase().includes(cleanQuery);
      const courseTitleMatch = item.course.title.toUpperCase().includes(cleanQuery);
      const instructorMatch = item.course.instructorName.toUpperCase().includes(cleanQuery);

      return codeMatch || studentNameMatch || studentEmailMatch || courseTitleMatch || instructorMatch;
    });
  }, [certificatesData, cleanQuery, filterCompletedOnly]);

  // Direct exact match
  const exactMatch = useMemo(() => {
    if (!cleanQuery) return null;
    return certificatesData.find((item) => item.certCode.toUpperCase() === cleanQuery);
  }, [certificatesData, cleanQuery]);

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      id="certificate-lookup-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        id="certificate-lookup-modal"
        className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                  수료증 인증번호 및 발급 내역 조회
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <ShieldCheck className="w-3 h-3" />
                  진위확인
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate mt-0.5">
                수료증 고유 인증번호(TDSN-XXXXXXXX) 또는 수강생명, 강의명으로 발급 진위를 신속히 검증합니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="input-certificate-search-modal"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="인증번호 (예: TDSN-XXXXXX), 수강생 성명, 이메일, 강의명으로 검색..."
              className="w-full pl-10 pr-10 py-2.5 text-xs bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono sm:font-sans font-medium"
              autoFocus
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                title="입력 초기화"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterCompletedOnly(!filterCompletedOnly)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                filterCompletedOnly
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>완강/수료자만 보기</span>
            </button>
          </div>
        </div>

        {/* Verification Status Banner (when exact cert code is entered) */}
        {cleanQuery.startsWith('TDSN') && (
          <div className="px-5 py-3 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-4 h-4 ${exactMatch ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className="font-semibold text-slate-800">
                인증번호 <strong className="font-mono text-indigo-700">{cleanQuery}</strong> 검증 결과:
              </span>
              {exactMatch ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  정상 발급 확인됨 ({exactMatch.isCompleted ? '수료 완료' : '학습 진행 중'})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  발급 내역 미등록 또는 일치하는 번호 없음
                </span>
              )}
            </div>
            {exactMatch && (
              <button
                type="button"
                onClick={() => setSelectedItemForCert(exactMatch)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>공식 수료증 열기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
            <span>
              총 <strong className="font-bold text-slate-900">{filteredItems.length}</strong>건의 수료/인증 내역이 조회되었습니다.
            </span>
            <span className="text-[11px] text-slate-400">
              * 항목을 클릭하거나 '수료증 보기' 버튼으로 원본 문서를 확인할 수 있습니다.
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Award className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-700">일치하는 수료증 번호나 발급 기록이 없습니다.</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  입력하신 인증번호(TDSN-XXXXXXXX), 수강생 이름 또는 강의명을 다시 확인해주세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={`${item.course.id}_${item.enrollment.userId}`}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  {/* Left Info */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <Avatar
                      src={item.user?.avatar}
                      name={item.user?.name || '수강생'}
                      size="md"
                    />

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          {item.user?.name || '익명 수강생'}
                        </span>
                        <span className="text-xs text-slate-400">({item.user?.email || '이메일 없음'})</span>
                        {item.isCompleted ? (
                          <Badge variant="success" size="sm">
                            <CheckCircle2 className="w-3 h-3" />
                            수료 완료 (100%)
                          </Badge>
                        ) : (
                          <Badge variant="primary" size="sm">
                            진행 중 ({item.enrollment.progressPercentage}%)
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-slate-700 line-clamp-1">
                        {item.course.title}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span>강사: {item.course.instructorName}</span>
                        <span>·</span>
                        <span>총 {item.totalLessons}강</span>
                        <span>·</span>
                        <span>수료/신청일: {item.completionDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Cert Code & Actions */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2.5 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                    {/* Cert Code Badge with Copy button */}
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-mono uppercase">인증번호:</span>
                      <span className="font-mono font-bold text-xs text-indigo-700 tracking-wider">
                        {item.certCode}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(item.certCode, e)}
                        className="p-1 hover:bg-white rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title="인증번호 복사"
                      >
                        {copiedCode === item.certCode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedItemForCert(item)}
                        className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>수료증 보기</span>
                      </button>

                      {onNavigateToCourse && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateToCourse(item.course.id);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                          title="해당 강의 정보 보기"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              TDSN 수료증 인증번호는 수료자 ID와 강의 고유 해시 알고리즘으로 위변조가 방지되는 영구 고유 식별자입니다.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer shadow-2xs shrink-0"
          >
            닫기
          </button>
        </div>
      </div>

      {/* Official Certificate Preview Modal (Gold-Navy-Ivory Enterprise Theme) */}
      {selectedItemForCert && (
        <CourseCompletionModal
          isOpen={Boolean(selectedItemForCert)}
          onClose={() => setSelectedItemForCert(null)}
          course={selectedItemForCert.course}
          lessonsCount={selectedItemForCert.totalLessons}
          user={selectedItemForCert.user}
          certificateCode={selectedItemForCert.certCode}
          issueDate={selectedItemForCert.completionDate}
          progressPercentage={selectedItemForCert.enrollment.progressPercentage}
        />
      )}
    </div>
  );
};
