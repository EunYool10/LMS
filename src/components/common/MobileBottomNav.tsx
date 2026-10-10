import React from 'react';
import { Home, BookOpen, Bell, Shield, Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { openMobileNotificationModal } from './MobileNotificationModal';

interface MobileBottomNavProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  onOpenNotifications?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenNotifications,
}) => {
  const { user, isAuthenticated, isAdmin, openAuthModal } = useAuth();
  const unreadCount = user ? storage.getNotifications(user.id).filter((n) => !n.isRead).length : 0;

  const handleNav = (view: string) => {
    if (view === 'dashboard' && !isAuthenticated) {
      openAuthModal('login');
      return;
    }
    onNavigate(view);
  };

  const handleExplore = () => {
    onNavigate('home');
    setTimeout(() => {
      const searchInput = document.getElementById('hero-search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const catalog = document.getElementById('section-popular-catalog') || document.getElementById('section-hero');
        if (catalog) {
          catalog.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, 120);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('focus-explore-search'));
    }
  };

  const handleOpenNotification = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (onOpenNotifications) {
      onOpenNotifications();
    } else {
      openMobileNotificationModal();
    }
  };

  const isHomeActive = currentView === 'home';
  const isExploreActive = currentView === 'course-detail' || currentView === 'learn';
  const isDashboardActive = currentView === 'dashboard';
  const isAdminActive = currentView.startsWith('admin');

  return (
    <nav
      aria-label="모바일 하단 탐색"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[calc(8px+env(safe-area-inset-bottom,0px))] flex items-center justify-around select-none"
    >
      {/* 1. 홈 */}
      <button
        type="button"
        id="btn-mobile-nav-home"
        onClick={() => {
          handleNav('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className={`flex-1 flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1 rounded-xl transition-all cursor-pointer touch-manipulation ${
          isHomeActive
            ? 'text-indigo-600 font-extrabold scale-105'
            : 'text-slate-500 hover:text-slate-900 active:scale-95 font-medium'
        }`}
      >
        <Home
          size={20}
          strokeWidth={isHomeActive ? 2.5 : 2}
          className={`w-5 h-5 shrink-0 block ${isHomeActive ? 'stroke-[2.5]' : ''}`}
          aria-hidden="true"
        />
        <span className="text-[10px] mt-0.5 leading-none">홈</span>
      </button>

      {/* 2. 강의 탐색 / 검색 */}
      <button
        type="button"
        id="btn-mobile-nav-explore"
        onClick={handleExplore}
        className={`flex-1 flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1 rounded-xl transition-all cursor-pointer touch-manipulation ${
          isExploreActive
            ? 'text-indigo-600 font-extrabold scale-105'
            : 'text-slate-500 hover:text-slate-900 active:scale-95 font-medium'
        }`}
      >
        <Compass
          size={20}
          strokeWidth={isExploreActive ? 2.5 : 2}
          className={`w-5 h-5 shrink-0 block transition-transform ${isExploreActive ? 'scale-105' : ''}`}
          aria-hidden="true"
        />
        <span className="text-[10px] mt-0.5 leading-none">탐색</span>
      </button>

      {/* 3. 내 학습 */}
      <button
        type="button"
        id="btn-mobile-nav-learning"
        onClick={() => handleNav('dashboard')}
        className={`flex-1 flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1 rounded-xl transition-all cursor-pointer touch-manipulation ${
          isDashboardActive
            ? 'text-indigo-600 font-extrabold scale-105'
            : 'text-slate-500 hover:text-slate-900 active:scale-95 font-medium'
        }`}
      >
        <BookOpen
          size={20}
          strokeWidth={isDashboardActive ? 2.5 : 2}
          className={`w-5 h-5 shrink-0 block ${isDashboardActive ? 'stroke-[2.5]' : ''}`}
          aria-hidden="true"
        />
        <span className="text-[10px] mt-0.5 leading-none">내 학습</span>
      </button>

      {/* 4. 알림 (학생 및 관리자 공통 상시 제공) */}
      <button
        type="button"
        id="btn-mobile-nav-notifications"
        onClick={handleOpenNotification}
        className="flex-1 relative flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1 rounded-xl transition-all cursor-pointer touch-manipulation text-slate-500 hover:text-slate-900 active:scale-95 font-medium"
      >
        <div className="relative">
          <Bell size={20} strokeWidth={2} className="w-5 h-5 shrink-0 block" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center px-0.5 ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 leading-none">알림</span>
      </button>

      {/* 5. 관리자 콘솔 (관리자 권한 계정일 때 표시) */}
      {isAdmin && (
        <button
          type="button"
          id="btn-mobile-nav-admin"
          onClick={() => onNavigate('admin-dashboard')}
          className={`flex-1 flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1 rounded-xl transition-all cursor-pointer touch-manipulation ${
            isAdminActive
              ? 'text-indigo-600 font-extrabold scale-105'
              : 'text-slate-500 hover:text-slate-900 active:scale-95 font-medium'
          }`}
        >
          <Shield
            size={20}
            strokeWidth={isAdminActive ? 2.5 : 2}
            className={`w-5 h-5 shrink-0 block ${isAdminActive ? 'stroke-[2.5]' : ''}`}
            aria-hidden="true"
          />
          <span className="text-[10px] mt-0.5 leading-none">관리자</span>
        </button>
      )}
    </nav>
  );
};

