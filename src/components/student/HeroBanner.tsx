import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  History,
  X,
  Clock,
  Briefcase,
  Code2,
  Palette,
  Video,
  FileSpreadsheet,
  GraduationCap,
  Award,
  MoreHorizontal,
  Building2,
  Target,
  BrainCircuit,
  RotateCcw,
  Tag,
  SlidersHorizontal,
  Sparkles,
  PlayCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Course, Category, Subcategory } from '../../types';
import { storage } from '../../services/storage';

interface HeroBannerProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedSubcategory?: string;
  onSelectSubcategory?: (subcategory: string) => void;
  selectedSubfield?: string;
  onSelectSubfield?: (subfield: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCoursesCount: number;
  userName?: string;
  userId?: string;
  isAuthenticated?: boolean;
  onContinueLearning?: () => void;
  hasInProgressCourse?: boolean;
  allCourses?: Course[];
  onSelectCourse?: (courseId: string) => void;
}

// Icon mapper for 12 core categories
const getCategoryIcon = (id: string, isSelected: boolean) => {
  const iconClass = `w-3 h-3 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`;
  switch (id) {
    case 'company-academy':
    case 'in-house-academy':
      return <Building2 className={`w-3 h-3 shrink-0 ${isSelected ? 'text-indigo-200' : 'text-indigo-400'}`} />;
    case 'job-competency':
      return <Target className={iconClass} />;
    case 'ai-data':
      return <BrainCircuit className={iconClass} />;
    case 'dev-it':
      return <Code2 className={iconClass} />;
    case 'design-content':
      return <Palette className={iconClass} />;
    case 'video-media':
      return <Video className={`w-3 h-3 shrink-0 ${isSelected ? 'text-rose-200' : 'text-rose-400'}`} />;
    case 'planning-business':
      return <Briefcase className={iconClass} />;
    case 'marketing-pr':
      return <TrendingUp className={iconClass} />;
    case 'work-office':
      return <FileSpreadsheet className={iconClass} />;
    case 'career-job':
      return <GraduationCap className={iconClass} />;
    case 'cert-exam':
      return <Award className={iconClass} />;
    case 'etc':
      return <MoreHorizontal className={iconClass} />;
    default:
      return <Layers className={iconClass} />;
  }
};

export const HeroBanner: React.FC<HeroBannerProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedSubcategory = 'all',
  onSelectSubcategory,
  selectedSubfield = 'all',
  onSelectSubfield,
  searchQuery,
  onSearchChange,
  totalCoursesCount,
  userName,
  userId,
  isAuthenticated,
  onContinueLearning,
  hasInProgressCourse,
  allCourses = [],
  onSelectCourse,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isMobile, setIsMobile] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const effectiveUserId = userId || 'guest';

  // Load recent searches
  const loadRecentSearches = () => {
    setRecentSearches(storage.getRecentSearches(effectiveUserId));
  };

  useEffect(() => {
    loadRecentSearches();
  }, [effectiveUserId]);

  // Sync external searchQuery changes with localQuery
  useEffect(() => {
    setLocalQuery(searchQuery);
    setDebouncedQuery(searchQuery);
    setActiveIndex(-1);
  }, [searchQuery]);

  // 300ms Debounce autocomplete search with visual loading indicator
  useEffect(() => {
    if (localQuery.trim() !== debouncedQuery.trim()) {
      setIsSearching(true);
    }
    setActiveIndex(-1);
    const timer = setTimeout(() => {
      setDebouncedQuery(localQuery);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery]);

  // Detect mobile screen width for responsive placeholder
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for mobile bottom nav explore button click
  useEffect(() => {
    const handleFocusExplore = () => {
      const input = document.getElementById('hero-search-input') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setIsSearchFocused(true);
      }
    };
    window.addEventListener('focus-explore-search', handleFocusExplore);
    return () => window.removeEventListener('focus-explore-search', handleFocusExplore);
  }, []);

  // Check scroll positions for gradient hints and arrows
  const checkScroll = () => {
    const el = categoryScrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 6);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  // Smooth mouse wheel horizontal scroll support
  useEffect(() => {
    const el = categoryScrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        // Vertical wheel event -> translate to horizontal scroll
        e.preventDefault();
        el.scrollBy({ left: e.deltaY * 1.3, behavior: 'auto' });
        checkScroll();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleScrollLeft = () => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  const handleCategoryClick = (catId: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    onSelectCategory(catId);
    if (onSelectSubcategory) onSelectSubcategory('all');
    if (onSelectSubfield) onSelectSubfield('all');

    if (event?.currentTarget && categoryScrollRef.current) {
      event.currentTarget.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  };

  // Click outside to close autocomplete & recent searches
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key to close dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (queryToSubmit: string) => {
    const trimmed = queryToSubmit.trim();
    onSearchChange(trimmed);
    if (trimmed) {
      storage.addRecentSearch(effectiveUserId, trimmed);
      loadRecentSearches();
    }
    setIsSearchFocused(false);
    setActiveIndex(-1);

    // Smoothly scroll down to results section
    setTimeout(() => {
      const catalogEl = document.getElementById('section-popular-catalog');
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const handleSelectRecent = (term: string) => {
    setLocalQuery(term);
    handleSearchSubmit(term);
  };

  const handleDeleteRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    storage.deleteRecentSearch(effectiveUserId, term);
    loadRecentSearches();
  };

  const handleClearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    storage.clearRecentSearches(effectiveUserId);
    setRecentSearches([]);
  };

  const handleClearInput = () => {
    setLocalQuery('');
    onSearchChange('');
    setIsSearchFocused(false);
    setActiveIndex(-1);
  };

  // Find active category object for subcategory rendering
  const activeCategoryObj = categories.find(
    (c) => c.id === selectedCategory || c.slug === selectedCategory
  );

  // Autocomplete matching from actual database data using debounced query
  const trimmed = debouncedQuery.trim().toLowerCase();

  const matchedRecent = trimmed
    ? recentSearches.filter((term) => term.toLowerCase().includes(trimmed)).slice(0, 3)
    : [];

  const matchedCourses = trimmed
    ? allCourses
        .filter(
          (c) =>
            c.title.toLowerCase().includes(trimmed) ||
            c.instructorName.toLowerCase().includes(trimmed) ||
            (c.categoryName && c.categoryName.toLowerCase().includes(trimmed)) ||
            (c.tags && c.tags.some((t) => t.toLowerCase().includes(trimmed)))
        )
        .slice(0, 4)
    : [];

  const matchedCategories = trimmed
    ? categories
        .filter((cat) => {
          if (cat.name.toLowerCase().includes(trimmed)) return true;
          return cat.subcategories?.some((sub) =>
            sub.name.toLowerCase().includes(trimmed) ||
            sub.subfields.some((f) => f.toLowerCase().includes(trimmed))
          );
        })
        .slice(0, 3)
    : [];

  type SuggestionItem =
    | { type: 'recent'; term: string }
    | { type: 'category'; category: Category }
    | { type: 'course'; course: Course };

  const suggestionItems: SuggestionItem[] = [
    ...matchedRecent.map((term) => ({ type: 'recent' as const, term })),
    ...matchedCategories.map((category) => ({ type: 'category' as const, category })),
    ...matchedCourses.map((course) => ({ type: 'course' as const, course })),
  ];

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (suggestionItems.length > 0) {
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestionItems.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      if (suggestionItems.length > 0) {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestionItems.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestionItems.length) {
        const item = suggestionItems[activeIndex];
        if (item.type === 'recent') {
          handleSelectRecent(item.term);
        } else if (item.type === 'category') {
          onSelectCategory(item.category.id);
          if (onSelectSubcategory) onSelectSubcategory('all');
          if (onSelectSubfield) onSelectSubfield('all');
          setLocalQuery('');
          onSearchChange('');
          setIsSearchFocused(false);
          setActiveIndex(-1);
        } else if (item.type === 'course') {
          handleSearchSubmit(localQuery);
          if (onSelectCourse) onSelectCourse(item.course.id);
          setIsSearchFocused(false);
          setActiveIndex(-1);
        }
      } else {
        handleSearchSubmit(localQuery);
      }
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
      setActiveIndex(-1);
    }
  };

  return (
    <section
      id="section-hero"
      className="relative bg-[#0A0F1D] text-white rounded-2xl px-4 py-4 sm:px-5 sm:py-4.5 lg:px-6 lg:py-5 shadow-sm border border-slate-800/90 z-30"
    >
      {/* Subtle Corporate Lighting Accents (safely contained inside rounded border) */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-900/15 via-indigo-950/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-indigo-600/10 rounded-full blur-xl pointer-events-none" />
      </div>

      <div className="relative z-20 max-w-4xl space-y-2.5 sm:space-y-3">
        {/* Top Header: Tag + Greeting inline or tight vertical stack */}
        <div className="space-y-1.5">
          {/* Corporate LMS Tag */}
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-950/80 border border-indigo-500/30 rounded-full text-[10.5px] font-semibold text-indigo-300">
            <Sparkles className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
            <span>기업용 통합 사내교육 & 직무역량 LMS</span>
          </div>

          {/* Dynamic Compact Headline & Subtitle */}
          {isAuthenticated ? (
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-3">
              <div>
                <h1 className="text-lg sm:text-xl lg:text-[22px] font-bold tracking-tight text-white leading-snug">
                  {userName ? `${userName}님, ` : ''}
                  <span className="text-indigo-300">오늘의 교육을 이어가볼까요?</span>
                </h1>
                <p className="text-slate-300 text-xs max-w-2xl leading-relaxed mt-0.5">
                  사내 필수교육 및 직무역량 과정을 이어서 수강하고 역량을 강화하세요.
                </p>
              </div>

              {/* Compact In-Progress CTA */}
              {hasInProgressCourse && onContinueLearning && (
                <div className="shrink-0 pt-0.5 sm:pt-0">
                  <button
                    type="button"
                    onClick={onContinueLearning}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1.5 group whitespace-nowrap"
                  >
                    <PlayCircle className="w-3.5 h-3.5 text-indigo-200 group-hover:scale-105 transition-transform" />
                    <span>이어서 학습하기</span>
                    <ArrowRight className="w-3 h-3 text-indigo-300 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h1 className="text-lg sm:text-xl lg:text-[22px] font-bold tracking-tight text-white leading-snug">
                사내 아카데미 & <span className="text-indigo-300">직무역량 교육 플랫폼</span>
              </h1>
              <p className="text-slate-300 text-xs max-w-2xl leading-relaxed mt-0.5">
                사내 온보딩부터 직무 역량, AI·데이터 실무 교육까지 한 곳에서 체계적으로 학습하세요.
              </p>
            </div>
          )}
        </div>

        {/* Professional LMS Search Bar with Non-Intrusive Floating Dropdown */}
        <div className="relative w-full max-w-2xl min-w-0 z-50" ref={searchContainerRef}>
          <div className="relative flex items-center h-12 sm:h-13 bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:shadow-md transition-all duration-150">
            {isSearching ? (
              <Loader2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-indigo-500 animate-spin absolute left-3.5 sm:left-4 pointer-events-none shrink-0" />
            ) : (
              <Search className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 sm:left-4 pointer-events-none shrink-0" />
            )}
            <input
              id="hero-search-input"
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isSearchFocused && localQuery.trim().length > 0}
              aria-controls="hero-search-autocomplete"
              aria-activedescendant={activeIndex >= 0 ? `suggestion-item-${activeIndex}` : undefined}
              aria-label="강의 검색"
              value={localQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setLocalQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={isMobile ? '강의나 키워드 검색' : '강의명, 강사명, 키워드를 검색하세요'}
              className="w-full h-full pl-10 sm:pl-12 pr-24 sm:pr-28 bg-transparent text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none min-w-0"
            />

            <div className="absolute right-1.5 sm:right-2 flex items-center gap-1 sm:gap-1.5 shrink-0">
              {localQuery && (
                <button
                  type="button"
                  onClick={handleClearInput}
                  aria-label="검색어 지우기"
                  className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  title="검색어 지우기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSearchSubmit(localQuery)}
                aria-label="강의 검색 실행"
                className="h-9 sm:h-10 px-3.5 sm:px-4.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>검색</span>
              </button>
            </div>
          </div>

          {/* Floating Dropdown: Only renders when typing search terms (prevents covering hero content when clicking/focusing empty input) */}
          {isSearchFocused && localQuery.trim().length > 0 && (
            <div
              id="hero-search-autocomplete"
              role="listbox"
              aria-label="강의 검색 자동완성 추천"
              className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white rounded-xl sm:rounded-2xl shadow-2xl ring-1 ring-slate-900/10 border border-slate-200 text-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-slate-100"
            >
              {isSearching ? (
                /* Loading State during 300ms Debounce */
                <div className="py-5 px-4 flex items-center justify-center gap-2.5 text-xs text-indigo-600 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>실시간 강의 데이터 검색 중...</span>
                </div>
              ) : suggestionItems.length > 0 ? (
                <div className="p-2 sm:p-2.5 space-y-2 max-h-[380px] overflow-y-auto">
                  {/* Matched Recent Searches */}
                  {matchedRecent.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-400 px-2 py-0.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <History className="w-3 h-3 text-slate-400" />
                          최근 검색어
                        </span>
                        <button
                          type="button"
                          onClick={handleClearAllRecent}
                          className="text-[10px] text-slate-400 hover:text-rose-500 font-medium cursor-pointer transition-colors"
                        >
                          전체 삭제
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {matchedRecent.map((term) => {
                          const itemIdx = suggestionItems.findIndex(
                            (it) => it.type === 'recent' && it.term === term
                          );
                          const isSelected = activeIndex === itemIdx;
                          return (
                            <div
                              key={term}
                              id={`suggestion-item-${itemIdx}`}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => handleSelectRecent(term)}
                              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-200'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{term}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteRecent(e, term)}
                                aria-label={`'${term}' 최근 검색어 삭제`}
                                className="text-slate-400 hover:text-rose-500 p-0.5 rounded-full hover:bg-slate-200/50 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Matched Categories */}
                  {matchedCategories.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <div className="text-[11px] font-bold text-slate-400 px-2 py-0.5 flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-indigo-500" />
                        <span>연관 교육 카테고리</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 px-1">
                        {matchedCategories.map((cat) => {
                          const itemIdx = suggestionItems.findIndex(
                            (it) => it.type === 'category' && it.category.id === cat.id
                          );
                          const isSelected = activeIndex === itemIdx;
                          return (
                            <button
                              key={cat.id}
                              id={`suggestion-item-${itemIdx}`}
                              role="option"
                              type="button"
                              aria-selected={isSelected}
                              onClick={() => {
                                onSelectCategory(cat.id);
                                if (onSelectSubcategory) onSelectSubcategory('all');
                                if (onSelectSubfield) onSelectSubfield('all');
                                setLocalQuery('');
                                onSearchChange('');
                                setIsSearchFocused(false);
                                setActiveIndex(-1);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                              }`}
                            >
                              <span>{cat.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Matched Courses from Actual DB */}
                  {matchedCourses.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <div className="text-[11px] font-bold text-slate-400 px-2 py-0.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3 text-indigo-500" />
                          추천 강의 바로가기
                        </span>
                        <span className="text-[10px] text-slate-400">클릭 또는 Enter 시 상세 이동</span>
                      </div>
                      <div className="space-y-0.5">
                        {matchedCourses.map((c) => {
                          const itemIdx = suggestionItems.findIndex(
                            (it) => it.type === 'course' && it.course.id === c.id
                          );
                          const isSelected = activeIndex === itemIdx;
                          return (
                            <button
                              key={c.id}
                              id={`suggestion-item-${itemIdx}`}
                              role="option"
                              type="button"
                              aria-selected={isSelected}
                              onClick={() => {
                                handleSearchSubmit(localQuery);
                                if (onSelectCourse) onSelectCourse(c.id);
                                setIsSearchFocused(false);
                                setActiveIndex(-1);
                              }}
                              className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-3 group transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50 ring-1 ring-indigo-300'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    isSelected ? 'bg-indigo-600' : 'bg-slate-400'
                                  }`}
                                />
                                <div className="min-w-0">
                                  <p
                                    className={`text-xs sm:text-sm font-semibold truncate ${
                                      isSelected
                                        ? 'text-indigo-700 font-bold'
                                        : 'text-slate-800 group-hover:text-indigo-600'
                                    }`}
                                  >
                                    {c.title}
                                  </p>
                                  <p className="text-[11px] text-slate-400 truncate">
                                    {c.categoryName || '사내교육'} · {c.instructorName}
                                  </p>
                                </div>
                              </div>
                              <ArrowRight
                                className={`w-3.5 h-3.5 transition-all shrink-0 ${
                                  isSelected
                                    ? 'text-indigo-600 translate-x-0.5'
                                    : 'text-slate-300 group-hover:text-indigo-600'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Keyboard navigation helper */}
                  <div className="pt-1.5 px-2 pb-0.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
                    <span>
                      <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9.5px]">↑</kbd>{' '}
                      <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9.5px]">↓</kbd> 추천 목록 이동
                    </span>
                    <span>
                      <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9.5px]">Enter</kbd> 선택/검색
                    </span>
                  </div>
                </div>
              ) : (
                /* Visual No-Results State */
                <div className="py-5 px-4 text-center text-xs text-slate-500 space-y-1">
                  <Search className="w-4 h-4 text-slate-300 mx-auto mb-1" />
                  <p className="font-semibold text-slate-700">'{debouncedQuery}' 검색 결과가 없습니다.</p>
                  <p className="text-[11px] text-slate-400">Enter 키를 눌러 전체 교육 과정에서 검색을 진행하세요.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Corporate LMS Categories Bar with Streamlined Horizontal Scroll */}
        <div id="section-categories" className="pt-0.5 space-y-1.5 relative z-10">
          <div className="relative group/catbar">
            {/* Left Scroll Navigation Button (Desktop) */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={handleScrollLeft}
                aria-label="이전 카테고리"
                className="hidden sm:flex absolute -left-2.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-slate-900/95 hover:bg-indigo-950 border border-slate-700 text-slate-200 hover:text-white items-center justify-center shadow-md transition-all cursor-pointer backdrop-blur-xs ring-1 ring-indigo-500/20"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
            )}

            {/* Left fade gradient hint */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#0A0F1D] via-[#0A0F1D]/80 to-transparent z-10 pointer-events-none rounded-l-lg" />
            )}

            {/* Main Category Tabs Container */}
            <div
              ref={categoryScrollRef}
              onScroll={checkScroll}
              className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none scroll-smooth touch-pan-x"
            >
              {/* ① 전체 버튼 */}
              <button
                type="button"
                onClick={(e) => handleCategoryClick('all', e)}
                className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer select-none flex items-center gap-1.5 shrink-0 group ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs ring-1 ring-indigo-400/40 font-bold'
                    : 'bg-[#0F172A] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                <Layers className={`w-3 h-3 shrink-0 ${selectedCategory === 'all' ? 'text-white' : 'text-slate-400 group-hover:text-indigo-300'}`} />
                <span className="whitespace-nowrap">전체</span>
                {totalCoursesCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      selectedCategory === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {totalCoursesCount}
                  </span>
                )}
              </button>

              {/* ② ~ ⑬ 기업용 LMS 카테고리 버튼들 */}
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id || selectedCategory === cat.slug;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={(e) => handleCategoryClick(cat.id, e)}
                    className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer select-none flex items-center gap-1.5 shrink-0 group ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-2xs ring-1 ring-indigo-400/40 font-bold'
                        : 'bg-[#0F172A] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {getCategoryIcon(cat.id, isSelected)}
                    <span className="whitespace-nowrap">{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Right fade gradient hint */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#0A0F1D] via-[#0A0F1D]/80 to-transparent z-10 pointer-events-none rounded-r-lg" />
            )}

            {/* Right Scroll Navigation Button (Desktop) */}
            {canScrollRight && (
              <button
                type="button"
                onClick={handleScrollRight}
                aria-label="다음 카테고리"
                className="hidden sm:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-slate-900/95 hover:bg-indigo-950 border border-slate-700 text-slate-200 hover:text-white items-center justify-center shadow-md transition-all cursor-pointer backdrop-blur-xs ring-1 ring-indigo-500/20"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Subcategory (중분류 / 세부분야) Sub-tabs (Active when specific category is selected) */}
          {activeCategoryObj && activeCategoryObj.subcategories && activeCategoryObj.subcategories.length > 0 && (
            <div className="mt-2 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md backdrop-blur-md p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Upper Header: Active Category Breadcrumb & Quick Reset */}
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium overflow-x-auto scrollbar-none py-0.5">
                  <span className="text-slate-300 font-semibold flex items-center gap-1 shrink-0">
                    <Layers className="w-3 h-3 text-indigo-400" />
                    <span>{activeCategoryObj.name}</span>
                  </span>

                  {selectedSubcategory !== 'all' && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                      <span className="text-indigo-300 font-semibold shrink-0">
                        {activeCategoryObj.subcategories.find((s) => s.id === selectedSubcategory)?.name || selectedSubcategory}
                      </span>
                    </>
                  )}

                  {selectedSubfield !== 'all' && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold shrink-0 text-[10.5px]">
                        {selectedSubfield}
                      </span>
                    </>
                  )}
                </div>

                {(selectedSubcategory !== 'all' || selectedSubfield !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectSubcategory) onSelectSubcategory('all');
                      if (onSelectSubfield) onSelectSubfield('all');
                    }}
                    className="text-[10.5px] font-semibold text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/60 transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 select-none"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    <span>필터 초기화</span>
                  </button>
                )}
              </div>

              {/* 중분류 버튼 목록 */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <div className="shrink-0 flex items-center">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 text-[10.5px] font-semibold tracking-wide select-none">
                    <Tag className="w-2.5 h-2.5 text-indigo-400" />
                    <span>중분류</span>
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectSubcategory) onSelectSubcategory('all');
                      if (onSelectSubfield) onSelectSubfield('all');
                    }}
                    className={`min-h-[28px] px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 select-none ${
                      selectedSubcategory === 'all'
                        ? 'bg-indigo-600 text-white font-semibold shadow-2xs ring-1 ring-indigo-400/50'
                        : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    전체 {activeCategoryObj.name}
                  </button>

                  {activeCategoryObj.subcategories.map((sub: Subcategory) => {
                    const isSubActive = selectedSubcategory === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          if (onSelectSubcategory) onSelectSubcategory(sub.id);
                          if (onSelectSubfield) onSelectSubfield('all');
                        }}
                        className={`min-h-[28px] px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 select-none ${
                          isSubActive
                            ? 'bg-indigo-600 text-white font-semibold shadow-2xs ring-1 ring-indigo-400/50'
                            : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                        }`}
                      >
                        {sub.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 세부 기술/영역 칩 (선택된 중분류에 세부항목이 있을 경우) */}
              {(() => {
                if (selectedSubcategory === 'all') {
                  return (
                    <div className="pt-0.5 flex items-center gap-1.5 text-[10.5px] text-slate-400 pl-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                      <span>중분류를 선택하면 맞춤형 세부분야(스킬·주제)를 더욱 정밀하게 필터링할 수 있습니다.</span>
                    </div>
                  );
                }

                const activeSub = activeCategoryObj.subcategories?.find((s) => s.id === selectedSubcategory);
                if (!activeSub || !activeSub.subfields || activeSub.subfields.length === 0) return null;

                return (
                  <div className="pt-1.5 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="shrink-0 flex items-center">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-950/70 border border-sky-500/30 text-sky-300 text-[10.5px] font-semibold tracking-wide select-none">
                        <SlidersHorizontal className="w-2.5 h-2.5 text-sky-400" />
                        <span>세부분야</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectSubfield) onSelectSubfield('all');
                        }}
                        className={`min-h-[26px] px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 select-none ${
                          selectedSubfield === 'all'
                            ? 'bg-sky-500 text-slate-950 font-semibold shadow-2xs ring-1 ring-sky-300/60'
                            : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                        }`}
                      >
                        전체
                      </button>

                      {activeSub.subfields.map((field) => {
                        const isFieldActive = selectedSubfield === field;
                        return (
                          <button
                            key={field}
                            type="button"
                            onClick={() => {
                              if (onSelectSubfield) onSelectSubfield(field);
                            }}
                            className={`min-h-[26px] px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 select-none ${
                              isFieldActive
                                ? 'bg-sky-500 text-slate-950 font-semibold shadow-2xs ring-1 ring-sky-300/60'
                                : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                            }`}
                          >
                            {field}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
