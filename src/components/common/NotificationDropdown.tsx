import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { SystemNotification } from '../../types';
import { VerifiedBadge } from './VerifiedBadge';
import { Bell, Check, CheckCheck, BookOpen, FileQuestion, Sparkles, Megaphone, Trash2 } from 'lucide-react';

interface NotificationDropdownProps {
  onNavigate: (view: string, param?: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onNavigate }) => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      return;
    }
    const notifs = storage.getNotifications(user.id);
    setNotifications(notifs);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [user, isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    storage.markNotificationAsRead(id);
    loadNotifications();
  };

  const handleMarkAllAsRead = () => {
    if (!user) return;
    storage.markAllNotificationsAsRead(user.id);
    loadNotifications();
  };

  const handleNotificationClick = (n: SystemNotification) => {
    handleMarkAsRead(n.id);
    setIsOpen(false);
    if (n.link) {
      if (n.link.startsWith('course-detail:')) {
        onNavigate('course-detail', n.link.replace('course-detail:', ''));
      } else if (n.link.startsWith('learn:')) {
        onNavigate('learn', n.link.replace('learn:', ''));
      } else if (n.link === 'dashboard') {
        onNavigate('dashboard');
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

  if (!isAuthenticated || !user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
        aria-label="알림 열기"
        aria-expanded={isOpen}
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute -right-8 sm:right-0 mt-2 w-[min(calc(100vw-24px),360px)] bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">알림</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {unreadCount}개 안 읽음
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 cursor-pointer flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>모두 읽음</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p>새로운 알림이 없습니다.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer ${
                    !n.isRead ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                        {n.type === 'notice' && (
                          <VerifiedBadge role="SUPER_ADMIN" size="xs" className="shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(n.createdAt).toLocaleDateString('ko-KR', {
                          month: 'numeric',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="text-slate-400 hover:text-indigo-600 p-1 shrink-0"
                      title="읽음 처리"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
