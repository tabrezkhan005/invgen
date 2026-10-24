'use client';

import { formatDate, formatCurrency } from '@/lib/utils';

interface Settings {
  currency_symbol?: string;
  [key: string]: unknown;
}

interface CustomerAnalytics {
  id: number;
  name: string;
  phone: string;
  invoice_count?: number;
  total_spent?: number;
  total_invoices?: number;
  first_invoice?: string;
  last_invoice?: string;
  last_invoice_date?: string;
  lifetime_value?: number;
  avg_order_value?: number;
  first_purchase?: string;
  last_purchase?: string;
  customer_age_days?: number;
}

interface CustomerInsightsTableProps {
  title: string;
  customers: CustomerAnalytics[];
  showInvoiceCount?: boolean;
  showTotalSpent?: boolean;
  showAvgOrder?: boolean;
  showLastPurchase?: boolean;
  emptyMessage?: string;
  settings?: Settings;
}

export default function CustomerInsightsTable({
  title,
  customers,
  showInvoiceCount = true,
  showTotalSpent = true,
  showAvgOrder = false,
  showLastPurchase = false,
  emptyMessage = 'No data available for the selected period.',
  settings
}: CustomerInsightsTableProps) {
  const formatCurrencyDisplay = (amount: number) => {
    return formatCurrency(amount, settings?.currency_symbol || '₹');
  };


  const getColumns = () => {
    const columns = [
      { key: 'name', label: 'Customer', width: 'w-1/3' }
    ];

    if (showInvoiceCount) {
      columns.push({ key: 'invoices', label: 'Invoices', width: 'w-20' });
    }

    if (showTotalSpent) {
      columns.push({ key: 'total', label: 'Total Spent', width: 'w-24' });
    }

    if (showAvgOrder) {
      columns.push({ key: 'avg', label: 'Avg Order', width: 'w-24' });
    }

    if (showLastPurchase) {
      columns.push({ key: 'last', label: 'Last Purchase', width: 'w-28' });
    }

    return columns;
  };

  const columns = getColumns();

  return (
    <div className="card">
      <h3 className="text-heading-3 mb-6">{title}</h3>

      {customers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl text-neutral-300 mb-4">📊</div>
          <p className="text-body text-neutral-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`text-left py-3 px-4 text-body-sm font-semibold text-neutral-700 uppercase tracking-wide ${column.width}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, index) => (
                <tr
                  key={customer.id}
                  className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
                    index === 0 ? 'bg-primary-50/30' : ''
                  }`}
                >
                  {/* Customer Name & Phone */}
                  <td className="py-4 px-4">
                    <div className="text-body text-neutral-900 font-medium">
                      {customer.name}
                    </div>
                    <div className="text-caption text-neutral-500 text-mono">
                      {customer.phone}
                    </div>
                  </td>

                  {/* Invoice Count */}
                  {showInvoiceCount && (
                    <td className="py-4 px-4">
                      <span className="text-mono font-medium text-neutral-800">
                        {customer.invoice_count || customer.total_invoices || 0}
                      </span>
                    </td>
                  )}

                  {/* Total Spent */}
                  {showTotalSpent && (
                    <td className="py-4 px-4">
                      <span className="text-mono font-semibold text-neutral-900">
                        {formatCurrencyDisplay(customer.total_spent || customer.lifetime_value || 0)}
                      </span>
                    </td>
                  )}

                  {/* Average Order */}
                  {showAvgOrder && (
                    <td className="py-4 px-4">
                      <span className="text-mono font-medium text-neutral-700">
                        {formatCurrencyDisplay(customer.avg_order_value || 0)}
                      </span>
                    </td>
                  )}

                  {/* Last Purchase */}
                  {showLastPurchase && (
                    <td className="py-4 px-4">
                      <span className="text-caption text-neutral-600">
                        {customer.last_purchase || customer.last_invoice_date
                          ? formatDate(customer.last_purchase || customer.last_invoice_date!)
                          : 'Never'
                        }
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {customers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <div className="flex justify-between items-center text-body-sm">
            <span className="text-neutral-600">
              Showing {customers.length} customer{customers.length !== 1 ? 's' : ''}
            </span>
            {showTotalSpent && (
              <span className="text-neutral-700 font-medium">
                Total: {formatCurrencyDisplay(customers.reduce((sum, c) => sum + (c.total_spent || c.lifetime_value || 0), 0))}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
