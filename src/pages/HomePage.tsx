import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { CourseCard } from '../components/student/CourseCard';
import { CourseCardSkeleton } from '../components/common/CourseCardSkeleton';
import { HeroBanner } from '../components/student/HeroBanner';
import { FloatingNav } from '../components/common/FloatingNav';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { AnnouncementBanner } from '../components/common/AnnouncementBanner';
import { EmptyState } from '../components/common/EmptyState';
import { LEGACY_CATEGORY_MAP, getCategoryById } from '../data/categoriesData';
import {
  BookOpen,
  PlayCircle,
  Clock,
  ArrowRight,
  PlusCircle,
  Video,
  Users,
  Layers,
  Sparkles,
  CheckCircle2,
  Heart,
  Filter,
  Loader2,
  Building2,
  ShieldCheck,
  Target,
  BrainCircuit,
  TrendingUp,
  ChevronRight,
  X,
  Search,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface HomePageProps {
  onNavigate: (view: string, param?: string) => void;
}

const COURSES_PER_PAGE = 12;

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedSubfield, setSelectedSubfield] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'rating'>('latest');
  const [showOnlyWishlist, setShowOnlyWishlist] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(COURSES_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const categories = storage.getCategories();
  const allCourses = storage.getCourses(false); // only published
  const userEnrollments = user ? storage.getEnrollments(user.id) : [];

  const loadWishlist = () => {
    if (user) {
      const items = storage.getWishlist(user.id);
      setWishlistIds(items.map((w) => w.courseId));
    } else {
      setWishlistIds([]);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, [user]);

  // Reset pagination count when filter criteria change
  useEffect(() => {
    setVisibleCount(COURSES_PER_PAGE);
  }, [selectedCategory, selectedSubcategory, selectedSubfield, searchQuery, selectedLevel, sortBy, showOnlyWishlist]);

  // Filter courses
  const filteredCourses = allCourses.filter((course) => {
    const courseCatId = LEGACY_CATEGORY_MAP[course.categoryId] || course.categoryId;
    const matchCategory = selectedCategory === 'all' || courseCatId === selectedCategory;

    // Subcategory matching
    const matchSubcategory =
      selectedSubcategory === 'all' ||
      course.subcategoryId === selectedSubcategory ||
      (course.subcategoryName && course.subcategoryName.includes(selectedSubcategory));

    // Subfield matching
    const matchSubfield =
      selectedSubfield === 'all' ||
      course.subfieldName === selectedSubfield ||
      (course.tags && course.tags.includes(selectedSubfield));

    const matchLevel = selectedLevel === 'all' || course.level === selectedLevel;
    const matchWishlist = !showOnlyWishlist || wishlistIds.includes(course.id);
    const q = searchQuery.trim().toLowerCase();

    // Check if query matches any category/subcategory/subfield keyword
    let matchesCategoryTaxonomy = false;
    if (q) {
      const matchedCat = getCategoryById(courseCatId);
      if (matchedCat) {
        if (matchedCat.name.toLowerCase().includes(q) || matchedCat.description.toLowerCase().includes(q)) {
          matchesCategoryTaxonomy = true;
        }
        if (
          matchedCat.subcategories?.some(
            (sub) =>
              sub.name.toLowerCase().includes(q) ||
              sub.subfields.some((field) => field.toLowerCase().includes(q))
          )
        ) {
          matchesCategoryTaxonomy = true;
        }
      }
    }

    const matchSearch =
      !q ||
      course.title.toLowerCase().includes(q) ||
      (course.shortDescription && course.shortDescription.toLowerCase().includes(q)) ||
      (course.description && course.description.toLowerCase().includes(q)) ||
      (course.instructorName && course.instructorName.toLowerCase().includes(q)) ||
      (course.categoryName && course.categoryName.toLowerCase().includes(q)) ||
      (course.subcategoryName && course.subcategoryName.toLowerCase().includes(q)) ||
      (course.subfieldName && course.subfieldName.toLowerCase().includes(q)) ||
      (course.tags && course.tags.some((t) => t.toLowerCase().includes(q))) ||
      matchesCategoryTaxonomy;

    return matchCategory && matchSubcategory && matchSubfield && matchLevel && matchSearch && matchWishlist;
  });

  // Sort
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === 'popular') return (b.enrolledCount || 0) - (a.enrolledCount || 0);
    if (sortBy === 'latest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  const visibleCourses = sortedCourses.slice(0, visibleCount);
  const hasMore = visibleCount < sortedCourses.length;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + COURSES_PER_PAGE);
      setIsLoadingMore(false);
    }, 250);
  };

  // In-progress enrollments for student Continue Learning tray
  const inProgressEnrollments = userEnrollments
    .map((enr) => ({
      enrollment: enr,
      course: allCourses.find((c) => c.id === enr.courseId),
    }))
    .filter((item) => item.course && item.enrollment.progressPercentage < 100);

  const primaryInProgress = inProgressEnrollments[0];

  // Specific corporate LMS category course subsets for curated homepage sections
  const companyAcademyCourses = allCourses.filter(
    (c) =>
      c.categoryId === 'company-academy' ||
      c.categoryId === 'in-house-academy' ||
      c.tags?.some((t) => ['온보딩', '조직문화', '신입사원', '사내교육', '핵심가치'].includes(t))
  );

  const mandatoryCourses = allCourses.filter(
    (c) =>
      c.subcategoryId === 'sub_acad_mandatory' ||
      c.tags?.some((t) => ['필수교육', '법정의무교육', '보안', '개인정보', '법정의무'].includes(t)) ||
      c.title.includes('필수') ||
      c.title.includes('법정의무')
  );

  const jobCompetencyCourses = allCourses.filter(
    (c) =>
      c.categoryId === 'job-competency' ||
      c.tags?.some((t) => ['직무역량', '커뮤니케이션', '보고서', '기획', '비즈니스'].includes(t))
  );

  const aiDataCourses = allCourses.filter(
    (c) =>
      c.categoryId === 'ai-data' ||
      c.tags?.some((t) => ['AI', 'ChatGPT', '데이터', '프롬프트', '생성형AI'].includes(t))
  );

  const isDefaultHomeView = selectedCategory === 'all' && !searchQuery && !showOnlyWishlist;

  const handleSelectCourse = (courseId: string) => {
    onNavigate('course-detail', courseId);
  };

  const handleContinueCourse = (courseId: string) => {
    const enr = userEnrollments.find((e) => e.courseId === courseId);
    const lessons = storage.getLessons(courseId);
    const targetLessonId = enr?.lastLessonId || (lessons[0] ? lessons[0].id : undefined);
    if (targetLessonId) {
      onNavigate('learn', `${courseId}/${targetLessonId}`);
    } else {
      onNavigate('course-detail', courseId);
    }
  };

  const handleWishlistToggle = (courseId: string) => {
    if (!user) return;
    const added = storage.toggleWishlist(user.id, courseId);
    loadWishlist();
    const targetCourse = allCourses.find((c) => c.id === courseId);
    showToast(
      added
        ? `'${targetCourse?.title || '강의'}'을(를) 관심 목록에 추가했습니다.`
        : `'${targetCourse?.title || '강의'}'을(를) 관심 목록에서 제거했습니다.`,
      added ? 'success' : 'info'
    );
  };

  const handleFocusSearch = () => {
    const input = document.getElementById('hero-search-input');
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="lms-container py-4 sm:py-6 space-y-6 sm:space-y-7 relative min-w-0">
      {/* Desktop Floating Navigation & Quick Action Widget */}
      <FloatingNav
        onNavigate={onNavigate}
        onFocusSearch={handleFocusSearch}
        onFilterWishlist={() => setShowOnlyWishlist((prev) => !prev)}
        isWishlistFilterActive={showOnlyWishlist}
      />

      {/* System Announcement Banner (with Operator In-Place Editing) */}
      <AnnouncementBanner />

      {/* Hero Banner (with Search Autocomplete & Dynamic Messaging) */}
      <HeroBanner
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedSubcategory={selectedSubcategory}
        onSelectSubcategory={setSelectedSubcategory}
        selectedSubfield={selectedSubfield}
        onSelectSubfield={setSelectedSubfield}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCoursesCount={allCourses.length}
        userName={user?.name}
        userId={user?.id}
        isAuthenticated={isAuthenticated}
        hasInProgressCourse={!!primaryInProgress?.course}
        onContinueLearning={() => primaryInProgress && handleContinueCourse(primaryInProgress.course!.id)}
        allCourses={allCourses}
        onSelectCourse={handleSelectCourse}
      />

      {/* Admin Quick Menu (Strictly visible ONLY to Admins) */}
      {isAdmin && (
        <section
          id="section-admin-quick"
          className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">관리자 빠른 작업</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('admin-dashboard')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1"
            >
              <span>관리자 콘솔 전체보기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {/* 1. 강의 관리 */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">강의 관리</h3>
                  <p className="text-xs text-slate-500 pt-1 leading-relaxed">
                    강의를 등록하고 커리큘럼 및 공개 상태를 관리하세요.
                  </p>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('admin-courses')}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer text-center"
                >
                  강의 관리 바로가기
                </button>
              </div>
            </div>

            {/* 2. 영상 관리 */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">영상 및 차시 관리</h3>
                  <p className="text-xs text-slate-500 pt-1 leading-relaxed">
                    강의 영상을 업로드하거나 URL 링크를 등록·수정하세요.
                  </p>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('admin-courses')}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer text-center"
                >
                  영상 관리 바로가기
                </button>
              </div>
            </div>

            {/* 3. 수강생 관리 */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">수강생 및 진도 관리</h3>
                  <p className="text-xs text-slate-500 pt-1 leading-relaxed">
                    학습자의 실시간 진도율과 수강 현황을 모니터링하세요.
                  </p>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('admin-users')}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer text-center"
                >
                  수강생 관리 바로가기
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 1: 이어서 학습하기 (Shown ONLY if logged-in student has actual in-progress data) */}
      {isAuthenticated && primaryInProgress?.course && isDefaultHomeView && (
        <section
          id="section-continue-learning"
          className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-indigo-600" />
              <span>이어서 학습하기</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
            >
              <span>내 학습방 전체</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-xl p-4 sm:p-5 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2 flex-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-indigo-600 px-2 py-0.5 rounded text-white">
                  {primaryInProgress.course.categoryName || '강의'}
                </span>
                <span className="text-xs text-indigo-300">
                  {primaryInProgress.course.instructorName || '강사'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                {primaryInProgress.course.title}
              </h3>
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 max-w-xs h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full transition-all"
                    style={{ width: `${primaryInProgress.enrollment.progressPercentage}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-indigo-300 tabular-nums">
                  {primaryInProgress.enrollment.progressPercentage}% 학습 완료
                </span>
              </div>
            </div>

            <div className="shrink-0 pt-2 md:pt-0">
              <button
                type="button"
                onClick={() => handleContinueCourse(primaryInProgress.course!.id)}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                <span>학습 계속하기</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: 사내 아카데미 추천 (신규입사자 온보딩, 기업 핵심가치, 조직문화) */}
      {isDefaultHomeView && companyAcademyCourses.length > 0 && (
        <section id="section-company-academy" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  사내 아카데미 추천
                </h2>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-0.5 rounded-full">
                  사내 공식
                </span>
              </div>
              <p className="text-xs text-slate-500 pl-8">
                신입사원 온보딩, 기업 핵심 가치, 조직문화 및 사내 시스템 공식 교육
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCategory('company-academy')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>전체보기</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {companyAcademyCourses.slice(0, 4).map((course) => {
              const enr = userEnrollments.find((e) => e.courseId === course.id);
              const isWish = wishlistIds.includes(course.id);
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollment={enr}
                  isWishlisted={isWish}
                  onSelect={handleSelectCourse}
                  onContinue={handleContinueCourse}
                  onWishlistToggle={handleWishlistToggle}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 3: 필수 교육 (법정의무교육, 정보보안, 성희롱예방, 개인정보) */}
      {isDefaultHomeView && mandatoryCourses.length > 0 && (
        <section id="section-mandatory-training" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  필수 교육
                </h2>
                <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-full">
                  법정의무 · 보안
                </span>
              </div>
              <p className="text-xs text-slate-500 pl-8">
                전 임직원 필수 이수 법정의무교육, 정보보안 및 개인정보보호 준수 가이드
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCategory('company-academy')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>전체보기</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {mandatoryCourses.slice(0, 4).map((course) => {
              const enr = userEnrollments.find((e) => e.courseId === course.id);
              const isWish = wishlistIds.includes(course.id);
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollment={enr}
                  isWishlisted={isWish}
                  onSelect={handleSelectCourse}
                  onContinue={handleContinueCourse}
                  onWishlistToggle={handleWishlistToggle}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 4: 직무 역량 교육 (비즈니스 기획, 커뮤니케이션, 리더십, 실무 스킬) */}
      {isDefaultHomeView && jobCompetencyCourses.length > 0 && (
        <section id="section-job-competency" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Target className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  직무 역량 교육
                </h2>
                <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded-full">
                  실무 마스터
                </span>
              </div>
              <p className="text-xs text-slate-500 pl-8">
                비즈니스 커뮤니케이션, 보고서 작성, 실무 기획 및 직무 전문성 강화
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCategory('job-competency')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>전체보기</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {jobCompetencyCourses.slice(0, 4).map((course) => {
              const enr = userEnrollments.find((e) => e.courseId === course.id);
              const isWish = wishlistIds.includes(course.id);
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollment={enr}
                  isWishlisted={isWish}
                  onSelect={handleSelectCourse}
                  onContinue={handleContinueCourse}
                  onWishlistToggle={handleWishlistToggle}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 5: AI · 데이터 (생성형 AI, 프롬프트 엔지니어링, 데이터 분석) */}
      {isDefaultHomeView && aiDataCourses.length > 0 && (
        <section id="section-ai-data" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  AI · 데이터
                </h2>
                <span className="text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/60 px-2 py-0.5 rounded-full">
                  업무자동화 & AX
                </span>
              </div>
              <p className="text-xs text-slate-500 pl-8">
                ChatGPT 및 생성형 AI 실무 프롬프트, 업무 자동화, 데이터 분석 실습
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCategory('ai-data')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>전체보기</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {aiDataCourses.slice(0, 4).map((course) => {
              const enr = userEnrollments.find((e) => e.courseId === course.id);
              const isWish = wishlistIds.includes(course.id);
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollment={enr}
                  isWishlisted={isWish}
                  onSelect={handleSelectCourse}
                  onContinue={handleContinueCourse}
                  onWishlistToggle={handleWishlistToggle}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 6: 인기 강의 & 전체 교육 과정 (Sorted & Filtered Catalog) */}
      <section id="section-popular-catalog" className="space-y-5">
        {/* Section Header with Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>
                {showOnlyWishlist
                  ? '관심 강의 목록'
                  : searchQuery
                  ? '검색 결과'
                  : selectedCategory === 'all'
                  ? '인기 강의 & 전체 교육 과정'
                  : '카테고리별 교육 과정'}
              </span>
              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                {sortedCourses.length}개
              </span>
              {showOnlyWishlist && (
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-current" /> 관심 등록됨
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs text-slate-500">
                {sortedCourses.length > 0
                  ? `${sortedCourses.length}개의 강의를 확인해보세요.`
                  : '등록된 강의 커리큘럼을 확인할 수 있습니다.'}
              </p>
              {selectedSubfield !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold">
                  <span>세부분야: {selectedSubfield}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubfield('all')}
                    className="hover:text-sky-900 cursor-pointer p-0.5 rounded-full hover:bg-sky-100 transition-colors"
                    title="세부분야 필터 해제"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Wishlist filter toggle */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setShowOnlyWishlist(!showOnlyWishlist)}
                className={`py-1.5 px-3 rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-1.5 border ${
                  showOnlyWishlist
                    ? 'bg-rose-50 border-rose-200 text-rose-600 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${showOnlyWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>관심 강의만</span>
              </button>
            )}

            {/* Level Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {['all', '초급', '중급', '고급'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`py-1.5 px-3 rounded-lg font-semibold transition-colors cursor-pointer ${
                    selectedLevel === lvl
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lvl === 'all' ? '전체' : lvl}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-xs"
            >
              <option value="popular">인기순</option>
              <option value="latest">최신순</option>
              <option value="rating">평점순</option>
            </select>
          </div>
        </div>

        {/* Search Results Summary Banner (Shows real-time count & quick reset when searching) */}
        {searchQuery.trim() && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl animate-in fade-in duration-150">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Search className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    '<span className="text-indigo-600">{searchQuery}</span>' 검색 결과
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200">
                    총 {sortedCourses.length}건
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  실제 등록된 강의명, 강사명, 카테고리 및 키워드 검색 기준
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
              }}
              className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 hover:text-indigo-600 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>검색어 초기화</span>
            </button>
          </div>
        )}

        {/* Loading Skeleton vs Empty State vs Courses Grid */}
        {isInitialLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <CourseCardSkeleton key={`catalog-skeleton-${i}`} />
            ))}
          </div>
        ) : allCourses.length === 0 ? (
          /* Empty State - No Courses in System */
          <EmptyState
            title="아직 등록된 강의가 없습니다"
            description="새로운 사내 교육 과정이 개설되면 이곳에 표시됩니다."
            showAction={isAdmin}
            actionLabel="새 강의 개설하기"
            onAction={() => onNavigate('admin-courses-create')}
          />
        ) : sortedCourses.length === 0 ? (
          /* Empty State - Filter Search Mismatch */
          searchQuery.trim() ? (
            <EmptyState
              title="검색 결과가 없습니다"
              description={`'${searchQuery}'에 일치하는 강의를 찾을 수 없습니다. 다른 검색어를 입력해보세요.`}
              showAction
              actionLabel="검색 초기화"
              onAction={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedSubcategory('all');
                setSelectedSubfield('all');
              }}
            />
          ) : (
            <EmptyState
              title="일치하는 강의가 없습니다"
              description="다른 카테고리나 난이도 필터를 선택해보세요."
              showAction
              actionLabel="필터 전체 초기화"
              onAction={() => {
                setSelectedCategory('all');
                setSelectedSubcategory('all');
                setSelectedSubfield('all');
                setSelectedLevel('all');
                setSearchQuery('');
                setShowOnlyWishlist(false);
              }}
            />
          )
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {visibleCourses.map((course) => {
                const enr = userEnrollments.find((e) => e.courseId === course.id);
                const isWish = wishlistIds.includes(course.id);

                return (
                  <CourseCard
                    key={course.id}
                    course={course}
                    enrollment={enr}
                    isWishlisted={isWish}
                    onSelect={handleSelectCourse}
                    onContinue={handleContinueCourse}
                    onWishlistToggle={handleWishlistToggle}
                  />
                );
              })}
            </div>

            {/* Infinite Scroll / Lazy Load Button */}
            {hasMore && (
              <div className="pt-6 pb-2 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>강의 더 불러오는 중...</span>
                    </>
                  ) : (
                    <span>강의 더보기 ({visibleCourses.length} / {sortedCourses.length})</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
