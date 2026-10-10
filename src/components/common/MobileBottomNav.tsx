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

  const items = [
    { id: 'btn-mobile-nav-home', label: '홈', icon: Home, active: isHomeActive, onClick: () => { handleNav('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
    { id: 'btn-mobile-nav-explore', label: '탐색', icon: Compass, active: isExploreActive, onClick: handleExplore },
    { id: 'btn-mobile-nav-learning', label: '내 학습', icon: BookOpen, active: isDashboardActive, onClick: () => handleNav('dashboard') },
    { id: 'btn-mobile-nav-notifications', label: '알림', icon: Bell, active: false, onClick: handleOpenNotification, badge: unreadCount },
    ...(isAdmin
      ? [{ id: 'btn-mobile-nav-admin', label: '관리자', icon: Shield, active: isAdminActive, onClick: () => onNavigate('admin-dashboard') }]
      : []),
  ];

  return (
    <nav
      aria-label="모바일 하단 탐색"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white/95 px-1 pt-1 pb-[calc(4px+env(safe-area-inset-bottom,0px))] backdrop-blur md:hidden"
    >
      {items.map(({ id, label, icon: Icon, active, onClick, badge }) => (
        <button
          key={id}
          id={id}
          type="button"
          onClick={onClick}
          aria-current={active ? 'page' : undefined}
          className={`flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-lg cursor-pointer touch-manipulation ${
            active ? 'text-brand-600' : 'text-neutral-500'
          }`}
        >
          <span className="relative">
            <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
            {!!badge && badge > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </span>
          <span className={`text-[11px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
        </button>
      ))}
    </nav>
  );
};
