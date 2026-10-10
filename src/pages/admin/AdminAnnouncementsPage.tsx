import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Pin,
  Calendar,
  BookOpen,
  CheckCircle2,
  X,
  AlertCircle,
  Clock,
  Send,
  Eye,
  EyeOff,
  Globe,
  Sparkles,
  Shield,
  Layers,
  ArrowRight,
  RotateCcw,
  Cloud,
  ChevronRight,
} from 'lucide-react';
import { Course, CourseAnnouncement, SystemAnnouncement, UserRole } from '../../types';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { VerifiedBadge } from '../../components/common/VerifiedBadge';
import { AnnouncementDetailModal } from '../../components/common/AnnouncementDetailModal';

interface AdminAnnouncementsPageProps {
  onNavigate?: (view: string, param?: string) => void;
}

type AnnouncementTab = 'system' | 'courses';
type PriorityFilter = 'all' | 'urgent' | 'important' | 'normal';

export const AdminAnnouncementsPage: React.FC<AdminAnnouncementsPageProps> = ({ onNavigate }) => {
  const { user, isSuperAdmin } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AnnouncementTab>('system');

  // Courses and Course Announcements state
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseAnnouncements, setCourseAnnouncements] = useState<CourseAnnouncement[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<PriorityFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // System-wide announcements state
  const [systemAnnouncements, setSystemAnnouncements] = useState<SystemAnnouncement[]>([]);

  // Detail Modal State
  const [detailModalAnnouncement, setDetailModalAnnouncement] = useState<
    (Partial<SystemAnnouncement> & Partial<CourseAnnouncement>) | null
  >(null);
  const [detailModalCourseTitle, setDetailModalCourseTitle] = useState<string | undefined>(undefined);

  // System Announcement Create/Edit Modal State
  const [isSysModalOpen, setIsSysModalOpen] = useState<boolean>(false);
  const [editingSysId, setEditingSysId] = useState<string | null>(null);
  const [sysTitle, setSysTitle] = useState<string>('');
  const [sysContent, setSysContent] = useState<string>('');
  const [sysPriority, setSysPriority] = useState<'normal' | 'important' | 'urgent'>('important');
  const [sysIsActive, setSysIsActive] = useState<boolean>(true);

  // Course Announcement Create/Edit Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState<boolean>(false);
  const [editingCourseAnnId, setEditingCourseAnnId] = useState<string | null>(null);
  const [formCourseId, setFormCourseId] = useState<string>('');
  const [formCourseTitle, setFormCourseTitle] = useState<string>('');
  const [formCourseContent, setFormCourseContent] = useState<string>('');
  const [formIsPinned, setFormIsPinned] = useState<boolean>(false);

  // Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    type: 'system' | 'course';
    id: string;
    title: string;
  } | null>(null);

  // Load / Refresh Data
  const refreshData = () => {
    const loadedCourses = storage.getCourses(true);
    setCourses(loadedCourses);
    const loadedCourseAnnouncements = storage.getCourseAnnouncements();
    setCourseAnnouncements(loadedCourseAnnouncements);
    const loadedSysAnnouncements = storage.getSystemAnnouncements();
    setSystemAnnouncements(loadedSysAnnouncements);
  };

  useEffect(() => {
    refreshData();

    const handleAnnouncementChange = () => {
      refreshData();
    };

    window.addEventListener('tdsnt_announcement_change', handleAnnouncementChange);
    window.addEventListener('storage', handleAnnouncementChange);

    return () => {
      window.removeEventListener('tdsnt_announcement_change', handleAnnouncementChange);
      window.removeEventListener('storage', handleAnnouncementChange);
    };
  }, []);

  const dispatchAnnouncementEvent = () => {
    window.dispatchEvent(new Event('tdsnt_announcement_change'));
    window.dispatchEvent(new Event('storage'));
  };

  // Currently Active System Announcement (for preview)
  const activeSystemAnnouncement = useMemo(() => {
    return systemAnnouncements.find((a) => a.isActive) || null;
  }, [systemAnnouncements]);

  const courseMap = useMemo(() => {
    const map: Record<string, Course> = {};
    courses.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [courses]);

  // Filtered Course Announcements
  const filteredCourseAnnouncements = useMemo(() => {
    return courseAnnouncements.filter((item) => {
      const matchesCourse = selectedCourseFilter === 'all' || item.courseId === selectedCourseFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.authorName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCourse && matchesSearch;
    });
  }, [courseAnnouncements, selectedCourseFilter, searchQuery]);

  // Filtered System Announcements
  const filteredSystemAnnouncements = useMemo(() => {
    return systemAnnouncements.filter((a) => {
      const matchesPriority =
        selectedPriorityFilter === 'all' || (a.priority || 'normal') === selectedPriorityFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        a.title.toLowerCase().includes(query) ||
        a.content.toLowerCase().includes(query) ||
        a.authorName.toLowerCase().includes(query);
      return matchesPriority && matchesSearch;
    });
  }, [systemAnnouncements, selectedPriorityFilter, searchQuery]);

  // ================= SYSTEM ANNOUNCEMENT CRUD =================

  const handleOpenCreateSystem = () => {
    setEditingSysId(null);
    setSysTitle('');
    setSysContent('');
    setSysPriority('important');
    setSysIsActive(true);
    setIsSysModalOpen(true);
  };

  const handleOpenEditSystem = (ann: SystemAnnouncement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSysId(ann.id);
    setSysTitle(ann.title);
    setSysContent(ann.content);
    setSysPriority(ann.priority || 'normal');
    setSysIsActive(ann.isActive);
    setIsSysModalOpen(true);
  };

  const handleApplyPreset = (presetText: string, presetTitle: string, priority: 'normal' | 'important' | 'urgent') => {
    setSysTitle(presetTitle);
    setSysContent(presetText);
    setSysPriority(priority);
  };

  const handleSaveSystemAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sysTitle.trim()) {
      showToast('공지 제목을 입력해주세요.', 'warning', '입력 필요');
      return;
    }
    if (!sysContent.trim()) {
      showToast('공지 본문 내용을 입력해주세요.', 'warning', '입력 필요');
      return;
    }

    const payload: SystemAnnouncement = {
      id: editingSysId || `sys_ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: sysTitle.trim(),
      content: sysContent.trim(),
      priority: sysPriority,
      isActive: sysIsActive,
      createdAt: editingSysId
        ? systemAnnouncements.find((a) => a.id === editingSysId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: editingSysId ? new Date().toISOString() : undefined,
      authorName: user?.name || '운영진',
      authorRole: (user?.role as UserRole) || 'SUPER_ADMIN',
    };

    storage.saveSystemAnnouncement(payload);
    refreshData();
    dispatchAnnouncementEvent();
    setIsSysModalOpen(false);

    showToast(
      editingSysId ? '전사 공지사항이 수정되었습니다.' : '신규 전사 공지사항이 등록되었습니다.',
      'success',
      '전사 공지 관리'
    );
  };

  const handleToggleSystemActive = (id: string, currentActive: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    storage.toggleSystemAnnouncementActive(id, !currentActive);
    refreshData();
    dispatchAnnouncementEvent();
    showToast(
      !currentActive ? '선택한 공지사항이 메인 포털 상단에 게시되었습니다.' : '공지사항 게시가 중단되었습니다.',
      'info',
      '게시 상태 변경'
    );
  };

  const handleDeleteSystemAnnouncement = (id: string) => {
    storage.deleteSystemAnnouncement(id);
    refreshData();
    dispatchAnnouncementEvent();
    setDeleteModalState(null);
    showToast('전사 공지사항이 삭제되었습니다.', 'info', '삭제 완료');
  };

  // ================= COURSE ANNOUNCEMENT CRUD =================

  const handleOpenCreateCourse = () => {
    setEditingCourseAnnId(null);
    setFormCourseId(courses[0]?.id || '');
    setFormCourseTitle('');
    setFormCourseContent('');
    setFormIsPinned(false);
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (ann: CourseAnnouncement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCourseAnnId(ann.id);
    setFormCourseId(ann.courseId);
    setFormCourseTitle(ann.title);
    setFormCourseContent(ann.content);
    setFormIsPinned(!!ann.isPinned);
    setIsCourseModalOpen(true);
  };

  const handleToggleCoursePin = (ann: CourseAnnouncement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated: CourseAnnouncement = {
      ...ann,
      isPinned: !ann.isPinned,
      updatedAt: new Date().toISOString(),
    };
    storage.saveCourseAnnouncement(updated);
    refreshData();
    dispatchAnnouncementEvent();
    showToast(
      !ann.isPinned ? '강의 공지가 상단에 고정되었습니다.' : '상단 고정이 해제되었습니다.',
      'info',
      '상단 고정 관리'
    );
  };

  const handleSaveCourseAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCourseId) {
      showToast('공지를 등록할 강의를 선택해주세요.', 'warning');
      return;
    }
    if (!formCourseTitle.trim()) {
      showToast('공지사항 제목을 입력해주세요.', 'warning');
      return;
    }
    if (!formCourseContent.trim()) {
      showToast('공지사항 본문 내용을 입력해주세요.', 'warning');
      return;
    }

    const payload: CourseAnnouncement = {
      id: editingCourseAnnId || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      courseId: formCourseId,
      title: formCourseTitle.trim(),
      content: formCourseContent.trim(),
      authorName: user?.name || 'TDSN 아카데미 운영진',
      authorRole: (user?.role as UserRole) || 'ADMIN',
      createdAt: editingCourseAnnId
        ? courseAnnouncements.find((a) => a.id === editingCourseAnnId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: editingCourseAnnId ? new Date().toISOString() : undefined,
      isPinned: formIsPinned,
    };

    storage.saveCourseAnnouncement(payload);
    refreshData();
    setIsCourseModalOpen(false);
    showToast(
      editingCourseAnnId ? '강의 공지사항이 수정되었습니다.' : '새 강의 공지사항이 성공적으로 등록되었습니다.',
      'success',
      '공지 관리'
    );
  };

  const handleDeleteCourseAnnouncement = (id: string) => {
    storage.deleteCourseAnnouncement(id);
    refreshData();
    setDeleteModalState(null);
    showToast('강의 공지사항이 삭제되었습니다.', 'info', '삭제 완료');
  };

  const handleCardClick = (item: SystemAnnouncement | CourseAnnouncement, type: 'system' | 'course') => {
    if (type === 'system') {
      setDetailModalAnnouncement(item);
      setDetailModalCourseTitle(undefined);
    } else {
      const course = courseMap[(item as CourseAnnouncement).courseId];
      setDetailModalAnnouncement(item);
      setDetailModalCourseTitle(course?.title);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  공지사항 통합 관리 센터
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Cloud className="w-3 h-3 text-emerald-600" />
                  <span>실시간 클라우드 동기화</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                수강생 포털 최상단에 노출되는 <strong>전사 메인 공지</strong>와 개별 과정별 <strong>강의 공지</strong>를 통합 제어합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'system' ? (
            <button
              type="button"
              id="btn-create-sys-announcement"
              onClick={handleOpenCreateSystem}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>전사 공지 등록</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-create-course-announcement"
              onClick={handleOpenCreateCourse}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>강의 공지 등록</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'system'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>전사 시스템 공지사항</span>
          <span
            className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'system' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {systemAnnouncements.length}건
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('courses')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'courses'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>강의별 공지사항</span>
          <span
            className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'courses' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {courseAnnouncements.length}건
          </span>
        </button>
      </div>

      {/* ================= TAB 1: SYSTEM ANNOUNCEMENTS ================= */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Executive Active Banner Preview & Management Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    activeSystemAnnouncement ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                  }`}
                />
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  메인 포털 실시간 상단 배너 상태
                </h2>
              </div>

              {activeSystemAnnouncement ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    실시간 메인 포털 게시 중
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleSystemActive(activeSystemAnnouncement.id, true)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    게시 끄기
                  </button>
                </div>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                  현재 게시된 공지 없음 (배너 미노출)
                </span>
              )}
            </div>

            {/* Live Banner View Simulation */}
            {activeSystemAnnouncement ? (
              <div
                onClick={() => handleCardClick(activeSystemAnnouncement, 'system')}
                className="group relative rounded-2xl overflow-hidden border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            activeSystemAnnouncement.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : activeSystemAnnouncement.priority === 'important'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                          }`}
                        >
                          {activeSystemAnnouncement.priority === 'urgent'
                            ? '긴급 공지'
                            : activeSystemAnnouncement.priority === 'important'
                            ? '중요 공지'
                            : '사내 공지'}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {activeSystemAnnouncement.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1 leading-relaxed">
                        {activeSystemAnnouncement.content}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditSystem(activeSystemAnnouncement, e)}
                      className="py-1.5 px-3 bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs cursor-pointer transition-colors"
                    >
                      편집
                    </button>
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-indigo-600 flex items-center gap-0.5">
                      <span>전문 보기</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
                <Megaphone className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">현재 수강생 홈 화면 상단에 게시 중인 공지가 없습니다.</p>
                <p className="text-[11px] text-slate-500">
                  아래 공지 목록에서 원하는 항목의 [메인 게시]를 누르거나 새 공지를 등록하세요.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateSystem}
                  className="mt-1 py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors"
                >
                  새 전사 공지 등록하기
                </button>
              </div>
            )}
          </div>

          {/* Search & Priority Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="공지 제목, 본문, 작성자 검색..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
                {[
                  { id: 'all', label: '전체' },
                  { id: 'urgent', label: '긴급' },
                  { id: 'important', label: '중요' },
                  { id: 'normal', label: '일반' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedPriorityFilter(f.id as any)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      selectedPriorityFilter === f.id
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium shrink-0">
              검색 결과: <strong className="text-indigo-600 font-bold">{filteredSystemAnnouncements.length}건</strong>
            </div>
          </div>

          {/* System Announcements List */}
          {filteredSystemAnnouncements.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">등록된 전사 공지사항이 없습니다</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                새로운 공지를 등록하여 모든 수강생에게 학습 일정이나 중요 변경 사항을 전달하세요.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateSystem}
                className="mt-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                신규 전사 공지 등록하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredSystemAnnouncements.map((item) => {
                const isUrgent = item.priority === 'urgent';
                const isImportant = item.priority === 'important';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item, 'system')}
                    className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-2xs transition-all space-y-3.5 cursor-pointer relative overflow-hidden ${
                      item.isActive
                        ? 'border-indigo-300 ring-2 ring-indigo-500/10'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Left Priority Border Indicator */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        item.isActive
                          ? 'bg-emerald-500'
                          : isUrgent
                          ? 'bg-rose-500'
                          : isImportant
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                      }`}
                    />

                    {/* Top Row: Meta & Quick Actions */}
                    <div className="flex items-start justify-between gap-3 pl-1">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Active Status Badge */}
                          {item.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>메인 포털 게시 중</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium">
                              <EyeOff className="w-3 h-3" />
                              <span>보관됨</span>
                            </span>
                          )}

                          {/* Priority Badge */}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${
                              isUrgent
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isImportant
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isUrgent ? '긴급 공지' : isImportant ? '중요 공지' : '일반 안내'}
                          </span>

                          <span aria-hidden="true" className="text-slate-300">·</span>

                          {/* Author & Date metadata */}
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <strong className="text-slate-700">{item.authorName}</strong>
                            <VerifiedBadge role={item.authorRole} size="xs" showLabel />
                          </span>

                          <span aria-hidden="true" className="text-slate-300">·</span>

                          <span className="text-xs text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug tracking-tight hover:text-indigo-600 transition-colors">
                          {item.title}
                        </h3>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Toggle Active Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleSystemActive(item.id, item.isActive, e)}
                          className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                            item.isActive
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {item.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{item.isActive ? '게시 중단' : '메인 게시'}</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditSystem(item, e)}
                          className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
                          title="공지 수정"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalState({
                              type: 'system',
                              id: item.id,
                              title: item.title,
                            });
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
                          title="공지 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Announcement Content Snippet */}
                    <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed line-clamp-2 pl-3.5 border border-slate-100/90 font-normal">
                      {item.content}
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 pl-1">
                      <span>클릭하여 공지 전문 읽기</span>
                      <span className="font-bold text-indigo-600 hover:underline flex items-center gap-0.5">
                        <span>자세히 보기</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: COURSE ANNOUNCEMENTS ================= */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="강의 공지 제목, 내용 검색..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Course Selector Dropdown */}
              <div className="relative">
                <select
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                  className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">전체 강의 ({courseAnnouncements.length})</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500 w-full md:w-auto text-right font-medium">
              총 <strong className="text-indigo-600 font-bold">{filteredCourseAnnouncements.length}</strong>건의 강의 공지
            </div>
          </div>

          {/* Course Announcements List */}
          {filteredCourseAnnouncements.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">등록된 강의 공지사항이 없습니다</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {selectedCourseFilter !== 'all'
                  ? '선택하신 강의에 등록된 공지가 없습니다. 새 공지사항을 등록하여 수강생에게 학습 내용을 안내하세요.'
                  : '등록된 강의 공지사항이 없습니다. 신규 강의 공지 등록 버튼을 눌러 과정을 선택하고 작성할 수 있습니다.'}
              </p>
              <button
                type="button"
                onClick={handleOpenCreateCourse}
                className="mt-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                강의 공지사항 등록하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredCourseAnnouncements.map((item) => {
                const targetCourse = courseMap[item.courseId];

                return (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item, 'course')}
                    className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-2xs transition-all space-y-3.5 cursor-pointer relative overflow-hidden ${
                      item.isPinned
                        ? 'border-amber-300 ring-2 ring-amber-500/10'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Left Accent Bar */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        item.isPinned ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                    />

                    {/* Top Row: Meta & Quick Actions */}
                    <div className="flex items-start justify-between gap-3 pl-1">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Pin Status Badge */}
                          {item.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                              <Pin className="w-3 h-3" />
                              <span>상단 고정</span>
                            </span>
                          )}

                          {/* Course Name Badge */}
                          <span className="inline-flex items-center gap-1 text-xs text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                            <BookOpen className="w-3 h-3 text-indigo-600" />
                            <span className="truncate max-w-[220px]">
                              {targetCourse ? targetCourse.title : '강의'}
                            </span>
                          </span>

                          <span aria-hidden="true" className="text-slate-300">·</span>

                          <span className="text-xs text-slate-500 font-medium">
                            <strong className="text-slate-700">{item.authorName}</strong>
                          </span>

                          <span aria-hidden="true" className="text-slate-300">·</span>

                          <span className="text-xs text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug tracking-tight hover:text-indigo-600 transition-colors">
                          {item.title}
                        </h3>
                      </div>

                      {/* Right Quick Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Toggle Pin Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleCoursePin(item, e)}
                          className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                            item.isPinned
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                          <span>{item.isPinned ? '고정 해제' : '상단 고정'}</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditCourse(item, e)}
                          className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
                          title="공지 수정"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalState({
                              type: 'course',
                              id: item.id,
                              title: item.title,
                            });
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
                          title="공지 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Announcement Content Snippet */}
                    <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed line-clamp-2 pl-3.5 border border-slate-100/90 font-normal">
                      {item.content}
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 pl-1">
                      <span>클릭하여 공지 전문 읽기</span>
                      <span className="font-bold text-indigo-600 hover:underline flex items-center gap-0.5">
                        <span>자세히 보기</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: SYSTEM ANNOUNCEMENT CREATE/EDIT ================= */}
      {isSysModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4.5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingSysId ? '전사 시스템 공지사항 수정' : '신규 전사 시스템 공지사항 등록'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    수강생 메인 홈 화면 최상단에 게시되며 실시간으로 클라우드에 동기화됩니다.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSysModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Template Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>추천 공지 템플릿 빠른 적용</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    title: '2026년 하반기 전사 역량 강화 필수 직무 교육과정 오픈',
                    text: '2026년 하반기 전사 역량 강화 필수 직무 교육과정이 오픈되었습니다. 각 부서별 지정 교육을 기한 내에 이수해 주시기 바랍니다.',
                    priority: 'important' as const,
                  },
                  {
                    title: '2026년 법정의무교육 이수 기한 및 수강 안내',
                    text: '2026년 법정의무교육(개인정보보호, 직장 내 성희롱 예방 등) 수강 기한이 이달 말까지입니다. 전 임직원은 반드시 수료를 완료하시기 바랍니다.',
                    priority: 'urgent' as const,
                  },
                  {
                    title: 'TDSNTLMS 플랫폼 정기 시스템 점검 안내',
                    text: '안정적인 학습 서비스 제공을 위해 이번 주말 심야(토 02:00~06:00) 정기 서버 점검이 진행될 예정입니다. 이용에 참고 부탁드립니다.',
                    priority: 'normal' as const,
                  },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset.text, preset.title, preset.priority)}
                    className="py-1 px-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    {preset.title.slice(0, 15)}...
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveSystemAnnouncement} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">공지 제목 *</label>
                  <span className="text-[11px] text-slate-400">{sysTitle.length} / 60자</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={sysTitle}
                  onChange={(e) => setSysTitle(e.target.value)}
                  placeholder="예: 2026년 TDSNTLMS 온라인 실무 역량 강화 교육과정 오픈"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Priority Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">공지 중요도</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'normal', label: '일반 안내', color: 'border-slate-300 text-slate-700' },
                    { id: 'important', label: '중요 공지', color: 'border-amber-400 text-amber-800 bg-amber-50/60' },
                    { id: 'urgent', label: '긴급 공지', color: 'border-rose-400 text-rose-800 bg-rose-50/60' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSysPriority(p.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        sysPriority === p.id
                          ? `${p.color} ring-2 ring-indigo-500/30 font-black shadow-xs`
                          : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">공지 본문 내용 *</label>
                  <span className="text-[11px] text-slate-400">{sysContent.length} / 500자</span>
                </div>
                <textarea
                  rows={4}
                  required
                  maxLength={500}
                  value={sysContent}
                  onChange={(e) => setSysContent(e.target.value)}
                  placeholder="수강생 포털 메인 상단 배너 및 상세 모달에 노출될 공지 문구를 명확하게 입력하세요."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-medium"
                />
              </div>

              {/* Active Toggle */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">메인 포털 상단 배너에 즉시 게시</div>
                  <div className="text-[11px] text-slate-500">
                    체크 시 메인 페이지 최상단에 즉시 노출되며 다른 공지는 보관 상태로 전환됩니다.
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="chk-sys-active"
                  checked={sysIsActive}
                  onChange={(e) => setSysIsActive(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSysModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{editingSysId ? '수정 사항 저장' : '공지사항 등록 및 게시'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: COURSE ANNOUNCEMENT CREATE/EDIT ================= */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4.5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingCourseAnnId ? '강의 공지사항 수정' : '신규 강의 공지사항 등록'}
                  </h2>
                  <p className="text-[11px] text-slate-500">선택한 강의의 상세 화면에 실시간으로 표시됩니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCourseModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourseAnnouncement} className="space-y-4">
              {/* Select Course */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">대상 강의 선택 *</label>
                <select
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">공지 제목 *</label>
                  <span className="text-[11px] text-slate-400">{formCourseTitle.length} / 60자</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={formCourseTitle}
                  onChange={(e) => setFormCourseTitle(e.target.value)}
                  placeholder="예: 2주차 과제 제출 기한 연장 및 보강 영상 업로드 안내"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">공지 본문 내용 *</label>
                  <span className="text-[11px] text-slate-400">{formCourseContent.length} / 500자</span>
                </div>
                <textarea
                  rows={4}
                  required
                  maxLength={500}
                  value={formCourseContent}
                  onChange={(e) => setFormCourseContent(e.target.value)}
                  placeholder="수강생들에게 안내할 공지 내용을 명확하게 작성하세요."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-medium"
                />
              </div>

              {/* Pin to Top Toggle */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-amber-600" />
                    <span>강의 페이지 최상단 고정 (중요 공지)</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    체크 시 강의실 목록 상단에 하이라이트 배너 형태로 고정 노출됩니다.
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="chk-course-pinned"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{editingCourseAnnId ? '수정 사항 저장' : '강의 공지사항 등록'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deleteModalState && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 my-auto">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">공지사항 삭제</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                정말 <strong>"{deleteModalState.title}"</strong> 공지를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalState(null)}
                className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteModalState.type === 'system') {
                    handleDeleteSystemAnnouncement(deleteModalState.id);
                  } else {
                    handleDeleteCourseAnnouncement(deleteModalState.id);
                  }
                }}
                className="py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ANNOUNCEMENT DETAIL VIEW ================= */}
      <AnnouncementDetailModal
        isOpen={Boolean(detailModalAnnouncement)}
        onClose={() => setDetailModalAnnouncement(null)}
        announcement={detailModalAnnouncement}
        courseTitle={detailModalCourseTitle}
        onEdit={
          detailModalAnnouncement?.id
            ? () => {
                if (detailModalCourseTitle) {
                  // It's a course announcement
                  const ann = courseAnnouncements.find((a) => a.id === detailModalAnnouncement.id);
                  if (ann) handleOpenEditCourse(ann);
                } else {
                  // It's a system announcement
                  const ann = systemAnnouncements.find((a) => a.id === detailModalAnnouncement.id);
                  if (ann) handleOpenEditSystem(ann);
                }
              }
            : undefined
        }
      />
    </div>
  );
};
