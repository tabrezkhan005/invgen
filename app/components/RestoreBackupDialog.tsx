'use client';

import { formatDate } from '@/lib/utils';

interface BackupInfo {
  filename: string;
  date: string;
  size: string;
  invoice_count: number;
  customer_count: number;
}

interface RestoreBackupDialogProps {
  isOpen: boolean;
  backup: BackupInfo | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function RestoreBackupDialog({
  isOpen,
  backup,
  onConfirm,
  onCancel,
  loading = false
}: RestoreBackupDialogProps) {
  if (!isOpen || !backup) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-primary to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                🔄
              </div>
              <div>
                <h3 className="font-semibold text-lg">Restore Database Backup</h3>
                <p className="text-sm opacity-90">Replace current data with backup</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="mb-6">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-primary mt-0.5">ℹ️</div>
                  <div>
                    <h4 className="font-medium text-primary mb-1">Database Restoration</h4>
                    <p className="text-primary/80 text-sm">
                      This will replace all current data with the selected backup.
                      Any changes made after this backup will be lost. The app will restart automatically.
                    </p>
                  </div>
                </div>
              </div>

            {/* Backup Details */}
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600">Backup File:</span>
                <span className="font-mono text-sm text-neutral-900">
                  {backup.filename}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600">Created:</span>
                <span className="text-neutral-900">{formatDate(backup.date)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600">File Size:</span>
                <span className="text-neutral-900">{backup.size}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600">Invoices:</span>
                <span className="text-neutral-900">{backup.invoice_count}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
                <span className="text-sm font-medium text-neutral-600">Customers:</span>
                <span className="font-semibold text-neutral-900">
                  {backup.customer_count}
                </span>
              </div>
            </div>
          </div>

          {/* Current Data Warning */}
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-amber-600 mt-0.5">⚠️</div>
              <div>
                <h4 className="font-medium text-amber-900 mb-1">Data Loss Warning</h4>
                <p className="text-amber-700 text-sm">
                  All invoices, customers, and settings created or modified after{' '}
                  <span className="font-medium">{formatDate(backup.date)}</span> will be permanently lost.
                </p>
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
              Cancel Restore
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 bg-primary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-all focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Restoring...' : 'Restore Backup'}
            </button>
          </div>

          {/* Technical Note */}
          <div className="mt-4 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="text-neutral-600">🔧</div>
              <p className="text-neutral-700 text-xs">
                The application will automatically restart after restoration is complete.
                Make sure to close any other programs using the database.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
