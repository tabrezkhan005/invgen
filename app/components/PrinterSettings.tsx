'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';

interface PrinterSettingsProps {
  settings: {
    printer_type: 'thermal' | 'a4';
  };
  onUpdate: (key: string, value: string) => void;
}

export default function PrinterSettings({ settings, onUpdate }: PrinterSettingsProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid gap-2">
        <Label htmlFor="printer_type" className="text-sm font-semibold">Printer Type</Label>
        <Select
          value={settings.printer_type || 'thermal'}
          onValueChange={(val) => onUpdate('printer_type', val)}
        >
          <SelectTrigger id="printer_type" className="h-11">
            <SelectValue placeholder="Select printer type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="thermal">Thermal Printer (58mm receipts)</SelectItem>
            <SelectItem value="a4">Standard A4 Printer</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Select the hardware you'll use for printing invoices.</p>
      </div>

      <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Info className="h-4 w-4" />
          <span>Printer Specifications</span>
        </div>
        <div className="grid gap-3 text-xs leading-relaxed">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Thermal Printer</p>
            <p className="text-muted-foreground">Compact receipt printer, ideal for quick point-of-sale transactions. Layout is optimized for 58mm continuous rolls.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Standard A4 Printer</p>
            <p className="text-muted-foreground">Traditional office printer. Layout includes more detailed professional headers and larger fonts for A4 paper.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
