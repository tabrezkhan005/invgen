'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function LowStockBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    let cancelled = false;

    async function load() {
      try {
        const sum = await window.electronAPI.getInventorySummary();
        if (!cancelled) setCount(sum?.low_stock_count || 0);
      } catch {
        /* ignore */
      }
    }

    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-900">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-sm font-semibold">Low stock</AlertTitle>
      <AlertDescription className="text-sm">
        {count} product{count === 1 ? '' : 's'} low on stock.{' '}
        <Link href="/inventory?filter=low" className="font-medium underline underline-offset-2">
          View inventory
        </Link>
      </AlertDescription>
    </Alert>
  );
}
