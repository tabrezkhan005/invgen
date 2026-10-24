'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface InvoiceSettingsProps {
  settings: {
    invoice_prefix: string;
    currency_symbol: string;
    tax_rate: string;
    invoice_footer: string;
  };
  onUpdate: (key: string, value: string) => void;
}

export default function InvoiceSettings({ settings, onUpdate }: InvoiceSettingsProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="grid gap-2">
          <Label htmlFor="invoice_prefix" className="text-sm font-semibold">Invoice Prefix</Label>
          <Input
            id="invoice_prefix"
            value={settings.invoice_prefix || ''}
            onChange={(e) => onUpdate('invoice_prefix', e.target.value.toUpperCase())}
            placeholder="INV"
            maxLength={10}
            className="h-11 font-mono"
          />
          <p className="text-xs text-muted-foreground">Uppercase letters and numbers only.</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="currency_symbol" className="text-sm font-semibold">Currency Symbol</Label>
          <Input
            id="currency_symbol"
            value={settings.currency_symbol || ''}
            onChange={(e) => onUpdate('currency_symbol', e.target.value)}
            placeholder="₹"
            maxLength={3}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">e.g., $, ₹, €, £</p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tax_rate" className="text-sm font-semibold">Default Tax Rate (%)</Label>
        <div className="flex items-center gap-3">
          <Input
            id="tax_rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={settings.tax_rate || ''}
            onChange={(e) => onUpdate('tax_rate', e.target.value)}
            placeholder="0.00"
            className="h-11 w-32"
          />
          <span className="text-sm font-medium">%</span>
        </div>
        <p className="text-xs text-muted-foreground">Standard tax rate for all new invoices.</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="invoice_footer" className="text-sm font-semibold">Invoice Footer</Label>
        <Textarea
          id="invoice_footer"
          value={settings.invoice_footer || ''}
          onChange={(e) => onUpdate('invoice_footer', e.target.value)}
          placeholder="Thank you for your business!"
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">Custom message displayed at the bottom of invoices.</p>
      </div>
    </div>
  );
}
