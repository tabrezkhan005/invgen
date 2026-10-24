'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Building2,
  Receipt,
  Printer,
  ShieldCheck,
  Share2,
  HardDrive,
  AlertCircle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import BusinessSettings from '../components/BusinessSettings';
import InvoiceSettings from '../components/InvoiceSettings';
import PrinterSettings from '../components/PrinterSettings';
import PinManagement from '../components/PinManagement';
import ConnectionsSettings from '../components/ConnectionsSettings';
import BackupSettings from '../components/BackupSettings';
import ConfirmDialog from '../components/ConfirmDialog';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AppSettings {
  shop_name: string;
  shop_address: string;
  invoice_prefix: string;
  printer_type: 'thermal' | 'a4';
  currency_symbol: string;
  tax_rate: string;
  invoice_footer: string;
  backup_interval?: 'manual' | 'daily' | 'weekly' | string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('business');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [pinSet, setPinSet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isElectron) {
      loadSettings();
      checkPinStatus();
    }
  }, [isElectron]);

  const loadSettings = async () => {
    try {
      const appSettings = await window.electronAPI.getAllSettings();
      setSettings(appSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const checkPinStatus = async () => {
    try {
      const isSet = await window.electronAPI.isAdminPinSet();
      setPinSet(isSet);
    } catch (error) {
      console.error('Error checking PIN status:', error);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    setLoading(true);
    setMessage('');
    try {
      const result = await window.electronAPI.updateSetting({ key, value });
      if (result.success) {
        setMessage('Settings updated successfully');
        await loadSettings();
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage('Failed to update setting');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async (currentPin: string, newPin: string, confirmPin: string) => {
    if (newPin !== confirmPin) {
      setMessage('PINs do not match');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      if (pinSet) {
        const verifyResult = await window.electronAPI.verifyAdminPin(currentPin);
        if (!verifyResult.success) {
          setMessage(verifyResult.message);
          setLoading(false);
          return;
        }
      }
      const result = await window.electronAPI.setAdminPin(newPin);
      if (result.success) {
        setMessage('Admin PIN updated successfully');
        setPinSet(true);
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage('Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await window.electronAPI.resetSettings();
      if (result.success) {
        setMessage('Settings reset to defaults');
        await loadSettings();
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage('Failed to reset settings');
    } finally {
      setLoading(false);
      setShowResetConfirm(false);
    }
  };

  if (!mounted) return null;

  if (!isElectron) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Electron Required</AlertTitle>
          <AlertDescription>Please run this application in the Electron environment.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Billing
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-600">Manage your business preferences and hardware settings</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your business preferences, hardware, and security</p>
        </div>

        {message && (
          <Alert className={message.includes('success') ? 'bg-green-500/5 border-green-200 text-green-700' : 'bg-destructive/5 border-destructive/20 text-destructive'}>
            {message.includes('success') ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full md:w-auto">
              <TabsTrigger value="business" className="gap-2"><Building2 className="h-4 w-4" /> Business</TabsTrigger>
              <TabsTrigger value="invoice" className="gap-2"><Receipt className="h-4 w-4" /> Invoices</TabsTrigger>
              <TabsTrigger value="printer" className="gap-2"><Printer className="h-4 w-4" /> Printer</TabsTrigger>
              <TabsTrigger value="connections" className="gap-2"><Share2 className="h-4 w-4" /> Connections</TabsTrigger>
              <TabsTrigger value="backup" className="gap-2"><HardDrive className="h-4 w-4" /> Backup</TabsTrigger>
              <TabsTrigger value="security" className="gap-2"><ShieldCheck className="h-4 w-4" /> Security</TabsTrigger>
            </TabsList>
          </div>

          <Card className="border-none shadow-none bg-transparent">
            <TabsContent value="business" className="mt-0 focus-visible:ring-0">
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>Update your shop details shown on invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <BusinessSettings
                    settings={{
                      shop_name: settings?.shop_name || '',
                      shop_address: settings?.shop_address || ''
                    }}
                    onUpdate={handleUpdateSetting}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoice" className="mt-0 focus-visible:ring-0">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Customization</CardTitle>
                  <CardDescription>Configure numbering, currency and tax defaults</CardDescription>
                </CardHeader>
                <CardContent>
                  <InvoiceSettings
                    settings={{
                      invoice_prefix: settings?.invoice_prefix || '',
                      currency_symbol: settings?.currency_symbol || '',
                      tax_rate: settings?.tax_rate || '',
                      invoice_footer: settings?.invoice_footer || ''
                    }}
                    onUpdate={handleUpdateSetting}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="printer" className="mt-0 focus-visible:ring-0">
              <Card>
                <CardHeader>
                  <CardTitle>Printer Settings</CardTitle>
                  <CardDescription>Select the type of printer used for invoice generation</CardDescription>
                </CardHeader>
                <CardContent>
                  <PrinterSettings
                    settings={{
                      printer_type: settings?.printer_type || 'thermal'
                    }}
                    onUpdate={handleUpdateSetting}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="connections" className="mt-0 focus-visible:ring-0">
              <ConnectionsSettings onSettingChange={handleUpdateSetting} />
            </TabsContent>

            <TabsContent value="backup" className="mt-0 focus-visible:ring-0">
              <Card>
                <CardHeader>
                  <CardTitle>USB Backup</CardTitle>
                  <CardDescription>
                    Back up your offline database to a USB drive and restore when needed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BackupSettings
                    settings={{
                      backup_interval: settings?.backup_interval || 'daily',
                    }}
                    onUpdate={handleUpdateSetting}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-0 focus-visible:ring-0">
              <Card>
                <CardHeader>
                  <CardTitle>System Security</CardTitle>
                  <CardDescription>Manage your administrative PIN and data safety</CardDescription>
                </CardHeader>
                <CardContent>
                  <PinManagement
                    pinSet={pinSet}
                    onSetPin={handleSetPin}
                    onResetSettings={() => setShowResetConfirm(true)}
                    loading={loading}
                    message={message}
                  />
                </CardContent>
              </Card>
            </TabsContent>

          </Card>
        </Tabs>
      </div>
      </main>

      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset All Settings?"
        message="This will restore all business information, invoice preferences, and hardware settings to their original defaults. This action cannot be undone."
        confirmText="Yes, Reset Everything"
        onConfirm={handleResetSettings}
        onCancel={() => setShowResetConfirm(false)}
        loading={loading}
      />
    </div>
  );
}
