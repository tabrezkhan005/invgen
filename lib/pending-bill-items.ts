export interface PendingBillItem {
  item_name: string;
  qty: number;
  price: number;
  amount: number;
  sku?: string;
  product_id?: number;
}

const STORAGE_KEY = 'pendingBillItems';

export function queuePendingBillItems(items: PendingBillItem | PendingBillItem[]): void {
  if (typeof window === 'undefined') return;
  const list = Array.isArray(items) ? items : [items];
  const existing = readPendingBillItems();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, ...list]));
}

export function readPendingBillItems(): PendingBillItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearPendingBillItems(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function productToBillItem(
  product: {
    id: number;
    name: string;
    bill_name?: string | null;
    sku?: string;
    price?: number;
  },
  qty = 1
): PendingBillItem {
  const price = Number(product.price || 0);
  const quantity = Math.max(1, Number(qty) || 1);
  const billName = String(product.bill_name || '').trim() || product.name;
  return {
    item_name: billName,
    qty: quantity,
    price,
    amount: price * quantity,
    sku: product.sku,
    product_id: product.id,
  };
}
