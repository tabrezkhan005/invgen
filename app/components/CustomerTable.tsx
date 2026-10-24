'use client';

import { useState } from 'react';
import { formatDate, formatCurrency } from '@/lib/utils';

interface CustomerWithStats {
  id: number;
  name: string;
  phone: string;
  created_at: string;
  total_spent: number;
  last_visit: string | null;
}

interface CustomerTableProps {
  customers: CustomerWithStats[];
  selectedCustomerId: number | null;
  onCustomerSelect: (customerId: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  settings?: any;
}

export default function CustomerTable({
  customers,
  selectedCustomerId,
  onCustomerSelect,
  searchTerm,
  onSearchChange,
  settings
}: CustomerTableProps) {
  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const formatCurrencyDisplay = (amount: number) => {
    return formatCurrency(amount, settings?.currency_symbol || '₹');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return formatDate(dateString);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="max-w-md">
        <label htmlFor="customer-search" className="block text-body-sm font-medium text-neutral-700 mb-3">
          Search Customers
        </label>
        <input
          id="customer-search"
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or phone..."
          className="input"
        />
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-4 px-6 text-body-sm font-semibold text-neutral-700 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left py-4 px-6 text-body-sm font-semibold text-neutral-700 uppercase tracking-wide">
                  Phone
                </th>
                <th className="text-right py-4 px-6 text-body-sm font-semibold text-neutral-700 uppercase tracking-wide">
                  Total Spent
                </th>
                <th className="text-left py-4 px-6 text-body-sm font-semibold text-neutral-700 uppercase tracking-wide">
                  Last Visit
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-body text-neutral-500">
                    {searchTerm ? 'No customers found matching your search.' : 'No customers yet.'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => onCustomerSelect(customer.id)}
                    className={`
                      border-b border-neutral-100 cursor-pointer transition-colors
                      hover:bg-neutral-50
                      ${selectedCustomerId === customer.id ? 'bg-primary-50 border-primary-200' : ''}
                    `}
                  >
                    <td className="py-4 px-6">
                      <div className="text-body text-neutral-900 font-medium">
                        {customer.name}
                      </div>
                      {selectedCustomerId === customer.id && (
                        <div className="text-caption text-primary-600 mt-1">
                          Viewing details →
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-mono text-neutral-800">
                        {customer.phone}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-mono font-semibold text-neutral-900">
                        {formatCurrencyDisplay(customer.total_spent)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-body-sm text-neutral-600">
                        {formatDate(customer.last_visit)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {filteredCustomers.length > 0 && (
          <div className="border-t border-neutral-200 px-6 py-4 bg-neutral-50">
            <div className="flex justify-between items-center text-body-sm">
              <span className="text-neutral-600">
                Showing {filteredCustomers.length} of {customers.length} customers
              </span>
              <span className="text-neutral-700 font-medium">
                Total Value: {formatCurrencyDisplay(filteredCustomers.reduce((sum, c) => sum + c.total_spent, 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
