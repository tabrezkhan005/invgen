export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at?: string;
}

export interface CustomerWithStats {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  created_at: string;
  total_spent: number;
  total_invoices: number;
  last_visit: string | null;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  averageLifetimeValue: number;
}

export interface InvoiceItem {
  item_name: string;
  qty: number;
  price: number;
  amount: number;
  product_id?: number | null;
  sku?: string;
}

export interface Invoice {
  id: number;
  customer_id: number;
  invoice_no: string;
  date: string;
  total: number;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  items?: InvoiceItem[];
}

export interface BackupStatus {
  hasDrive: boolean;
  driveLetter: string | null;
  lastBackup: string | null;
  backupCount: number;
}

export interface BackupResult {
  success: boolean;
  message: string;
  drive?: string;
  path?: string;
}

export interface SalesAnalytics {
  total_invoices: number;
  total_revenue: number;
  avg_bill_value: number;
  highest_bill: number;
}

export interface CustomerAnalytics {
  id: number;
  name: string;
  phone: string;
  invoice_count?: number;
  total_spent?: number;
  total_invoices?: number;
  first_invoice?: string;
  last_invoice?: string;
  last_invoice_date?: string;
  lifetime_value?: number;
  avg_order_value?: number;
  first_purchase?: string;
  last_purchase?: string;
  customer_age_days?: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ExportResult {
  success: boolean;
  message: string;
  path?: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  backupUsed?: string;
  currentBackup?: string;
}

export interface DatabaseStatus {
  initialized: boolean;
  readOnly: boolean;
  recoveryMessage: string | null;
  dbPath: string | null;
  portableMode: boolean;
}

export interface PinResult {
  success: boolean;
  message: string;
}

export interface DeleteResult {
  success: boolean;
  message: string;
}

export interface AppSettings {
  shop_name: string;
  shop_address: string;
  invoice_prefix: string;
  printer_type: 'thermal' | 'a4';
  backup_interval: 'manual' | 'daily' | 'weekly';
  currency_symbol: string;
  tax_rate: string;
  invoice_footer: string;
}

export interface SettingUpdate {
  key: string;
  value: string;
}

export interface SettingResult {
  success: boolean;
  message: string;
}

export interface PrintResult {
  success?: boolean;
  message?: string;
  fallbackUsed?: boolean;
  originalError?: string;
  filePath?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface PaginatedInvoices {
  invoices: any[];
  total: number;
  limit: number;
  offset: number;
}

export interface FastAnalyticsData {
  salesAnalytics: any;
  topCustomers: any[];
  repeatCustomers: any[];
  inactiveCustomers: any[];
  lifetimeValue: any[];
}

export interface Printer {
  id: string;
  name: string;
  type: 'thermal' | 'a4' | 'wifi';
  status: 'available' | 'busy' | 'offline';
  connection?: string;
  ip?: string;
  port?: number;
}

export interface USBDrive {
  id: string;
  name: string;
  mountPoint: string;
  size: string;
  available: string;
  status: 'mounted' | 'unmounted' | 'busy';
}

export interface ProductAttribute {
  id?: number;
  product_id?: number;
  label: string;
  value: string;
  sort_order?: number;
}

export interface ProductCategory {
  id: number;
  name: string;
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  sku: string;
  price: number;
  image_path: string | null;
  category_id: number | null;
  category_name?: string | null;
  barcode_payload?: string | null;
  bill_name?: string | null;
  stock_qty: number;
  low_stock_threshold: number;
  unit: string;
  is_low_stock?: boolean;
  is_out_of_stock?: boolean;
  attributes?: ProductAttribute[];
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  sku?: string;
  code?: string;
  price?: number;
  image_path?: string | null;
  category_id?: number | null;
  barcode_payload?: string;
  bill_name?: string | null;
  stock_qty?: number;
  low_stock_threshold?: number;
  unit?: string;
  attributes?: ProductAttribute[];
}

export interface InventorySummary {
  total_products: number;
  total_units: number;
  stock_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface InventoryMovement {
  id: number;
  product_id: number;
  type: string;
  qty: number;
  balance_after: number;
  note: string | null;
  reference_id: string | null;
  created_at: string;
  product_name?: string;
  sku?: string;
}

export interface ProductResult {
  success: boolean;
  message: string;
  product?: Product;
  category?: ProductCategory;
}

export interface AuditLog {
  id: number;
  action: string;
  reference_id: string | null;
  details: string | null;
  timestamp: string;
}

export interface AuditLogOptions {
  limit?: number;
  offset?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
}

  export interface RevenueData {
    date: string;
    revenue: number;
    invoices: number;
  }

  export interface ElectronAPI {
  // Customer operations
  addCustomer: (customer: { name: string; phone: string; email?: string; address?: string }) => Promise<Customer>;
  getCustomers: () => Promise<Customer[]>;
  getCustomersWithStats: () => Promise<CustomerWithStats[]>;
  updateCustomer: (id: number, customerData: { name: string; phone: string; email?: string; address?: string }) => Promise<boolean>;
  deleteCustomer: (id: number) => Promise<boolean>;
  getCustomerStats: () => Promise<CustomerStats>;
  getDashboardStats: () => Promise<{ totalCustomers: number; totalRevenue: number; totalInvoices: number; activeCustomers: number }>;
  getTodaySummary: () => Promise<{ invoicesCreated: number; revenueGenerated: number; newCustomers: number }>;

  // Invoice operations
  createInvoice: (invoiceData: {
    customerId: number;
    date: string;
    items: InvoiceItem[];
  }) => Promise<Invoice>;
  getInvoicesByCustomer: (customerId: number) => Promise<Invoice[]>;
    getInvoiceWithItems: (invoiceId: number) => Promise<Invoice | null>;
    getRecentInvoices: (limit?: number) => Promise<Invoice[]>;
    generatePDF: (invoiceId: number) => Promise<{ success: boolean; message: string; filePath?: string }>;

    // Print operations
  printInvoice: (invoiceId: number, printer?: string) => Promise<PrintResult>;

  // Backup operations
  performBackup: () => Promise<BackupResult>;
  getBackupStatus: () => Promise<BackupStatus>;

  // Analytics operations
  getSalesAnalytics: (dateRange: DateRange) => Promise<SalesAnalytics>;
  getTopCustomers: (dateRange: DateRange) => Promise<CustomerAnalytics[]>;
  getRepeatCustomers: (dateRange: DateRange) => Promise<CustomerAnalytics[]>;
  getInactiveCustomers: (dateRange: DateRange) => Promise<CustomerAnalytics[]>;
  getCustomerLifetimeValue: () => Promise<CustomerAnalytics[]>;
  getRevenueByDate: (dateRange: DateRange) => Promise<RevenueData[]>;

  // Export operations
  exportInvoicesToPDF: (dateRange: DateRange) => Promise<ExportResult>;
  exportReportsToExcel: (dateRange: DateRange) => Promise<ExportResult>;
  exportCustomerLedgerToCSV: () => Promise<ExportResult>;

  // Restore operations
  restoreFromBackup: () => Promise<RestoreResult>;
  isPortableMode: () => Promise<boolean>;
  getDatabaseStatus: () => Promise<DatabaseStatus>;

  // PIN management operations
  setAdminPin: (pin: string) => Promise<PinResult>;
  verifyAdminPin: (pin: string) => Promise<PinResult>;
  isAdminPinSet: () => Promise<boolean>;
  isAdminPinVerified: () => Promise<boolean>;

  // Protected operations
  deleteInvoice: (invoiceId: number) => Promise<DeleteResult>;

  // Audit logging operations
  getAuditLogs: (options?: AuditLogOptions) => Promise<AuditLog[]>;

  // Settings operations
  getAllSettings: () => Promise<AppSettings>;
  updateSetting: (setting: SettingUpdate) => Promise<SettingResult>;
  resetSettings: () => Promise<SettingResult>;

  // Performance optimized operations
  getInvoicesPaginated: (options?: PaginationOptions) => Promise<PaginatedInvoices>;
  getInvoicesByCustomerPaginated: (customerId: number, options?: PaginationOptions) => Promise<PaginatedInvoices>;
  getAnalyticsFast: (dateRange: { startDate: string; endDate: string }) => Promise<FastAnalyticsData | null>;

  // Connections management
  scanPrinters: () => Promise<Printer[]>;
  testPrinterConnection: (printerId: string) => Promise<{ success: boolean; message: string }>;
  scanUsbDrives: () => Promise<USBDrive[]>;
  setSelectedPrinter: (printerId: string) => Promise<{ success: boolean; message: string }>;
  setSelectedUsbDrive: (usbDriveId: string) => Promise<{ success: boolean; message: string }>;
  getSelectedDevices: () => Promise<{ selectedPrinter: string; selectedUsbDrive: string }>;

  // Products management
  addProduct: (productData: ProductInput) => Promise<ProductResult>;
  getProducts: () => Promise<Product[]>;
  getProductsPaginated: (options?: {
    page?: number;
    pageSize?: number;
    query?: string;
    categoryId?: number | null;
    stockFilter?: 'low' | 'out';
  }) => Promise<{ items: Product[]; total: number; page: number; pageSize: number }>;
  searchProducts: (query: string, limit?: number) => Promise<Product[]>;
  restoreBackup: (path?: string) => Promise<{ success: boolean; message: string }>;
  updateProduct: (id: number, productData: ProductInput) => Promise<ProductResult>;
  deleteProduct: (id: number) => Promise<ProductResult>;
  getProductById: (id: number) => Promise<Product | null>;
  getProductBySku: (sku: string) => Promise<Product | null>;
  getProductByBarcode: (payload: string) => Promise<Product | null>;
  getProductCategories: () => Promise<ProductCategory[]>;
  addProductCategory: (name: string) => Promise<ProductResult>;
  updateProductCategory: (id: number, name: string) => Promise<ProductResult>;
  deleteProductCategory: (id: number) => Promise<ProductResult>;
  saveProductImage: (imageData: string, fileName: string) => Promise<{ success: boolean; imagePath?: string; fileName?: string; message?: string }>;
  getProductImage: (imagePath: string) => Promise<{ success: boolean; dataUrl?: string; message?: string }>;
  // Inventory
  adjustInventory: (data: {
    productId: number;
    qtyChange: number;
    type?: 'in' | 'out' | 'adjust';
    note?: string;
  }) => Promise<ProductResult>;
  getInventorySummary: () => Promise<InventorySummary>;
  getLowStockProducts: () => Promise<Product[]>;
  getInventoryMovements: (options?: { limit?: number; productId?: number }) => Promise<InventoryMovement[]>;

  // Testing
  testPrinterScan: () => Promise<any>;
  testPrint: () => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
