import React from 'react';
import {
  Megaphone,
  Calendar,
  AlertCircle,
  Pin,
  X,
  Share2,
  Check,
  Edit,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { BaseModal } from './BaseModal';
import { VerifiedBadge } from './VerifiedBadge';
import { SystemAnnouncement, CourseAnnouncement, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface AnnouncementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: (Partial<SystemAnnouncement> & Partial<CourseAnnouncement>) | null;
  courseTitle?: string;
  onEdit?: () => void;
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  isOpen,
  onClose,
  announcement,
  courseTitle,
  onEdit,
}) => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  if (!announcement) return null;

  const title = announcement.title || '사내 공지사항';
  const content = announcement.content || '';
  const createdAt = announcement.createdAt
    ? new Date(announcement.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const authorName = announcement.authorName || 'TDSN 아카데미 교육운영팀';
  const authorRole = (announcement.authorRole as UserRole) || 'SUPER_ADMIN';
  const priority = announcement.priority || 'important';
  const isPinned = announcement.isPinned;

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${title}\n\n${content}`);
        setCopied(true);
        showToast('공지사항 내용이 클립보드에 복사되었습니다.', 'success', '복사 완료');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      showToast('공지사항 복사에 실패했습니다.', 'error');
    }
  };

  const getPriorityInfo = () => {
    switch (priority) {
      case 'urgent':
        return {
          label: '긴급 공지',
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          dot: 'bg-rose-500',
        };
      case 'important':
        return {
          label: '중요 공지',
          bg: 'bg-amber-50',
          text: 'text-amber-800',
          border: 'border-amber-200',
          dot: 'bg-amber-500',
        };
      default:
        return {
          label: '일반 안내',
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          border: 'border-indigo-200',
          dot: 'bg-indigo-500',
        };
    }
  };

  const priorityStyle = getPriorityInfo();

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      showCloseButton={false}
      headerBorder={false}
      asBottomSheetOnMobile={false}
      className="p-0 overflow-hidden"
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Modal Top Header */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-white">
          <div className="space-y-2.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Priority Indicator */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                <span>{priorityStyle.label}</span>
              </span>

              {/* Pin indicator if pinned */}
              {isPinned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Pin className="w-3 h-3" />
                  <span>상단 고정</span>
                </span>
              )}

              {/* Course Title if Course Announcement */}
              {courseTitle && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[180px] sm:max-w-[260px]">{courseTitle}</span>
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug tracking-tight">
              {title}
            </h2>

            {/* Author & Date metadata (Clean zero-pill typography) */}
            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <span>{authorName}</span>
                <VerifiedBadge role={authorRole} size="xs" showLabel />
              </span>
              {createdAt && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{createdAt}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1 -mt-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50 flex-1">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed sm:leading-loose whitespace-pre-line break-words font-normal">
              {content}
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 sm:px-6 py-3.5 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200/90 transition-colors cursor-pointer"
            title="공지 내용 복사"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? '복사됨' : '공지 복사'}</span>
          </button>

          <div className="flex items-center gap-2">
            {isAdmin && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>공지 수정</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
