import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../../services/storage';
import { getRoleLabel, isServiceOwner, isAdminRole } from '../../utils/rbac';
import { Course, User, Question } from '../../types';
import {
  Search,
  BookOpen,
  Users,
  FileQuestion,
  Award,
  X,
  ArrowRight,
  Sparkles,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { generateCertificateCode } from '../../utils/certificate';

interface AdminGlobalSearchProps {
  onNavigate: (view: string, param?: string) => void;
  className?: string;
}

export const AdminGlobalSearch: React.FC<AdminGlobalSearchProps> = ({
  onNavigate,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmed = query.trim().toLowerCase();

  const searchResults = React.useMemo(() => {
    if (!trimmed) {
      return { courses: [], users: [], questions: [], total: 0 };
    }

    const allCourses = storage.getCourses(true);
    const allUsers = storage.getUsers();
    const allQuestions = storage.getQuestions();
    const allEnrollments = storage.getEnrollments();

    const matchedCourses = allCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(trimmed) ||
        c.instructorName.toLowerCase().includes(trimmed) ||
        (c.categoryName && c.categoryName.toLowerCase().includes(trimmed)) ||
        (c.description && c.description.toLowerCase().includes(trimmed))
    );

    const matchedUsers = allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(trimmed) ||
        u.email.toLowerCase().includes(trimmed) ||
        u.role.toLowerCase().includes(trimmed)
    );

    const matchedQuestions = allQuestions.filter(
      (q) =>
        q.title.toLowerCase().includes(trimmed) ||
        (q.explanation && q.explanation.toLowerCase().includes(trimmed)) ||
        q.options.some((opt) => opt.toLowerCase().includes(trimmed))
    );

    const matchedCertificates = allEnrollments
      .map((enr) => {
        const c = allCourses.find((course) => course.id === enr.courseId);
        if (!c) return null;
        const u = allUsers.find((user) => user.id === enr.userId);
        const certCode = generateCertificateCode(c.id, u?.id || enr.userId);

        const codeMatch = certCode.toLowerCase().includes(trimmed);
        const nameMatch = u?.name.toLowerCase().includes(trimmed);
        const courseMatch = c.title.toLowerCase().includes(trimmed);

        if (codeMatch || (trimmed.startsWith('tdsn') && (nameMatch || courseMatch))) {
          return {
            certCode,
            studentName: u?.name || '익명 수강생',
            studentEmail: u?.email || '',
            courseTitle: c.title,
            courseId: c.id,
            isCompleted: Boolean(enr.completedAt || enr.progressPercentage >= 100),
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const total =
      matchedCourses.length +
      matchedUsers.length +
      matchedQuestions.length +
      matchedCertificates.length;

    return {
      courses: matchedCourses.slice(0, 5),
      users: matchedUsers.slice(0, 5),
      questions: matchedQuestions.slice(0, 5),
      certificates: matchedCertificates.slice(0, 5),
      total,
    };
  }, [trimmed]);

  const handleSelectCourse = (courseId: string) => {
    onNavigate('admin-courses-edit', courseId);
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectUser = () => {
    onNavigate('admin-users');
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectQuestion = (courseId?: string) => {
    if (courseId) {
      onNavigate('admin-questions', courseId);
    } else {
      onNavigate('admin-questions');
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectCertificate = (certCode: string) => {
    onNavigate('admin-certificates', certCode);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Bar Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          id="input-admin-global-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="통합 검색: 강의명, 수강생, 출제 시험, 수료증 번호(TDSN-...)..."
          className="w-full pl-10 pr-10 py-2.5 text-xs bg-white text-slate-800 placeholder:text-slate-400 border border-slate-200/90 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 pointer-events-none">
            통합 탐색
          </span>
        )}
      </div>

      {/* Floating Results Popover */}
      {isOpen && trimmed.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 max-h-[420px] overflow-y-auto divide-y divide-slate-100 animate-fadeIn text-xs">
          {/* Summary Header */}
          <div className="p-3 bg-slate-50/80 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700">
              '{query}' 검색 결과 총 <strong className="text-indigo-600 font-black">{searchResults.total}건</strong>
            </span>
            <span className="text-[10px] text-slate-400">항목을 클릭하면 해당 관리 페이지로 이동합니다</span>
          </div>

          {searchResults.total === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <p className="font-semibold text-slate-600">검색 결과가 없습니다.</p>
              <p className="text-[11px]">강의명, 강사명, 사용자 이메일 또는 문제 키워드로 다시 검색해보세요.</p>
            </div>
          ) : (
            <>
              {/* Group 1: Courses */}
              {searchResults.courses.length > 0 && (
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>강의 ({searchResults.courses.length})</span>
                  </div>
                  <div className="space-y-1">
                    {searchResults.courses.map((course) => (
                      <div
                        key={course.id}
                        onClick={() => handleSelectCourse(course.id)}
                        className="p-2.5 rounded-xl hover:bg-indigo-50/60 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {course.title}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>강사: {course.instructorName}</span>
                            <span>·</span>
                            <span>수강생 {course.enrolledCount}명</span>
                            <span>·</span>
                            <span>{course.categoryName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={course.isPublished ? 'success' : 'neutral'} size="sm">
                            {course.isPublished ? '공개 중' : '비공개'}
                          </Badge>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group 2: Users */}
              {searchResults.users.length > 0 && (
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>사용자 및 강사 ({searchResults.users.length})</span>
                  </div>
                  <div className="space-y-1">
                    {searchResults.users.map((u) => (
                      <div
                        key={u.id}
                        onClick={handleSelectUser}
                        className="p-2.5 rounded-xl hover:bg-purple-50/60 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors flex items-center gap-2">
                            <span>{u.name}</span>
                            <span className="text-[10px] font-semibold text-slate-400">{u.email}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            계정 생성: {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={
                              isServiceOwner(u.role)
                                ? 'purple'
                                : isAdminRole(u.role)
                                ? 'primary'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {getRoleLabel(u.role)}
                          </Badge>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group 3: Questions */}
              {searchResults.questions.length > 0 && (
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <FileQuestion className="w-3.5 h-3.5 text-amber-600" />
                    <span>출제 문항 및 퀴즈 ({searchResults.questions.length})</span>
                  </div>
                  <div className="space-y-1">
                    {searchResults.questions.map((q) => (
                      <div
                        key={q.id}
                        onClick={() => handleSelectQuestion(q.courseId)}
                        className="p-2.5 rounded-xl hover:bg-amber-50/60 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                            {q.title}
                          </div>
                          {q.explanation && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              해설: {q.explanation}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="amber" size="sm">
                            {q.type} ({q.points}점)
                          </Badge>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group 4: Certificates */}
              {searchResults.certificates.length > 0 && (
                <div className="p-3 space-y-2 bg-indigo-50/30">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>수료증 및 인증번호 ({searchResults.certificates.length})</span>
                  </div>
                  <div className="space-y-1">
                    {searchResults.certificates.map((cert) => (
                      <div
                        key={cert.certCode}
                        onClick={() => handleSelectCertificate(cert.certCode)}
                        className="p-2.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-indigo-700 tracking-wider">
                              {cert.certCode}
                            </span>
                            {cert.isCompleted ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                수료 완료
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                학습 중
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate mt-0.5">
                            수강생: <strong>{cert.studentName}</strong> ({cert.studentEmail}) · {cert.courseTitle}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-indigo-600 font-semibold group-hover:underline">
                            조회하기
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
