import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { TDSLogo } from '../common/TDSLogo';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  FileQuestion,
  Users,
  BarChart3,
  Award,
  Settings,
  ArrowLeft,
  Database,
  Menu,
  X,
  Megaphone,
  Shield,
  ChevronRight,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { LogoutConfirmModal } from '../common/LogoutConfirmModal';
import { getRoleLabel, getRoleMetadata } from '../../utils/rbac';

interface AdminSidebarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  superOnly?: boolean;
  badge?: string;
  badgeVariant?: 'purple' | 'indigo' | 'emerald' | 'amber';
  accentColor?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, onNavigate }) => {
  const { user, isSuperAdmin, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuSections: MenuSection[] = [
    {
      title: '학습 및 콘텐츠 관리',
      items: [
        {
          id: 'admin-dashboard',
          label: '관리자 대시보드',
          icon: LayoutDashboard,
          accentColor: 'indigo',
        },
        {
          id: 'admin-courses',
          label: '강의 커리큘럼 관리',
          icon: BookOpen,
          accentColor: 'indigo',
        },
        {
          id: 'admin-courses-create',
          label: '신규 강의 제작',
          icon: PlusCircle,
          accentColor: 'indigo',
        },
        {
          id: 'admin-announcements',
          label: '공지사항 통합 관리',
          icon: Megaphone,
          badge: '시스템 & 강의',
          badgeVariant: 'indigo',
          accentColor: 'indigo',
        },
      ],
    },
    {
      title: '평가 및 퀴즈 출제',
      items: [
        {
          id: 'admin-questions',
          label: '문제 및 퀴즈 출제',
          icon: FileQuestion,
          accentColor: 'amber',
        },
      ],
    },
    {
      title: '학습 데이터 및 통계',
      items: [
        {
          id: 'admin-analytics',
          label: '수강생 학습 기록 & 통계',
          icon: BarChart3,
          accentColor: 'purple',
        },
        {
          id: 'admin-certificates',
          label: '수료증 및 인증번호 조회',
          icon: Award,
          badge: '진위검증',
          badgeVariant: 'amber',
          accentColor: 'amber',
        },
      ],
    },
    {
      title: '시스템 운영 및 진단',
      items: [
        {
          id: 'admin-users',
          label: '사용자 및 권한 관리',
          icon: Users,
          badge: isSuperAdmin ? '최고권한' : undefined,
          badgeVariant: 'purple',
          accentColor: 'purple',
        },
        {
          id: 'admin-diagnostic',
          label: 'DB 무결성 진단 센터',
          icon: Database,
          badge: '정상',
          badgeVariant: 'emerald',
          accentColor: 'emerald',
        },
        {
          id: 'admin-settings',
          label: '전체 시스템 환경설정',
          icon: Settings,
          superOnly: true,
          accentColor: 'slate',
        },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    setIsMobileOpen(false);
  };

  const getBadgeClass = (variant?: 'purple' | 'indigo' | 'emerald' | 'amber') => {
    switch (variant) {
      case 'indigo':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'purple':
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-4 select-none bg-slate-50/60">
      <div className="space-y-4">
        {/* Admin Brand Header */}
        <div className="px-2 pt-1 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TDSLogo size="md" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-black tracking-tight text-slate-900">TDSNTLMS</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Enterprise Admin</span>
              </div>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            aria-label="사이드바 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Admin Identity Card */}
        <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar user={user} size="sm" showVerifiedBadge />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-bold text-xs text-slate-900 truncate">{user?.name || '관리자'}</span>
                {user && <VerifiedBadge role={user.role} size="xs" className="shrink-0" />}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    isSuperAdmin
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}
                >
                  {getRoleLabel(user?.role)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">관리자 콘솔</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grouped Navigation Sections */}
        <nav className="space-y-4 pt-1" aria-label="관리자 메뉴">
          {menuSections.map((section) => {
            const filteredItems = section.items.filter((item) => {
              if (item.superOnly && !isSuperAdmin) return false;
              return true;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <div className="px-3 pb-1 flex items-center justify-between">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </span>
                </div>

                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemClick(item.id)}
                        className={`group relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white font-bold shadow-xs shadow-indigo-600/25'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white hover:border-slate-200/90 hover:shadow-2xs border border-transparent'
                        }`}
                      >
                        {/* Left accent bar for active item */}
                        {isActive && (
                          <span className="absolute left-1 top-2 bottom-2 w-1 bg-white/40 rounded-full" />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0 truncate pl-0.5">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-all ${
                              isActive
                                ? 'text-white'
                                : 'text-slate-400 group-hover:text-indigo-600 group-hover:scale-110'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge ? (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 border ${
                              isActive
                                ? 'bg-white/20 text-white border-white/30'
                                : getBadgeClass(item.badgeVariant)
                            }`}
                          >
                            {item.badge}
                          </span>
                        ) : (
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-all shrink-0 ${
                              isActive
                                ? 'text-white/80'
                                : 'text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-indigo-600'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer Return Action & Logout */}
      <div className="pt-3 border-t border-slate-200/80 mt-4 space-y-2">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="w-full py-2.5 px-3 bg-white hover:bg-indigo-50/80 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200/90 shadow-2xs group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>수강생 포털로 이동</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsMobileOpen(false);
            setShowLogoutConfirm(true);
          }}
          className="w-full py-2 px-3 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200/80 group"
          title="관리자 콘솔 로그아웃"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 transition-colors" />
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Toggle Trigger Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
          aria-label="관리자 메뉴 열기"
        >
          <Menu className="w-4 h-4" />
          <span>관리자 메뉴</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-slate-700">
            {menuSections
              .flatMap((s) => s.items)
              .find((i) => i.id === currentView)?.label || '관리자 콘솔'}
          </span>
        </div>
      </div>

      {/* Mobile Backdrop Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Aside */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-68 bg-white z-50 transform transition-transform duration-200 ease-in-out md:hidden shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-68 bg-white text-slate-700 min-h-[calc(100vh-4.25rem)] border-r border-slate-200/90 shrink-0">
        {sidebarContent}
      </aside>

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
    </>
  );
};
