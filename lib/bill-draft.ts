export interface BillDraftItem {
  item_name: string;
  qty: number;
  price: number;
  amount: number;
  product_id?: number | null;
  sku?: string;
}

export interface BillDraft {
  customerName: string;
  invoiceDate: string;
  items: BillDraftItem[];
  taxRate: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  updatedAt: string;
}

export const BILL_DRAFT_KEY = 'billing-pro-active-draft';

export function loadBillDraft(): BillDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BILL_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BillDraft;
  } catch {
    return null;
  }
}

export function saveBillDraft(draft: BillDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      BILL_DRAFT_KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
    );
  } catch (error) {
    console.error('Failed to save bill draft:', error);
  }
}

export function clearBillDraft(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BILL_DRAFT_KEY);
}
