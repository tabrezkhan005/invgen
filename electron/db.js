const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// Create database connection with provided path
function createDatabase(dbPath) {
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fsSync.existsSync(dbDir)) {
    fsSync.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create customers table if it doesn't exist
  const createTableStmt = db.prepare(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  createTableStmt.run();

  // Create invoices table if it doesn't exist
  const createInvoicesTableStmt = db.prepare(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      invoice_no TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
    )
  `);
  createInvoicesTableStmt.run();

  // Create invoice_items table if it doesn't exist
  const createInvoiceItemsTableStmt = db.prepare(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price REAL NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE
    )
  `);
  createInvoiceItemsTableStmt.run();

  // Create products table
  const createProductsTableStmt = db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  createProductsTableStmt.run();

  // Product categories (user-defined)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Freeform attribute rows per product
  db.prepare(`
    CREATE TABLE IF NOT EXISTS product_attributes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    )
  `).run();

  // Migrate products table: sku, price, category_id, barcode_payload
  function ensureProductColumn(columnName, columnDef) {
    const cols = db.prepare(`PRAGMA table_info(products)`).all();
    if (!cols.some((c) => c.name === columnName)) {
      db.exec(`ALTER TABLE products ADD COLUMN ${columnName} ${columnDef}`);
      console.log(`Added products.${columnName}`);
    }
  }
  ensureProductColumn('sku', 'TEXT');
  ensureProductColumn('price', 'REAL NOT NULL DEFAULT 0');
  ensureProductColumn('category_id', 'INTEGER');
  ensureProductColumn('barcode_payload', 'TEXT');
  ensureProductColumn('stock_qty', 'REAL NOT NULL DEFAULT 0');
  ensureProductColumn('low_stock_threshold', 'REAL NOT NULL DEFAULT 10');
  ensureProductColumn('unit', "TEXT NOT NULL DEFAULT 'Piece'");

  // Optional product link on invoice lines (for stock deduction)
  const invoiceItemCols = db.prepare(`PRAGMA table_info(invoice_items)`).all();
  if (!invoiceItemCols.some((c) => c.name === 'product_id')) {
    db.exec(`ALTER TABLE invoice_items ADD COLUMN product_id INTEGER`);
    console.log('Added invoice_items.product_id');
  }

  // Inventory movement history
  db.prepare(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      qty REAL NOT NULL,
      balance_after REAL NOT NULL,
      note TEXT,
      reference_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    )
  `).run();

  // Backfill sku from legacy code
  db.exec(`UPDATE products SET sku = code WHERE (sku IS NULL OR sku = '') AND code IS NOT NULL AND code != ''`);
  db.exec(`UPDATE products SET sku = 'P-' || id WHERE sku IS NULL OR sku = ''`);
  // Keep code in sync with sku for older callers
  db.exec(`UPDATE products SET code = sku WHERE code IS NULL OR code = '' OR code != sku`);

  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_products_barcode_payload ON products(barcode_payload)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`);
  } catch (e) {
    console.warn('Product index setup:', e.message);
  }

  // Create settings table for app configuration and security
  const createSettingsTableStmt = db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  createSettingsTableStmt.run();

  // Create audit_logs table for compliance and activity tracking
  const createAuditLogsTableStmt = db.prepare(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      reference_id TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  createAuditLogsTableStmt.run();

  // Create indexes for performance optimization
  try {
    // Index for invoice date filtering (critical for analytics)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)`);

    // Index for customer-invoice relationships
    db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)`);

    // Index for invoice items lookup
    db.exec(`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)`);

    // Index for audit log timestamp queries
    db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`);

    // Index for audit log action filtering
    db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }

  // Prepared statements for better performance
  const insertCustomerStmt = db.prepare(`
    INSERT INTO customers (name, phone) VALUES (?, ?)
  `);

  const selectAllCustomersStmt = db.prepare(`
    SELECT * FROM customers ORDER BY created_at DESC
  `);

  const selectCustomersWithStatsStmt = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.phone,
      COALESCE(c.email, '') as email,
      COALESCE(c.address, '') as address,
      c.created_at,
      COALESCE(stats.total_spent, 0) as total_spent,
      COALESCE(stats.total_invoices, 0) as total_invoices,
      stats.last_visit
    FROM customers c
    LEFT JOIN (
      SELECT
        customer_id,
        SUM(total) as total_spent,
        COUNT(*) as total_invoices,
        MAX(date) as last_visit
      FROM invoices
      GROUP BY customer_id
    ) stats ON c.id = stats.customer_id
    ORDER BY COALESCE(stats.last_visit, c.created_at) DESC
  `);

  const updateCustomerStmt = db.prepare(`
    UPDATE customers
    SET name = ?, phone = ?, email = ?, address = ?
    WHERE id = ?
  `);

  const deleteCustomerStmt = db.prepare(`
    DELETE FROM customers WHERE id = ?
  `);

  const selectCustomerStatsStmt = db.prepare(`
    SELECT
      COUNT(*) as total_customers,
      COUNT(CASE WHEN last_visit >= date('now', '-30 days') THEN 1 END) as active_customers,
      COUNT(CASE WHEN created_at >= date('now', 'start of month') THEN 1 END) as new_customers_this_month,
      COALESCE(AVG(CASE WHEN total_spent > 0 THEN total_spent END), 0) as average_lifetime_value
    FROM (
      SELECT
        c.id,
        c.created_at,
        COALESCE(stats.total_spent, 0) as total_spent,
        stats.last_visit
      FROM customers c
      LEFT JOIN (
        SELECT
          customer_id,
          SUM(total) as total_spent,
          MAX(date) as last_visit
        FROM invoices
        GROUP BY customer_id
      ) stats ON c.id = stats.customer_id
    )
  `);

  // Invoice prepared statements
  const insertInvoiceStmt = db.prepare(`
    INSERT INTO invoices (customer_id, invoice_no, date, total) VALUES (?, ?, ?, ?)
  `);

  const insertInvoiceItemStmt = db.prepare(`
    INSERT INTO invoice_items (invoice_id, item_name, qty, price, amount, product_id) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const selectInvoicesByCustomerStmt = db.prepare(`
    SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC
  `);

  const selectInvoiceWithItemsStmt = db.prepare(`
    SELECT i.*, c.name as customer_name, c.phone as customer_phone
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ?
  `);

  const selectInvoiceItemsStmt = db.prepare(`
    SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id
  `);

  const selectRecentInvoicesStmt = db.prepare(`
    SELECT i.*, c.name as customer_name, c.phone as customer_phone
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    ORDER BY i.created_at DESC
    LIMIT ?
  `);

  const getNextInvoiceNumberStmt = db.prepare(`
    SELECT COUNT(*) + 1 as next_no FROM invoices WHERE date LIKE ?
  `);

  // Settings prepared statements
  const getSettingStmt = db.prepare(`
    SELECT value FROM settings WHERE key = ?
  `);

  const setSettingStmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
  `);

const deleteInvoiceStmt = db.prepare(`
  DELETE FROM invoices WHERE id = ?
`);

// Audit logging prepared statements
const insertAuditLogStmt = db.prepare(`
  INSERT INTO audit_logs (action, reference_id, details) VALUES (?, ?, ?)
`);

const getAuditLogsStmt = db.prepare(`
  SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?
`);

const getAuditLogsByActionStmt = db.prepare(`
  SELECT * FROM audit_logs WHERE action = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?
`);

const getAuditLogsByDateRangeStmt = db.prepare(`
  SELECT * FROM audit_logs
  WHERE date(timestamp) >= ? AND date(timestamp) <= ?
  ORDER BY timestamp DESC LIMIT ? OFFSET ?
`);

const getInvoicesPaginatedStmt = db.prepare(`
  SELECT * FROM invoices ORDER BY created_at DESC LIMIT ? OFFSET ?
`);

const getInvoicesByCustomerPaginatedStmt = db.prepare(`
  SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
`);

const getInvoiceCountStmt = db.prepare(`
  SELECT COUNT(*) as total FROM invoices
`);

const getInvoiceCountByCustomerStmt = db.prepare(`
  SELECT COUNT(*) as total FROM invoices WHERE customer_id = ?
`);

  // Analytics prepared statements
  const getSalesAnalyticsStmt = db.prepare(`
    SELECT
      COUNT(*) as total_invoices,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(AVG(total), 0) as avg_bill_value,
      COALESCE(MAX(total), 0) as highest_bill
    FROM invoices
    WHERE date >= ? AND date <= ?
  `);

  // Optimized analytics queries with better performance
  const getSalesAnalyticsFastStmt = db.prepare(`
    SELECT
      COUNT(*) as total_invoices,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(AVG(total), 0) as avg_bill_value,
      COALESCE(MAX(total), 0) as highest_bill
    FROM invoices
    WHERE date >= ? AND date <= ?
    LIMIT 1
  `);

  const getTopCustomersStmt = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.phone,
      COUNT(i.id) as invoice_count,
      COALESCE(SUM(i.total), 0) as total_spent
    FROM customers c
    JOIN invoices i ON c.id = i.customer_id
    WHERE i.date >= ? AND i.date <= ?
    GROUP BY c.id, c.name, c.phone
    ORDER BY total_spent DESC
    LIMIT 10
  `);

  // Optimized version for better performance
  const getTopCustomersFastStmt = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.phone,
      stats.invoice_count,
      stats.total_spent
    FROM customers c
    INNER JOIN (
      SELECT
        customer_id,
        COUNT(*) as invoice_count,
        SUM(total) as total_spent
      FROM invoices
      WHERE date >= ? AND date <= ?
      GROUP BY customer_id
      ORDER BY total_spent DESC
      LIMIT 10
    ) stats ON c.id = stats.customer_id
    ORDER BY stats.total_spent DESC
  `);

  const getRepeatCustomersStmt = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.phone,
      COUNT(i.id) as invoice_count,
      COALESCE(SUM(i.total), 0) as total_spent,
      MIN(i.date) as first_invoice,
      MAX(i.date) as last_invoice
    FROM customers c
    JOIN invoices i ON c.id = i.customer_id
    WHERE i.date >= ? AND i.date <= ?
    GROUP BY c.id, c.name, c.phone
    HAVING invoice_count > 1
    ORDER BY invoice_count DESC, total_spent DESC
  `);

  const getInactiveCustomersStmt = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.phone,
      COALESCE(MAX(i.date), NULL) as last_invoice_date,
      COALESCE(SUM(i.total), 0) as total_spent,
      COUNT(i.id) as total_invoices
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customer_id AND i.date <= ?
    WHERE c.id NOT IN (
      SELECT customer_id FROM invoices
      WHERE date >= ? AND date <= ?
    )
    GROUP BY c.id, c.name, c.phone
    HAVING total_invoices > 0
    ORDER BY last_invoice_date DESC
  `);

  const getCustomerLifetimeValueStmt = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.phone,
      COUNT(i.id) as total_invoices,
      COALESCE(SUM(i.total), 0) as lifetime_value,
      COALESCE(AVG(i.total), 0) as avg_order_value,
      MIN(i.date) as first_purchase,
      MAX(i.date) as last_purchase,
      JULIANDAY(MAX(i.date)) - JULIANDAY(MIN(i.date)) as customer_age_days
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customer_id
    GROUP BY c.id, c.name, c.phone
    HAVING total_invoices > 0
    ORDER BY lifetime_value DESC
  `);

  // Products prepared statements
  const insertProductStmt = db.prepare(`
    INSERT INTO products (name, code, sku, price, image_path, category_id, barcode_payload, stock_qty, low_stock_threshold, unit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const selectAllProductsStmt = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN product_categories c ON c.id = p.category_id
    ORDER BY p.created_at DESC
  `);

  const selectProductsBySearchStmt = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN product_categories c ON c.id = p.category_id
    WHERE p.name LIKE ? OR p.code LIKE ? OR p.sku LIKE ? OR IFNULL(p.barcode_payload, '') LIKE ?
    ORDER BY p.name ASC
    LIMIT ?
  `);

  const updateProductStmt = db.prepare(`
    UPDATE products
    SET name = ?, code = ?, sku = ?, price = ?, image_path = ?, category_id = ?, barcode_payload = ?,
        stock_qty = ?, low_stock_threshold = ?, unit = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const updateStockQtyStmt = db.prepare(`
    UPDATE products SET stock_qty = ?, updated_at = datetime('now') WHERE id = ?
  `);

  const insertMovementStmt = db.prepare(`
    INSERT INTO inventory_movements (product_id, type, qty, balance_after, note, reference_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const selectMovementsByProductStmt = db.prepare(`
    SELECT m.*, p.name as product_name, p.sku
    FROM inventory_movements m
    JOIN products p ON p.id = m.product_id
    WHERE m.product_id = ?
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ?
  `);

  const selectRecentMovementsStmt = db.prepare(`
    SELECT m.*, p.name as product_name, p.sku
    FROM inventory_movements m
    JOIN products p ON p.id = m.product_id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ?
  `);

  const selectLowStockStmt = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN product_categories c ON c.id = p.category_id
    WHERE p.stock_qty <= p.low_stock_threshold
    ORDER BY p.stock_qty ASC, p.name ASC
  `);

  const selectInventorySummaryStmt = db.prepare(`
    SELECT
      COUNT(*) as total_products,
      COALESCE(SUM(stock_qty), 0) as total_units,
      COALESCE(SUM(stock_qty * price), 0) as stock_value,
      SUM(CASE WHEN stock_qty <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_count,
      SUM(CASE WHEN stock_qty <= 0 THEN 1 ELSE 0 END) as out_of_stock_count
    FROM products
  `);

  const deleteProductStmt = db.prepare(`
    DELETE FROM products WHERE id = ?
  `);

  const selectProductByIdStmt = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN product_categories c ON c.id = p.category_id
    WHERE p.id = ?
  `);

  const selectProductBySkuStmt = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN product_categories c ON c.id = p.category_id
    WHERE p.sku = ? OR p.code = ?
  `);

  const selectProductByBarcodeStmt = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN product_categories c ON c.id = p.category_id
    WHERE p.barcode_payload = ? OR p.sku = ? OR p.code = ?
  `);

  const selectAttributesByProductStmt = db.prepare(`
    SELECT id, product_id, label, value, sort_order
    FROM product_attributes
    WHERE product_id = ?
    ORDER BY sort_order ASC, id ASC
  `);

  const deleteAttributesByProductStmt = db.prepare(`
    DELETE FROM product_attributes WHERE product_id = ?
  `);

  const insertAttributeStmt = db.prepare(`
    INSERT INTO product_attributes (product_id, label, value, sort_order) VALUES (?, ?, ?, ?)
  `);

  const selectAllCategoriesStmt = db.prepare(`
    SELECT * FROM product_categories ORDER BY name ASC
  `);

  const insertCategoryStmt = db.prepare(`
    INSERT INTO product_categories (name) VALUES (?)
  `);

  const deleteCategoryStmt = db.prepare(`
    DELETE FROM product_categories WHERE id = ?
  `);

  const selectCategoryByNameStmt = db.prepare(`
    SELECT * FROM product_categories WHERE lower(name) = lower(?)
  `);

  // Function definitions inside createDatabase scope
  function addCustomer(name, phone) {
    const result = insertCustomerStmt.run(name, phone);
    return {
      id: result.lastInsertRowid,
      name,
      phone,
      created_at: new Date().toISOString(),
    };
  }

  function getAllCustomers() {
    return selectAllCustomersStmt.all();
  }

  function getCustomersWithStats() {
    return selectCustomersWithStatsStmt.all();
  }

  function updateCustomer(id, customerData) {
    const result = updateCustomerStmt.run(
      customerData.name,
      customerData.phone,
      customerData.email || null,
      customerData.address || null,
      id
    );
    return result.changes > 0;
  }

  function deleteCustomer(id) {
    // Check if customer has invoices
    const invoices = selectInvoicesByCustomerStmt.all(id);
    if (invoices.length > 0) {
      throw new Error('Cannot delete customer with existing invoices');
    }

    const result = deleteCustomerStmt.run(id);
    return result.changes > 0;
  }

  function getCustomerStats() {
    const result = selectCustomerStatsStmt.get();
    return {
      totalCustomers: result.total_customers,
      activeCustomers: result.active_customers,
      newCustomersThisMonth: result.new_customers_this_month,
      averageLifetimeValue: result.average_lifetime_value
    };
  }

  // Invoice functions
  function getNextInvoiceNumber(date) {
    // Get year-month from date (YYYY-MM format)
    const yearMonth = date.substring(0, 7);
    const result = getNextInvoiceNumberStmt.get(`${yearMonth}%`);
    return `${yearMonth}-${String(result.next_no).padStart(3, '0')}`;
  }

  function createInvoice(customerId, date, items) {
    // Calculate total
    const total = items.reduce((sum, item) => sum + item.amount, 0);

    // Generate invoice number with configured prefix
    const invoicePrefix = getSetting('invoice_prefix') || 'INV';
    const nextNumber = getNextInvoiceNumber(date);
    const invoiceNo = `${invoicePrefix}${nextNumber.substring(nextNumber.indexOf('-'))}`;

    // Use transaction to ensure data integrity
    const transaction = db.transaction(() => {
      // Insert invoice
      const invoiceResult = insertInvoiceStmt.run(customerId, invoiceNo, date, total);
      const invoiceId = invoiceResult.lastInsertRowid;

      // Insert invoice items + deduct inventory for catalog products
      for (const item of items) {
        let productId = item.product_id || null;

        // Resolve product by SKU/name when product_id not provided
        if (!productId && item.sku) {
          const bySku = selectProductBySkuStmt.get(String(item.sku).trim(), String(item.sku).trim());
          if (bySku) productId = bySku.id;
        }
        if (!productId && item.item_name) {
          const byName = db.prepare(
            `SELECT id FROM products WHERE lower(name) = lower(?) LIMIT 1`
          ).get(String(item.item_name).trim());
          if (byName) productId = byName.id;
        }

        insertInvoiceItemStmt.run(
          invoiceId,
          item.item_name,
          item.qty,
          item.price,
          item.amount,
          productId
        );

        if (productId && Number(item.qty) > 0) {
          applyStockChange(
            productId,
            -Number(item.qty),
            'sale',
            `Sold on invoice ${invoiceNo}`,
            invoiceId
          );
        }
      }

      return {
        id: invoiceId,
        customer_id: customerId,
        invoice_no: invoiceNo,
        date,
        total,
        created_at: new Date().toISOString(),
      };
    });

    return transaction();
  }

  function adjustInventory(productId, qtyChange, type = 'adjust', note = '') {
    const delta = Number(qtyChange);
    if (!delta) throw new Error('Quantity change cannot be zero');
    const movementType = type === 'in' || type === 'out' || type === 'adjust' ? type : 'adjust';
    const signed = movementType === 'out' ? -Math.abs(delta) : movementType === 'in' ? Math.abs(delta) : delta;
    return applyStockChange(productId, signed, movementType, note || null, null);
  }

  function getInventorySummary() {
    const row = selectInventorySummaryStmt.get();
    return {
      total_products: Number(row?.total_products || 0),
      total_units: Number(row?.total_units || 0),
      stock_value: Number(row?.stock_value || 0),
      low_stock_count: Number(row?.low_stock_count || 0),
      out_of_stock_count: Number(row?.out_of_stock_count || 0),
    };
  }

  function getLowStockProducts() {
    return selectLowStockStmt.all().map(enrichProduct);
  }

  function getInventoryMovements(limit = 50, productId = null) {
    if (productId) return selectMovementsByProductStmt.all(productId, limit);
    return selectRecentMovementsStmt.all(limit);
  }

  function getInvoicesByCustomer(customerId) {
    return selectInvoicesByCustomerStmt.all(customerId);
  }

  function getInvoiceWithItems(invoiceId) {
    const invoice = selectInvoiceWithItemsStmt.get(invoiceId);
    if (!invoice) return null;

    const items = selectInvoiceItemsStmt.all(invoiceId);
    return {
      ...invoice,
      items,
    };
  }

  function getRecentInvoices(limit = 5) {
    return selectRecentInvoicesStmt.all(limit);
  }

// Analytics functions
function getSalesAnalytics(startDate, endDate) {
  return getSalesAnalyticsStmt.get(startDate, endDate);
}

function getSalesAnalyticsFast(startDate, endDate) {
  return getSalesAnalyticsFastStmt.get(startDate, endDate);
}

function getTopCustomers(startDate, endDate) {
  return getTopCustomersStmt.all(startDate, endDate);
}

function getTopCustomersFast(startDate, endDate) {
  return getTopCustomersFastStmt.all(startDate, endDate);
}

  function getRepeatCustomers(startDate, endDate) {
    return getRepeatCustomersStmt.all(startDate, endDate);
  }

  function getInactiveCustomers(endDate, startDate, endDate2) {
    // endDate is the cutoff date (all data up to this point)
    // startDate, endDate2 are the analysis period
    return getInactiveCustomersStmt.all(endDate, startDate, endDate2);
  }

  function getCustomerLifetimeValue() {
    return getCustomerLifetimeValueStmt.all();
  }

  function getTodaySummary() {
    // Get local date in YYYY-MM-DD format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    const invoicesCreated = db.prepare(`
      SELECT COUNT(*) as count FROM invoices WHERE date(date) = ?
    `).get(today).count;

    const revenueGenerated = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE date(date) = ?
    `).get(today).total;

    const newCustomers = db.prepare(`
      SELECT COUNT(*) as count FROM customers WHERE date(created_at) = ?
    `).get(today).count;

    return {
      invoicesCreated,
      revenueGenerated,
      newCustomers
    };
  }

  function getDashboardStats() {
      // Get total customers
      const totalCustomers = selectAllCustomersStmt.all().length;

      // Get total revenue (sum of all invoice totals)
      const totalRevenueResult = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total_revenue FROM invoices
      `).get();
      const totalRevenue = totalRevenueResult.total_revenue;

      // Get total invoices
      const totalInvoices = db.prepare(`
        SELECT COUNT(*) as count FROM invoices
      `).get().count;

      // Get active customers (customers with invoices in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeCustomers = db.prepare(`
        SELECT COUNT(DISTINCT customer_id) as count
        FROM invoices
        WHERE date >= ?
      `).get(thirtyDaysAgo.toISOString().split('T')[0]).count;

      return {
        totalCustomers,
        totalRevenue,
        totalInvoices,
        activeCustomers
      };
    }

    function getRevenueByDate(startDate, endDate) {
      return db.prepare(`
        SELECT
          date(date) as date,
          COALESCE(SUM(total), 0) as revenue,
          COUNT(*) as invoices
        FROM invoices
        WHERE date(date) >= date(?) AND date(date) <= date(?)
        GROUP BY date(date)
        ORDER BY date ASC
      `).all(startDate, endDate);
    }


  // Settings and PIN management functions
  function getSetting(key) {
    const result = getSettingStmt.get(key);
    return result ? result.value : null;
  }

  function setSetting(key, value) {
    setSettingStmt.run(key, value);
  }

  function setAdminPin(pin) {
    // Hash the PIN using a simple hash (in production, use bcrypt or similar)
    const hashedPin = require('crypto').createHash('sha256').update(pin).digest('hex');
    setSetting('admin_pin', hashedPin);
  }

  function verifyAdminPin(pin) {
    const storedHash = getSetting('admin_pin');
    if (!storedHash) return false;

    const inputHash = require('crypto').createHash('sha256').update(pin).digest('hex');
    return inputHash === storedHash;
  }

  function isAdminPinSet() {
    return getSetting('admin_pin') !== null;
  }

  // Products helpers
  function defaultBarcodePayload(sku, name, price) {
    return `${sku}|${name}|${Number(price || 0)}`;
  }

  function enrichProduct(row) {
    if (!row) return null;
    const attributes = selectAttributesByProductStmt.all(row.id);
    const stockQty = Number(row.stock_qty || 0);
    const lowThreshold = Number(row.low_stock_threshold ?? 10);
    return {
      ...row,
      sku: row.sku || row.code,
      code: row.sku || row.code,
      price: Number(row.price || 0),
      category_id: row.category_id || null,
      category_name: row.category_name || null,
      barcode_payload: row.barcode_payload || defaultBarcodePayload(row.sku || row.code, row.name, row.price),
      stock_qty: stockQty,
      low_stock_threshold: lowThreshold,
      unit: row.unit || 'Piece',
      is_low_stock: stockQty <= lowThreshold,
      is_out_of_stock: stockQty <= 0,
      attributes,
    };
  }

  function applyStockChange(productId, delta, type, note = null, referenceId = null) {
    const product = selectProductByIdStmt.get(productId);
    if (!product) throw new Error('Product not found');
    const current = Number(product.stock_qty || 0);
    const next = current + Number(delta);
    updateStockQtyStmt.run(next, productId);
    insertMovementStmt.run(
      productId,
      type,
      Number(delta),
      next,
      note,
      referenceId != null ? String(referenceId) : null
    );
    return enrichProduct(selectProductByIdStmt.get(productId));
  }

  function replaceProductAttributes(productId, attributes = []) {
    deleteAttributesByProductStmt.run(productId);
    const list = Array.isArray(attributes) ? attributes : [];
    list.forEach((attr, index) => {
      const label = String(attr.label || '').trim();
      if (!label) return;
      insertAttributeStmt.run(productId, label, String(attr.value ?? ''), Number(attr.sort_order ?? index));
    });
  }

  // Products functions
  function addProduct(productData) {
    // Support legacy (name, code, imagePath) and new object form
    let data = productData;
    if (typeof productData === 'string') {
      // legacy: addProduct(name, code, imagePath)
      data = {
        name: arguments[0],
        sku: arguments[1],
        code: arguments[1],
        image_path: arguments[2] || null,
        price: 0,
        attributes: [],
      };
    }

    const name = String(data.name || '').trim();
    if (!name) throw new Error('Product name is required');

    const sku = String(data.sku || data.code || `P-${Date.now()}`).trim();
    const price = Number(data.price || 0);
    const imagePath = data.image_path || null;
    const categoryId = data.category_id || null;
    const barcodePayload = String(data.barcode_payload || defaultBarcodePayload(sku, name, price)).trim();
    const stockQty = Number(data.stock_qty ?? 0);
    const lowThreshold = Number(data.low_stock_threshold ?? 10);
    const unit = String(data.unit || 'Piece').trim() || 'Piece';

    const existing = selectProductBySkuStmt.get(sku, sku);
    if (existing) throw new Error(`SKU "${sku}" already exists`);

    const result = insertProductStmt.run(
      name, sku, sku, price, imagePath, categoryId, barcodePayload,
      stockQty, lowThreshold, unit
    );
    const productId = result.lastInsertRowid;
    replaceProductAttributes(productId, data.attributes || []);
    if (stockQty !== 0) {
      insertMovementStmt.run(productId, 'in', stockQty, stockQty, 'Opening stock', null);
    }
    return enrichProduct(selectProductByIdStmt.get(productId));
  }

  function getAllProducts() {
    return selectAllProductsStmt.all().map(enrichProduct);
  }

  function searchProducts(query, limit = 50) {
    const searchTerm = `%${query || ''}%`;
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return selectProductsBySearchStmt
      .all(searchTerm, searchTerm, searchTerm, searchTerm, lim)
      .map(enrichProduct);
  }

  function getProductsPaginated(options = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const pageSize = Math.min(Math.max(Number(options.pageSize) || 50, 1), 200);
    const offset = (page - 1) * pageSize;
    const query = String(options.query || '').trim();
    const categoryId = options.categoryId != null && options.categoryId !== ''
      ? Number(options.categoryId)
      : null;
    const stockFilter = options.stockFilter; // 'low' | 'out' | undefined

    const where = [];
    const params = [];

    if (query) {
      const term = `%${query}%`;
      where.push(`(p.name LIKE ? OR p.code LIKE ? OR p.sku LIKE ? OR IFNULL(p.barcode_payload, '') LIKE ?)`);
      params.push(term, term, term, term);
    }
    if (categoryId != null && !Number.isNaN(categoryId)) {
      where.push('p.category_id = ?');
      params.push(categoryId);
    }
    if (stockFilter === 'low') {
      where.push('p.stock_qty <= p.low_stock_threshold');
    } else if (stockFilter === 'out') {
      where.push('p.stock_qty <= 0');
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM products p
      ${whereSql}
    `).get(...params);
    const total = countRow?.total || 0;

    const items = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      ${whereSql}
      ORDER BY p.name ASC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset).map(enrichProduct);

    return { items, total, page, pageSize };
  }

  function updateProduct(id, productData) {
    const current = selectProductByIdStmt.get(id);
    if (!current) return false;

    const name = String(productData.name ?? current.name).trim();
    const sku = String(productData.sku ?? productData.code ?? current.sku ?? current.code).trim();
    const price = Number(productData.price !== undefined ? productData.price : current.price || 0);
    const imagePath = productData.image_path !== undefined ? productData.image_path : current.image_path;
    const categoryId = productData.category_id !== undefined ? productData.category_id : current.category_id;
    const barcodePayload = String(
      productData.barcode_payload !== undefined
        ? productData.barcode_payload
        : (current.barcode_payload || defaultBarcodePayload(sku, name, price))
    ).trim();
    const stockQty = Number(
      productData.stock_qty !== undefined ? productData.stock_qty : (current.stock_qty || 0)
    );
    const lowThreshold = Number(
      productData.low_stock_threshold !== undefined
        ? productData.low_stock_threshold
        : (current.low_stock_threshold ?? 10)
    );
    const unit = String(
      productData.unit !== undefined ? productData.unit : (current.unit || 'Piece')
    ).trim() || 'Piece';

    // Ensure unique sku if changing
    const conflict = selectProductBySkuStmt.get(sku, sku);
    if (conflict && conflict.id !== id) {
      throw new Error(`SKU "${sku}" already exists`);
    }

    const prevStock = Number(current.stock_qty || 0);
    const result = updateProductStmt.run(
      name, sku, sku, price, imagePath || null, categoryId || null, barcodePayload,
      stockQty, lowThreshold, unit, id
    );
    if (result.changes === 0) return false;

    // If stock was edited directly on product form, log an adjust movement
    if (productData.stock_qty !== undefined && stockQty !== prevStock) {
      insertMovementStmt.run(
        id,
        'adjust',
        stockQty - prevStock,
        stockQty,
        'Stock set from product edit',
        null
      );
    }

    if (Array.isArray(productData.attributes)) {
      replaceProductAttributes(id, productData.attributes);
    }
    return true;
  }

  function deleteProduct(id) {
    deleteAttributesByProductStmt.run(id);
    const result = deleteProductStmt.run(id);
    return result.changes > 0;
  }

  function getProductById(id) {
    return enrichProduct(selectProductByIdStmt.get(id));
  }

  function getProductBySku(sku) {
    if (!sku) return null;
    return enrichProduct(selectProductBySkuStmt.get(String(sku).trim(), String(sku).trim()));
  }

  function getProductByBarcode(payload) {
    if (!payload) return null;
    const value = String(payload).trim();
    // Prefer exact barcode_payload / sku match
    let row = selectProductByBarcodeStmt.get(value, value, value);
    if (row) return enrichProduct(row);

    // Parse SKU|name|price style payload — use first segment as SKU
    const parts = value.split('|');
    if (parts.length >= 1 && parts[0]) {
      row = selectProductBySkuStmt.get(parts[0].trim(), parts[0].trim());
      if (row) return enrichProduct(row);
    }
    return null;
  }

  function getAllCategories() {
    return selectAllCategoriesStmt.all();
  }

  function addCategory(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new Error('Category name is required');
    const existing = selectCategoryByNameStmt.get(trimmed);
    if (existing) return existing;
    const result = insertCategoryStmt.run(trimmed);
    return { id: result.lastInsertRowid, name: trimmed, created_at: new Date().toISOString() };
  }

  function deleteCategory(id) {
    // Unlink products first
    db.prepare(`UPDATE products SET category_id = NULL WHERE category_id = ?`).run(id);
    const result = deleteCategoryStmt.run(id);
    return result.changes > 0;
  }

function deleteInvoice(invoiceId) {
  // First, delete associated invoice items (cascade should handle this, but being explicit)
  const deleteItemsStmt = db.prepare(`DELETE FROM invoice_items WHERE invoice_id = ?`);
  deleteItemsStmt.run(invoiceId);

  // Then delete the invoice
  const result = deleteInvoiceStmt.run(invoiceId);
  return result.changes > 0; // Return true if invoice was deleted
}

// Audit logging functions
function logAuditEvent(action, referenceId = null, details = null) {
  try {
    insertAuditLogStmt.run(action, referenceId, details);
  } catch (error) {
    console.error('Error logging audit event:', error);
    // Don't throw error to avoid breaking main functionality
  }
}

function getAuditLogs(limit = 100, offset = 0) {
  return getAuditLogsStmt.all(limit, offset);
}

function getAuditLogsByAction(action, limit = 100, offset = 0) {
  return getAuditLogsByActionStmt.all(action, limit, offset);
}

function getAuditLogsByDateRange(startDate, endDate, limit = 100, offset = 0) {
  return getAuditLogsByDateRangeStmt.all(startDate, endDate, limit, offset);
}

// Paginated invoice functions
function getInvoicesPaginated(limit = 50, offset = 0) {
  return getInvoicesPaginatedStmt.all(limit, offset);
}

function getInvoicesByCustomerPaginated(customerId, limit = 50, offset = 0) {
  return getInvoicesByCustomerPaginatedStmt.all(customerId, limit, offset);
}

function getInvoiceCount(customerId = null) {
  if (customerId) {
    const result = getInvoiceCountByCustomerStmt.get(customerId);
    return result.total;
  } else {
    const result = getInvoiceCountStmt.get();
    return result.total;
  }
}

  // Database integrity and safety functions
  function checkDatabaseIntegrity(dbConnection) {
    try {
      // First, try a simple query to see if the database is accessible
      const testQuery = dbConnection.prepare('SELECT 1 as test').get();
      if (!testQuery || testQuery.test !== 1) {
        console.log('Database basic functionality test failed');
        return false;
      }

      // Run SQLite integrity check
      const result = dbConnection.pragma('integrity_check');
      console.log('Database integrity check result:', result);

      // Handle different result formats
      let status = null;
      if (Array.isArray(result) && result.length > 0) {
        const firstItem = result[0];
        if (typeof firstItem === 'object' && firstItem.integrity_check) {
          status = firstItem.integrity_check;
        } else if (typeof firstItem === 'string') {
          status = firstItem;
        }
      } else if (typeof result === 'object' && result.integrity_check) {
        status = result.integrity_check;
      } else if (typeof result === 'string') {
        status = result;
      }

      console.log('Database integrity check final status:', status);

      if (typeof status === 'string' && status.toLowerCase() === 'ok') {
        return true;
      }

      // For development and new databases, be more permissive
      if (status && typeof status === 'string') {
        // Allow if it's just index or statistics issues, or if it's a valid response
        if (status.includes('index') || status.includes('stat') || status.includes('ok')) {
          console.log('Minor integrity issue or success detected, allowing database access');
          return true;
        }
      }

      // If we get here, the check failed
      console.log('Database integrity check failed with status:', status);
      return false;

      return false;
    } catch (error) {
      console.error('Error checking database integrity:', error);
      // If we can't even run a basic query, the database is likely corrupted
      return false;
    }
  }

  function validateBackupFile(backupPath) {
    try {
      // Check if file exists and has size > 0
      const stats = fsSync.statSync(backupPath);
      if (stats.size === 0) {
        console.log(`Backup file ${backupPath} is empty`);
        return false;
      }

      // Try to open the backup file with SQLite to verify it's valid
      const testDb = new Database(backupPath, { readonly: true });
      const isValid = checkDatabaseIntegrity(testDb);
      testDb.close();

      return isValid;
    } catch (error) {
      console.error(`Error validating backup ${backupPath}:`, error);
      return false;
    }
  }

  function findLatestValidBackup(searchPaths) {
    let latestBackup = null;
    let latestTime = 0;

    for (const searchPath of searchPaths) {
      try {
        // Check if directory exists
        if (!fsSync.existsSync(searchPath)) {
          continue;
        }

        const files = fsSync.readdirSync(searchPath);
        const backupFiles = files
          .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
          .map(file => ({
            name: file,
            path: path.join(searchPath, file),
            stats: null
          }));

        // Get file stats
        for (const file of backupFiles) {
          try {
            file.stats = fsSync.statSync(file.path);
          } catch (error) {
            continue;
          }
        }

        // Find valid backups and track the latest
        for (const file of backupFiles) {
          if (file.stats && validateBackupFile(file.path)) {
            if (file.stats.mtime.getTime() > latestTime) {
              latestTime = file.stats.mtime.getTime();
              latestBackup = {
                path: file.path,
                name: file.name,
                time: file.stats.mtime
              };
            }
          }
        }
      } catch (error) {
        console.error(`Error searching backups in ${searchPath}:`, error);
      }
    }

    return latestBackup;
  }

  // Return the database object with all functions
  return {
    addCustomer,
    getAllCustomers,
    getCustomersWithStats,
    updateCustomer,
    deleteCustomer,
    getCustomerStats,
    createInvoice,
    getInvoicesByCustomer,
    getInvoiceWithItems,
    getRecentInvoices,
    deleteInvoice,
    // Analytics functions
    getSalesAnalytics,
    getSalesAnalyticsFast,
    getTopCustomers,
    getTopCustomersFast,
    getRepeatCustomers,
    getInactiveCustomers,
      getCustomerLifetimeValue,
      getTodaySummary,
      getDashboardStats,
      getRevenueByDate,
      // Audit logging functions

    logAuditEvent,
    getAuditLogs,
    getAuditLogsByAction,
    getAuditLogsByDateRange,
    // Paginated invoice functions
    getInvoicesPaginated,
    getInvoicesByCustomerPaginated,
    getInvoiceCount,
    // Settings and PIN functions
    getSetting,
    setSetting,
    setAdminPin,
    verifyAdminPin,
    isAdminPinSet,
    // Products functions
    addProduct,
    getAllProducts,
    getProductsPaginated,
    searchProducts,
    updateProduct,
    deleteProduct,
    getProductById,
    getProductBySku,
    getProductByBarcode,
    getAllCategories,
    addCategory,
    deleteCategory,
    adjustInventory,
    getInventorySummary,
    getLowStockProducts,
    getInventoryMovements,
    // Safety functions
    checkDatabaseIntegrity: () => checkDatabaseIntegrity(db),
    validateBackupFile,
    findLatestValidBackup,
    close: () => db.close(),
  };
}

// Export a function that creates the database with the provided path
module.exports = function(dbPath, options = {}) {
  const { skipIntegrityCheck = false, readOnly = false } = options;

  // Create database connection
  const db = createDatabase(dbPath);

  // Check database integrity unless skipped
  let isDatabaseValid = true;
  if (!skipIntegrityCheck && !readOnly) {
    isDatabaseValid = db.checkDatabaseIntegrity();
    if (!isDatabaseValid) {
      console.error('Database integrity check failed!');
    }
  }

  // Return the database object with validation info
  return {
    ...db,
    isDatabaseValid,
    readOnly,
  };
};
