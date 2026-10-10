import React, { useState } from 'react';
import { storage } from '../../services/storage';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { ProgressBar } from '../common/ProgressBar';
import { Search, Award, BookOpen, Clock, CheckCircle2, UserCheck, Eye, Copy, Check } from 'lucide-react';
import { generateCertificateCode } from '../../utils/certificate';
import { CourseCompletionModal } from '../student/CourseCompletionModal';

export const StudentAnalyticsTable: React.FC = () => {
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedForCert, setSelectedForCert] = useState<{
    course: any;
    user: any;
    totalLessons: number;
    certCode?: string;
    issueDate?: string;
    progressPercentage?: number;
  } | null>(null);
  const enrollments = storage.getEnrollments();
  const users = storage.getUsers();
  const courses = storage.getCourses(true);

  const enrichedData = enrollments.map((enr) => {
    const student = users.find((u) => u.id === enr.userId);
    const course = courses.find((c) => c.id === enr.courseId);
    const progressList = storage.getProgressList(enr.userId, enr.courseId);
    const completedLessons = progressList.filter((p) => p.isCompleted).length;
    const lessons = storage.getLessons(enr.courseId);
    const lastLesson = lessons.find((l) => l.id === enr.lastLessonId);
    const certCode = course ? generateCertificateCode(course.id, enr.userId) : '';

    return {
      ...enr,
      certCode,
      courseObj: course,
      userObj: student,
      studentName: student?.name || '익명 수강생',
      studentEmail: student?.email || 'unknown@tdsnt.kr',
      studentAvatar: student?.avatar,
      courseTitle: course?.title || '강의 정보 없음',
      totalLessons: lessons.length,
      completedLessons,
      lastLessonTitle: lastLesson?.title || '학습 시작 전',
    };
  });

  const filtered = enrichedData.filter(
    (item) =>
      item.studentName.toLowerCase().includes(search.toLowerCase()) ||
      item.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
      item.courseTitle.toLowerCase().includes(search.toLowerCase()) ||
      item.certCode.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header & Filter */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">수강생 학습 진도 및 기록</h3>
          <p className="text-xs text-slate-500">강의별 수강생의 실시간 진도율과 최근 학습 위치를 조회합니다.</p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="수강생, 강의명, 인증번호(TDSN-...) 검색"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Mobile Card List View (< md) */}
      <div className="block md:hidden divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            수강 기록이 없습니다.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={`mobile-enr-${item.id}`} className="p-4 space-y-3 bg-white">
              {/* Header: Student & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={item.studentAvatar}
                    name={item.studentName}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">{item.studentName}</div>
                    <div className="text-[11px] text-slate-400 truncate">{item.studentEmail}</div>
                  </div>
                </div>

                <div className="shrink-0">
                  {item.progressPercentage === 100 ? (
                    <Badge variant="success" size="sm">
                      <CheckCircle2 className="w-3 h-3" /> 이수 완료
                    </Badge>
                  ) : (
                    <Badge variant="primary" size="sm">
                      학습 중
                    </Badge>
                  )}
                </div>
              </div>

              {/* Course Title */}
              <div className="text-xs font-semibold text-slate-800 line-clamp-2">
                {item.courseTitle}
              </div>

              {/* Progress & Lessons */}
              <div className="space-y-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <span>진도율 ({item.completedLessons}/{item.totalLessons}강)</span>
                  <span className="tabular-nums text-indigo-600 font-bold">{item.progressPercentage}%</span>
                </div>
                <ProgressBar
                  progress={item.progressPercentage}
                  size="sm"
                  variant={item.progressPercentage === 100 ? 'emerald' : 'indigo'}
                />
              </div>

              {/* Meta details */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                <span>최근 학습: <strong className="text-slate-700 font-medium">{item.lastLessonTitle}</strong></span>
                <span>신청일: {new Date(item.enrolledAt).toLocaleDateString('ko-KR')}</span>
              </div>

              {/* Certificate & Actions Row */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {item.certCode ? (
                  <button
                    type="button"
                    onClick={() => handleCopyCode(item.certCode)}
                    className="font-mono font-bold text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-200/70 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="수료증 인증번호 복사"
                  >
                    <span>{item.certCode}</span>
                    {copiedCode === item.certCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </button>
                ) : (
                  <span className="text-slate-400 text-xs">수료증 미발급</span>
                )}

                {item.courseObj && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedForCert({
                        course: item.courseObj,
                        user: item.userObj,
                        totalLessons: item.totalLessons,
                        certCode: item.certCode,
                        issueDate: item.completedAt || item.enrolledAt,
                        progressPercentage: item.progressPercentage,
                      })
                    }
                    className="min-h-[36px] py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>수료증 보기</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-semibold">수강생</th>
              <th className="py-3 px-4 font-semibold">수강 강의</th>
              <th className="py-3 px-4 font-semibold">수료증 인증번호</th>
              <th className="py-3 px-4 font-semibold">진도율</th>
              <th className="py-3 px-4 font-semibold">완료 차시</th>
              <th className="py-3 px-4 font-semibold">최근 학습 위치</th>
              <th className="py-3 px-4 font-semibold">신청일</th>
              <th className="py-3 px-4 font-semibold">상태</th>
              <th className="py-3 px-4 font-semibold text-right">수료증</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                  수강 기록이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={item.studentAvatar}
                        name={item.studentName}
                        size="sm"
                      />
                      <div>
                        <div className="font-bold text-slate-900">{item.studentName}</div>
                        <div className="text-[11px] text-slate-400">{item.studentEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900 line-clamp-1 max-w-[180px]" title={item.courseTitle}>
                      {item.courseTitle}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {item.certCode ? (
                      <button
                        type="button"
                        onClick={() => handleCopyCode(item.certCode)}
                        className="font-mono font-bold text-[11px] text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200/70 inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="수료증 인증번호 복사"
                      >
                        <span>{item.certCode}</span>
                        {copiedCode === item.certCode ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-indigo-400" />
                        )}
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 min-w-[130px]">
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        progress={item.progressPercentage}
                        size="sm"
                        variant={item.progressPercentage === 100 ? 'emerald' : 'indigo'}
                      />
                      <span className="font-bold text-slate-800 tabular-nums">{item.progressPercentage}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {item.completedLessons} / {item.totalLessons} 강
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 truncate max-w-[130px]" title={item.lastLessonTitle}>
                    {item.lastLessonTitle}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {new Date(item.enrolledAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="py-3.5 px-4">
                    {item.progressPercentage === 100 ? (
                      <Badge variant="success" size="sm">
                        <CheckCircle2 className="w-3 h-3" /> 이수 완료
                      </Badge>
                    ) : (
                      <Badge variant="primary" size="sm">
                        학습 중
                      </Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {item.courseObj ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedForCert({
                            course: item.courseObj,
                            user: item.userObj,
                            totalLessons: item.totalLessons,
                            certCode: item.certCode,
                            issueDate: item.completedAt || item.enrolledAt,
                            progressPercentage: item.progressPercentage,
                          })
                        }
                        className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="공식 수료증 보기"
                      >
                        <Eye className="w-3 h-3" />
                        <span>보기</span>
                      </button>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Certificate Viewer Modal */}
      {selectedForCert && (
        <CourseCompletionModal
          isOpen={Boolean(selectedForCert)}
          onClose={() => setSelectedForCert(null)}
          course={selectedForCert.course}
          lessonsCount={selectedForCert.totalLessons}
          user={selectedForCert.user}
          certificateCode={selectedForCert.certCode}
          issueDate={selectedForCert.issueDate}
          progressPercentage={selectedForCert.progressPercentage}
        />
      )}
    </div>
  );
};
