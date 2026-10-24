'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/electron';

interface BarcodeLabelSheetProps {
  products: Product[];
  open: boolean;
  onClose: () => void;
  currencySymbol?: string;
}

function LabelCell({
  product,
  currencySymbol,
}: {
  product: Product;
  currencySymbol?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const value =
    product.barcode_payload || product.sku || product.code || String(product.id);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 10,
        height: 36,
        margin: 2,
        width: 1.2,
      });
    } catch (error) {
      console.error('Label barcode error:', error);
    }
  }, [value]);

  return (
    <div className="barcode-label flex h-[1.4in] flex-col items-center justify-center overflow-hidden border border-dashed border-slate-300 p-1 text-center">
      <p className="w-full truncate text-[10px] font-semibold leading-tight text-slate-900">
        {product.name}
      </p>
      <p className="font-mono text-[9px] text-slate-600">{product.sku}</p>
      <p className="text-[10px] font-bold text-slate-800">
        {formatCurrency(product.price || 0, currencySymbol)}
      </p>
      <svg ref={svgRef} className="max-w-full" />
    </div>
  );
}

export function BarcodeLabelSheet({
  products,
  open,
  onClose,
  currencySymbol,
}: BarcodeLabelSheetProps) {
  if (!open) return null;

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('printing-labels');
    return () => document.body.classList.remove('printing-labels');
  }, [open]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/50 print:static print:bg-white">
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 print:hidden">
        <div>
          <h2 className="text-lg font-bold">Print barcode labels</h2>
          <p className="text-sm text-muted-foreground">
            {products.length} label{products.length === 1 ? '' : 's'} · A4 sheet
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-100 p-4 print:bg-white print:p-0">
        <div className="barcode-label-sheet mx-auto grid max-w-[210mm] grid-cols-3 gap-1 bg-white p-2 shadow-lg print:max-w-none print:shadow-none sm:grid-cols-3">
          {products.map((product) => (
            <LabelCell
              key={product.id}
              product={product}
              currencySymbol={currencySymbol}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
