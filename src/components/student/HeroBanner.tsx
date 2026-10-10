import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, History, Loader2, Search, X } from 'lucide-react';
import { Category, Course, Subcategory } from '../../types';
import { storage } from '../../services/storage';
import { CategoryIcon } from '../common/CategoryIcon';

// ============================================================================
// HomeSearch — course search with recent searches + live autocomplete
// ============================================================================

interface HomeSearchProps {
  categories: Category[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectCategory: (category: string) => void;
  onSelectSubcategory?: (subcategory: string) => void;
  onSelectSubfield?: (subfield: string) => void;
  userId?: string;
  allCourses?: Course[];
  onSelectCourse?: (courseId: string) => void;
}

export const HomeSearch: React.FC<HomeSearchProps> = ({
  categories,
  searchQuery,
  onSearchChange,
  onSelectCategory,
  onSelectSubcategory,
  onSelectSubfield,
  userId,
  allCourses = [],
  onSelectCourse,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveUserId = userId || 'guest';
  const loadRecentSearches = () => setRecentSearches(storage.getRecentSearches(effectiveUserId));

  useEffect(() => {
    loadRecentSearches();
  }, [effectiveUserId]);

  useEffect(() => {
    setLocalQuery(searchQuery);
    setDebouncedQuery(searchQuery);
    setActiveIndex(-1);
  }, [searchQuery]);

  // 300ms debounce for autocomplete
  useEffect(() => {
    if (localQuery.trim() !== debouncedQuery.trim()) setIsSearching(true);
    setActiveIndex(-1);
    const timer = setTimeout(() => {
      setDebouncedQuery(localQuery);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery]);

  // Mobile bottom nav "탐색" focuses this input
  useEffect(() => {
    const handleFocusExplore = () => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsFocused(true);
    };
    window.addEventListener('focus-explore-search', handleFocusExplore);
    return () => window.removeEventListener('focus-explore-search', handleFocusExplore);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const close = () => {
    setIsFocused(false);
    setActiveIndex(-1);
  };

  const submit = (query: string) => {
    const trimmed = query.trim();
    onSearchChange(trimmed);
    if (trimmed) {
      storage.addRecentSearch(effectiveUserId, trimmed);
      loadRecentSearches();
    }
    close();
    setTimeout(() => {
      document.getElementById('section-popular-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const pickRecent = (term: string) => {
    setLocalQuery(term);
    submit(term);
  };

  const pickCategory = (catId: string) => {
    onSelectCategory(catId);
    onSelectSubcategory?.('all');
    onSelectSubfield?.('all');
    setLocalQuery('');
    onSearchChange('');
    close();
    setTimeout(() => {
      document.getElementById('section-popular-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const pickCourse = (courseId: string) => {
    submit(localQuery);
    onSelectCourse?.(courseId);
  };

  const q = debouncedQuery.trim().toLowerCase();
  const matchedRecent = q ? recentSearches.filter((t) => t.toLowerCase().includes(q)).slice(0, 3) : [];
  const matchedCourses = q
    ? allCourses
        .filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.instructorName.toLowerCase().includes(q) ||
            (c.categoryName && c.categoryName.toLowerCase().includes(q)) ||
            (c.tags && c.tags.some((t) => t.toLowerCase().includes(q)))
        )
        .slice(0, 5)
    : [];
  const matchedCategories = q
    ? categories
        .filter(
          (cat) =>
            cat.name.toLowerCase().includes(q) ||
            cat.subcategories?.some(
              (sub) => sub.name.toLowerCase().includes(q) || sub.subfields.some((f) => f.toLowerCase().includes(q))
            )
        )
        .slice(0, 3)
    : [];

  type Item = { type: 'recent'; term: string } | { type: 'category'; category: Category } | { type: 'course'; course: Course };
  const items: Item[] = [
    ...matchedRecent.map((term) => ({ type: 'recent' as const, term })),
    ...matchedCategories.map((category) => ({ type: 'category' as const, category })),
    ...matchedCourses.map((course) => ({ type: 'course' as const, course })),
  ];
  const indexOf = (pred: (it: Item) => boolean) => items.findIndex(pred);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setActiveIndex((p) => (p < items.length - 1 ? p + 1 : 0));
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setActiveIndex((p) => (p > 0 ? p - 1 : items.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[activeIndex];
      if (!item) submit(localQuery);
      else if (item.type === 'recent') pickRecent(item.term);
      else if (item.type === 'category') pickCategory(item.category.id);
      else pickCourse(item.course.id);
    } else if (e.key === 'Escape') {
      close();
    }
  };

  const showDropdown = isFocused && localQuery.trim().length > 0;
  const optionClass = (selected: boolean) =>
    `w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm cursor-pointer transition-colors ${
      selected ? 'bg-brand-50 text-brand-800' : 'text-neutral-700 hover:bg-neutral-50'
    }`;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex items-center h-12 rounded-xl border border-neutral-300 bg-white transition-[border-color,box-shadow] focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10">
        {isSearching ? (
          <Loader2 className="ml-4 w-5 h-5 shrink-0 text-brand-600 animate-spin" />
        ) : (
          <Search className="ml-4 w-5 h-5 shrink-0 text-neutral-400" />
        )}
        <input
          ref={inputRef}
          id="hero-search-input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="hero-search-autocomplete"
          aria-activedescendant={activeIndex >= 0 ? `suggestion-item-${activeIndex}` : undefined}
          aria-label="강의 검색"
          value={localQuery}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            setIsFocused(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="강의명, 강사, 키워드로 검색"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />
        {localQuery && (
          <button
            type="button"
            onClick={() => {
              setLocalQuery('');
              onSearchChange('');
              close();
            }}
            aria-label="검색어 지우기"
            className="mr-1 p-1.5 rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => submit(localQuery)}
          className="mr-1.5 h-9 shrink-0 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 cursor-pointer"
        >
          검색
        </button>
      </div>

      {showDropdown && (
        <div
          id="hero-search-autocomplete"
          role="listbox"
          aria-label="검색 추천"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
        >
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              검색 중…
            </div>
          ) : items.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-500">
              <p className="font-medium text-neutral-700">'{debouncedQuery}'와 일치하는 추천이 없습니다</p>
              <p className="mt-1 text-xs">Enter를 누르면 전체 강의에서 검색합니다.</p>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto p-1.5">
              {matchedRecent.length > 0 && (
                <div className="pb-1">
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium text-neutral-500">
                    <span>최근 검색어</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        storage.clearRecentSearches(effectiveUserId);
                        setRecentSearches([]);
                      }}
                      className="hover:text-neutral-800 cursor-pointer"
                    >
                      전체 삭제
                    </button>
                  </div>
                  {matchedRecent.map((term) => {
                    const idx = indexOf((it) => it.type === 'recent' && it.term === term);
                    return (
                      <div
                        key={term}
                        id={`suggestion-item-${idx}`}
                        role="option"
                        aria-selected={activeIndex === idx}
                        onClick={() => pickRecent(term)}
                        className={optionClass(activeIndex === idx)}
                      >
                        <History className="w-4 h-4 shrink-0 text-neutral-400" />
                        <span className="flex-1 truncate">{term}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            storage.deleteRecentSearch(effectiveUserId, term);
                            loadRecentSearches();
                          }}
                          aria-label={`'${term}' 삭제`}
                          className="p-0.5 rounded text-neutral-400 hover:text-neutral-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {matchedCategories.length > 0 && (
                <div className="pb-1">
                  <div className="px-3 py-1.5 text-xs font-medium text-neutral-500">카테고리</div>
                  {matchedCategories.map((cat) => {
                    const idx = indexOf((it) => it.type === 'category' && it.category.id === cat.id);
                    return (
                      <button
                        key={cat.id}
                        id={`suggestion-item-${idx}`}
                        role="option"
                        type="button"
                        aria-selected={activeIndex === idx}
                        onClick={() => pickCategory(cat.id)}
                        className={optionClass(activeIndex === idx)}
                      >
                        <CategoryIcon categoryId={cat.id} className="w-4 h-4 shrink-0 text-brand-600" />
                        <span className="flex-1 truncate">{cat.name}</span>
                        <span className="text-xs text-neutral-400">카테고리로 보기</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {matchedCourses.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-neutral-500">강의</div>
                  {matchedCourses.map((c) => {
                    const idx = indexOf((it) => it.type === 'course' && it.course.id === c.id);
                    return (
                      <button
                        key={c.id}
                        id={`suggestion-item-${idx}`}
                        role="option"
                        type="button"
                        aria-selected={activeIndex === idx}
                        onClick={() => pickCourse(c.id)}
                        className={optionClass(activeIndex === idx)}
                      >
                        <BookOpen className="w-4 h-4 shrink-0 text-neutral-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-neutral-900">{c.title}</span>
                          <span className="block truncate text-xs text-neutral-500">
                            {c.categoryName || '사내 교육'} · {c.instructorName}
                          </span>
                        </span>
                        <ArrowRight className="w-4 h-4 shrink-0 text-neutral-300" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CategoryFilter — category tabs with subcategory / subfield refinement
// ============================================================================

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedSubcategory?: string;
  onSelectSubcategory?: (subcategory: string) => void;
  selectedSubfield?: string;
  onSelectSubfield?: (subfield: string) => void;
  totalCoursesCount: number;
}

const chipClass = (active: boolean) =>
  `shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
    active
      ? 'border-neutral-900 bg-neutral-900 text-white'
      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
  }`;

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedSubcategory = 'all',
  onSelectSubcategory,
  selectedSubfield = 'all',
  onSelectSubfield,
  totalCoursesCount,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Translate vertical wheel into horizontal scroll on the tab strip
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const selectCategory = (id: string, target?: HTMLElement) => {
    onSelectCategory(id);
    onSelectSubcategory?.('all');
    onSelectSubfield?.('all');
    target?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const activeCategory = categories.find((c) => c.id === selectedCategory || c.slug === selectedCategory);
  const activeSub = activeCategory?.subcategories?.find((s) => s.id === selectedSubcategory);

  return (
    <div id="section-categories" className="space-y-3">
      <div
        ref={scrollRef}
        role="tablist"
        aria-label="강의 카테고리"
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-neutral-200 px-4 scrollbar-none sm:mx-0 sm:px-0"
      >
        {[{ id: 'all', name: '전체' } as Pick<Category, 'id' | 'name'>, ...categories].map((cat) => {
          const active = cat.id === 'all' ? selectedCategory === 'all' : cat.id === activeCategory?.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={(e) => selectCategory(cat.id, e.currentTarget)}
              className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 pb-3 pt-2 text-sm font-medium transition-colors cursor-pointer ${
                active ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {cat.id !== 'all' && <CategoryIcon categoryId={cat.id} className="w-4 h-4" />}
              {cat.name}
              {cat.id === 'all' && totalCoursesCount > 0 && (
                <span className="text-xs text-neutral-400 tabular-nums">{totalCoursesCount}</span>
              )}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-neutral-900" />}
            </button>
          );
        })}
      </div>

      {activeCategory?.subcategories && activeCategory.subcategories.length > 0 && (
        <div className="space-y-2">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
            <button
              type="button"
              onClick={() => {
                onSelectSubcategory?.('all');
                onSelectSubfield?.('all');
              }}
              className={chipClass(selectedSubcategory === 'all')}
            >
              전체
            </button>
            {activeCategory.subcategories.map((sub: Subcategory) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  onSelectSubcategory?.(sub.id);
                  onSelectSubfield?.('all');
                }}
                className={chipClass(selectedSubcategory === sub.id)}
              >
                {sub.name}
              </button>
            ))}
          </div>

          {activeSub && activeSub.subfields.length > 0 && (
            <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
              <span className="shrink-0 pr-1 text-xs font-medium text-neutral-500">세부 분야</span>
              {['all', ...activeSub.subfields].map((field) => {
                const active = selectedSubfield === field;
                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => onSelectSubfield?.(field)}
                    className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      active ? 'bg-brand-50 text-brand-700' : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {field === 'all' ? '전체' : field}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

