'use client';

import { useEffect, useRef, useState } from 'react';
import { Package, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/electron';

interface QtyPromptProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (product: Product, qty: number) => void;
  imageUrl?: string | null;
}

export function QtyPrompt({
  product,
  open,
  onClose,
  onConfirm,
  imageUrl,
}: QtyPromptProps) {
  const [qty, setQty] = useState('1');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQty('1');
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 40);
    return () => clearTimeout(t);
  }, [open, product?.id]);

  if (!open || !product) return null;

  function submit() {
    if (!product) return;
    const n = Math.max(1, Number(qty) || 1);
    onConfirm(product, n);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <Package className="size-6 opacity-50" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{product.name}</p>
              {product.bill_name?.trim() &&
                product.bill_name.trim() !== product.name && (
                  <p className="truncate text-xs text-muted-foreground">
                    On bill: {product.bill_name.trim()}
                  </p>
                )}
              <p className="font-mono text-xs text-muted-foreground">
                {product.sku || product.code}
              </p>
              <p className="text-sm font-bold text-primary">
                {formatCurrency(product.price || 0)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div>
          <label className="bp-label">Quantity</label>
          <input
            ref={inputRef}
            type="number"
            min="1"
            step="1"
            className="bp-input text-lg font-semibold"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
              if (e.key === 'Escape') onClose();
            }}
          />
        </div>

        <div className="flex gap-2">
          <button type="button" className="bp-btn-outline flex-1" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="bp-btn-primary flex-1" onClick={submit}>
            Add to bill
          </button>
        </div>
      </div>
    </div>
  );
}
