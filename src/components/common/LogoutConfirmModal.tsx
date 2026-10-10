import React from 'react';
import { LogOut, X } from 'lucide-react';
import { BaseModal } from './BaseModal';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      showCloseButton={false}
      headerBorder={false}
      asBottomSheetOnMobile={false}
      className="p-4 sm:p-5"
    >
      <div className="space-y-4">
        {/* Header with Logout icon and close button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100/80 shadow-2xs">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 id="logout-dialog-title" className="text-base sm:text-lg font-bold text-slate-900">
                정말 로그아웃하시겠습니까?
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                계정 세션을 종료하시겠습니까?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Informative description */}
        <p
          id="logout-dialog-description"
          className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-100"
        >
          현재까지 진행된 동영상 학습 기록과 변경사항은 안전하게 저장되어 있습니다.
        </p>

        {/* Actions: Cancel & Logout */}
        <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2.5 pt-2">
          <button
            type="button"
            id="logout-cancel-btn"
            onClick={onClose}
            className="w-full sm:w-auto h-10.5 px-4 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
          >
            취소
          </button>
          <button
            type="button"
            id="logout-confirm-btn"
            onClick={onConfirm}
            className="w-full sm:w-auto h-10.5 px-5 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs hover:shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
