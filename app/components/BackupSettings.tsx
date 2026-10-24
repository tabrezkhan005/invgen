'use client';

import { useCallback, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Info,
  ShieldAlert,
  Lightbulb,
  HardDrive,
  RefreshCw,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface USBDrive {
  id: string;
  name: string;
  mountPoint?: string;
  size?: string;
  available?: string;
  status?: string;
}

interface BackupSettingsProps {
  settings: {
    backup_interval?: 'manual' | 'daily' | 'weekly' | string;
  };
  onUpdate: (key: string, value: string) => void;
}

export default function BackupSettings({ settings, onUpdate }: BackupSettingsProps) {
  const [status, setStatus] = useState<{
    hasDrive: boolean;
    driveLetter: string | null;
    lastBackup: string | null;
    backupCount: number;
  } | null>(null);
  const [usbDrives, setUsbDrives] = useState<USBDrive[]>([]);
  const [selectedUsb, setSelectedUsb] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageOk, setMessageOk] = useState(true);

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    try {
      const [backupStatus, drives, selected] = await Promise.all([
        window.electronAPI.getBackupStatus(),
        window.electronAPI.scanUsbDrives(),
        window.electronAPI.getSelectedDevices(),
      ]);
      setStatus(backupStatus);
      setUsbDrives(drives || []);
      setSelectedUsb(selected?.selectedUsbDrive || '');
    } catch (error) {
      console.error('Backup settings refresh failed:', error);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSelectUsb(id: string) {
    setSelectedUsb(id);
    try {
      await window.electronAPI.setSelectedUsbDrive(id);
      setMessage('USB drive selected for backups');
      setMessageOk(true);
      refresh();
    } catch {
      setMessage('Failed to select USB drive');
      setMessageOk(false);
    }
  }

  async function handleBackupNow() {
    setBusy(true);
    setMessage('');
    try {
      const result = await window.electronAPI.performBackup();
      setMessageOk(!!result?.success);
      setMessage(result?.message || (result?.success ? 'Backup complete' : 'Backup failed'));
      await refresh();
    } catch {
      setMessageOk(false);
      setMessage('Backup failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (
      !window.confirm(
        'Restore will replace your current database with the latest USB backup. Continue?'
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = window.electronAPI.restoreBackup
        ? await window.electronAPI.restoreBackup()
        : await window.electronAPI.restoreFromBackup();
      setMessageOk(!!result?.success);
      setMessage(result?.message || (result?.success ? 'Restore complete' : 'Restore failed'));
    } catch {
      setMessageOk(false);
      setMessage('Restore failed — verify admin PIN and USB backup');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="backup_interval" className="text-sm font-semibold">
            Backup Interval
          </Label>
          <div className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            PROTECTED
          </div>
        </div>
        <Select
          value={settings.backup_interval || 'daily'}
          onValueChange={(val) => onUpdate('backup_interval', val)}
        >
          <SelectTrigger id="backup_interval" className="h-11">
            <SelectValue placeholder="Select interval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual Only</SelectItem>
            <SelectItem value="daily">Daily (Recommended)</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          How often the application should automatically backup data to connected USB drives.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            USB backup
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={busy}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Drive: </span>
            {status?.hasDrive
              ? status.driveLetter || 'Connected'
              : 'No backup drive detected'}
          </p>
          <p>
            <span className="text-muted-foreground">Last backup: </span>
            {status?.lastBackup
              ? new Date(status.lastBackup).toLocaleString()
              : 'Never'}
          </p>
          <p>
            <span className="text-muted-foreground">Backup files: </span>
            {status?.backupCount ?? 0}
          </p>
        </div>

        <div className="grid gap-2">
          <Label className="text-xs font-semibold">Backup USB drive</Label>
          <Select value={selectedUsb || undefined} onValueChange={handleSelectUsb}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select USB drive" />
            </SelectTrigger>
            <SelectContent>
              {usbDrives.length === 0 ? (
                <SelectItem value="none" disabled>
                  No USB drives found
                </SelectItem>
              ) : (
                usbDrives.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} {d.mountPoint ? `(${d.mountPoint})` : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" onClick={handleBackupNow} disabled={busy} className="gap-2">
            <Upload className="h-4 w-4" />
            Backup now
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleRestore}
            disabled={busy}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Restore latest
          </Button>
        </div>
      </div>

      {message ? (
        <Alert
          className={
            messageOk
              ? 'bg-emerald-500/5 border-emerald-200 text-emerald-800'
              : 'bg-destructive/5 border-destructive/20 text-destructive'
          }
        >
          {messageOk ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-4">
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-sm font-semibold text-primary">Backup Information</AlertTitle>
          <AlertDescription className="text-xs text-primary/80 space-y-2 pt-1">
            <p>
              <strong>Manual:</strong> Backups only when you click Backup now.
            </p>
            <p>
              <strong>Daily:</strong> Backup once per day on launch or first invoice.
            </p>
            <p>
              <strong>Weekly:</strong> Backup once every Monday.
            </p>
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border bg-amber-500/5 border-amber-200 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <span>Pro Tip</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Keep your backup USB connected. The app keeps the last 10 backups in the{' '}
            <code className="bg-amber-100 px-1 rounded">BILLING_BACKUP</code> folder.
          </p>
        </div>
      </div>
    </div>
  );
}
