import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  PlayCircle,
  FolderTree,
  BookOpen,
  Search,
  Heart,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  Shield,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface FloatingNavProps {
  onNavigate: (view: string, param?: string) => void;
  onFocusSearch?: () => void;
  onFilterWishlist?: () => void;
  isWishlistFilterActive?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({
  onNavigate,
  onFocusSearch,
  onFilterWishlist,
  isWishlistFilterActive,
}) => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState<string>('section-hero');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('tds_quick_nav_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tds_quick_nav_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Sections defined on the page
  const sections: NavSection[] = [
    { id: 'section-hero', label: '홈 / 검색', icon: <Sparkles className="w-3.5 h-3.5" /> },
    ...(isAdmin ? [{ id: 'section-admin-quick', label: '관리자 작업', icon: <Shield className="w-3.5 h-3.5" /> }] : []),
    ...(isAuthenticated ? [{ id: 'section-continue-learning', label: '이어서 학습', icon: <PlayCircle className="w-3.5 h-3.5" /> }] : []),
    { id: 'section-categories', label: '카테고리', icon: <FolderTree className="w-3.5 h-3.5" /> },
    { id: 'section-popular-catalog', label: '전체 강의', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  // Scroll Spy detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;

      for (let i = sections.length - 1; i >= 0; i--) {
        let sec = document.getElementById(sections[i].id);
        if (!sec && sections[i].id === 'section-popular-catalog') {
          sec = document.getElementById('section-all-courses');
        }
        if (sec) {
          const top = sec.offsetTop;
          if (scrollPos >= top) {
            setActiveSection(sections[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    let targetId = id;
    if (!document.getElementById(targetId)) {
      if (targetId === 'section-popular-catalog') targetId = 'section-all-courses';
      else if (targetId === 'section-all-courses') targetId = 'section-popular-catalog';
    }

    const el = document.getElementById(targetId);
    if (el) {
      const topOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <>
      {/* Desktop Floating Navigation Widget */}
      <aside
        aria-label="빠른 탐색 메뉴"
        className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-end transition-all duration-200 pointer-events-none select-none"
      >
        <div
          className={`pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg rounded-xl p-1.5 transition-all duration-200 text-slate-700 flex flex-col ${
            isCollapsed ? 'w-10 items-center' : 'w-36'
          }`}
        >
          {/* Header with collapse toggle */}
          <div className="flex items-center justify-between w-full px-1 py-0.5 mb-1 border-b border-slate-100">
            {!isCollapsed && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 tracking-tight pl-0.5">
                <Compass className="w-3 h-3 text-indigo-600 shrink-0" />
                <span>빠른 이동</span>
              </div>
            )}
            <button
              type="button"
              onClick={toggleCollapse}
              className={`p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer ${
                isCollapsed ? 'mx-auto' : ''
              }`}
              title={isCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
              aria-label={isCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
            >
              {isCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Section navigation links */}
          <div className="flex flex-col gap-0.5 w-full">
            {sections.map((sec) => {
              const isActive = activeSection === sec.id;
              return (
                <div key={sec.id} className="relative group w-full">
                  <button
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer text-left ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/70 shadow-2xs'
                        : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-transparent'
                    } ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}`}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                      {sec.icon}
                    </span>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between w-full min-w-0">
                        <span className="truncate text-[11px]">{sec.label}</span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 ml-1" />}
                      </div>
                    )}
                  </button>

                  {/* Tooltip on collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-900/95 backdrop-blur-md text-white text-[10.5px] font-medium whitespace-nowrap shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50">
                      {sec.label}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900/95" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Shortcuts */}
          <div className="mt-1 pt-1 border-t border-slate-100 flex flex-col gap-0.5 w-full">
            {!isCollapsed && (
              <div className="px-1.5 py-0.5 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                바로가기
              </div>
            )}

            {onFocusSearch && (
              <div className="relative group w-full">
                <button
                  type="button"
                  onClick={onFocusSearch}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all cursor-pointer text-left ${
                    isCollapsed ? 'justify-center px-0 py-1.5' : ''
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                  {!isCollapsed && <span className="truncate text-[11px]">강의 검색</span>}
                </button>
                {isCollapsed && (
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-900/95 text-white text-[10.5px] font-medium whitespace-nowrap shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50">
                    강의 검색
                    <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900/95" />
                  </div>
                )}
              </div>
            )}

            {isAuthenticated && onFilterWishlist && (
              <div className="relative group w-full">
                <button
                  type="button"
                  onClick={onFilterWishlist}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left ${
                    isWishlistFilterActive
                      ? 'bg-rose-50 text-rose-600 font-bold border border-rose-200/70 shadow-2xs'
                      : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50/40 border border-transparent'
                  } ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isWishlistFilterActive ? 'fill-rose-500 text-rose-500' : 'text-slate-400 group-hover:text-rose-500'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate text-[11px]">찜한 강의</span>}
                </button>
                {isCollapsed && (
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-900/95 text-white text-[10.5px] font-medium whitespace-nowrap shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50">
                    찜한 강의
                    <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900/95" />
                  </div>
                )}
              </div>
            )}

            {isAuthenticated && (
              <div className="relative group w-full">
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all cursor-pointer text-left ${
                    isCollapsed ? 'justify-center px-0 py-1.5' : ''
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                  {!isCollapsed && <span className="truncate text-[11px]">내 학습방</span>}
                </button>
                {isCollapsed && (
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-900/95 text-white text-[10.5px] font-medium whitespace-nowrap shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50">
                    내 학습방
                    <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900/95" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scroll to Top Button */}
          <div className="mt-1 pt-1 border-t border-slate-100 w-full">
            <div className="relative group w-full">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-all cursor-pointer text-left ${
                  isCollapsed ? 'justify-center px-0' : ''
                }`}
              >
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                {!isCollapsed && <span>맨 위로</span>}
              </button>
              {isCollapsed && (
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-900/95 text-white text-[10.5px] font-medium whitespace-nowrap shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50">
                  맨 위로 이동
                  <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900/95" />
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
