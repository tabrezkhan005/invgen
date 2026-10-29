'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Search, ImagePlus, X, Package, Edit2, Trash2,
  ShoppingCart, Tag, LayoutGrid, List, Printer
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { ProductBarcode } from '../components/product-barcode';
import { BarcodeLabelSheet } from '../components/barcode-label-sheet';
import { ProductDetailModal } from '../components/product-detail-modal';
import { QtyPrompt } from '../components/qty-prompt';
import { ToastNotify } from '../components/toast-notify';
import { formatCurrency } from '@/lib/utils';
import { productToBillItem, queuePendingBillItems } from '@/lib/pending-bill-items';
import type { Product, ProductAttribute, ProductCategory } from '@/types/electron';

interface AttrDraft {
  label: string;
  value: string;
}

interface ProductFormState {
  name: string;
  bill_name: string;
  sku: string;
  price: string;
  category_id: number | null;
  image_path: string | null;
  barcode_payload: string;
  stock_qty: string;
  low_stock_threshold: string;
  unit: string;
  attributes: AttrDraft[];
  _fileName?: string;
}

function emptyForm(): ProductFormState {
  return {
    name: '',
    bill_name: '',
    sku: '',
    price: '',
    category_id: null,
    image_path: null,
    barcode_payload: '',
    stock_qty: '0',
    low_stock_threshold: '10',
    unit: 'Piece',
    attributes: [
      { label: '', value: '' },
      { label: '', value: '' },
    ],
  };
}

function buildDefaultPayload(sku: string, name: string, price: string) {
  return `${sku || 'SKU'}|${name || 'Item'}|${Number(price || 0)}`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 40;
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [labelProducts, setLabelProducts] = useState<Product[]>([]);
  const [showLabels, setShowLabels] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [qtyProduct, setQtyProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastOpen, setToastOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormState>(emptyForm());
  const [newCategoryName, setNewCategoryName] = useState('');

  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    if (!showForm) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showForm]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 220);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter]);

  const loadProductImages = useCallback(async (productList: Product[]) => {
    if (!isElectron) return;
    const imageMap: Record<number, string> = {};
    await Promise.all(
      productList.map(async (product) => {
        if (!product.image_path) return;
        try {
          const result = await window.electronAPI.getProductImage(product.image_path);
          if (result.success && result.dataUrl) imageMap[product.id] = result.dataUrl;
        } catch {
          /* ignore */
        }
      })
    );
    setProductImages((prev) => ({ ...prev, ...imageMap }));
  }, [isElectron]);

  const loadCategories = useCallback(async () => {
    if (!isElectron) return;
    try {
      setCategories((await window.electronAPI.getProductCategories()) || []);
    } catch (err) {
      console.error(err);
    }
  }, [isElectron]);

  const loadProducts = useCallback(async () => {
    if (!isElectron) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const result = await window.electronAPI.getProductsPaginated({
        page,
        pageSize,
        query: debouncedSearch || undefined,
        categoryId: categoryFilter === 'all' ? null : Number(categoryFilter),
      });
      const items = result?.items || [];
      setProducts(items);
      setFilteredProducts(items);
      setTotal(result?.total || 0);
      loadProductImages(items);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isElectron, loadProductImages, page, pageSize, debouncedSearch, categoryFilter]);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
    }
  }

  function openLabels(list: Product[]) {
    if (!list.length) return;
    setLabelProducts(list);
    setShowLabels(true);
  }

  async function saveImageIfNeeded(
    preview: string | null,
    fileName: string | undefined,
    existingPath: string | null
  ): Promise<string | null> {
    if (preview?.startsWith('data:') && fileName && isElectron) {
      const imageResult = await window.electronAPI.saveProductImage(preview, fileName);
      if (imageResult.success) return imageResult.fileName || null;
    }
    return existingPath;
  }

  async function handleAddCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed || !isElectron) return;
    const result = await window.electronAPI.addProductCategory(trimmed);
    if (result.success && result.category) {
      await loadCategories();
      setFormData((prev) => ({ ...prev, category_id: result.category!.id }));
      setNewCategoryName('');
    } else {
      setError(result.message || 'Failed to add category');
    }
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      setImagePreview(base64Data);
      setFormData((prev) => ({ ...prev, image_path: base64Data, _fileName: file.name }));
    };
    reader.readAsDataURL(file);
  }

  function openCreate() {
    setEditingProduct(null);
    setFormData(emptyForm());
    setImagePreview(null);
    setShowForm(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    const attrs = (product.attributes || []).map((a: ProductAttribute) => ({
      label: a.label,
      value: a.value,
    }));
    while (attrs.length < 2) attrs.push({ label: '', value: '' });
    setFormData({
      name: product.name,
      bill_name: product.bill_name || '',
      sku: product.sku || product.code,
      price: product.price != null && Number(product.price) !== 0 ? String(product.price) : '',
      category_id: product.category_id,
      image_path: product.image_path,
      barcode_payload:
        product.barcode_payload ||
        buildDefaultPayload(product.sku || product.code, product.name, String(product.price ?? 0)),
      stock_qty: String(product.stock_qty ?? 0),
      low_stock_threshold: String(product.low_stock_threshold ?? 10),
      unit: product.unit || 'Piece',
      attributes: attrs,
    });
    setImagePreview(productImages[product.id] || null);
    setShowForm(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isElectron) return;
    try {
      setError('');
      if (!formData.name.trim()) {
        setError('Please enter a product name');
        return;
      }
      const sku = formData.sku.trim() || `P-${Date.now()}`;
      const price = Number(formData.price || 0);
      const savedImagePath = await saveImageIfNeeded(
        imagePreview,
        formData._fileName,
        editingProduct?.image_path || null
      );
      const payload =
        formData.barcode_payload.trim() ||
        buildDefaultPayload(sku, formData.name.trim(), String(price));

      const payloadData = {
        name: formData.name.trim(),
        bill_name: formData.bill_name.trim() || null,
        sku,
        price,
        category_id: formData.category_id,
        image_path: savedImagePath,
        barcode_payload: payload,
        stock_qty: Number(formData.stock_qty || 0),
        low_stock_threshold: Number(formData.low_stock_threshold || 10),
        unit: formData.unit.trim() || 'Piece',
        attributes: formData.attributes.filter((a) => a.label.trim()),
      };

      const result = editingProduct
        ? await window.electronAPI.updateProduct(editingProduct.id, payloadData)
        : await window.electronAPI.addProduct(payloadData);

      if (result.success) {
        setSuccess(editingProduct ? 'Product updated' : 'Product added');
        setShowForm(false);
        setEditingProduct(null);
        setFormData(emptyForm());
        setImagePreview(null);
        loadProducts();
        setTimeout(() => setSuccess(''), 2500);
      } else {
        setError(result.message || 'Save failed');
      }
    } catch (err) {
      setError('Failed to save product');
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || !isElectron) return;
    const result = await window.electronAPI.deleteProduct(deleteConfirm.id);
    if (result.success) {
      setDeleteConfirm(null);
      setSuccess('Product deleted');
      loadProducts();
      setTimeout(() => setSuccess(''), 2500);
    } else {
      setError(result.message || 'Delete failed');
    }
  };

  const handleAddToBill = (product: Product) => {
    setDetailProduct(null);
    setQtyProduct(product);
  };

  const confirmAddToBill = (product: Product, qty: number) => {
    queuePendingBillItems(productToBillItem(product, qty));
    setToastMessage(
      qty > 1
        ? `${product.name} × ${qty} added to bill`
        : `${product.name} added to bill`
    );
    setToastOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const actionButton = (
    <div className="flex items-center gap-2">
      {selectedIds.size > 0 && (
        <button
          type="button"
          onClick={() =>
            openLabels(filteredProducts.filter((p) => selectedIds.has(p.id)))
          }
          className="bp-btn-outline h-9 px-3"
        >
          <Printer className="h-4 w-4" />
          Print labels ({selectedIds.size})
        </button>
      )}
      <button type="button" onClick={openCreate} className="bp-btn-primary h-9 px-3">
        <Plus className="h-4 w-4" />
        Add Product
      </button>
    </div>
  );

  return (
    <AppLayout title="Products" subtitle="SKU catalog with custom fields" actionButton={actionButton}>
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

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-white px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name or SKU…"
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bp-input w-auto min-w-[160px]"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
        <div className="flex rounded-lg border border-border bg-white p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`rounded-md p-2 ${viewMode === 'table' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`rounded-md p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>

      {loading && filteredProducts.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <div className="mr-3 size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading products…
        </div>
      ) : null}

      {/* Table view */}
      {viewMode === 'table' ? (
        <div className="bp-card overflow-hidden">
          <div className="table-container overflow-x-auto">
            <table className="bp-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredProducts.length > 0 &&
                        selectedIds.size === filteredProducts.length
                      }
                      onChange={toggleSelectAll}
                      aria-label="Select all on page"
                    />
                  </th>
                  <th className="w-14"></th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Details</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No products found. Add your first ornament SKU.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="cursor-pointer"
                      onClick={() => setDetailProduct(product)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          aria-label={`Select ${product.name}`}
                        />
                      </td>
                      <td>
                        <div className="size-11 overflow-hidden rounded-lg bg-secondary ring-offset-2 hover:ring-2 hover:ring-primary/40">
                          {productImages[product.id] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={productImages[product.id]} alt="" className="size-full object-cover" />
                          ) : (
                            <div className="flex size-full items-center justify-center text-muted-foreground">
                              <Package className="size-5" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <p className="font-semibold text-foreground">{product.name}</p>
                        {product.bill_name?.trim() &&
                          product.bill_name.trim() !== product.name && (
                            <p className="text-xs text-muted-foreground">
                              Bill: {product.bill_name.trim()}
                            </p>
                          )}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 font-mono text-xs">
                          <Tag className="size-3" />
                          {product.sku || product.code}
                        </span>
                      </td>
                      <td className="text-muted-foreground">{product.category_name || '—'}</td>
                      <td className="font-semibold">{formatCurrency(product.price || 0)}</td>
                      <td>
                        <span className="font-semibold">{product.stock_qty ?? 0}</span>
                        <span className="ml-1 text-xs text-muted-foreground">{product.unit || 'Piece'}</span>
                        {product.is_out_of_stock ? (
                          <span className="ml-1 bp-badge bg-red-100 text-red-700">Out</span>
                        ) : product.is_low_stock ? (
                          <span className="ml-1 bp-badge bg-amber-100 text-amber-800">Low</span>
                        ) : null}
                      </td>
                      <td>
                        <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {(product.attributes || [])
                            .slice(0, 3)
                            .map((a) => `${a.label}: ${a.value}`)
                            .join(' · ') || '—'}
                        </p>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openLabels([product])}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-secondary"
                            title="Print label"
                          >
                            <Printer className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddToBill(product)}
                            className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]"
                            title="Add to bill"
                          >
                            <ShoppingCart className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-secondary"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(product)}
                            className="rounded-md border border-border p-1.5 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="size-3.5" />
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bp-card cursor-pointer overflow-hidden transition hover:border-primary/40 hover:shadow-md"
              onClick={() => setDetailProduct(product)}
            >
              <div className="aspect-[4/3] bg-secondary">
                {productImages[product.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={productImages[product.id]} alt="" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <Package className="size-10 opacity-40" />
                  </div>
                )}
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{product.name}</h3>
                  <span className="text-sm font-bold text-primary">{formatCurrency(product.price || 0)}</span>
                </div>
                {product.bill_name?.trim() &&
                  product.bill_name.trim() !== product.name && (
                    <p className="text-xs text-muted-foreground">
                      Bill: {product.bill_name.trim()}
                    </p>
                  )}
                <p className="font-mono text-xs text-muted-foreground">{product.sku || product.code}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToBill(product);
                  }}
                  className="bp-btn-primary w-full"
                >
                  <ShoppingCart className="size-3.5" />
                  Add to bill
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/45 p-4"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <form
            onSubmit={handleSubmit}
            className="grid max-h-[92vh] w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl lg:grid-cols-[minmax(0,1fr)_280px] lg:grid-rows-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-h-0 max-h-[92vh] overflow-y-auto overscroll-contain p-6 pb-10 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">
                  {editingProduct ? 'Edit product' : 'Add new product'}
                </h2>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-md p-1 hover:bg-secondary">
                  <X className="size-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="bp-label">Product name * (for search)</label>
                  <input
                    required
                    className="bp-input"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        name,
                        barcode_payload: buildDefaultPayload(prev.sku, name, prev.price),
                      }));
                    }}
                    placeholder="Gold chain / Earrings…"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="bp-label">Name on bill</label>
                  <input
                    className="bp-input"
                    value={formData.bill_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bill_name: e.target.value }))
                    }
                    placeholder="What should appear on the invoice (optional)"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Search uses product name. The bill uses this name when set.
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Additional details</p>
                    <p className="text-xs text-muted-foreground">
                      Bead count, length, weight, metal type, etc.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-primary hover:underline"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        attributes: [...prev.attributes, { label: '', value: '' }],
                      }))
                    }
                  >
                    + More
                  </button>
                </div>
                {(formData.attributes.length
                  ? formData.attributes
                  : [
                      { label: '', value: '' },
                      { label: '', value: '' },
                    ]
                ).map((attr, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      className="bp-input"
                      placeholder={index === 0 ? 'e.g. Length' : index === 1 ? 'e.g. Weight' : 'Field name'}
                      value={attr.label}
                      onChange={(e) => {
                        const base =
                          formData.attributes.length > 0
                            ? formData.attributes
                            : [
                                { label: '', value: '' },
                                { label: '', value: '' },
                              ];
                        const attributes = [...base];
                        attributes[index] = { ...attributes[index], label: e.target.value };
                        setFormData((prev) => ({ ...prev, attributes }));
                      }}
                    />
                    <input
                      className="bp-input"
                      placeholder={index === 0 ? 'e.g. 18 inch' : index === 1 ? 'e.g. 5g' : 'Value'}
                      value={attr.value}
                      onChange={(e) => {
                        const base =
                          formData.attributes.length > 0
                            ? formData.attributes
                            : [
                                { label: '', value: '' },
                                { label: '', value: '' },
                              ];
                        const attributes = [...base];
                        attributes[index] = { ...attributes[index], value: e.target.value };
                        setFormData((prev) => ({ ...prev, attributes }));
                      }}
                    />
                    <button
                      type="button"
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          attributes:
                            prev.attributes.length <= 1
                              ? [{ label: '', value: '' }]
                              : prev.attributes.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="bp-label">SKU</label>
                  <div className="flex gap-2">
                    <input
                      className="bp-input"
                      value={formData.sku}
                      onChange={(e) => {
                        const sku = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          sku,
                          barcode_payload: buildDefaultPayload(sku, prev.name, prev.price),
                        }));
                      }}
                      placeholder="Auto if empty"
                    />
                    <button
                      type="button"
                      className="bp-btn-outline shrink-0"
                      onClick={() => {
                        const sku = `P-${Date.now().toString().slice(-6)}`;
                        setFormData((prev) => ({
                          ...prev,
                          sku,
                          barcode_payload: buildDefaultPayload(sku, prev.name, prev.price),
                        }));
                      }}
                    >
                      Auto
                    </button>
                  </div>
                </div>
                <div>
                  <label className="bp-label">Price (per piece)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="bp-input"
                    placeholder="Enter price"
                    value={formData.price}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const price = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        price,
                        barcode_payload: buildDefaultPayload(prev.sku, prev.name, price),
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className="bp-label">Opening / current stock</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="bp-input"
                    value={formData.stock_qty}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stock_qty: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="bp-label">Low stock alert at</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="bp-input"
                    value={formData.low_stock_threshold}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, low_stock_threshold: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="bp-label">Unit</label>
                  <input
                    className="bp-input"
                    value={formData.unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                    placeholder="Piece / Pair / Set"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="bp-label">Category</label>
                  <select
                    className="bp-input"
                    value={formData.category_id ?? ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category_id: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  >
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      className="bp-input"
                      placeholder="New category…"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                    />
                    <button type="button" className="bp-btn-outline shrink-0" onClick={handleAddCategory}>
                      + New
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="bp-label">Barcode content (editable)</label>
                <input
                  className="bp-input font-mono text-xs"
                  value={formData.barcode_payload}
                  onChange={(e) => setFormData((prev) => ({ ...prev, barcode_payload: e.target.value }))}
                />
              </div>
            </div>

            <aside className="space-y-4 border-t border-border bg-secondary/40 p-5 lg:border-l lg:border-t-0">
              <ProductBarcode
                value={
                  formData.barcode_payload ||
                  buildDefaultPayload(formData.sku, formData.name, formData.price)
                }
                label={formData.name || 'Barcode'}
              />
              <div>
                <p className="bp-label">Product image</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white px-3 py-8 text-sm text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="" className="h-28 w-full rounded-lg object-cover" />
                  ) : (
                    <>
                      <ImagePlus className="size-6" />
                      Upload image
                    </>
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" className="bp-btn-outline flex-1" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="bp-btn-primary flex-1">
                  Save product
                </button>
              </div>
            </aside>
          </form>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">Delete product?</h3>
            <p className="text-sm text-muted-foreground">
              Remove <strong>{deleteConfirm.name}</strong> permanently.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="bp-btn-outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <BarcodeLabelSheet
        open={showLabels}
        products={labelProducts}
        onClose={() => {
          setShowLabels(false);
          setLabelProducts([]);
        }}
      />

      <ProductDetailModal
        open={Boolean(detailProduct)}
        product={detailProduct}
        imageUrl={detailProduct ? productImages[detailProduct.id] : null}
        onClose={() => setDetailProduct(null)}
        onAddToBill={handleAddToBill}
      />

      <QtyPrompt
        open={Boolean(qtyProduct)}
        product={qtyProduct}
        imageUrl={qtyProduct ? productImages[qtyProduct.id] : null}
        onClose={() => setQtyProduct(null)}
        onConfirm={confirmAddToBill}
      />

      <ToastNotify
        open={toastOpen}
        message={toastMessage}
        onClose={() => setToastOpen(false)}
      />
    </AppLayout>
  );
}
