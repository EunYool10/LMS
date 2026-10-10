import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    title?: string,
    action?: { label: string; onClick: () => void },
    duration?: number
  ) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'info',
      title?: string,
      action?: { label: string; onClick: () => void },
      duration?: number
    ) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastMessage = { id, message, type, title, action, duration };
      setToasts((prev) => [...prev, newToast]);

      const timeoutDuration = duration ?? (action ? 6000 : 4000);
      setTimeout(() => {
        removeToast(id);
      }, timeoutDuration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const bgMap = {
            success: 'bg-white border-emerald-500/30 text-slate-800 shadow-emerald-500/10',
            error: 'bg-white border-rose-500/30 text-slate-800 shadow-rose-500/10',
            warning: 'bg-white border-amber-500/30 text-slate-800 shadow-amber-500/10',
            info: 'bg-white border-indigo-500/30 text-slate-800 shadow-indigo-500/10',
          };

          const iconMap = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
            error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
            info: <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />,
          };

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all transform translate-y-0 ${bgMap[toast.type]}`}
            >
              {iconMap[toast.type]}
              <div className="flex-1 min-w-0">
                {toast.title && <h4 className="text-sm font-semibold text-slate-900 mb-0.5">{toast.title}</h4>}
                <p className="text-xs text-slate-600 leading-relaxed break-words">{toast.message}</p>
                {toast.action && (
                  <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        toast.action?.onClick();
                        removeToast(toast.id);
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                    >
                      {toast.action.label}
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
