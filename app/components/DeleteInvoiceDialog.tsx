'use client';

import { formatDate } from '@/lib/utils';

interface InvoiceData {
  id: number;
  invoice_number: string;
  customer_name: string;
  total: number;
  date: string;
  item_count: number;
}

interface DeleteInvoiceDialogProps {
  isOpen: boolean;
  invoice: InvoiceData | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function DeleteInvoiceDialog({
  isOpen,
  invoice,
  onConfirm,
  onCancel,
  loading = false
}: DeleteInvoiceDialogProps) {
  if (!isOpen || !invoice) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              🗑️
            </div>
            <div>
              <h3 className="font-semibold text-lg">Delete Invoice</h3>
              <p className="text-sm opacity-90">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-red-600 mt-0.5">⚠️</div>
                <div>
                  <h4 className="font-medium text-red-900 mb-1">Are you sure?</h4>
                  <p className="text-red-700 text-sm">
                    Deleting this invoice will permanently remove all associated data.
                    This action requires admin PIN verification.
                  </p>
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600">Invoice Number:</span>
                <span className="font-mono font-semibold text-neutral-900">
                  {invoice.invoice_number}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600">Customer:</span>
                <span className="font-medium text-neutral-900">{invoice.customer_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600">Date:</span>
                <span className="text-neutral-900">{formatDate(invoice.date)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600">Items:</span>
                <span className="text-neutral-900">{invoice.item_count} item{invoice.item_count !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
                <span className="text-sm font-medium text-neutral-600">Total Amount:</span>
                <span className="font-bold text-lg text-neutral-900">
                  {formatCurrency(invoice.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 btn-secondary"
            >
              Keep Invoice
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete Invoice'}
            </button>
          </div>

          {/* Additional Warning */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="text-yellow-600">💡</div>
              <p className="text-yellow-700 text-xs">
                This will also remove the invoice from customer history and any associated reports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
