'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Warehouse, Package, AlertTriangle, TrendingDown, Plus, Minus, RefreshCw
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { formatCurrency } from '@/lib/utils';
import type { InventoryMovement, InventorySummary, Product } from '@/types/electron';

export default function InventoryPage() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjust'>('in');
  const [adjustQty, setAdjustQty] = useState('1');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustStockValue, setAdjustStockValue] = useState('');

  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const f = new URLSearchParams(window.location.search).get('filter');
    if (f === 'low' || f === 'out' || f === 'all') setFilter(f);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 220);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!isElectron) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const stockFilter = filter === 'all' ? undefined : filter;
      const [sum, pageResult, low, moves] = await Promise.all([
        window.electronAPI.getInventorySummary(),
        window.electronAPI.getProductsPaginated({
          page,
          pageSize,
          query: debouncedSearch || undefined,
          stockFilter,
        }),
        window.electronAPI.getLowStockProducts(),
        window.electronAPI.getInventoryMovements({ limit: 40 }),
      ]);
      setSummary(sum);
      setProducts(pageResult?.items || []);
      setTotal(pageResult?.total || 0);
      setLowStock(low || []);
      setMovements(moves || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [isElectron, page, pageSize, debouncedSearch, filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter]);

  // Filtering is done server-side via getProductsPaginated
  const filtered = products;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function openAdjust(product: Product, type: 'in' | 'out' | 'adjust' = 'in') {
    setAdjustProduct(product);
    setAdjustType(type);
    setAdjustQty('1');
    setAdjustStockValue(String(product.stock_qty ?? 0));
    setAdjustNote('');
  }

  async function submitAdjust() {
    if (!adjustProduct || !isElectron) return;
    try {
      setError('');
      let qtyChange = Number(adjustQty);
      if (adjustType === 'adjust') {
        qtyChange = Number(adjustStockValue) - Number(adjustProduct.stock_qty || 0);
      }
      if (!qtyChange) {
        setError('Enter a quantity to change');
        return;
      }
      const result = await window.electronAPI.adjustInventory({
        productId: adjustProduct.id,
        qtyChange,
        type: adjustType,
        note: adjustNote.trim(),
      });
      if (result.success) {
        setSuccess(`Stock updated for ${adjustProduct.name}`);
        setAdjustProduct(null);
        load();
        setTimeout(() => setSuccess(''), 2500);
      } else {
        setError(result.message || 'Failed to update stock');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update stock');
    }
  }

  return (
    <AppLayout
      title="Inventory"
      subtitle="Track stock levels for your designs"
      actionButton={
        <button type="button" onClick={load} className="bp-btn-outline h-9 gap-1.5 px-3">
          <RefreshCw className="size-3.5" />
          Refresh
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError('')}>dismiss</button>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bp-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Package className="size-3.5" /> Products
          </div>
          <p className="mt-1 text-2xl font-bold">{summary?.total_products ?? '—'}</p>
        </div>
        <div className="bp-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Warehouse className="size-3.5" /> Total units
          </div>
          <p className="mt-1 text-2xl font-bold">{summary?.total_units ?? '—'}</p>
        </div>
        <div className="bp-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            Stock value
          </div>
          <p className="mt-1 text-2xl font-bold">
            {summary ? formatCurrency(summary.stock_value) : '—'}
          </p>
        </div>
        <div className="bp-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <AlertTriangle className="size-3.5 text-amber-600" /> Low / Out
          </div>
          <p className="mt-1 text-2xl font-bold">
            {summary?.low_stock_count ?? 0}
            <span className="text-base font-medium text-muted-foreground">
              {' '}/ {summary?.out_of_stock_count ?? 0}
            </span>
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SKU or name…"
          className="bp-input max-w-xs"
        />
        {(['all', 'low', 'out'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              filter === f
                ? 'bg-primary text-white'
                : 'border border-border bg-white text-muted-foreground hover:bg-secondary'
            }`}
          >
            {f === 'all' ? 'All stock' : f === 'low' ? `Low stock (${lowStock.length})` : 'Out of stock'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading inventory…</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="bp-card overflow-hidden min-w-0">
            <div className="table-container overflow-x-auto">
              <table className="bp-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Stock</th>
                    <th>Unit</th>
                    <th>Value</th>
                    <th>Status</th>
                    <th className="text-right">Adjust</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground">
                        No products match this filter.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category_name || '—'}</p>
                        </td>
                        <td className="font-mono text-xs">{p.sku}</td>
                        <td className="font-bold">{p.stock_qty}</td>
                        <td className="text-muted-foreground text-xs">{p.unit || 'Piece'}</td>
                        <td>{formatCurrency((p.stock_qty || 0) * (p.price || 0))}</td>
                        <td>
                          {p.is_out_of_stock ? (
                            <span className="bp-badge bg-red-100 text-red-700">Out</span>
                          ) : p.is_low_stock ? (
                            <span className="bp-badge bg-amber-100 text-amber-800">Low</span>
                          ) : (
                            <span className="bp-badge bg-emerald-100 text-emerald-800">OK</span>
                          )}
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              title="Stock in"
                              onClick={() => openAdjust(p, 'in')}
                              className="rounded-md border border-border p-1.5 text-emerald-700 hover:bg-emerald-50"
                            >
                              <Plus className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Stock out"
                              onClick={() => openAdjust(p, 'out')}
                              className="rounded-md border border-border p-1.5 text-red-600 hover:bg-red-50"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Set stock"
                              onClick={() => openAdjust(p, 'adjust')}
                              className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-secondary"
                            >
                              Set
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
                <span>
                  Page {page} of {totalPages} · {total} products
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bp-card min-w-0 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingDown className="size-4 text-primary" />
              Recent movements
            </h3>
            <div className="max-h-[520px] space-y-2 overflow-y-auto">
              {movements.length === 0 ? (
                <p className="text-xs text-muted-foreground">No stock movements yet.</p>
              ) : (
                movements.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{m.product_name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{m.sku}</p>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-bold ${
                          m.qty >= 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {m.qty >= 0 ? '+' : ''}
                        {m.qty}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {m.type} · bal {m.balance_after}
                      {m.note ? ` · ${m.note}` : ''}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">
              {adjustType === 'in' ? 'Stock in' : adjustType === 'out' ? 'Stock out' : 'Set stock'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {adjustProduct.name}{' '}
              <span className="font-mono">({adjustProduct.sku})</span>
              <br />
              Current: <strong>{adjustProduct.stock_qty}</strong> {adjustProduct.unit || 'Piece'}
            </p>

            {adjustType === 'adjust' ? (
              <div>
                <label className="bp-label">New stock quantity</label>
                <input
                  type="number"
                  className="bp-input"
                  value={adjustStockValue}
                  onChange={(e) => setAdjustStockValue(e.target.value)}
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <label className="bp-label">Quantity</label>
                <input
                  type="number"
                  min="0.01"
                  step="1"
                  className="bp-input"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="bp-label">Note (optional)</label>
              <input
                className="bp-input"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="e.g. New purchase / damaged / count correction"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="bp-btn-outline" onClick={() => setAdjustProduct(null)}>
                Cancel
              </button>
              <button type="button" className="bp-btn-primary" onClick={submitAdjust}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
