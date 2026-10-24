'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';

// Type definitions
interface AuditLog {
  id: number;
  action: string;
  reference_id: string | null;
  details: string | null;
  timestamp: string;
}

interface AuditLogOptions {
  limit?: number;
  offset?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Check if we're running in Electron (prevent SSR mismatch)
  const [isElectron, setIsElectron] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only check for Electron after component has mounted
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
    setMounted(true);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const options: AuditLogOptions = {
        limit: 500, // Load more logs for audit trail
      };

      if (filterAction !== 'all') {
        options.action = filterAction;
      }

      if (startDate && endDate) {
        options.startDate = startDate;
        options.endDate = endDate;
      }

      const logs = await window.electronAPI.getAuditLogs(options);
      setAuditLogs(logs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filterAction, startDate, endDate]);

  // Load audit logs on component mount and when filters change
  useEffect(() => {
    if (isElectron) {
      loadAuditLogs();
    }
  }, [isElectron, loadAuditLogs]);

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'INVOICE_CREATED':
        return 'bg-green-100 text-green-800';
      case 'INVOICE_DELETED':
        return 'bg-red-100 text-red-800';
        case 'BACKUP_CREATED':
          return 'bg-primary/10 text-primary';
      case 'DATABASE_RESTORED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ADMIN_PIN_SET':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get unique actions for filter dropdown
  const uniqueActions = Array.from(new Set(auditLogs.map(log => log.action)));

  // Show loading state during SSR and initial client render
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isElectron) {
    return (
      <AppLayout title="Audit Log">
        <div className="text-center">
          <h1 className="text-heading-2 text-danger-600 mb-4">Electron Required</h1>
          <p className="text-body">This app must be run through Electron to access audit logs.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Audit Trail"
      subtitle="Complete activity log and system events"
      actionButton={
        <div className="flex gap-3">
          <Link href="/" className="btn-secondary">
            ← Back to Customers
          </Link>
          <Link href="/reports" className="btn-secondary">
            Reports
          </Link>
        </div>
      }
    >

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Type
              </label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>
                    {formatAction(action)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setFilterAction('all');
                setStartDate('');
                setEndDate('');
              }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Activity Log ({auditLogs.length} entries)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Complete audit trail of all system activities
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Loading audit logs...</div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">No audit logs found.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeColor(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.reference_id || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-primary">
              {auditLogs.filter(log => log.action === 'INVOICE_CREATED').length}
            </div>
            <div className="text-sm text-gray-600">Invoices Created</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-red-600">
              {auditLogs.filter(log => log.action === 'INVOICE_DELETED').length}
            </div>
            <div className="text-sm text-gray-600">Invoices Deleted</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-green-600">
              {auditLogs.filter(log => log.action === 'BACKUP_CREATED').length}
            </div>
            <div className="text-sm text-gray-600">Backups Created</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-purple-600">
              {auditLogs.filter(log => log.action === 'DATABASE_RESTORED').length}
            </div>
            <div className="text-sm text-gray-600">Database Restores</div>
          </div>
        </div>
    </AppLayout>
  );
}
