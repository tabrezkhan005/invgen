// IPC handlers for connections (printers and USB drives)
ipcMain.handle('scan-printers', async () => {
  console.log('Scanning for printers...');
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    console.log(`Found ${printers.length} printers`);
    return printers;
  } catch (error) {
    console.error('Error scanning printers:', error);
    return [];
  }
});

ipcMain.handle('test-printer-connection', async (event, printerId) => {
  try {
    // In production, we'd actually test the printer
    // For now, we'll verify it's still available
    const printers = await mainWindow.webContents.getPrintersAsync();
    const printer = printers.find(p => p.name === printerId);
    if (printer) {
      return { success: true, message: 'Printer is available' };
    } else {
      return { success: false, message: 'Printer not found' };
    }
  } catch (error) {
    console.error('Error testing printer connection:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('scan-usb-drives', async () => {
  console.log('Scanning for USB drives...');
  try {
    const drives = await detectRemovableDrives();
    const formattedDrives = drives.map(drive => ({
      id: `usb-${drive.letter}`,
      name: drive.description || `Removable Drive (${drive.letter})`,
      mountPoint: drive.mountpoint,
      status: 'mounted'
    }));
    console.log(`Found ${formattedDrives.length} USB drives`);
    return formattedDrives;
  } catch (error) {
    console.error('Error scanning USB drives:', error);
    return [];
  }
});

ipcMain.handle('set-selected-printer', async (event, printerId) => {
  try {
    global.db.setSetting('selected_printer', printerId);
    return { success: true, message: 'Default printer updated' };
  } catch (error) {
    console.error('Error setting selected printer:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('set-selected-usb-drive', async (event, usbDriveId) => {
  try {
    global.db.setSetting('selected_usb_drive', usbDriveId);
    return { success: true, message: 'Default USB drive updated' };
  } catch (error) {
    console.error('Error setting selected USB drive:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-selected-devices', async () => {
  try {
    const selectedPrinter = global.db.getSetting('selected_printer') || '';
    const selectedUsbDrive = global.db.getSetting('selected_usb_drive') || '';
    return { selectedPrinter, selectedUsbDrive };
  } catch (error) {
    console.error('Error getting selected devices:', error);
    return { selectedPrinter: '', selectedUsbDrive: '' };
  }
});

ipcMain.handle('get-revenue-by-date', async (event, { startDate, endDate }) => {
  try {
    return global.db.getRevenueByDate(startDate, endDate);
  } catch (error) {
    console.error('Error getting revenue by date:', error);
    return [];
  }
});

ipcMain.handle('get-dashboard-stats', async () => {
  try {
    return global.db.getDashboardStats();
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return {
      totalCustomers: 0,
      totalRevenue: 0,
      totalInvoices: 0,
      activeCustomers: 0
    };
  }
});

// IPC handlers for audit logging
ipcMain.handle('get-audit-logs', async (event, options = {}) => {
  try {
    const { limit = 100, offset = 0, action, startDate, endDate } = options;

    if (!global.db) return [];

    if (action) {
      return global.db.getAuditLogsByAction(action, limit, offset);
    } else if (startDate && endDate) {
      return global.db.getAuditLogsByDateRange(startDate, endDate, limit, offset);
    } else {
      return global.db.getAuditLogs(limit, offset);
    }
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return [];
  }
});

// IPC handlers for paginated invoice queries
ipcMain.handle('get-invoices-paginated', async (event, options = {}) => {
  try {
    const { limit = 50, offset = 0 } = options;
    if (!global.db) return { invoices: [], total: 0 };

    const invoices = global.db.getInvoicesPaginated(limit, offset);
    const total = global.db.getInvoiceCount();
    return { invoices, total, limit, offset };
  } catch (error) {
    console.error('Error getting paginated invoices:', error);
    return { invoices: [], total: 0, limit, offset };
  }
});

ipcMain.handle('get-invoices-by-customer-paginated', async (event, customerId, options = {}) => {
  try {
    const { limit = 50, offset = 0 } = options;
    if (!global.db) return { invoices: [], total: 0 };

    const invoices = global.db.getInvoicesByCustomerPaginated(customerId, limit, offset);
    const total = global.db.getInvoiceCount(customerId);
    return { invoices, total, limit, offset };
  } catch (error) {
    console.error('Error getting paginated customer invoices:', error);
    return { invoices: [], total: 0, limit, offset };
  }
});

// IPC handlers for optimized analytics
ipcMain.handle('get-analytics-fast', async (event, dateRange) => {
  try {
    const { startDate, endDate } = dateRange;
    if (!global.db) return null;

    const analyticsData = await runHeavyQuery(async () => {
      const [
        salesData,
        topCustomersData,
        repeatCustomersData,
        inactiveCustomersData,
        lifetimeValueData
      ] = await Promise.all([
        global.db.getSalesAnalyticsFast(startDate, endDate),
        global.db.getTopCustomersFast(startDate, endDate),
        global.db.getRepeatCustomers(startDate, endDate),
        global.db.getInactiveCustomers(endDate, startDate, endDate),
        global.db.getCustomerLifetimeValue()
      ]);

      return {
        salesAnalytics: salesData,
        topCustomers: topCustomersData,
        repeatCustomers: repeatCustomersData,
        inactiveCustomers: inactiveCustomersData,
        lifetimeValue: lifetimeValueData
      };
    });

    return analyticsData;
  } catch (error) {
    console.error('Error getting fast analytics:', error);
    return null;
  }
});

// Protected operations - require PIN verification
ipcMain.handle('restore-from-backup', async (event, options) => {
  if (requireAdminPin()) {
    return { success: false, message: 'Admin PIN verification required' };
  }

  try {
    return await restoreFromBackup();
  } catch (error) {
    console.error('Error in restore IPC handler:', error);
    return { success: false, message: `Restore failed: ${error.message}` };
  }
});

ipcMain.handle('delete-invoice', async (event, invoiceId) => {
  if (requireAdminPin()) {
    return { success: false, message: 'Admin PIN verification required' };
  }

  try {
    if (!global.db) return { success: false, message: 'Database not available' };

    const deleted = global.db.deleteInvoice(invoiceId);
    if (deleted) {
      global.db.logAuditEvent('INVOICE_DELETED', invoiceId.toString(), `Invoice ${invoiceId} deleted`);
    }

    return {
      success: deleted,
      message: deleted ? 'Invoice deleted successfully' : 'Invoice not found'
    };
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return { success: false, message: `Delete failed: ${error.message}` };
  }
});
