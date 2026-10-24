'use client';

import { useEffect, useRef, useState } from 'react';
import { ScanBarcode, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/electron';

interface BarcodeScanListenerProps {
  onConfirmAdd: (product: Product, qty: number) => void;
  enabled?: boolean;
}

export function BarcodeScanListener({ onConfirmAdd, enabled = true }: BarcodeScanListenerProps) {
  const [buffer, setBuffer] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState('1');
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const lastKeyTime = useRef(0);
  const bufferRef = useRef('');
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const cameraRegionId = 'barcode-camera-reader';

  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  async function lookupBarcode(raw: string) {
    const code = raw.trim();
    if (!code || !isElectron) return;
    setError('');
    try {
      const product = await window.electronAPI.getProductByBarcode(code);
      if (!product) {
        setError(`No product found for barcode: ${code}`);
        return;
      }
      setPendingProduct(product);
      setQty('1');
    } catch (err) {
      console.error(err);
      setError('Barcode lookup failed');
    }
  }

  // USB wedge scanners type quickly then send Enter
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingField =
        tag === 'input' || tag === 'textarea' || target?.isContentEditable;

      // Allow capture when focus is on our hidden scanner field, or when not typing elsewhere
      const isScannerField = target === scannerInputRef.current;
      if (isTypingField && !isScannerField) return;

      const now = Date.now();
      if (now - lastKeyTime.current > 80) {
        bufferRef.current = '';
      }
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        const value = bufferRef.current.trim();
        bufferRef.current = '';
        setBuffer('');
        if (value.length >= 3) {
          e.preventDefault();
          lookupBarcode(value);
        }
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
        setBuffer(bufferRef.current);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, isElectron]);

  // Optional camera scan via html5-qrcode (still local — uses device camera only)
  useEffect(() => {
    if (!cameraOpen) return;
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let cancelled = false;

    async function startCamera() {
      setCameraError('');
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const instance = new Html5Qrcode(cameraRegionId);
        scanner = instance;
        await instance.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 250, height: 120 } },
          (decoded) => {
            lookupBarcode(decoded);
            setCameraOpen(false);
          },
          () => undefined
        );
      } catch (err: any) {
        console.error(err);
        setCameraError(err?.message || 'Camera not available offline or permission denied');
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (scanner) {
        scanner.stop().catch(() => undefined).finally(() => {
          try { scanner?.clear(); } catch { /* ignore */ }
        });
      }
    };
  }, [cameraOpen]);

  function handleConfirm() {
    if (!pendingProduct) return;
    const quantity = Math.max(1, Number(qty) || 1);
    onConfirmAdd(pendingProduct, quantity);
    setPendingProduct(null);
    setQty('1');
  }

  return (
    <>
      <div className="bp-card space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-2 tracking-tight">
            <ScanBarcode className="h-4 w-4 text-primary" />
            Add from barcode
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setCameraOpen(true)}
          >
            <Camera className="h-3.5 w-3.5" />
            Camera
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use a USB barcode scanner (types + Enter), or paste a code below. Quantity is asked after a match.
        </p>
        <input
          ref={scannerInputRef}
          aria-label="Barcode scanner capture"
          className="sr-only"
          value={buffer}
          readOnly
          tabIndex={-1}
        />
        <div className="flex gap-2">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                lookupBarcode(manualCode);
                setManualCode('');
              }
            }}
            placeholder="Scan or type barcode / SKU"
            className="font-mono text-sm"
          />
          <Button
            type="button"
            onClick={() => {
              lookupBarcode(manualCode);
              setManualCode('');
            }}
          >
            Lookup
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Dialog open={!!pendingProduct} onOpenChange={(open) => !open && setPendingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add scanned product</DialogTitle>
            <DialogDescription>
              Enter quantity. Price is per piece from the product catalog.
            </DialogDescription>
          </DialogHeader>
          {pendingProduct && (
            <div className="space-y-3">
              <div>
                <p className="font-semibold">{pendingProduct.name}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {pendingProduct.sku || pendingProduct.code}
                </p>
                <p className="text-sm mt-1">
                  Unit price: <strong>{formatCurrency(pendingProduct.price || 0)}</strong>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirm();
                    }
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingProduct(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm}>
              Add to bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan with camera</DialogTitle>
            <DialogDescription>Point at a CODE128 barcode. Works offline with the device camera.</DialogDescription>
          </DialogHeader>
          <div id={cameraRegionId} className="w-full overflow-hidden rounded-md bg-black min-h-[220px]" />
          {cameraError && <p className="text-xs text-destructive">{cameraError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCameraOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
