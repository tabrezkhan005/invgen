'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Plus,
  FileText,
  Printer,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  History,
  MoreHorizontal,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from 'next/link';
import PinModal from '../PinModal';
import AppLayout from '../components/AppLayout';
import { formatDate, formatCurrency } from '@/lib/utils';

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface Invoice {
  id: number;
  customer_id: number;
  invoice_no: string;
  date: string;
  total: number;
  customer_name?: string;
}

export default function InvoicesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const invoicesPerPage = 15;

  const loadInitialData = useCallback(async () => {
    try {
      const [customerData, settingsData] = await Promise.all([
        window.electronAPI.getCustomers(),
        window.electronAPI.getAllSettings()
      ]);
      setCustomers(customerData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * invoicesPerPage;
      let result;
      if (selectedCustomerId === 'all') {
        result = await window.electronAPI.getInvoicesPaginated({ limit: invoicesPerPage, offset });
      } else {
        result = await window.electronAPI.getInvoicesByCustomerPaginated(Number(selectedCustomerId), { limit: invoicesPerPage, offset });
      }

      // Fetch customer names for each invoice if not joined
      const invoicesWithNames = await Promise.all(result.invoices.map(async (inv: any) => {
        const customer = customers.find(c => c.id === inv.customer_id);
        return { ...inv, customer_name: customer?.name || 'Unknown' };
      }));

      setInvoices(invoicesWithNames);
      setTotalInvoices(result.total);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedCustomerId, customers]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);
  useEffect(() => { if (customers.length > 0) loadInvoices(); }, [loadInvoices, customers]);

  const handlePrint = async (id: number) => {
    setPrintingId(id);
    try {
      await window.electronAPI.printInvoice(id);
    } finally {
      setPrintingId(null);
    }
  };

  const handleDownloadPDF = async (id: number) => {
    try {
      await window.electronAPI.generatePDF(id);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      const result = await window.electronAPI.deleteInvoice(pendingDeleteId);
      if (result.success) loadInvoices();
    } finally {
      setShowPinModal(false);
      setPendingDeleteId(null);
    }
  };

  const totalPages = Math.ceil(totalInvoices / invoicesPerPage);

  return (
    <AppLayout
      title="Invoice History"
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Invoices" }]}
      actionButton={
        <Button asChild className="gap-2">
          <Link href="/billing"><Plus className="h-4 w-4" /> New Invoice</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Invoice History</h1>
          <p className="text-muted-foreground">Manage and track all generated invoices</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filter by Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCustomerId} onValueChange={(val) => { setSelectedCustomerId(val); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" /> Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-8">
              <div>
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{totalInvoices}</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div>
                <p className="text-xs text-muted-foreground">Recent Activity</p>
                <p className="text-sm font-medium">Last invoice: {invoices[0] ? formatDate(invoices[0].date) : 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Invoice No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="h-16 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                          Loading...
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono font-medium pl-6">{inv.invoice_no}</TableCell>
                      <TableCell>{inv.customer_name}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(inv.date)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(inv.total, settings.currency_symbol || '₹')}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => handlePrint(inv.id)}
                            disabled={printingId === inv.id}
                          >
                            <Printer className="h-3.5 w-3.5 mr-1.5" />
                            {printingId === inv.id ? '...' : 'Print'}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Invoice Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleDownloadPDF(inv.id)}>
                                  <Download className="h-4 w-4 mr-2" /> Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                onClick={() => { setPendingDeleteId(inv.id); setShowPinModal(true); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onVerify={async (pin) => await window.electronAPI.verifyAdminPin(pin)}
        onVerified={handleDelete}
        title="Confirm Deletion"
        description="This action requires Admin PIN and cannot be undone."
      />
    </AppLayout>
  );
}
