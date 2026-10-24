'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface ProductBarcodeProps {
  value: string;
  label?: string;
  height?: number;
}

export function ProductBarcode({ value, label, height = 60 }: ProductBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 12,
        height,
        margin: 8,
        width: 1.5,
      });
    } catch (error) {
      console.error('Barcode render error:', error);
    }
  }, [value, height]);

  function handlePrint() {
    if (!svgRef.current) return;
    const svg = svgRef.current.outerHTML;
    const win = window.open('', '_blank', 'width=400,height=300');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Barcode</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:16px}
      h3{margin:0 0 12px;font-size:14px}</style></head><body>
      ${label ? `<h3>${label}</h3>` : ''}
      ${svg}
      <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    win.document.close();
  }

  if (!value) {
    return <p className="text-xs text-muted-foreground">Enter barcode content to preview</p>;
  }

  return (
    <div className="space-y-2 rounded-md border bg-white p-3">
      {label ? <p className="text-xs font-medium text-slate-600">{label}</p> : null}
      <div className="flex justify-center overflow-x-auto">
        <svg ref={svgRef} />
      </div>
      <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={handlePrint}>
        <Printer className="h-3.5 w-3.5" />
        Print barcode
      </Button>
    </div>
  );
}
