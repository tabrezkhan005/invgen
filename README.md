# Invoice Management App

Electron + Next.js + SQLite application for managing customers and invoices.

## Features

- ✅ Electron window with Next.js UI
- ✅ SQLite database with customers, invoices, and invoice_items tables
- ✅ Add customers (name + phone)
- ✅ List all saved customers
- ✅ Create invoices with multiple items
- ✅ Auto-generate invoice numbers (YYYY-MM-XXX format)
- ✅ Auto-calculate totals and item amounts
- ✅ Transaction-safe invoice creation
- ✅ Auto-print invoices after creation
- ✅ Manual reprint from invoice history
- ✅ Support for thermal (58mm) and A4 printers
- ✅ Professional invoice layout
- ✅ Automatic USB drive backup after each invoice
- ✅ Manual backup with "Backup Now" button
- ✅ Keeps only last 10 backups (auto-cleanup)
- ✅ Works even if USB drive not connected (no errors)
- ✅ **Analytics dashboard with date range filters**
- ✅ **Sales analytics: revenue, invoices, averages, highest bill**
- ✅ **Customer analytics: top customers, repeat customers, inactive customers**
- ✅ **Customer lifetime value analysis**
- ✅ **Export functionality: PDF invoices, Excel reports, CSV customer ledger**
- ✅ **Database restore from USB backup with confirmation**
- ✅ **Portable mode support - run from USB drive**
- ✅ **Automatic portable detection and database relocation**
- ✅ **No system dependencies or registry entries**
- ✅ **Data safety hardening with integrity checks**
- ✅ **Automatic database recovery from backups**
- ✅ **Read-only mode when no valid backups exist**
- ✅ **Startup integrity validation and auto-recovery**
- ✅ **Complete audit trail system**
- ✅ **Compliance-ready activity logging**
- ✅ **Read-only audit logs for security**
- ✅ **Activity tracking: invoices, backups, restores, settings**
- ✅ **High-performance database optimization**
- ✅ **Strategic indexes for query acceleration**
- ✅ **Pagination for large datasets**
- ✅ **Optimized analytics queries**
- ✅ **Non-blocking UI operations**
- ✅ **Comprehensive configuration system**
- ✅ **Dynamic settings application**
- ✅ **PIN-protected settings changes**
- ✅ **Configurable: shop info, invoices, printing, backups**
- ✅ Data persists after app restart
- ✅ Secure IPC communication
- ✅ Database stored in user data directory (or app folder in portable mode)

## Project Structure

```
electron/
├── main.js      # Electron main process - creates window, starts Next.js
├── preload.js   # Secure IPC bridge for renderer process
└── db.js        # SQLite database operations

app/
├── page.tsx           # Next.js UI for customer management
├── analytics/
│   └── page.tsx       # Next.js UI for analytics dashboard
├── audit/
│   └── page.tsx       # Next.js UI for audit trail and activity logs
├── billing/
│   └── page.tsx       # Next.js UI for invoice creation
├── invoices/
│   └── page.tsx       # Next.js UI for invoice history and reprinting
├── settings/
│   └── page.tsx       # Next.js UI for app settings, PIN management, and configuration
└── PinModal.tsx       # Reusable PIN entry modal component

types/
└── electron.d.ts      # TypeScript declarations for Electron API
```

## Quick Start

### Prerequisites
- Node.js 16+
- npm

### Install Dependencies
```bash
npm install
```

### Run the Application
```bash
npm run electron-dev
```

This will:
1. Start Next.js development server on port 3000
2. Launch Electron window loading the Next.js app
3. Open DevTools for debugging

### Alternative Commands
```bash
# Run only Next.js (for web development)
npm run dev

# Run Electron directly (assumes Next.js is already running)
npm run electron
```

## How It Works

### Security Architecture
- **SQLite access**: Only in Electron main process (secure)
- **Next.js**: Never accesses database directly
- **IPC**: Secure communication via `contextBridge`
- **Preload script**: Exposes safe APIs to renderer

### Database
- Location: `app.getPath('userData')/customers.db`
- Tables:
  - `customers` (id, name, phone, created_at)
  - `invoices` (id, customer_id, invoice_no, date, total, created_at)
  - `invoice_items` (id, invoice_id, item_name, qty, price, amount)
- WAL mode enabled for better performance
- Foreign key relationships ensure data integrity

### Printing
- **Auto-print**: Invoices print automatically after creation
- **Manual reprint**: Access invoice history to reprint any invoice
- **Printer support**: Works with thermal (58mm) and A4 printers
- **Layout**: Professional invoice format with company header, customer details, itemized list, and totals
- **System integration**: Uses system default printer, no browser print dialogs

### Backup System
- **Auto-backup**: Database automatically backed up to USB drive after each invoice
- **Manual backup**: "Backup Now" button for immediate backup
- **USB detection**: Automatically detects removable USB drives
- **Backup folder**: Creates `BILLING_BACKUP` folder on USB drive
- **Naming**: `backup_YYYY-MM-DD_HH-MM-SS.db` format
- **Retention**: Keeps only last 10 backups (auto-deletes older ones)
- **Fault tolerance**: Billing continues even if USB drive is missing
- **Status display**: Shows backup status on main pages

### Analytics Dashboard
- **Date Range Filters**: Custom start and end date selection
- **Sales Analytics**:
  - Total revenue within date range
  - Total number of invoices
  - Average bill value
  - Highest bill amount
- **Customer Analytics**:
  - Top customers by total spending (within date range)
  - Repeat customers (2+ invoices within date range)
  - Inactive customers (had invoices before but not in selected period)
- **Lifetime Value**: All-time customer analysis including order frequency and customer age
- **Fast Queries**: Optimized SQL queries for real-time analytics
- **Read-only**: Analytics never modify data, only analyze existing records

### Export & Restore
- **Export Options**:
  - **PDF Invoices**: Complete invoice report with all details for selected date range
  - **Excel Reports**: Comprehensive workbook with sales summary, top customers, and invoice list
  - **CSV Customer Ledger**: All-time customer data export for external analysis
- **Restore from Backup**:
  - Restore database from latest USB backup
  - Automatic backup of current data before restore
  - Confirmation dialog with clear warnings
  - App restart after successful restore
  - Safe operation with rollback capability

### Portable Mode
- **Automatic Detection**: App detects when running from USB/removable drive
- **Self-Contained**: No installation required, no system registry entries
- **Data Portability**: All data stored within app folder on USB drive
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Visual Indicator**: Blue "Portable Mode" badge shows current mode
- **Same Features**: All functionality works identically in both modes
- **Database Location**: `USB Drive/App Folder/data/customers.db`
- **Backup Location**: `USB Drive/BILLING_BACKUP/` (additional copies)

### Data Safety & Recovery
- **Startup Integrity Check**: SQLite `PRAGMA integrity_check` on every app launch
- **Automatic Recovery**: Finds and restores latest valid backup if database corrupted
- **Backup Validation**: Verifies backup files are not empty and SQLite can open them
- **Read-Only Mode**: Opens in read-only mode if no valid backups available
- **Silent Operation**: Recovery happens automatically without user intervention
- **Write Protection**: Prevents data corruption by blocking writes on corrupted DB
- **Recovery Logging**: Clear status messages about recovery actions taken
- **Backup Before Restore**: Creates backup of corrupted database before replacement

### Security & Access Control
- **Admin PIN System**: Hashed PIN protection for sensitive operations
- **Session-Based Access**: PIN verification valid for 5 minutes
- **Protected Operations**:
  - Database restore from backup
  - Delete invoices
  - Export data (PDF, Excel, CSV)
  - Change settings
- **No Plain Text Storage**: PINs hashed using SHA-256 before storage
- **PIN Setup**: Easy PIN configuration through Settings page
- **Visual Feedback**: Clear indicators for PIN-protected actions

### Audit Trail System
- **Complete Activity Logging**: All system activities are tracked
- **Compliance Ready**: Professional audit trail for business compliance
- **Tracked Events**:
  - Invoice creation and deletion
  - Backup creation and database restoration
  - Admin PIN configuration changes
  - Settings modifications
- **Read-Only Access**: Audit logs cannot be modified or deleted
- **Filtering & Search**: Filter by action type, date range, or reference ID
- **Secure Storage**: Audit logs stored in tamper-evident database table
- **Activity Summary**: Dashboard showing activity statistics and trends

### Performance Optimizations
- **Strategic Database Indexes**: Optimized for query performance on large datasets
  - `invoices.date` - Critical for analytics date range queries
  - `invoices.customer_id` - Accelerates customer-invoice JOIN operations
  - `invoice_items.invoice_id` - Speeds up invoice item lookups
  - `audit_logs.timestamp` & `audit_logs.action` - Fast audit log filtering
- **Pagination System**: Prevents UI blocking with large invoice lists
  - 50 invoices per page with navigation controls
  - Efficient offset-based queries
  - Total count tracking for pagination UI
- **Optimized Analytics Queries**: Sub-second performance even with thousands of records
  - Pre-aggregated subqueries for top customers
  - Fast COUNT/SUM operations for sales analytics
  - Parallel query execution with Promise.all
- **Non-Blocking Operations**: UI stays responsive during heavy computations
  - `setImmediate()` for heavy queries
  - Async analytics processing
  - Background query execution
- **Query Performance Monitoring**: Built-in performance tracking and optimization

### Configuration System
- **Comprehensive Settings Management**: Full application customization
- **Admin PIN Protection**: All settings changes require PIN verification
- **Dynamic Application**: Settings apply immediately without restart
- **Configurable Options**:
  - **Shop Information**: Name and address for invoices
  - **Invoice Settings**: Prefix, currency symbol, tax rate, footer
  - **Printing**: Thermal (58mm) or A4 printer selection
  - **Backup**: Manual, daily, or weekly intervals
- **Validation**: Input validation with helpful error messages
- **Reset to Defaults**: One-click reset with PIN verification
- **Persistent Storage**: Settings saved locally and loaded on startup

### IPC Channels
- `add-customer`: Add new customer
- `get-customers`: Fetch all customers
- `create-invoice`: Create invoice with items (transaction-safe)
- `get-invoices-by-customer`: Fetch invoices for a customer
- `get-invoice-with-items`: Fetch invoice with its items
- `print-invoice`: Print invoice to system printer
- `perform-backup`: Perform manual database backup
- `get-backup-status`: Get current backup status and USB drive info
- `get-sales-analytics`: Get sales analytics for date range
- `get-top-customers`: Get top customers for date range
- `get-repeat-customers`: Get repeat customers for date range
- `get-inactive-customers`: Get inactive customers analysis
- `get-customer-lifetime-value`: Get all-time customer lifetime value
- `export-invoices-pdf`: Export invoices to PDF file
- `export-reports-excel`: Export reports to Excel workbook
- `export-customer-ledger-csv`: Export customer ledger to CSV
- `restore-from-backup`: Restore database from USB backup
- `is-portable-mode`: Check if app is running in portable mode
- `get-database-status`: Get current database status and recovery information
- `set-admin-pin`: Set admin PIN for security
- `verify-admin-pin`: Verify admin PIN for protected operations
- `is-admin-pin-set`: Check if admin PIN is configured
- `is-admin-pin-verified`: Check if PIN session is active
- `delete-invoice`: Delete invoice (PIN-protected)
- `get-audit-logs`: Get audit logs with filtering options
- `get-all-settings`: Get all application settings
- `update-setting`: Update individual setting (PIN-protected)
- `reset-settings`: Reset all settings to defaults (PIN-protected)
- `get-invoices-paginated`: Get paginated invoice list
- `get-invoices-by-customer-paginated`: Get paginated customer invoices
- `get-analytics-fast`: Get optimized analytics data

## Development

### Adding New Features
1. Add IPC handler in `electron/main.js`
2. Expose method in `electron/preload.js`
3. Add TypeScript types in `types/electron.d.ts`
4. Use in Next.js components via `window.electronAPI`

### Database Schema Changes
Edit `electron/db.js` to modify table structure or add new operations.

## Troubleshooting

### Electron window doesn't load
- Ensure Next.js server is running on port 3000
- Check console for errors in DevTools

### Database errors
- Check file permissions in user data directory
- Verify better-sqlite3 is properly installed

### IPC not working
- Ensure preload script is correctly loaded in main.js
- Check contextBridge exposure in preload.js

## Technologies Used

- **Electron**: Cross-platform desktop app framework
- **Next.js**: React framework with App Router
- **SQLite**: Embedded database via better-sqlite3
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
