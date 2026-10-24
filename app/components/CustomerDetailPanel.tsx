'use client';

import { formatDate, formatCurrency } from '@/lib/utils';

interface CustomerWithStats {
  id: number;
  name: string;
  phone: string;
  created_at: string;
  total_spent: number;
  last_visit: string | null;
}

interface Invoice {
  id: number;
  invoice_no: string;
  date: string;
  total: number;
  created_at: string;
}

interface Settings {
  currency_symbol?: string;
  [key: string]: unknown;
}

interface CustomerDetailPanelProps {
  customer: CustomerWithStats | null;
  invoices: Invoice[];
  loading: boolean;
  settings?: Settings;
}

export default function CustomerDetailPanel({
  customer,
  invoices,
  loading,
  settings
}: CustomerDetailPanelProps) {
  if (!customer) {
    return (
      <div className="card flex flex-col items-center justify-center py-12">
        <div className="text-4xl text-neutral-300 mb-4">👤</div>
        <h3 className="text-heading-3 text-neutral-600 mb-2">Select a Customer</h3>
        <p className="text-body text-neutral-500 text-center max-w-sm">
          Click on a customer from the list to view their purchase history and details.
        </p>
      </div>
    );
  }

  const formatCurrencyDisplay = (amount: number) => {
    return formatCurrency(amount, settings?.currency_symbol || '₹');
  };


  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-neutral-200 rounded w-full"></div>
            <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer Summary */}
      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-heading-2 text-neutral-900 mb-1">
              {customer.name}
            </h2>
            <p className="text-mono text-neutral-700 mb-2">
              {customer.phone}
            </p>
            <p className="text-caption text-neutral-500">
              Customer since {formatDate(customer.created_at)}
            </p>
          </div>

          {/* Total Spent - Highlighted */}
          <div className="text-right">
            <div className="text-caption text-neutral-500 mb-1">Total Spent</div>
            <div className="text-3xl font-bold text-primary-600 text-mono">
              {formatCurrencyDisplay(customer.total_spent)}
            </div>
            <div className="text-caption text-neutral-500 mt-1">
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
          <div>
            <div className="text-caption text-neutral-500">Last Visit</div>
            <div className="text-body font-medium text-neutral-900">
              {customer.last_visit ? formatDate(customer.last_visit) : 'Never'}
            </div>
          </div>
          <div>
            <div className="text-caption text-neutral-500">Average Order</div>
            <div className="text-body font-medium text-neutral-900">
              {invoices.length > 0
                ? formatCurrencyDisplay(customer.total_spent / invoices.length)
                : formatCurrencyDisplay(0)
              }
            </div>
          </div>
        </div>
      </div>

      {/* Purchase History */}
      <div className="card">
        <h3 className="text-heading-3 mb-6">Purchase History</h3>

        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl text-neutral-300 mb-4">🛒</div>
            <p className="text-body text-neutral-500">No purchases yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-mono text-neutral-700 font-medium">
                    {invoice.invoice_no}
                  </div>
                  <div className="text-body-sm text-neutral-600">
                    {formatDate(invoice.date)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-mono font-semibold text-neutral-900">
                    {formatCurrencyDisplay(invoice.total)}
                  </div>
                  <div className="text-caption text-neutral-500">
                    {new Date(invoice.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
