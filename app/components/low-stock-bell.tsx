'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

export function LowStockBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    let cancelled = false;

    async function refresh() {
      try {
        const sum = await window.electronAPI.getInventorySummary();
        if (!cancelled) setCount(sum?.low_stock_count || 0);
      } catch {
        /* ignore */
      }
    }

    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(refresh, 60000);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex size-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Low stock notifications"
        title="Low stock"
      >
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-white p-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {count > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {count} product{count === 1 ? '' : 's'} low on stock.
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No low-stock alerts.</p>
          )}
          {count > 0 && (
            <Link
              href="/inventory?filter=low"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex text-xs font-semibold text-primary underline-offset-2 hover:underline"
            >
              View inventory
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
