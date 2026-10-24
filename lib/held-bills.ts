export interface HeldBillItem {
  item_name: string;
  qty: number;
  price: number;
  amount: number;
  product_id?: number | null;
  sku?: string;
}

export interface HeldBill {
  id: string;
  customerName: string;
  items: HeldBillItem[];
  invoiceDate: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  heldAt: string;
  note?: string;
}

export const HELD_BILLS_STORAGE_KEY = 'billing-pro-held-bills';
export const MAX_HELD_BILLS = 20;

export function loadHeldBills(): HeldBill[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HELD_BILLS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_HELD_BILLS);
  } catch {
    return [];
  }
}

export function saveHeldBills(bills: HeldBill[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      HELD_BILLS_STORAGE_KEY,
      JSON.stringify(bills.slice(0, MAX_HELD_BILLS))
    );
  } catch (error) {
    console.error('Failed to save held bills:', error);
  }
}

export function draftHasContent(
  customerName: string,
  items: HeldBillItem[]
): boolean {
  return Boolean(
    customerName.trim() ||
      items.some(
        (item) => item.item_name.trim() || item.qty > 1 || item.price > 0
      )
  );
}

export function heldBillTotal(bill: HeldBill): number {
  return bill.items.reduce((sum, item) => sum + (item.amount || 0), 0);
}

export function heldBillItemCount(bill: HeldBill): number {
  return bill.items.filter((item) => item.item_name.trim()).length;
}
