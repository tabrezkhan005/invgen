'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Wifi, Usb, Printer, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
// SettingField import removed as it's not used

interface Printer {
  id: string;
  name: string;
  type: 'thermal' | 'a4' | 'wifi';
  status: 'available' | 'busy' | 'offline';
  ip?: string;
  port?: number;
}

interface USBDrive {
  id: string;
  name: string;
  mountPoint: string;
  size: string;
  available: string;
  status: 'mounted' | 'unmounted' | 'busy';
}

interface ConnectionsSettingsProps {
  onSettingChange: (key: string, value: string) => Promise<void>;
}

export default function ConnectionsSettings({ onSettingChange }: ConnectionsSettingsProps) {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [usbDrives, setUsbDrives] = useState<USBDrive[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [selectedUsbDrive, setSelectedUsbDrive] = useState<string>('');
  const [scanningPrinters, setScanningPrinters] = useState(false);
  const [scanningUsb, setScanningUsb] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string>('');

  // Load initial data
  useEffect(() => {
    loadDevices();
    loadSelectedDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setDeviceError('');
      console.log('Scanning for devices...');
      const [printersData, usbDrivesData] = await Promise.all([
        window.electronAPI.scanPrinters(),
        window.electronAPI.scanUsbDrives()
      ]);
      console.log('Printers found:', printersData);
      console.log('USB drives found:', usbDrivesData);
      setPrinters(printersData || []);
      setUsbDrives(usbDrivesData || []);

      // Show success message if no devices found
      if ((!printersData || printersData.length === 0) && (!usbDrivesData || usbDrivesData.length === 0)) {
        setDeviceError('No printers or USB drives detected. Make sure your devices are connected and powered on.');
      }
    } catch (error: any) {
      console.error('Error loading devices:', error);
      setDeviceError('Failed to scan for devices. Please check your system permissions and try again.');
      setPrinters([]);
      setUsbDrives([]);
    }
  };

  const loadSelectedDevices = async () => {
    try {
      const { selectedPrinter, selectedUsbDrive } = await window.electronAPI.getSelectedDevices();
      setSelectedPrinter(selectedPrinter);
      setSelectedUsbDrive(selectedUsbDrive);
    } catch (error: any) {
      console.error('Error loading selected devices:', error);
    }
  };

  const scanPrinters = async () => {
    console.log('🔍 [RENDERER] Starting printer scan...');
    setScanningPrinters(true);
    setDeviceError('');

    try {
      console.log('📡 [RENDERER] Calling window.electronAPI.scanPrinters()...');
      console.log('Available API methods:', Object.keys(window.electronAPI || {}));

      const printersData = await window.electronAPI.scanPrinters();
      console.log('📋 [RENDERER] Raw printer scan result:', printersData);
      console.log('📊 [RENDERER] Printers count:', printersData?.length || 0);

      if (Array.isArray(printersData)) {
        console.log('✅ [RENDERER] Found printers:', printersData.map(p => ({ name: p.name, type: p.type, status: p.status })));
        setPrinters(printersData);

        if (printersData.length === 0) {
          console.log('⚠️ [RENDERER] No printers found');
          setDeviceError('No printers detected. Make sure your printer is connected and powered on.');
        } else {
          setDeviceError(''); // Clear any previous errors
        }
      } else {
        console.warn('⚠️ [RENDERER] Invalid printer data format:', printersData);
        setPrinters([]);
        setDeviceError('Invalid printer data received. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ [RENDERER] Error scanning printers:', error);
      const errorMessage = error?.message || String(error);
      console.error('Error details:', errorMessage, error?.stack);
      setDeviceError(`Failed to scan for printers: ${errorMessage}`);
      setPrinters([]);
    } finally {
      setScanningPrinters(false);
    }
  };

  const scanUsbDrives = async () => {
    setScanningUsb(true);
    setDeviceError('');
    try {
      const usbDrivesData = await window.electronAPI.scanUsbDrives();
      setUsbDrives(usbDrivesData || []);
      if (!usbDrivesData || usbDrivesData.length === 0) {
        setDeviceError('No USB drives detected. Make sure your USB drive is connected.');
      }
    } catch (error: any) {
      console.error('Error scanning USB drives:', error);
      setDeviceError('Failed to scan for USB drives. Please check your system permissions.');
      setUsbDrives([]);
    } finally {
      setScanningUsb(false);
    }
  };

  const testPrinterConnection = async (printerId: string) => {
    setTestingConnection(printerId);
    try {
      const result = await window.electronAPI.testPrinterConnection(printerId);

      if (result.success) {
        // Update printer status to available
        setPrinters(prev => prev.map(p =>
          p.id === printerId
            ? { ...p, status: 'available' as const }
            : p
        ));
        alert(`✅ Connection test successful for ${printers.find(p => p.id === printerId)?.name}`);
      } else {
        alert(`❌ Connection test failed: ${result.message}`);
      }
    } catch (error: any) {
      alert(`❌ Connection test failed: ${error}`);
    } finally {
      setTestingConnection(null);
    }
  };

  const handlePrinterChange = async (printerId: string) => {
    setSelectedPrinter(printerId);
    try {
      await window.electronAPI.setSelectedPrinter(printerId);
      await onSettingChange('selected_printer', printerId);
    } catch (error: any) {
      console.error('Error setting selected printer:', error);
    }
  };

  const handleUsbDriveChange = async (usbDriveId: string) => {
    setSelectedUsbDrive(usbDriveId);
    try {
      await window.electronAPI.setSelectedUsbDrive(usbDriveId);
      await onSettingChange('selected_usb_drive', usbDriveId);
    } catch (error: any) {
      console.error('Error setting selected USB drive:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'busy':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-100 text-green-800">Available</Badge>;
      case 'busy':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Busy</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Printer Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Printer Connections
          </CardTitle>
          <CardDescription>
            Manage and detect available printers including thermal, A4, and WiFi printers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Display */}
          {deviceError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{deviceError}</p>
            </div>
          )}

          {/* Printer Selection */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium">Default Printer</label>
              <p className="text-xs text-muted-foreground">Select your primary printer for invoices</p>
            </div>
            <Select value={selectedPrinter} onValueChange={handlePrinterChange}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select printer" />
              </SelectTrigger>
              <SelectContent>
                {printers.map((printer, index) => (
                  <SelectItem key={`${printer.id}-${index}`} value={printer.id}>
                    <div className="flex items-center gap-2">
                      {printer.type === 'wifi' ? (
                        <Wifi className="h-3 w-3" />
                      ) : (
                        <Printer className="h-3 w-3" />
                      )}
                      {printer.name}
                      {printer.status !== 'available' && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {printer.status}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Printer Detection */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Available Printers</h4>
              <p className="text-sm text-muted-foreground">
                Scan for USB and WiFi printers on your network
              </p>
            </div>
            <Button
              onClick={scanPrinters}
              disabled={scanningPrinters}
              variant="outline"
              size="sm"
            >
              {scanningPrinters ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Scan Printers
            </Button>
          </div>

          {/* Printer List */}
          <div className="space-y-2">
            {printers.map((printer, index) => (
              <div key={`${printer.id}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(printer.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{printer.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {(printer.type || 'unknown').toUpperCase()}
                      </Badge>
                    </div>
                    {printer.ip && (
                      <p className="text-xs text-muted-foreground">
                        {printer.ip}:{printer.port}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(printer.status)}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => testPrinterConnection(printer.id)}
                    disabled={testingConnection === printer.id}
                  >
                    {testingConnection === printer.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* USB Drive Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Usb className="h-5 w-5" />
            USB Drive Connections
          </CardTitle>
          <CardDescription>
            Manage and detect available USB drives for backup and data storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* USB Drive Selection */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium">Default USB Drive</label>
              <p className="text-xs text-muted-foreground">Select your primary USB drive for backups</p>
            </div>
            <Select value={selectedUsbDrive} onValueChange={handleUsbDriveChange}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select USB drive" />
              </SelectTrigger>
              <SelectContent>
                {usbDrives.map((drive, index) => (
                  <SelectItem key={`${drive.id}-${index}`} value={drive.id}>
                    <div className="flex items-center gap-2">
                      <Usb className="h-3 w-3" />
                      {drive.name} ({drive.available} free)
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* USB Detection */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Connected USB Drives</h4>
              <p className="text-sm text-muted-foreground">
                Scan for available USB drives and external storage
              </p>
            </div>
            <Button
              onClick={scanUsbDrives}
              disabled={scanningUsb}
              variant="outline"
              size="sm"
            >
              {scanningUsb ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Scan USB
            </Button>
          </div>

          {/* USB Drive List */}
          <div className="space-y-2">
            {usbDrives.map((drive, index) => (
              <div key={`${drive.id}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Usb className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{drive.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {drive.mountPoint}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {drive.available} free of {drive.size}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={drive.status === 'mounted' ? 'default' : 'secondary'}>
                    {drive.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
