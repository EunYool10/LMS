import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './Avatar';
import { NotificationDropdown } from './NotificationDropdown';
import { BrandLogo } from './BrandLogo';
import { ChevronDown, LayoutDashboard, LogOut, Megaphone, Menu, Settings, Shield, X } from 'lucide-react';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { getRoleLabel } from '../../utils/rbac';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, isAuthenticated, isAdmin, logout, openAuthModal } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const go = (view: string, param?: string) => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
    onNavigate(view, param);
  };

  const isAdminView = currentView.startsWith('admin');
  const links = [
    { id: 'nav-link-courses', label: '강의', view: 'home', active: currentView === 'home' || currentView === 'course-detail', show: true },
    { id: 'nav-link-my-learning', label: '내 학습', view: 'dashboard', active: currentView === 'dashboard', show: isAuthenticated },
    { id: 'nav-link-admin-console', label: '관리자', view: 'admin-dashboard', active: isAdminView, show: isAdmin },
  ].filter((l) => l.show);

  const menuItem =
    'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className={`flex h-16 items-center gap-6 ${isAdminView ? 'px-4 sm:px-6' : 'lms-container'}`}>
        <BrandLogo onClick={() => go('home')} />

        <nav className="hidden h-full items-stretch gap-1 md:flex" aria-label="메인 메뉴">
          {links.map((l) => (
            <button
              key={l.view}
              id={l.id}
              type="button"
              onClick={() => go(l.view)}
              aria-current={l.active ? 'page' : undefined}
              className={`relative flex items-center px-3 text-[15px] font-medium transition-colors cursor-pointer ${
                l.active ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {l.label}
              {l.active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-600" />}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <NotificationDropdown onNavigate={onNavigate} />

          {isAuthenticated && user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                id="btn-nav-profile-menu"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-expanded={isProfileOpen}
                aria-haspopup="menu"
                className="flex h-9 items-center gap-2 rounded-full pl-0.5 pr-1 sm:pr-2.5 hover:bg-neutral-100 cursor-pointer"
              >
                <Avatar user={user} size="xs" showVerifiedBadge={false} showOrnaments={false} />
                <span className="hidden max-w-[120px] truncate text-sm font-medium text-neutral-800 sm:block">{user.name}</span>
                <ChevronDown className="hidden w-4 h-4 text-neutral-400 sm:block" />
              </button>

              {isProfileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg"
                >
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar user={user} size="sm" showVerifiedBadge={false} showOrnaments={false} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">{user.name}</p>
                      <p className="truncate text-xs text-neutral-500">{user.email}</p>
                      <p className="mt-0.5 text-xs font-medium text-brand-700">{getRoleLabel(user.role)}</p>
                    </div>
                  </div>
                  <div className="my-1 h-px bg-neutral-100" />
                  <button type="button" role="menuitem" id="btn-menu-account-settings" onClick={() => go('account-settings')} className={menuItem}>
                    <Settings className="w-4 h-4 text-neutral-400" />
                    프로필 · 계정 설정
                  </button>
                  <button type="button" role="menuitem" onClick={() => go('dashboard')} className={menuItem}>
                    <LayoutDashboard className="w-4 h-4 text-neutral-400" />
                    내 학습
                  </button>
                  {isAdmin && (
                    <>
                      <button type="button" role="menuitem" onClick={() => go('admin-dashboard')} className={menuItem}>
                        <Shield className="w-4 h-4 text-neutral-400" />
                        관리자 콘솔
                      </button>
                      <button type="button" role="menuitem" onClick={() => go('admin-settings')} className={menuItem}>
                        <Megaphone className="w-4 h-4 text-neutral-400" />
                        시스템 설정 · 공지
                      </button>
                    </>
                  )}
                  <div className="my-1 h-px bg-neutral-100" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className={`${menuItem} text-rose-600 hover:bg-rose-50`}
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => openAuthModal('login')} className="lms-btn lms-btn-ghost lms-btn-sm">
                로그인
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="lms-btn lms-btn-primary lms-btn-sm hidden xs:inline-flex"
              >
                회원가입
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 md:hidden cursor-pointer"
            aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-neutral-200 bg-white px-4 py-3 md:hidden">
          <nav className="space-y-0.5" aria-label="모바일 메뉴">
            {links.map((l) => (
              <button
                key={l.view}
                type="button"
                onClick={() => go(l.view)}
                className={`flex w-full rounded-md px-3 py-2.5 text-left text-[15px] font-medium cursor-pointer ${
                  l.active ? 'bg-brand-50 text-brand-700' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {l.label}
              </button>
            ))}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => go('account-settings')}
                className={`flex w-full rounded-md px-3 py-2.5 text-left text-[15px] font-medium cursor-pointer ${
                  currentView === 'account-settings' ? 'bg-brand-50 text-brand-700' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                프로필 · 계정 설정
              </button>
            )}
          </nav>
          <div className="mt-3 border-t border-neutral-100 pt-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="lms-btn lms-btn-secondary w-full text-rose-600"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('login');
                  }}
                  className="lms-btn lms-btn-secondary"
                >
                  로그인
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('register');
                  }}
                  className="lms-btn lms-btn-primary"
                >
                  회원가입
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          logout();
          setShowLogoutConfirm(false);
          onNavigate('home');
        }}
      />
    </header>
  );
};
