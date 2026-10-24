'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Plus, Package, X, Maximize2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/electron';

interface ProductPickerPanelProps {
  onAddProduct: (product: Product, qty?: number) => void;
  currencySymbol?: string;
}

export function ProductPickerPanel({ onAddProduct }: ProductPickerPanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!isElectron || !open) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function runSearch() {
      setLoading(true);
      try {
        const list = await window.electronAPI.searchProducts(trimmed, 24);
        if (cancelled) return;
        const sliced = (list || []).slice(0, 24);
        setResults(sliced);

        const imageMap: Record<number, string> = {};
        await Promise.all(
          sliced.map(async (p) => {
            if (!p.image_path) return;
            try {
              const img = await window.electronAPI.getProductImage(p.image_path);
              if (img.success && img.dataUrl) imageMap[p.id] = img.dataUrl;
            } catch {
              /* ignore */
            }
          })
        );
        if (!cancelled) setImages((prev) => ({ ...prev, ...imageMap }));
      } catch (err) {
        console.error('Product search error:', err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const t = setTimeout(runSearch, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, isElectron, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function handleAdd(product: Product) {
    onAddProduct(product, 1);
  }

  const trimmed = query.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bp-card flex w-full min-w-0 items-center gap-3 p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Search className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Search product</p>
          <p className="text-xs text-muted-foreground">
            Open catalog popup — browse SKUs with large photos
          </p>
        </div>
        <Maximize2 className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3 sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search products"
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Product catalog
                </h2>
                <p className="text-xs text-muted-foreground">
                  Search by name or SKU — click Add to put on the bill
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="border-b border-border px-4 py-3 sm:px-5">
              <div className="flex h-12 w-full items-center gap-3 rounded-xl border border-input bg-secondary/40 px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type product name or SKU…"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                  autoComplete="off"
                />
                {loading && (
                  <span className="text-xs text-muted-foreground">Searching…</span>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {!trimmed ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                  <Package className="size-12 opacity-40" />
                  <p className="text-sm font-medium">Start typing to find products</p>
                  <p className="max-w-sm text-xs">
                    Photos, SKU, price, stock and details show in a large preview so you can pick the right item.
                  </p>
                </div>
              ) : !loading && results.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No products match “{trimmed}”
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {results.map((product) => (
                    <div
                      key={product.id}
                      className="flex gap-3 rounded-xl border border-border bg-white p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
                        {images[product.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={images[product.id]}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
                            <Package className="size-8 opacity-50" />
                            <span className="text-[10px]">No photo</span>
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="text-base font-bold leading-snug text-foreground">
                          {product.name}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {product.sku || product.code}
                          {product.category_name ? ` · ${product.category_name}` : ''}
                        </p>
                        <p className="mt-1 text-lg font-bold text-primary">
                          {formatCurrency(product.price || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stock: <strong>{product.stock_qty ?? 0}</strong>{' '}
                          {product.unit || 'Piece'}
                          {product.is_out_of_stock
                            ? ' · Out'
                            : product.is_low_stock
                              ? ' · Low'
                              : ''}
                        </p>
                        {(product.attributes || []).length > 0 && (
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {(product.attributes || [])
                              .slice(0, 4)
                              .map((a) => `${a.label}: ${a.value}`)
                              .join(' · ')}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAdd(product)}
                          className="mt-auto inline-flex h-9 w-fit items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-hover)]"
                        >
                          <Plus className="size-4" />
                          Add to bill
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
