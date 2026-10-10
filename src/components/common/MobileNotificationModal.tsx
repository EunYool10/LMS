import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { SystemNotification } from '../../types';
import {
  Bell,
  X,
  CheckCheck,
  BookOpen,
  FileQuestion,
  Sparkles,
  Megaphone,
  Trash2,
  ExternalLink,
  BellOff,
} from 'lucide-react';

export const openMobileNotificationModal = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-mobile-notifications'));
  }
};

interface MobileNotificationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate: (view: string, param?: string) => void;
}

export const MobileNotificationModal: React.FC<MobileNotificationModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  onNavigate,
}) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [isOpen, setIsOpen] = useState(propIsOpen ?? false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  const loadNotifications = () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      return;
    }
    const notifs = storage.getNotifications(user.id);
    setNotifications(notifs);
  };

  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen]);

  useEffect(() => {
    const handleOpenEvent = () => {
      if (!isAuthenticated) {
        openAuthModal('login');
        return;
      }
      loadNotifications();
      setIsOpen(true);
    };

    window.addEventListener('open-mobile-notifications', handleOpenEvent);
    return () => window.removeEventListener('open-mobile-notifications', handleOpenEvent);
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, user]);

  const handleClose = () => {
    setIsOpen(false);
    propOnClose?.();
  };

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    storage.markNotificationAsRead(id);
    loadNotifications();
  };

  const handleDeleteNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    storage.deleteNotification(user.id, id);
    loadNotifications();
  };

  const handleMarkAllAsRead = () => {
    if (!user) return;
    storage.markAllNotificationsAsRead(user.id);
    loadNotifications();
  };

  const handleNotificationClick = (n: SystemNotification) => {
    handleMarkAsRead(n.id);
    handleClose();
    if (n.link) {
      if (n.link.startsWith('course-detail:')) {
        onNavigate('course-detail', n.link.replace('course-detail:', ''));
      } else if (n.link.startsWith('learn:')) {
        onNavigate('learn', n.link.replace('learn:', ''));
      } else if (n.link === 'dashboard') {
        onNavigate('dashboard');
      } else if (n.link.startsWith('admin-')) {
        onNavigate(n.link);
      } else {
        onNavigate('home');
      }
    }
  };

  const getIcon = (type: SystemNotification['type']) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-4 h-4 text-indigo-600" />;
      case 'quiz':
        return <FileQuestion className="w-4 h-4 text-amber-600" />;
      case 'notice':
        return <Megaphone className="w-4 h-4 text-purple-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return '방금 전';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}분 전`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}시간 전`;
      const diffDays = Math.floor(diffHour / 24);
      if (diffDays < 7) return `${diffDays}일 전`;
      return date.toLocaleDateString('ko-KR');
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-150"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet Box */}
      <div
        className="relative z-51 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200 sm:zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-notification-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 id="mobile-notification-title" className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>알림 센터</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-rose-500 text-white font-extrabold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">수강 공지 및 학습 피드백</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="모두 읽음으로 표시"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>모두 읽음</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification List Body */}
        <div className="p-2 overflow-y-auto divide-y divide-slate-100 flex-1 min-h-[160px] max-h-[60vh]">
          {notifications.length === 0 ? (
            <div className="py-14 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <BellOff className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-600">도착한 알림이 없습니다.</p>
              <p className="text-[11px] text-slate-400">강의 공지 또는 학습 결과가 업데이트되면 알려드립니다.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 text-left relative group ${
                  n.isRead ? 'hover:bg-slate-50 opacity-80' : 'bg-indigo-50/40 hover:bg-indigo-50/70'
                }`}
              >
                {/* Type Icon */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    n.type === 'course'
                      ? 'bg-indigo-100 text-indigo-600'
                      : n.type === 'quiz'
                      ? 'bg-amber-100 text-amber-600'
                      : n.type === 'notice'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs truncate ${n.isRead ? 'font-semibold text-slate-800' : 'font-bold text-slate-900'}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">{getTimeAgo(n.createdAt)}</p>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteNotification(n.id, e)}
                  className="absolute right-2 top-2 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="알림 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>TDSNTLMS 실시간 학습 알림</span>
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
