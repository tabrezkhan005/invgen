'use client';

import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastNotifyProps {
  message: string;
  open: boolean;
  onClose: () => void;
  durationMs?: number;
}

export function ToastNotify({
  message,
  open,
  onClose,
  durationMs = 2800,
}: ToastNotifyProps) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!open || !message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[120] max-w-sm animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <p className="flex-1 text-sm font-medium text-foreground">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
          aria-label="Dismiss"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
