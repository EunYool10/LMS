import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  Users,
  BarChart3,
  Award,
  Settings,
  ArrowLeft,
  Menu,
  X,
  Megaphone,
  LogOut,
  MessageSquareText,
} from 'lucide-react';
import { useInquirySummary } from '../../services/inquiries';
import { LogoutConfirmModal } from '../common/LogoutConfirmModal';
import { getRoleLabel } from '../../utils/rbac';

interface AdminSidebarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  superOnly?: boolean;
  badge?: number;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, onNavigate }) => {
  const { user, isSuperAdmin, logout } = useAuth();
  const { openCount } = useInquirySummary(user);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuSections: MenuSection[] = [
    {
      title: '운영',
      items: [
        { id: 'admin-dashboard', label: '대시보드', icon: LayoutDashboard },
        { id: 'admin-announcements', label: '공지사항', icon: Megaphone },
        { id: 'admin-inquiries', label: '문의 관리', icon: MessageSquareText, badge: openCount },
      ],
    },
    {
      title: '콘텐츠',
      items: [
        { id: 'admin-courses', label: '강의 관리', icon: BookOpen },
        { id: 'admin-questions', label: '문제 · 퀴즈', icon: FileQuestion },
      ],
    },
    {
      title: '학습자',
      items: [
        { id: 'admin-analytics', label: '학습 현황', icon: BarChart3 },
        { id: 'admin-certificates', label: '수료증 조회', icon: Award },
        { id: 'admin-users', label: '사용자 · 권한', icon: Users },
      ],
    },
    {
      title: '시스템',
      items: [
        { id: 'admin-settings', label: '환경설정', icon: Settings, superOnly: true },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    setIsMobileOpen(false);
  };

  const activeId = currentView === 'admin-courses-edit' || currentView === 'admin-courses-create' ? 'admin-courses' : currentView;
  const activeLabel = menuSections.flatMap((s) => s.items).find((i) => i.id === activeId)?.label || '관리자 콘솔';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4 md:hidden">
        <span className="text-sm font-semibold text-neutral-900">관리자 메뉴</span>
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 cursor-pointer"
          aria-label="메뉴 닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="관리자 메뉴">
        {menuSections.map((section) => {
          const items = section.items.filter((item) => !item.superOnly || isSuperAdmin);
          if (items.length === 0) return null;
          return (
            <div key={section.title}>
              <p className="px-3 pb-1.5 text-xs font-medium text-neutral-400">{section.title}</p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleItemClick(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
                          isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-brand-600' : 'text-neutral-400'}`} />
                        <span className="truncate">{item.label}</span>
                        {!!item.badge && (
                          <span className="ml-auto min-w-[20px] rounded-full bg-amber-500 px-1.5 text-center text-[11px] font-semibold leading-5 text-white tabular-nums">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-neutral-200 p-3">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <Avatar user={user} size="xs" showVerifiedBadge={false} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-neutral-900">{user?.name || '관리자'}</span>
            <span className="block text-xs text-neutral-500">{getRoleLabel(user?.role)}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-neutral-400" />
          학습 포털로 이동
        </button>
        <button
          type="button"
          onClick={() => {
            setIsMobileOpen(false);
            setShowLogoutConfirm(true);
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
        >
          <LogOut className="h-4 w-4 text-neutral-400" />
          로그아웃
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2 md:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100 cursor-pointer"
          aria-label="관리자 메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-neutral-900">{activeLabel}</span>
      </div>

      {isMobileOpen && <div className="fixed inset-0 z-40 bg-neutral-950/40 md:hidden" onClick={() => setIsMobileOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transition-transform duration-200 md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      <aside className="sticky top-16 hidden h-[calc(100dvh-64px)] w-60 shrink-0 border-r border-neutral-200 bg-white md:block">
        {sidebarContent}
      </aside>

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
