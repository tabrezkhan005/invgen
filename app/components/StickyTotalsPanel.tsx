'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { Calculator, Percent, Tag } from 'lucide-react';

interface StickyTotalsPanelProps {
  subtotal: number;
  taxRate?: number;
  onTaxRateChange?: (rate: number) => void;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  onDiscountChange?: (type: 'percentage' | 'fixed', value: number) => void;
  disabled?: boolean;
  settings?: any;
}

export default function StickyTotalsPanel({
  subtotal,
  taxRate = 0,
  onTaxRateChange,
  discountType = 'percentage',
  discountValue = 0,
  onDiscountChange,
  disabled = false,
  settings
}: StickyTotalsPanelProps) {
  const [isEditingTax, setIsEditingTax] = useState(false);
  const [tempTaxRate, setTempTaxRate] = useState(taxRate);
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [tempDiscountType, setTempDiscountType] = useState<'percentage' | 'fixed'>(discountType);
  const [tempDiscountValue, setTempDiscountValue] = useState(discountValue);

  const discountAmount = discountType === 'percentage'
    ? subtotal * (discountValue / 100)
    : Math.min(discountValue, subtotal);
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
  const grandTotal = subtotal - discountAmount + taxAmount;

  const handleTaxSave = () => {
    if (onTaxRateChange) onTaxRateChange(tempTaxRate);
    setIsEditingTax(false);
  };

  const handleDiscountSave = () => {
    if (onDiscountChange) onDiscountChange(tempDiscountType, tempDiscountValue);
    setIsEditingDiscount(false);
  };

  return (
    <div className="sticky bottom-0 z-10 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-md border-t">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 items-end md:items-center justify-between">
        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
          {/* Discount Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" /> Discount
            </label>
            <div className="flex gap-1">
              <Select
                value={discountType}
                onValueChange={(v: any) => onDiscountChange?.(v, discountValue)}
                disabled={disabled}
              >
                <SelectTrigger className="w-[70px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="fixed">{settings?.currency_symbol || '₹'}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => onDiscountChange?.(discountType, Number(e.target.value) || 0)}
                className="w-24 h-9"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Tax Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" /> Tax Rate
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={taxRate}
                onChange={(e) => onTaxRateChange?.(Number(e.target.value) || 0)}
                className="w-24 h-9"
                disabled={disabled}
              />
              <span className="text-sm font-medium">%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full md:w-auto md:min-w-[300px]">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal, settings?.currency_symbol || '₹')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-destructive">-{formatCurrency(discountAmount, settings?.currency_symbol || '₹')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax ({taxRate}%)</span>
            <span>{formatCurrency(taxAmount, settings?.currency_symbol || '₹')}</span>
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Grand Total</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(grandTotal, settings?.currency_symbol || '₹')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
