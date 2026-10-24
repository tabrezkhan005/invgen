'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface BusinessSettingsProps {
  settings: {
    shop_name: string;
    shop_address: string;
  };
  onUpdate: (key: string, value: string) => void;
}

export default function BusinessSettings({ settings, onUpdate }: BusinessSettingsProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid gap-2">
        <Label htmlFor="shop_name" className="text-sm font-semibold">Shop Name</Label>
        <Input
          id="shop_name"
          value={settings.shop_name || ''}
          onChange={(e) => onUpdate('shop_name', e.target.value)}
          placeholder="Enter your business name"
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">Your business name as it appears on invoices and receipts.</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="shop_address" className="text-sm font-semibold">Shop Address</Label>
        <Textarea
          id="shop_address"
          value={settings.shop_address || ''}
          onChange={(e) => onUpdate('shop_address', e.target.value)}
          placeholder="Enter your complete shop address"
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">Complete address including street, city, and contact info.</p>
      </div>
    </div>
  );
}
