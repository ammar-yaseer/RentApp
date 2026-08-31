import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const newToast: Toast = { id, duration: 4000, ...t };
    setToasts((prev) => [...prev, newToast]);
    if (newToast.duration) {
      setTimeout(() => remove(id), newToast.duration);
    }
  }, [remove]);

  const success = useCallback((title: string, message?: string) => toast({ type: 'success', title, message }), [toast]);
  const error = useCallback((title: string, message?: string) => toast({ type: 'error', title, message, duration: 6000 }), [toast]);
  const info = useCallback((title: string, message?: string) => toast({ type: 'info', title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: 'warning', title, message, duration: 5000 }), [toast]);

  const icons = {
    success: <CheckCircle2 size={20} className="text-green-600" />,
    error: <AlertTriangle size={20} className="text-red-600" />,
    info: <Info size={20} className="text-blue-600" />,
    warning: <AlertTriangle size={20} className="text-amber-600" />,
  };

  const borders = {
    success: 'border-green-200',
    error: 'border-red-200',
    info: 'border-blue-200',
    warning: 'border-amber-200',
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      {/* Toast container — fixed at top on mobile, top-right on desktop */}
      <div className="fixed top-0 inset-x-0 z-[100] px-3 pt-2 sm:top-4 sm:right-4 sm:left-auto sm:inset-x-auto sm:w-96 pointer-events-none">
        <div className="space-y-2 pointer-events-auto">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl bg-white border shadow-lg animate-slide-up',
                borders[t.type]
              )}
            >
              <div className="shrink-0 mt-0.5">{icons[t.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900">{t.title}</p>
                {t.message && <p className="text-xs text-slate-600 mt-0.5">{t.message}</p>}
              </div>
              <button onClick={() => remove(t.id)} className="shrink-0 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
