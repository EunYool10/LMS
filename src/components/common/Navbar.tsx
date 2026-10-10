import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { NotificationDropdown } from './NotificationDropdown';
import { BrandLogo } from './BrandLogo';
import {
  LayoutDashboard,
  Shield,
  LogOut,
  ChevronDown,
  BookOpen,
  Menu,
  X,
  Settings,
  Megaphone,
} from 'lucide-react';
import { UserRole } from '../../types';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { getRoleLabel, getRoleMetadata } from '../../utils/rbac';

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
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (view: string, param?: string) => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
    onNavigate(view, param);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-2xs select-none">
      {/* Container: max-width 1360px, modern responsive layout */}
      <div className="max-w-[1360px] mx-auto px-2.5 xs:px-4 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Brand Logo & Modern Navigation Tabs */}
        <div className="flex items-center gap-3 sm:gap-5 lg:gap-7 min-w-0 shrink-0">
          <BrandLogo onClick={() => handleNavClick('home')} />

          {/* Desktop Segmented Navigation Bar */}
          <nav
            className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60"
            aria-label="메인 네비게이션"
          >
            <button
              type="button"
              id="nav-link-courses"
              onClick={() => handleNavClick('home')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] transition-all duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                currentView === 'home'
                  ? 'bg-white text-indigo-700 font-bold shadow-2xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${currentView === 'home' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>강의 목록</span>
            </button>

            {isAuthenticated && (
              <button
                type="button"
                id="nav-link-my-learning"
                onClick={() => handleNavClick('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] transition-all duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  currentView === 'dashboard'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
                }`}
              >
                <LayoutDashboard className={`w-3.5 h-3.5 ${currentView === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>내 학습</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                id="nav-link-admin-console"
                onClick={() => handleNavClick('admin-dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  currentView.startsWith('admin')
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'text-indigo-700 hover:bg-indigo-50/80 font-bold border border-indigo-200/70'
                }`}
              >
                <Shield className={`w-3.5 h-3.5 ${currentView.startsWith('admin') ? 'text-white' : 'text-indigo-600'}`} />
                <span>관리자 콘솔</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right: Notifications, User Profile & Auth, Mobile Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

          {/* Notification dropdown */}
          <NotificationDropdown onNavigate={onNavigate} />

          {/* User Profile / Auth Action Buttons */}
          {isAuthenticated && user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                id="btn-nav-profile-menu"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="h-9 flex items-center gap-1.5 sm:gap-2 px-1.5 sm:pl-1.5 sm:pr-3 rounded-full border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80 transition-all cursor-pointer bg-white shadow-2xs group shrink-0"
                aria-expanded={isProfileOpen}
              >
                <Avatar user={user} size="xs" showVerifiedBadge={false} showOrnaments={false} />
                <div className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 min-w-0">
                  <span className="truncate max-w-[80px] lg:max-w-[120px]">{user.name}</span>
                  <VerifiedBadge role={user.role} size="xs" className="shrink-0" />
                </div>
                <span
                  className={`hidden md:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    getRoleMetadata(user.role)?.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {getRoleLabel(user.role)}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform hidden xs:block" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-[min(calc(100vw-24px),260px)] bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Card Header */}
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 min-w-0">
                    <Avatar user={user} size="sm" showVerifiedBadge={false} showOrnaments={false} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                        <VerifiedBadge role={user.role} size="xs" className="shrink-0" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 shrink-0">
                          {getRoleLabel(user.role)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="p-1 space-y-0.5">
                    <button
                      type="button"
                      id="btn-menu-account-settings"
                      onClick={() => handleNavClick('account-settings')}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>내 프로필 & 계정 설정</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavClick('dashboard')}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>내 학습 대시보드</span>
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleNavClick('admin-dashboard')}
                          className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                        >
                          <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>관리자 콘솔 바로가기</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavClick('admin-settings')}
                          className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                        >
                          <Megaphone className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>시스템 설정 & 공지 관리</span>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-100 my-1" />

                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full h-9 px-3 rounded-xl text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>로그아웃</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="h-9 px-3 sm:px-3.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-indigo-600 rounded-xl hover:bg-indigo-50/60 transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center"
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="hidden xs:flex h-9 px-3.5 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer items-center justify-center"
              >
                회원가입
              </button>
            </div>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden h-9 w-9 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="메뉴 열기"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center gap-2.5 ${
              currentView === 'home'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold'
            }`}
          >
            <BookOpen className="w-4 h-4 opacity-80" />
            <span>강의 목록</span>
          </button>

          {isAuthenticated && (
            <>
              <button
                type="button"
                onClick={() => handleNavClick('dashboard')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center gap-2.5 ${
                  currentView === 'dashboard'
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 opacity-80" />
                <span>내 학습</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('account-settings')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center gap-2.5 ${
                  currentView === 'account-settings'
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold'
                }`}
              >
                <Settings className="w-4 h-4 opacity-80" />
                <span>내 프로필 & 계정 설정</span>
              </button>
            </>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleNavClick('admin-dashboard')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2.5 cursor-pointer transition-colors ${
                currentView.startsWith('admin') ? 'bg-indigo-50' : ''
              }`}
            >
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>관리자 콘솔</span>
            </button>
          )}

          {isAuthenticated ? (
            <div className="pt-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="w-full h-10.5 px-3.5 rounded-xl text-xs sm:text-sm font-bold text-rose-600 bg-rose-50/70 hover:bg-rose-100 border border-rose-200/80 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>
            </div>
          ) : (
            <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal('login');
                }}
                className="h-10.5 flex items-center justify-center text-xs sm:text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal('register');
                }}
                className="h-10.5 flex items-center justify-center text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                회원가입
              </button>
            </div>
          )}
        </div>
      )}

      {/* Logout Confirmation Dialog Modal (Rendered via React Portal directly into document.body) */}
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
