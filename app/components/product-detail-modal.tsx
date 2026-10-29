'use client';

import { Package, ShoppingCart, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/electron';

interface ProductDetailModalProps {
  product: Product | null;
  imageUrl?: string | null;
  open: boolean;
  onClose: () => void;
  onAddToBill?: (product: Product) => void;
}

export function ProductDetailModal({
  product,
  imageUrl,
  open,
  onClose,
  onAddToBill,
}: ProductDetailModalProps) {
  if (!open || !product) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className="relative grid max-h-[92vh] w-full max-w-3xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl sm:grid-cols-[1.1fr_1fr]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full border border-border bg-white/95 p-2 text-muted-foreground shadow-sm hover:bg-secondary hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="flex min-h-[220px] items-center justify-center bg-secondary/60 p-4 sm:min-h-[360px]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={product.name}
              className="max-h-[70vh] w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Package className="size-16 opacity-40" />
              <span className="text-sm">No photo</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-5 sm:p-6">
          <div>
            <h2 className="pr-8 text-xl font-bold tracking-tight text-foreground">
              {product.name}
            </h2>
            {product.bill_name?.trim() &&
              product.bill_name.trim() !== product.name && (
                <p className="mt-1 text-sm text-muted-foreground">
                  On bill: <span className="font-medium text-foreground">{product.bill_name.trim()}</span>
                </p>
              )}
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {product.sku || product.code}
              {product.category_name ? ` · ${product.category_name}` : ''}
            </p>
          </div>

          <p className="text-2xl font-bold text-primary">
            {formatCurrency(product.price || 0)}
          </p>

          <p className="text-sm text-muted-foreground">
            Stock:{' '}
            <strong className="text-foreground">{product.stock_qty ?? 0}</strong>{' '}
            {product.unit || 'Piece'}
            {product.is_out_of_stock
              ? ' · Out of stock'
              : product.is_low_stock
                ? ' · Low stock'
                : ''}
          </p>

          {(product.attributes || []).length > 0 && (
            <div className="space-y-1.5 rounded-xl border border-border bg-secondary/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Details
              </p>
              {(product.attributes || []).map((a, i) => (
                <div key={`${a.label}-${i}`} className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{a.label}</span>
                  <span className="font-medium text-foreground">{a.value}</span>
                </div>
              ))}
            </div>
          )}

          {onAddToBill && (
            <button
              type="button"
              onClick={() => {
                onAddToBill(product);
                onClose();
              }}
              className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-hover)]"
            >
              <ShoppingCart className="size-4" />
              Add to bill
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
