import React, { ReactNode } from 'react';
import { BookOpen, PlusCircle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  showAction?: boolean;
  className?: string;
}

/**
 * Common Empty State Component for Mobile and Desktop
 * Responsive container ensuring no layout overflow or clipped text
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title = '등록된 강의가 없습니다',
  description = '새로운 사내 교육 과정이 개설되면 이곳에 표시됩니다.',
  icon,
  actionLabel = '새 강의 개설하기',
  onAction,
  showAction = false,
  className = '',
}) => {
  return (
    <div
      className={`w-full py-10 sm:py-14 px-4 sm:px-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col items-center justify-center text-center space-y-3 select-none ${className}`}
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-0.5 shrink-0">
        {icon || <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.5]" />}
      </div>

      <div className="space-y-1 max-w-md mx-auto">
        <h3 className="text-sm sm:text-base font-bold text-slate-800 leading-snug tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      </div>

      {showAction && onAction && (
        <div className="pt-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onAction}
            className="w-full sm:w-auto py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{actionLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};
