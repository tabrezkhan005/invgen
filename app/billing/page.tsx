'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Receipt, Calendar, Info, CheckCircle2, AlertCircle, Database, Settings, RotateCcw, Package, Printer, PauseCircle, PlayCircle, Trash2, Clock } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Replaced CustomerSelector with inline autocomplete input for faster access
import AppLayout from '../components/AppLayout';
import InvoiceItemsTable from '../components/InvoiceItemsTable';
import StickyTotalsPanel from '../components/StickyTotalsPanel';
import { ProductPickerPanel } from '../components/product-picker-panel';
import { BarcodeScanListener } from '../components/barcode-scan-listener';
import { formatCurrency } from '@/lib/utils';
import {
  clearPendingBillItems,
  productToBillItem,
  readPendingBillItems,
} from '@/lib/pending-bill-items';
import {
  draftHasContent,
  heldBillItemCount,
  heldBillTotal,
  loadHeldBills,
  MAX_HELD_BILLS,
  saveHeldBills,
  type HeldBill,
} from '@/lib/held-bills';
import type { Printer as ElectronPrinter, Product } from '@/types/electron';

interface Customer {
  id: number;
  name: string;
  phone: string;
  created_at: string;
}

interface InvoiceItem {
  item_name: string;
  qty: number;
  price: number;
  amount: number;
  product_id?: number | null;
  sku?: string;
}

interface BackupStatus {
  hasDrive: boolean;
  driveLetter: string | null;
  lastBackup: string | null;
  backupCount: number;
}

interface DatabaseStatus {
  initialized: boolean;
  readOnly: boolean;
  recoveryMessage: string | null;
  dbPath: string | null;
  portableMode: boolean;
}


export default function BillingPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [printers, setPrinters] = useState<ElectronPrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  });
  const [items, setItems] = useState<InvoiceItem[]>([{ item_name: '', qty: 1, price: 0, amount: 0 }]);
  const [taxRate, setTaxRate] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  // Success Dialog State
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);

  // Held Bills — persisted to localStorage (survive refresh/restart)
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [heldBillsReady, setHeldBillsReady] = useState(false);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [editingHoldNoteId, setEditingHoldNoteId] = useState<string | null>(null);
  const [editingHoldNote, setEditingHoldNote] = useState('');

  // Refs for keyboard navigation
  const itemRefs = useRef<(HTMLInputElement | null)[]>([]);
  const customerInputRef = useRef<HTMLInputElement>(null); // New ref for customer input
  const formRef = useRef<HTMLFormElement>(null);

  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  const loadInitialData = useCallback(async () => {
    if (!isElectron) return;
    try {
      const [customerData, backupData, databaseData, settingsData] = await Promise.all([
        window.electronAPI.getCustomers(),
        window.electronAPI.getBackupStatus(),
        window.electronAPI.getDatabaseStatus(),
        window.electronAPI.getAllSettings()
      ]);
      setCustomers(customerData);
      setBackupStatus(backupData);
      setDbStatus(databaseData);
      setSettings(settingsData);
      if (settingsData.tax_rate) setTaxRate(Number(settingsData.tax_rate));

      // Load recent invoices separately with error handling
      try {
        const recentInvoicesData = await window.electronAPI.getRecentInvoices();
        setRecentInvoices(recentInvoicesData || []);
      } catch (error) {
        console.error('Error loading recent invoices:', error);
        setRecentInvoices([]);
      }

      // Load printers
      let printersData: ElectronPrinter[] = [];
      try {
        printersData = await window.electronAPI.scanPrinters();
        setPrinters(printersData || []);
        console.log('Loaded printers:', printersData);
      } catch (error) {
        console.error('Error loading printers:', error);
        setPrinters([]);
      }

      // Load selected printer
      try {
        const { selectedPrinter: savedPrinter } = await window.electronAPI.getSelectedDevices();
        // Only set the saved printer if it exists in the current printer list
        if (savedPrinter && printersData.some(p => p.id === savedPrinter)) {
          setSelectedPrinter(savedPrinter);
        } else {
          setSelectedPrinter('');
        }
      } catch (error) {
        console.error('Error loading selected printer:', error);
        setSelectedPrinter('');
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }, [isElectron]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    setHeldBills(loadHeldBills());
    setHeldBillsReady(true);
  }, []);

  useEffect(() => {
    if (!heldBillsReady) return;
    saveHeldBills(heldBills);
  }, [heldBills, heldBillsReady]);

  const appendProductToBill = useCallback((product: Product, qty = 1) => {
    const billItem = productToBillItem(product, qty);
    setItems((prev) => {
      const hasOnlyEmpty =
        prev.length === 1 &&
        !prev[0].item_name.trim() &&
        !prev[0].price &&
        prev[0].qty === 1;
      const nextItem: InvoiceItem = {
        item_name: billItem.item_name,
        qty: billItem.qty,
        price: billItem.price,
        amount: billItem.amount,
        product_id: billItem.product_id ?? product.id,
        sku: billItem.sku || product.sku,
      };
      if (hasOnlyEmpty) return [nextItem];
      return [...prev, nextItem];
    });
  }, []);

  // New Bill function - resets the form
  const startNewBill = useCallback(() => {
    // Clear refs array first to prevent stale refs
    if (itemRefs.current) {
      itemRefs.current = [];
    }

    setCustomerName('');
    setItems([{ item_name: '', qty: 1, price: 0, amount: 0 }]);
    setDiscountValue(0);
    setDiscountType('percentage');
    setCustomerSearchOpen(false);
    setFilteredCustomers([]);
    setCurrentFocusIndex(0);
    // Reset date to now
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    setInvoiceDate(localISOTime);

    // Focus on customer name field with multiple attempts to reclaim focus from print dialogs
    const attemptFocus = () => {
      // Ensure window itself has focus before focusing input
      if (typeof window !== 'undefined') {
          window.focus();
      }

      if (customerInputRef.current) {
        customerInputRef.current.focus();
        customerInputRef.current.select();
      }
    };

    // Attempt immediately and at intervals to ensure focus is grabbed after OS window switches
    attemptFocus();
    [100, 300, 500, 800].forEach(delay => setTimeout(attemptFocus, delay));
  }, []);

  const buildHeldFromDraft = useCallback((): HeldBill | null => {
    if (!draftHasContent(customerName, items)) return null;
    return {
      id: `hold-${Date.now()}`,
      customerName,
      items: items.map((item) => ({ ...item })),
      invoiceDate,
      discountValue,
      discountType,
      heldAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      note: '',
    };
  }, [customerName, items, invoiceDate, discountValue, discountType]);

  // Hold current bill — persist (cap at MAX_HELD_BILLS, drop oldest)
  const holdCurrentBill = useCallback(() => {
    const heldBill = buildHeldFromDraft();
    if (!heldBill) return;

    setHeldBills((prev) => {
      const next = [...prev, heldBill];
      if (next.length > MAX_HELD_BILLS) return next.slice(next.length - MAX_HELD_BILLS);
      return next;
    });
    startNewBill();
  }, [buildHeldFromDraft, startNewBill]);

  // Resume: if current draft has content, auto-hold it first
  const resumeBill = useCallback((billId: string) => {
    const bill = heldBills.find((b) => b.id === billId);
    if (!bill) return;

    const currentDraft = buildHeldFromDraft();

    setHeldBills((prev) => {
      let next = prev.filter((b) => b.id !== billId);
      if (currentDraft) {
        next = [...next, { ...currentDraft, id: `hold-${Date.now()}-swap` }];
        if (next.length > MAX_HELD_BILLS) next = next.slice(next.length - MAX_HELD_BILLS);
      }
      return next;
    });

    setCustomerName(bill.customerName);
    setItems(bill.items.length ? bill.items : [{ item_name: '', qty: 1, price: 0, amount: 0 }]);
    setInvoiceDate(bill.invoiceDate);
    setDiscountValue(bill.discountValue);
    setDiscountType(bill.discountType);
    setShowHeldBills(false);
  }, [heldBills, buildHeldFromDraft]);

  const deleteHeldBill = useCallback((billId: string) => {
    setHeldBills((prev) => prev.filter((b) => b.id !== billId));
  }, []);

  const saveHoldNote = useCallback((billId: string, note: string) => {
    setHeldBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, note: note.trim() } : b))
    );
    setEditingHoldNoteId(null);
    setEditingHoldNote('');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      // Ctrl+N or F2 for new bill
      if ((e.ctrlKey && e.key === 'n') || e.key === 'F2') {
        e.preventDefault();
        startNewBill();
      }
      // F3 for hold current bill
      if (e.key === 'F3') {
        e.preventDefault();
        holdCurrentBill();
      }
      // F4 to show held bills
      if (e.key === 'F4') {
        e.preventDefault();
        setShowHeldBills(prev => !prev);
      }
      // Ctrl+P for Generate & Print
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        // Trigger form submission programmatically
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [startNewBill, holdCurrentBill]);

  // Customer search functionality
  const handleCustomerSearch = (searchTerm: string) => {
    setCustomerName(searchTerm);
    if (searchTerm.trim()) {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().startsWith(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerSearchOpen(false);
    setFilteredCustomers([]);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, itemIndex: number, field: string) => {
    const totalItems = items.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (itemIndex < totalItems - 1) {
          setCurrentFocusIndex(itemIndex + 1);
          setTimeout(() => {
            const nextInput = itemRefs.current[itemIndex + 1];
            if (nextInput) nextInput.focus();
          }, 0);
        } else if (field === 'amount') {
          // Add new row when pressing down on last item's amount field
          addItem();
          setTimeout(() => {
            const newInput = itemRefs.current[totalItems];
            if (newInput) newInput.focus();
          }, 0);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (itemIndex > 0) {
          setCurrentFocusIndex(itemIndex - 1);
          setTimeout(() => {
            const prevInput = itemRefs.current[itemIndex - 1];
            if (prevInput) prevInput.focus();
          }, 0);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        // Move to next field in same row
        const fields = ['item_name', 'qty', 'price'];
        const currentFieldIndex = fields.indexOf(field);
        if (currentFieldIndex < fields.length - 1) {
          const nextField = fields[currentFieldIndex + 1];
          const input = document.querySelector(`input[data-item="${itemIndex}"][data-field="${nextField}"]`) as HTMLInputElement;
          if (input) input.focus();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        // Move to previous field in same row
        const prevFields = ['item_name', 'qty', 'price'];
        const prevFieldIndex = prevFields.indexOf(field);
        if (prevFieldIndex > 0) {
          const prevField = prevFields[prevFieldIndex - 1];
          const input = document.querySelector(`input[data-item="${itemIndex}"][data-field="${prevField}"]`) as HTMLInputElement;
          if (input) input.focus();
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (field === 'price') {
          // If this is the last item and price field, add new item
          if (itemIndex === totalItems - 1) {
            addItem();
            setTimeout(() => {
              // Focus on the first field of the new item
              const newItemIndex = totalItems;
              const newInput = itemRefs.current[newItemIndex * 3]; // item_name field of new item
              if (newInput) newInput.focus();
            }, 0);
          } else {
            // Move to next item's first field
            const nextInput = itemRefs.current[(itemIndex + 1) * 3]; // item_name field of next item
            if (nextInput) nextInput.focus();
          }
        } else {
          // Move to next field in same row (for item_name or qty)
          const fields = ['item_name', 'qty', 'price'];
          const currentFieldIndex = fields.indexOf(field);
          if (currentFieldIndex < fields.length - 1) {
            const nextField = fields[currentFieldIndex + 1];
            const input = document.querySelector(`input[data-item="${itemIndex}"][data-field="${nextField}"]`) as HTMLInputElement;
            if (input) input.focus();
          }
        }
        break;
      case 'Delete':
      case 'Backspace':
        // Only delete if field is empty
        const target = e.target as HTMLInputElement;
        if (!target.value && field === 'item_name' && totalItems > 1) {
          e.preventDefault();
          removeItem(itemIndex);
          setTimeout(() => {
            if (itemIndex > 0) {
              const prevInput = itemRefs.current[itemIndex - 1];
              if (prevInput) prevInput.focus();
            }
          }, 0);
        }
        break;
    }
  };

  // No limit on items - they will paginate across multiple pages when printing

  const addItem = () => {
    setItems([...items, { item_name: '', qty: 1, price: 0, amount: 0 }]);
    // Auto-scroll to new item after it's added
    setTimeout(() => {
      const newItemIndex = items.length;
      const newInput = itemRefs.current[newItemIndex * 3];
      if (newInput) {
        newInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        newInput.focus();
      }
    }, 100);
  };
  const removeItem = (index: number) => items.length > 1 && setItems(items.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index], [field]: value };
    if (field === 'qty' || field === 'price') {
      item.amount = (Number(item.qty) || 0) * (Number(item.price) || 0);
    }
    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

  const handleCreateInvoice = async (e: React.FormEvent, action: 'print' | 'pdf' = 'print') => {
    console.log('🎯 Generate & Print clicked, action:', action);
    e.preventDefault();

    console.log('📋 Current state:', {
      customerName: customerName.trim(),
      itemsCount: items.length,
      items: items.map(item => ({ name: item.item_name.trim(), qty: item.qty }))
    });

    // Validation checks
    const customerNameValid = customerName.trim();
    // Only validate items that have a name - allow empty item names (they'll be filtered out)
    const itemsWithName = items.filter(item => item.item_name.trim());
    const hasAtLeastOneItem = itemsWithName.length > 0;
    const itemsValid = itemsWithName.every(item => item.qty > 0);

    console.log('🔍 Validation:', {
      customerNameValid,
      hasAtLeastOneItem,
      itemsValid,
      willProceed: customerNameValid && hasAtLeastOneItem && itemsValid
    });

    if (!customerNameValid || !hasAtLeastOneItem || !itemsValid) {
      console.warn('⚠️ Validation failed, not proceeding');
      return;
    }

    console.log('✅ Validation passed, starting invoice creation');
    setLoading(true);
    try {
      console.log('👤 Finding/creating customer...');
      // Find or create customer
      let customer = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
      console.log('👤 Existing customer found:', !!customer);

      if (!customer) {
        console.log('👤 Creating new customer:', customerName.trim());
        const newCustomer = await window.electronAPI.addCustomer({ name: customerName.trim(), phone: '' });
        console.log('👤 Customer created:', newCustomer);
        if (newCustomer) {
          customer = newCustomer;
          setCustomers(prev => [...prev, newCustomer]);
        } else {
          throw new Error('Failed to create customer');
        }
      }

      console.log('📄 Creating invoice...');
      // Include all items with qty > 0, use "-" for empty item names
      const invoiceData = {
        customerId: customer.id,
        date: invoiceDate,
        items: items
          .filter(item => item.qty > 0 || item.item_name.trim())
          .map(item => ({
            ...item,
            item_name: item.item_name.trim() || '-'
          })),
      };
      console.log('📄 Invoice data:', invoiceData);

      const result = await window.electronAPI.createInvoice(invoiceData);
      console.log('📄 Invoice created:', result);

      if (action === 'print') {
        console.log('🖨️ Starting print process for invoice ID:', result.id, 'with printer:', selectedPrinter);
        console.log('🖨️ Selected printer details:', printers.find(p => p.id === selectedPrinter));
        console.log('🖨️ Available printers:', printers.map(p => ({ id: p.id, name: p.name })));

        try {
          const printResult = await window.electronAPI.printInvoice(result.id, selectedPrinter);
          console.log('🖨️ Print result received:', printResult);

          if (printResult && printResult.success) {
            // Instead of alert, show success dialog
            // We delay this slightly to let existing focus transitions settle
            setLastInvoice(result);
            setShowSuccessDialog(true);

            // Note: We don't call startNewBill() here anymore.
            // It will be called when the user closes the dialog/confirms.
          } else {
            alert(`⚠️ Print completed but result unclear:\n${JSON.stringify(printResult, null, 2)}`);
          }
        } catch (printError: any) {
          console.error('🖨️ Print failed with error:', printError);
          const errorMessage = printError?.message || String(printError);
          console.error('🖨️ Error details:', errorMessage);
          console.error('🖨️ Error stack:', printError?.stack);
          alert(`❌ Print failed!\n\nError: ${errorMessage}\n\nPlease check:\n1. Printer is connected and powered on\n2. Printer is selected in the dropdown\n3. Check console for detailed logs`);
        }

        console.log('🖨️ Print process completed');
      } else {
        console.log('📄 Starting PDF generation for invoice ID:', result.id);
        await window.electronAPI.generatePDF(result.id);
        console.log('📄 PDF generation completed');
      }

      // Store current state for persistence
      const currentState = {
        customerName,
        invoiceDate,
        items: items.filter(item => item.item_name.trim() !== ''),
        taxRate,
        discountType,
        discountValue
      };
      localStorage.setItem('lastInvoiceState', JSON.stringify(currentState));

      setRecentInvoices(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 invoices
      loadInitialData();
    } catch (error: any) {
      console.error('❌ Error creating invoice:', error);
      const errorMessage = error?.message || String(error);
      console.error('❌ Error details:', errorMessage);
      console.error('❌ Error stack:', error?.stack);
      alert(`Failed to create invoice: ${errorMessage}`);
    } finally {
      console.log('🔚 Setting loading to false');
      setLoading(false);
    }
  };

  const handleReprintInvoice = async (invoiceId: number) => {
    try {
      setLoading(true);
      await window.electronAPI.printInvoice(invoiceId, selectedPrinter);
    } catch (error) {
      console.error('Error reprinting invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    // Start new bill (which resets forms and focuses input)
    startNewBill();
  };

  const handleNewBill = () => {
    // Use startNewBill for consistent behavior
    startNewBill();
    localStorage.removeItem('lastInvoiceState');
  };

  // Load persistent state on mount
  useEffect(() => {
    const pending = readPendingBillItems();
    const mappedPending = pending.map((p) => ({
      item_name: p.item_name,
      qty: p.qty,
      price: p.price,
      amount: p.amount,
      product_id: p.product_id ?? null,
      sku: p.sku,
    }));

    const savedState = localStorage.getItem('lastInvoiceState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setCustomerName(state.customerName || '');
        setInvoiceDate(state.invoiceDate || (() => {
          const now = new Date();
          const offset = now.getTimezoneOffset() * 60000;
          return new Date(now.getTime() - offset).toISOString().slice(0, 16);
        })());
        const restored: InvoiceItem[] = state.items || [{ item_name: '', qty: 1, price: 0, amount: 0 }];
        if (mappedPending.length > 0) {
          const hasOnlyEmpty =
            restored.length === 1 &&
            !restored[0].item_name.trim() &&
            !restored[0].price &&
            restored[0].qty === 1;
          setItems(hasOnlyEmpty ? mappedPending : [...restored, ...mappedPending]);
          clearPendingBillItems();
        } else {
          setItems(restored);
        }
        setTaxRate(state.taxRate || 0);
        setDiscountType(state.discountType || 'percentage');
        setDiscountValue(state.discountValue || 0);
      } catch (error) {
        console.error('Error loading saved state:', error);
        if (mappedPending.length > 0) {
          setItems(mappedPending);
          clearPendingBillItems();
        }
      }
    } else if (mappedPending.length > 0) {
      setItems(mappedPending);
      clearPendingBillItems();
    }
  }, []);

  if (!isElectron) return (
    <div className="min-h-screen flex items-center justify-center">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Electron Required</AlertTitle>
        <AlertDescription>This app must be run through Electron.</AlertDescription>
      </Alert>
    </div>
  );

  const billingActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={startNewBill}
        className="gap-1.5 h-9"
        title="Start a new bill (Ctrl+N or F2)"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        New
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={holdCurrentBill}
        className="gap-1.5 h-9"
        title="Hold current bill (F3)"
      >
        <PauseCircle className="h-3.5 w-3.5" />
        Hold
      </Button>
      <Button
        variant={heldBills.length > 0 ? 'default' : 'outline'}
        size="sm"
        onClick={() => setShowHeldBills(!showHeldBills)}
        className="gap-1.5 h-9 relative"
        title="View held bills (F4)"
      >
        <Clock className="h-3.5 w-3.5" />
        Held
        {heldBills.length > 0 && (
          <Badge className="ml-1 h-5 min-w-5 rounded-full bg-[var(--warning)] px-1.5 text-[10px] text-white">
            {heldBills.length}
          </Badge>
        )}
      </Button>
      {selectedPrinter ? (
        <span className="hidden items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-xs text-muted-foreground lg:inline-flex">
          <Printer className="h-3.5 w-3.5" />
          {printers.find((p) => p.id === selectedPrinter)?.name || selectedPrinter}
        </span>
      ) : null}
    </div>
  );

  return (
    <AppLayout title="Create Invoice" subtitle="Build and print bills offline" actionButton={billingActions}>
      {/* Held Bills Panel */}
      {showHeldBills && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Held Bills ({heldBills.length}/{MAX_HELD_BILLS})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHeldBills(false)}
                className="text-amber-700 hover:text-amber-900"
              >
                Close
              </Button>
            </div>
            {heldBills.length === 0 ? (
              <p className="text-amber-700 text-sm">No bills on hold. Press F3 to hold the current bill. Holds are saved across restarts.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {heldBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="bg-white rounded-lg border border-amber-200 p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {bill.customerName || 'No Customer'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {heldBillItemCount(bill)} items •
                          ₹{heldBillTotal(bill).toFixed(2)}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          Held at {bill.heldAt}
                        </p>
                        {editingHoldNoteId === bill.id ? (
                          <div className="mt-2 flex gap-1">
                            <Input
                              value={editingHoldNote}
                              onChange={(e) => setEditingHoldNote(e.target.value)}
                              placeholder="Note / label…"
                              className="h-7 text-xs"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveHoldNote(bill.id, editingHoldNote);
                                if (e.key === 'Escape') {
                                  setEditingHoldNoteId(null);
                                  setEditingHoldNote('');
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => saveHoldNote(bill.id, editingHoldNote)}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="mt-1 text-left text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingHoldNoteId(bill.id);
                              setEditingHoldNote(bill.note || '');
                            }}
                            title="Add or edit note"
                          >
                            {bill.note ? `Note: ${bill.note}` : '+ Add note'}
                          </button>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => resumeBill(bill.id)}
                          className="h-8 gap-1"
                          title="Resume this bill (current draft will be held if non-empty)"
                        >
                          <PlayCircle className="h-3 w-3" />
                          Resume
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteHeldBill(bill.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Delete this held bill"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="space-y-5">
        {dbStatus?.readOnly && (
          <Alert variant="destructive">
            <Database className="h-4 w-4" />
            <AlertTitle>Read-Only Mode</AlertTitle>
            <AlertDescription>Database is in read-only mode. You cannot create new invoices.</AlertDescription>
          </Alert>
        )}

        {/* Printer Selection - Moved to Top */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Printer Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium">Printer:</span>
                <Select
                  value={selectedPrinter}
                  onValueChange={async (value) => {
                    if (value !== "no-printers") {
                      setSelectedPrinter(value);
                      // Save the selected printer to the database for persistence
                      try {
                        await window.electronAPI.setSelectedPrinter(value);
                        console.log('✅ Printer saved:', value);
                      } catch (error) {
                        console.error('Failed to save printer preference:', error);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select printer for printing" />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.length === 0 ? (
                      <SelectItem value="no-printers" disabled>
                        No printers found - click refresh button
                      </SelectItem>
                    ) : (
                      printers.map((printer) => (
                        <SelectItem key={printer.id} value={printer.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{printer.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {printer.type.toUpperCase()}
                            </Badge>
                            {printer.status !== 'available' && (
                              <Badge variant="secondary" className="text-xs">
                                {printer.status}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      console.log('🔍 Scanning for printers...');
                      const printersData = await window.electronAPI.scanPrinters();
                      setPrinters(printersData || []);
                      console.log('Refreshed printers:', printersData);
                      const savedPrinter = localStorage.getItem('selected_printer');
                      if (savedPrinter && printersData.some(p => p.id === savedPrinter)) {
                        setSelectedPrinter(savedPrinter);
                      } else {
                        setSelectedPrinter('');
                      }
                    } catch (error) {
                      console.error('Error scanning printers:', error);
                      setPrinters([]);
                      setSelectedPrinter('');
                    }
                  }}
                  title="Refresh printer list"
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      console.log('🧪 Testing basic print functionality...');
                      const result = await window.electronAPI.testPrint();
                      console.log('🧪 Test print result:', result);
                      alert(`Test Print Result:\n${JSON.stringify(result, null, 2)}`);
                    } catch (error: any) {
                      console.error('🧪 Test print error:', error);
                      const errorMessage = error?.message || String(error);
                      alert(`Test Print Error:\n${errorMessage}`);
                    }
                  }}
                  title="Test basic printing"
                >
                  🧪
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <form ref={formRef} onSubmit={handleCreateInvoice} className="space-y-6">
          {/* Customer Search and Date */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Name</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full relative">
                  <Input
                    ref={customerInputRef}
                    placeholder="Enter customer name..."
                    value={customerName}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    aria-autocomplete="list"
                    aria-expanded={filteredCustomers.length > 0}
                    className="w-full"
                    autoComplete="off"
                    onFocus={() => { /* show suggestions when focused */ }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Close suggestions dropdown
                        setFilteredCustomers([]);
                        // Move focus to first item in the invoice items table
                        const firstItemInput = itemRefs.current[0];
                        if (firstItemInput) {
                          firstItemInput.focus();
                          firstItemInput.select();
                        }
                      }
                    }}
                  />

                  {filteredCustomers.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow-sm max-h-60 overflow-auto">
                      <ul>
                        {filteredCustomers.map((customer) => (
                          <li
                            key={customer.id}
                            role="option"
                            tabIndex={0}
                            onClick={() => selectCustomer(customer)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') selectCustomer(customer);
                            }}
                            className="px-3 py-2 hover:bg-slate-100 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{customer.name}</span>
                              <span className="text-xs text-muted-foreground">{customer.phone || ''}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Date & Time</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="datetime-local"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  disabled={dbStatus?.readOnly}
                />
              </CardContent>
            </Card>
          </div>

          {/* Quick actions + catalog (reference layout) */}
          {!dbStatus?.readOnly && (
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
              <div className="min-w-0 space-y-4">
                <ProductPickerPanel onAddProduct={appendProductToBill} />
                <Card className="bp-card min-w-0 border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Add items</CardTitle>
                    <CardDescription>Line items for this invoice</CardDescription>
                  </CardHeader>
                  <CardContent className="min-w-0 overflow-x-auto">
                    <InvoiceItemsTable
                      items={items}
                      onUpdateItem={updateItem}
                      onAddItem={addItem}
                      onRemoveItem={removeItem}
                      disabled={dbStatus?.readOnly}
                      currencySymbol={settings.currency_symbol}
                      onKeyDown={handleKeyDown}
                      itemRefs={itemRefs}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="min-w-0 space-y-4">
                <Card className="bp-card border-border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Quick actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button asChild variant="outline" className="h-11 w-full justify-start gap-2 border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary-soft)]">
                      <Link href="/products">
                        <Package className="h-4 w-4" />
                        New product
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground px-1">
                      Scan a barcode or search the catalog to add priced SKUs with quantity.
                    </p>
                  </CardContent>
                </Card>
                <BarcodeScanListener onConfirmAdd={appendProductToBill} enabled />
              </div>
            </div>
          )}

          {dbStatus?.readOnly && (
            <Card className="bp-card">
              <CardContent className="pt-6">
                <InvoiceItemsTable
                  items={items}
                  onUpdateItem={updateItem}
                  onAddItem={addItem}
                  onRemoveItem={removeItem}
                  disabled
                  currencySymbol={settings.currency_symbol}
                  onKeyDown={handleKeyDown}
                  itemRefs={itemRefs}
                />
              </CardContent>
            </Card>
          )}

          {/* Totals */}
          <StickyTotalsPanel
            subtotal={subtotal}
            taxRate={taxRate}
            onTaxRateChange={setTaxRate}
            discountType={discountType}
            discountValue={discountValue}
            onDiscountChange={(type, value) => {
              setDiscountType(type);
              setDiscountValue(value);
            }}
            disabled={dbStatus?.readOnly}
            settings={settings}
          />

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              {recentInvoices.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-sm font-medium text-gray-700">Recent:</span>
                  {recentInvoices.slice(0, 3).map((invoice, index) => (
                    <Button
                      key={invoice.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleReprintInvoice(invoice.id)}
                      disabled={loading}
                    >
                      #{invoice.invoice_no}
                    </Button>
                  ))}
                </div>
              )}
            </div>


            <div className="flex flex-wrap gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 rounded-lg px-6 font-semibold"
                disabled={loading || dbStatus?.readOnly || !customerName.trim()}
                onClick={(e) => handleCreateInvoice(e, 'pdf')}
              >
                {loading ? 'Processing…' : 'Save as PDF'}
              </Button>
              <Button
                type="button"
                size="lg"
                className="h-11 rounded-lg bg-primary px-8 font-semibold text-primary-foreground shadow-md hover:bg-[var(--primary-hover)]"
                disabled={loading || dbStatus?.readOnly || !customerName.trim() || !selectedPrinter}
                onClick={(e) => handleCreateInvoice(e, 'print')}
              >
                {loading ? 'Processing…' : 'Generate & Print'}
                {!loading && <Receipt className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </form>
      </main>


      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Invoice Created Successfully
            </DialogTitle>
            <DialogDescription>
              Invoice #{lastInvoice?.invoice_no} has been created and sent to the printer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
             <div className="flex justify-between text-sm">
                <span className="text-gray-500">Customer:</span>
                <span className="font-medium">{lastInvoice?.customer_name}</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount:</span>
                <span className="font-bold">₹{lastInvoice?.total?.toFixed(2)}</span>
             </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                  setShowSuccessDialog(false);
                  startNewBill();
              }}
            >
              Close
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto bp-btn-primary"
              onClick={handleSuccessDialogClose}
              autoFocus
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Start New Bill (Enter)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
