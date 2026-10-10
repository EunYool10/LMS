import React, { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { CourseCard } from '../components/student/CourseCard';
import { CourseCardSkeleton } from '../components/common/CourseCardSkeleton';
import { CategoryFilter, HomeSearch } from '../components/student/HeroBanner';
import { AnnouncementBanner } from '../components/common/AnnouncementBanner';
import { EmptyState } from '../components/common/EmptyState';
import { CourseCover } from '../components/common/CourseCover';
import { LEGACY_CATEGORY_MAP, getCategoryById } from '../data/categoriesData';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Heart,
  Loader2,
  PlayCircle,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface HomePageProps {
  onNavigate: (view: string, param?: string) => void;
}

const COURSES_PER_PAGE = 12;
const GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5';

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { user, isAuthenticated, isAdmin, openAuthModal } = useAuth();
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
    const timer = setTimeout(() => setIsInitialLoading(false), 150);
    return () => clearTimeout(timer);
  }, []);

  const categories = storage.getCategories();
  const allCourses = storage.getCourses(false); // only published
  const userEnrollments = user ? storage.getEnrollments(user.id) : [];

  const loadWishlist = () => {
    setWishlistIds(user ? storage.getWishlist(user.id).map((w) => w.courseId) : []);
  };

  useEffect(() => {
    loadWishlist();
  }, [user]);

  useEffect(() => {
    setVisibleCount(COURSES_PER_PAGE);
  }, [selectedCategory, selectedSubcategory, selectedSubfield, searchQuery, selectedLevel, sortBy, showOnlyWishlist]);

  const filteredCourses = allCourses.filter((course) => {
    const courseCatId = LEGACY_CATEGORY_MAP[course.categoryId] || course.categoryId;
    const matchCategory = selectedCategory === 'all' || courseCatId === selectedCategory;
    const matchSubcategory =
      selectedSubcategory === 'all' ||
      course.subcategoryId === selectedSubcategory ||
      (course.subcategoryName && course.subcategoryName.includes(selectedSubcategory));
    const matchSubfield =
      selectedSubfield === 'all' ||
      course.subfieldName === selectedSubfield ||
      (course.tags && course.tags.includes(selectedSubfield));
    const matchLevel = selectedLevel === 'all' || course.level === selectedLevel;
    const matchWishlist = !showOnlyWishlist || wishlistIds.includes(course.id);
    const q = searchQuery.trim().toLowerCase();

    let matchesCategoryTaxonomy = false;
    if (q) {
      const matchedCat = getCategoryById(courseCatId);
      if (matchedCat) {
        if (matchedCat.name.toLowerCase().includes(q) || matchedCat.description.toLowerCase().includes(q)) {
          matchesCategoryTaxonomy = true;
        }
        if (
          matchedCat.subcategories?.some(
            (sub) => sub.name.toLowerCase().includes(q) || sub.subfields.some((field) => field.toLowerCase().includes(q))
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

  const enrolledItems = userEnrollments
    .map((enrollment) => ({ enrollment, course: allCourses.find((c) => c.id === enrollment.courseId) }))
    .filter((item): item is { enrollment: typeof item.enrollment; course: NonNullable<typeof item.course> } => !!item.course);
  const inProgress = enrolledItems.filter((item) => item.enrollment.progressPercentage < 100);
  const completedCount = enrolledItems.length - inProgress.length;

  const mandatoryCourses = allCourses.filter(
    (c) =>
      c.subcategoryId === 'sub_acad_mandatory' ||
      c.tags?.some((t) => ['필수교육', '법정의무교육', '보안', '개인정보', '법정의무'].includes(t)) ||
      c.title.includes('필수') ||
      c.title.includes('법정의무')
  );

  const isDefaultHomeView = selectedCategory === 'all' && !searchQuery && !showOnlyWishlist;

  const handleSelectCourse = (courseId: string) => onNavigate('course-detail', courseId);

  const handleContinueCourse = (courseId: string) => {
    const enr = userEnrollments.find((e) => e.courseId === courseId);
    const lessons = storage.getLessons(courseId);
    const targetLessonId = enr?.lastLessonId || (lessons[0] ? lessons[0].id : undefined);
    if (targetLessonId) onNavigate('learn', `${courseId}/${targetLessonId}`);
    else onNavigate('course-detail', courseId);
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

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedSubfield('all');
    setSelectedLevel('all');
    setSearchQuery('');
    setShowOnlyWishlist(false);
  };

  const renderCard = (course: (typeof allCourses)[number]) => (
    <CourseCard
      key={course.id}
      course={course}
      enrollment={userEnrollments.find((e) => e.courseId === course.id)}
      isWishlisted={wishlistIds.includes(course.id)}
      onSelect={handleSelectCourse}
      onContinue={handleContinueCourse}
      onWishlistToggle={handleWishlistToggle}
    />
  );

  const catalogTitle = showOnlyWishlist
    ? '관심 강의'
    : searchQuery
    ? `'${searchQuery}' 검색 결과`
    : selectedCategory === 'all'
    ? '전체 강의'
    : categories.find((c) => c.id === selectedCategory)?.name || '강의';

  return (
    <div className="min-w-0">
      {/* ── Intro band: greeting, search, and the learner's summary ── */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="lms-container grid gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:gap-12">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="lms-eyebrow">TDS 사내 교육</p>
              <h1 className="text-2xl font-bold leading-tight text-neutral-900 sm:text-[28px]">
                {isAuthenticated && user ? `${user.name}님, 오늘도 한 걸음 성장해요` : '일하는 방식을 배우는 가장 빠른 길'}
              </h1>
              <p className="max-w-xl text-[15px] leading-relaxed text-neutral-600">
                온보딩과 필수 교육부터 직무 역량, AI·데이터 실무까지 필요한 과정을 한곳에서 찾아 학습하세요.
              </p>
            </div>
            <div className="max-w-2xl">
              <HomeSearch
                categories={categories}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectCategory={setSelectedCategory}
                onSelectSubcategory={setSelectedSubcategory}
                onSelectSubfield={setSelectedSubfield}
                userId={user?.id}
                allCourses={allCourses}
                onSelectCourse={handleSelectCourse}
              />
            </div>
          </div>

          {isAuthenticated && user ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900">나의 학습</h2>
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="inline-flex items-center gap-0.5 text-[13px] font-medium text-neutral-500 hover:text-neutral-900 cursor-pointer"
                >
                  대시보드 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <dl className="mt-4 grid grid-cols-3 divide-x divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
                {[
                  { label: '수강 중', value: inProgress.length },
                  { label: '수료', value: completedCount },
                  { label: '관심', value: wishlistIds.length },
                ].map((s) => (
                  <div key={s.label} className="px-3 py-3 text-center">
                    <dd className="text-xl font-bold tabular-nums text-neutral-900">{s.value}</dd>
                    <dt className="mt-0.5 text-xs text-neutral-500">{s.label}</dt>
                  </div>
                ))}
              </dl>
              {inProgress[0] ? (
                <button
                  type="button"
                  onClick={() => handleContinueCourse(inProgress[0].course.id)}
                  className="mt-4 flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 cursor-pointer"
                >
                  <PlayCircle className="w-9 h-9 shrink-0 text-brand-600" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-neutral-500">최근 학습</span>
                    <span className="block truncate text-sm font-semibold text-neutral-900">{inProgress[0].course.title}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-brand-700">
                    {inProgress[0].enrollment.progressPercentage}%
                  </span>
                </button>
              ) : (
                <p className="mt-4 text-[13px] leading-relaxed text-neutral-500">
                  아직 수강 중인 강의가 없어요. 아래에서 관심 있는 과정을 찾아보세요.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
              <h2 className="text-sm font-semibold text-neutral-900">로그인하고 학습을 시작하세요</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">
                사내 계정으로 로그인하면 수강 기록과 진도, 수료증이 자동으로 관리됩니다.
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => openAuthModal('login')} className="lms-btn lms-btn-primary flex-1">
                  로그인
                </button>
                <button type="button" onClick={() => openAuthModal('register')} className="lms-btn lms-btn-secondary flex-1">
                  회원가입
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="lms-container space-y-10 py-8 sm:py-10">
        <AnnouncementBanner />

        {/* ── Admin shortcuts ── */}
        {isAdmin && (
          <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 sm:mr-auto">
              <Settings2 className="w-4 h-4 text-neutral-500" />
              관리자 바로가기
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '강의 관리', view: 'admin-courses', icon: BookOpen },
                { label: '수강생 관리', view: 'admin-users', icon: Users },
                { label: '학습 통계', view: 'admin-analytics', icon: BarChart3 },
                { label: '관리자 콘솔', view: 'admin-dashboard', icon: ArrowRight },
              ].map(({ label, view, icon: Icon }) => (
                <button key={view} type="button" onClick={() => onNavigate(view)} className="lms-btn lms-btn-secondary lms-btn-sm">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Continue learning ── */}
        {isAuthenticated && inProgress.length > 0 && isDefaultHomeView && (
          <section id="section-continue-learning" className="space-y-4">
            <div className="flex items-end justify-between">
              <h2 className="lms-section-title">이어서 학습하기</h2>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-0.5 text-[13px] font-medium text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                전체 보기 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {inProgress.slice(0, 3).map(({ course, enrollment }) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleContinueCourse(course.id)}
                  className="group flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-3 text-left transition-[border-color,box-shadow] hover:border-neutral-300 hover:shadow-md cursor-pointer"
                >
                  <CourseCover
                    thumbnail={course.thumbnail}
                    title={course.title}
                    categoryId={course.categoryId}
                    compact
                    className="aspect-video w-28 shrink-0 rounded-lg"
                  />
                  <span className="min-w-0 flex-1 space-y-2">
                    <span className="block truncate text-sm font-semibold text-neutral-900 group-hover:text-brand-700">
                      {course.title}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-100">
                        <span
                          className="block h-full rounded-full bg-brand-600"
                          style={{ width: `${enrollment.progressPercentage}%` }}
                        />
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-neutral-600">
                        {enrollment.progressPercentage}%
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Required training ── */}
        {isDefaultHomeView && mandatoryCourses.length > 0 && (
          <section id="section-mandatory-training" className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="lms-section-title flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand-600" />
                  필수 교육
                </h2>
                <p className="mt-1 text-[13px] text-neutral-500">전 임직원이 기한 내 이수해야 하는 과정입니다.</p>
              </div>
            </div>
            <div className={GRID}>{mandatoryCourses.slice(0, 4).map(renderCard)}</div>
          </section>
        )}

        {/* ── Catalog ── */}
        <section id="section-popular-catalog" className="scroll-mt-20 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h2 className="lms-section-title">{catalogTitle}</h2>
              <span className="text-sm tabular-nums text-neutral-500">{sortedCourses.length}개</span>
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                검색 초기화
              </button>
            )}
          </div>

          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedSubcategory={selectedSubcategory}
            onSelectSubcategory={setSelectedSubcategory}
            selectedSubfield={selectedSubfield}
            onSelectSubfield={setSelectedSubfield}
            totalCoursesCount={allCourses.length}
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5" role="group" aria-label="난이도">
              {['all', '초급', '중급', '고급'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  aria-pressed={selectedLevel === lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`rounded-md px-3 py-1 text-[13px] font-medium transition-colors cursor-pointer ${
                    selectedLevel === lvl ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {lvl === 'all' ? '전체 난이도' : lvl}
                </button>
              ))}
            </div>

            {isAuthenticated && (
              <button
                type="button"
                aria-pressed={showOnlyWishlist}
                onClick={() => setShowOnlyWishlist(!showOnlyWishlist)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                  showOnlyWishlist
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${showOnlyWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
                관심 강의
              </button>
            )}

            {selectedSubfield !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-[13px] font-medium text-brand-700">
                {selectedSubfield}
                <button type="button" onClick={() => setSelectedSubfield('all')} aria-label="세부 분야 해제" className="cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="정렬"
              className="ml-auto rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
            >
              <option value="latest">최신순</option>
              <option value="popular">인기순</option>
              <option value="rating">평점순</option>
            </select>
          </div>

          {isInitialLoading ? (
            <div className={GRID}>
              {Array.from({ length: 8 }).map((_, i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : allCourses.length === 0 ? (
            <EmptyState
              title="아직 등록된 강의가 없습니다"
              description="새로운 사내 교육 과정이 개설되면 이곳에 표시됩니다."
              showAction={isAdmin}
              actionLabel="새 강의 개설하기"
              onAction={() => onNavigate('admin-courses-create')}
            />
          ) : sortedCourses.length === 0 ? (
            <EmptyState
              title={searchQuery.trim() ? '검색 결과가 없습니다' : '조건에 맞는 강의가 없습니다'}
              description={
                searchQuery.trim()
                  ? `'${searchQuery}'와 일치하는 강의가 없습니다. 다른 검색어를 입력해 보세요.`
                  : '다른 카테고리나 난이도를 선택해 보세요.'
              }
              showAction
              actionLabel="필터 초기화"
              onAction={resetFilters}
            />
          ) : (
            <>
              <div className={GRID}>{visibleCourses.map(renderCard)}</div>
              {hasMore && (
                <div className="pt-2 text-center">
                  <button type="button" onClick={handleLoadMore} disabled={isLoadingMore} className="lms-btn lms-btn-secondary">
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        불러오는 중…
                      </>
                    ) : (
                      <>
                        더 보기
                        <span className="tabular-nums text-neutral-400">
                          {visibleCourses.length}/{sortedCourses.length}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {isAuthenticated && completedCount > 0 && isDefaultHomeView && (
          <p className="flex items-center justify-center gap-1.5 text-[13px] text-neutral-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            지금까지 {completedCount}개 과정을 수료했어요.
          </p>
        )}
      </div>
    </div>
  );
};
