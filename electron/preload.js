const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded successfully');

contextBridge.exposeInMainWorld('electronAPI', {
  // Invoice operations
  createInvoice: (data) => ipcRenderer.invoke('create-invoice', data),
  getInvoices: () => ipcRenderer.invoke('get-invoices'),
  getInvoiceWithItems: (id) => ipcRenderer.invoke('get-invoice-with-items', id),
  updateInvoice: (data) => ipcRenderer.invoke('update-invoice', data),
  deleteInvoice: (id) => ipcRenderer.invoke('delete-invoice', id),

  // Customer operations
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  addCustomer: (data) => ipcRenderer.invoke('add-customer', data),
  updateCustomer: (data) => ipcRenderer.invoke('update-customer', data),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),
  getCustomersWithStats: () => ipcRenderer.invoke('get-customers-with-stats'),

  // PIN operations
  verifyAdminPin: (pin) => ipcRenderer.invoke('verify-admin-pin', pin),
  isAdminPinSet: () => ipcRenderer.invoke('is-admin-pin-set'),
  setAdminPin: (pin) => ipcRenderer.invoke('set-admin-pin', pin),
  updateAdminPin: (data) => ipcRenderer.invoke('update-admin-pin', data),
  isAdminPinVerified: () => ipcRenderer.invoke('is-admin-pin-verified'),

  // Printing operations
  printInvoice: (id, printer) => ipcRenderer.invoke('print-invoice', id, printer),
  generatePDF: (id) => ipcRenderer.invoke('generate-pdf', id),

  // Settings operations
  getAllSettings: () => ipcRenderer.invoke('get-all-settings'),
  updateSetting: (data) => ipcRenderer.invoke('update-setting', data),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),

  // Backup operations
  getBackupStatus: () => ipcRenderer.invoke('get-backup-status'),
  performBackup: () => ipcRenderer.invoke('perform-backup'),
  restoreBackup: (path) => ipcRenderer.invoke('restore-backup', path),
  restoreFromBackup: (options) => ipcRenderer.invoke('restore-from-backup', options),

  // Analytics operations
  getSalesAnalytics: (dateRange) => ipcRenderer.invoke('get-sales-analytics', dateRange),
  getTopCustomers: (dateRange) => ipcRenderer.invoke('get-top-customers', dateRange),
  getRepeatCustomers: (dateRange) => ipcRenderer.invoke('get-repeat-customers', dateRange),
  getInactiveCustomers: (dateRange) => ipcRenderer.invoke('get-inactive-customers', dateRange),
  getCustomerLifetimeValue: () => ipcRenderer.invoke('get-customer-lifetime-value'),
  getRevenueByDate: (dateRange) => ipcRenderer.invoke('get-revenue-by-date', dateRange),
  getAnalyticsFast: (dateRange) => ipcRenderer.invoke('get-analytics-fast', dateRange),

  // Database operations
  getDatabaseStatus: () => ipcRenderer.invoke('get-database-status'),
  isPortableMode: () => ipcRenderer.invoke('is-portable-mode'),

  // Export operations
  exportInvoicesPdf: (dateRange) => ipcRenderer.invoke('export-invoices-pdf', dateRange),
  exportReportsExcel: (dateRange) => ipcRenderer.invoke('export-reports-excel', dateRange),
  exportCustomerLedgerCsv: () => ipcRenderer.invoke('export-customer-ledger-csv'),

  // Connection operations
  scanPrinters: () => ipcRenderer.invoke('scan-printers'),
  scanUsbDrives: () => ipcRenderer.invoke('scan-usb-drives'),
  setSelectedPrinter: (printerId) => ipcRenderer.invoke('set-selected-printer', printerId),
  setSelectedUsbDrive: (usbDriveId) => ipcRenderer.invoke('set-selected-usb-drive', usbDriveId),
  getSelectedDevices: () => ipcRenderer.invoke('get-selected-devices'),
  testPrinterConnection: (printerId) => ipcRenderer.invoke('test-printer-connection', printerId),

  // Recent invoices for reprint functionality
  getRecentInvoices: (limit) => ipcRenderer.invoke('get-recent-invoices', limit),
  getInvoicesByCustomer: (customerId) => ipcRenderer.invoke('get-invoices-by-customer', customerId),
  getInvoicesPaginated: (options) => ipcRenderer.invoke('get-invoices-paginated', options),
  getInvoicesByCustomerPaginated: (customerId, options) =>
    ipcRenderer.invoke('get-invoices-by-customer-paginated', customerId, options),

  // Products management
  addProduct: (productData) => ipcRenderer.invoke('add-product', productData),
  getProducts: () => ipcRenderer.invoke('get-products'),
  getProductsPaginated: (options) => ipcRenderer.invoke('get-products-paginated', options || {}),
  searchProducts: (query, limit) => ipcRenderer.invoke('search-products', query, limit),
  updateProduct: (id, productData) => ipcRenderer.invoke('update-product', { id, productData }),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  getProductById: (id) => ipcRenderer.invoke('get-product-by-id', id),
  getProductBySku: (sku) => ipcRenderer.invoke('get-product-by-sku', sku),
  getProductByBarcode: (payload) => ipcRenderer.invoke('get-product-by-barcode', payload),
  getProductCategories: () => ipcRenderer.invoke('get-product-categories'),
  addProductCategory: (name) => ipcRenderer.invoke('add-product-category', name),
  updateProductCategory: (id, name) =>
    ipcRenderer.invoke('update-product-category', { id, name }),
  deleteProductCategory: (id) => ipcRenderer.invoke('delete-product-category', id),
  saveProductImage: (imageData, fileName) => ipcRenderer.invoke('save-product-image', { imageData, fileName }),
  getProductImage: (imagePath) => ipcRenderer.invoke('get-product-image', imagePath),
  // Inventory
  adjustInventory: (data) => ipcRenderer.invoke('adjust-inventory', data),
  getInventorySummary: () => ipcRenderer.invoke('get-inventory-summary'),
  getLowStockProducts: () => ipcRenderer.invoke('get-low-stock-products'),
  getInventoryMovements: (options) => ipcRenderer.invoke('get-inventory-movements', options || {}),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),

  // Audit logs
  getAuditLogs: (options) => ipcRenderer.invoke('get-audit-logs', options),

  // Test methods
  testConnection: () => Promise.resolve({ success: true, message: 'Electron API is working!' }),
  testPrinterScan: () => ipcRenderer.invoke('test-printer-scan'),
  testPrint: () => ipcRenderer.invoke('test-print'),
});
