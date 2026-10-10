import React, { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  className?: string;
  ariaLabel?: string;
  headerBorder?: boolean;
  noPadding?: boolean;
  asBottomSheetOnMobile?: boolean;
}

const widthMap: Record<NonNullable<BaseModalProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

/**
 * Common BaseModal Component
 * - Single source of truth for all modals across the application
 * - Uniform z-index (z-[9999]), viewport center alignment, overlay/dimmed backdrop
 * - Solid scroll locking and escape key handling
 * - Mounted via React createPortal(..., document.body)
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  headerContent,
  footerContent,
  className = '',
  ariaLabel,
  headerBorder = true,
  noPadding = false,
  asBottomSheetOnMobile = true,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Standard scroll lock and ESC key listener
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen || !mounted) return null;

  const containerClasses = asBottomSheetOnMobile
    ? 'items-end sm:items-center justify-center p-0 sm:p-5'
    : 'items-center justify-center p-3 sm:p-5';

  const modalBoxClasses = asBottomSheetOnMobile
    ? `relative z-10 w-full ${widthMap[maxWidth]} max-h-[88vh] sm:max-h-[90vh] flex flex-col bg-white rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 pb-[calc(8px+env(safe-area-inset-bottom,0px))] sm:pb-0 ${className}`
    : `relative z-10 w-full ${widthMap[maxWidth]} max-h-[90vh] flex flex-col bg-white rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${className}`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : ariaLabel || '모달 대화상자'}
      className={`fixed inset-0 z-[9999] flex ${containerClasses}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      {/* Dimmed Overlay Backdrop with backdrop-blur */}
      <div
        className="fixed inset-0 bg-neutral-950/45 transition-opacity animate-in fade-in duration-150"
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={modalBoxClasses}
      >
        {/* Mobile Bottom Sheet Pull Indicator */}
        {asBottomSheetOnMobile && (
          <div className="sm:hidden pt-2 pb-1 flex justify-center shrink-0">
            <div className="w-10 h-1 rounded-full bg-neutral-300" />
          </div>
        )}

        {/* Header - render if title, headerContent, or close button exists */}
        {(title || headerContent || showCloseButton) && (
          <div
            className={`flex items-center justify-between px-5 sm:px-6 py-4 bg-white shrink-0 ${
              headerBorder ? 'border-b border-neutral-200' : ''
            }`}
          >
            {headerContent ? (
              <div className="w-full mr-2">{headerContent}</div>
            ) : (
              <div>
                {title && (
                  <h3 className="text-base font-semibold text-neutral-900">
                    {title}
                  </h3>
                )}
                {subtitle && <p className="mt-0.5 text-[13px] text-neutral-500">{subtitle}</p>}
              </div>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="ml-2 shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors cursor-pointer"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div
          className={`overflow-y-auto flex-1 ${
            noPadding ? '' : 'p-5 sm:p-6'
          }`}
        >
          {children}
        </div>

        {/* Optional Footer */}
        {footerContent && (
          <div className="shrink-0 border-t border-neutral-200 bg-white px-5 py-3.5 sm:px-6">
            {footerContent}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
