import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Bottom sheet on mobile, right-side drawer on desktop. */
export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          'absolute bg-white shadow-xl flex flex-col animate-slide-up',
          'inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh] sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[480px] sm:rounded-l-2xl sm:rounded-tr-none sm:max-h-none',
        )}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900 truncate">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="btn-ghost !p-2 -mr-2">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">{children}</div>
        {footer && <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">{footer}</div>}
      </div>
    </div>
  );
}
