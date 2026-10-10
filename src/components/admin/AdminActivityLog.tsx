import React, { useState } from 'react';
import { storage } from '../../services/storage';
import { AuditLog } from '../../types';
import {
  Activity,
  BookOpen,
  Megaphone,
  Users,
  Layers,
  Trash2,
  Edit2,
  PlusCircle,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface AdminActivityLogProps {
  limit?: number;
  showFilters?: boolean;
  className?: string;
  onNavigate?: (view: string, param?: string) => void;
}

export const AdminActivityLog: React.FC<AdminActivityLogProps> = ({
  limit = 10,
  showFilters = true,
  className = '',
  onNavigate,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>(() => storage.getAuditLogs());
  const [filter, setFilter] = useState<'all' | 'course' | 'announcement' | 'user' | 'bulk'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLogs(storage.getAuditLogs());
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'course') {
      return (
        log.action.includes('COURSE') ||
        Boolean(log.targetCourseId) ||
        Boolean(log.targetCourseTitle)
      );
    }
    if (filter === 'announcement') {
      return (
        log.action.includes('ANNOUNCEMENT') ||
        Boolean(log.targetAnnouncementId) ||
        Boolean(log.targetAnnouncementTitle)
      );
    }
    if (filter === 'user') {
      return (
        log.action.includes('USER') ||
        log.action.includes('ROLE') ||
        log.action.includes('STATUS') ||
        Boolean(log.targetUserId)
      );
    }
    if (filter === 'bulk') {
      return log.action.includes('BULK');
    }
    return true;
  });

  const displayLogs = filteredLogs.slice(0, limit);

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return '방금 전';
      if (diffMin < 60) return `${diffMin}분 전`;
      if (diffHour < 24) return `${diffHour}시간 전`;
      if (diffDay < 7) return `${diffDay}일 전`;
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const getActionConfig = (action: string) => {
    switch (action) {
      case 'COURSE_CREATE':
        return {
          label: '강의 생성',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          icon: PlusCircle,
          iconColor: 'text-emerald-600',
        };
      case 'COURSE_UPDATE':
        return {
          label: '강의 수정',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          icon: Edit2,
          iconColor: 'text-indigo-600',
        };
      case 'COURSE_DELETE':
        return {
          label: '강의 삭제',
          color: 'bg-rose-50 text-rose-700 border-rose-200/80',
          icon: Trash2,
          iconColor: 'text-rose-600',
        };
      case 'ANNOUNCEMENT_CREATE':
        return {
          label: '공지 등록',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          icon: Megaphone,
          iconColor: 'text-indigo-600',
        };
      case 'ANNOUNCEMENT_UPDATE':
        return {
          label: '공지 수정',
          color: 'bg-amber-50 text-amber-700 border-amber-200/80',
          icon: Megaphone,
          iconColor: 'text-amber-600',
        };
      case 'ANNOUNCEMENT_DELETE':
        return {
          label: '공지 삭제',
          color: 'bg-rose-50 text-rose-700 border-rose-200/80',
          icon: Trash2,
          iconColor: 'text-rose-600',
        };
      case 'BULK_UPDATE':
        return {
          label: '일괄 수정',
          color: 'bg-blue-50 text-blue-700 border-blue-200/80',
          icon: Layers,
          iconColor: 'text-blue-600',
        };
      case 'BULK_DELETE':
        return {
          label: '일괄 삭제',
          color: 'bg-rose-50 text-rose-700 border-rose-200/80',
          icon: Trash2,
          iconColor: 'text-rose-600',
        };
      case 'UPDATE_ROLE':
        return {
          label: '권한 변경',
          color: 'bg-purple-50 text-purple-700 border-purple-200/80',
          icon: Users,
          iconColor: 'text-purple-600',
        };
      case 'UPDATE_STATUS':
        return {
          label: '상태 변경',
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Users,
          iconColor: 'text-slate-600',
        };
      default:
        return {
          label: action,
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Activity,
          iconColor: 'text-slate-600',
        };
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <span>관리자 활동 감사 로그</span>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {logs.length}건 기록됨
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              강의 개설, 공지사항 등록, 회원 상태 변경 등 주요 관리자 작업 이력입니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="self-end sm:self-auto p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
          title="새로고침"
          aria-label="로그 새로고침"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      {/* Filter Chips */}
      {showFilters && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            전체 활동
          </button>
          <button
            type="button"
            onClick={() => setFilter('course')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              filter === 'course'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>강의 관리</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('announcement')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              filter === 'announcement'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Megaphone className="w-3 h-3" />
            <span>공지사항</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('user')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              filter === 'user'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>회원 및 권한</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('bulk')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              filter === 'bulk'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>일괄 작업</span>
          </button>
        </div>
      )}

      {/* Log list */}
      <div className="space-y-2.5">
        {displayLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            기록된 관리자 작업 내역이 없습니다.
          </div>
        ) : (
          displayLogs.map((log) => {
            const config = getActionConfig(log.action);
            const Icon = config.icon;

            return (
              <div
                key={log.id}
                className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/60 transition-colors text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${config.color}`}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{config.label}</span>
                    </span>
                    <span className="font-bold text-slate-900 truncate">
                      {log.actorName || '시스템 관리자'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(log.timestamp)}</span>
                  </div>
                </div>

                <p className="text-slate-600 leading-relaxed pl-1 text-[11px]">
                  {log.details}
                </p>

                {(log.targetCourseTitle || log.targetAnnouncementTitle) && (
                  <div className="pt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-500">대상 항목:</span>
                    <span className="font-medium text-slate-700 truncate max-w-xs">
                      {log.targetCourseTitle || log.targetAnnouncementTitle}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {filteredLogs.length > limit && (
        <div className="pt-2 border-t border-slate-100 text-center">
          <span className="text-[11px] text-slate-400 font-medium">
            최근 {limit}개 항목 표시 중 (전체 {filteredLogs.length}개)
          </span>
        </div>
      )}
    </div>
  );
};
