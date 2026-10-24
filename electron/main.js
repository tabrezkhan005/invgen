const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const db = require('./db');

// Fix for fontkit @swc/helpers module resolution issue
// fontkit expects @swc/helpers to export applyDecoratedDescriptor (camelCase)
// but @swc/helpers exports _apply_decorated_descriptor (with underscores)
// We'll patch the require to map the function name correctly
const Module = require('module');
const originalRequire = Module.prototype.require;
const fsSync = require('fs');

Module.prototype.require = function(id) {
  // Fix for @swc/helpers module resolution
  if (id === '@swc/helpers') {
    try {
      // First try the normal require
      const helpers = originalRequire.call(this, id);

      // Map the underscore version to camelCase for fontkit compatibility
      if (helpers && typeof helpers.applyDecoratedDescriptor === 'undefined') {
        if (typeof helpers._apply_decorated_descriptor === 'function') {
          helpers.applyDecoratedDescriptor = helpers._apply_decorated_descriptor;
        } else if (typeof helpers._applyDecs2203R === 'function') {
          helpers.applyDecoratedDescriptor = helpers._applyDecs2203R;
        }
      }

      return helpers;
    } catch (e) {
      // If require fails, try to find it manually in common locations
      const possiblePaths = [
        path.join(__dirname, '..', 'node_modules', '@swc', 'helpers'),
        path.join(__dirname, '..', 'node_modules', 'fontkit', 'node_modules', '@swc', 'helpers'),
        path.join(process.cwd(), 'node_modules', '@swc', 'helpers'),
        path.join(process.cwd(), 'node_modules', 'fontkit', 'node_modules', '@swc', 'helpers'),
      ];

      for (const helpersPath of possiblePaths) {
        if (fsSync.existsSync(path.join(helpersPath, 'package.json'))) {
          try {
            const helpers = originalRequire.call(this, helpersPath);
            // Apply the same mapping
            if (helpers && typeof helpers.applyDecoratedDescriptor === 'undefined') {
              if (typeof helpers._apply_decorated_descriptor === 'function') {
                helpers.applyDecoratedDescriptor = helpers._apply_decorated_descriptor;
              }
            }
            return helpers;
          } catch (err) {
            continue;
          }
        }
      }

      // If all else fails, throw the original error
      throw e;
    }
  }

  // Fix for lru-cache module resolution (used by path-scurry)
  // lru-cache v6+ exports LRUCache as the default export (module.exports = LRUCache)
  // but path-scurry expects it as a named export (lru_cache_1.LRUCache)
  if (id === 'lru-cache') {
    try {
      const LRUCache = originalRequire.call(this, id);

      // If it's the class itself (default export), wrap it so LRUCache is available as a property
      if (typeof LRUCache === 'function' && !LRUCache.LRUCache) {
        // Create a wrapper that has LRUCache as a property
        const wrapper = Object.assign(function(...args) {
          return new LRUCache(...args);
        }, LRUCache);

        // Set prototype to LRUCache so instanceof works
        Object.setPrototypeOf(wrapper, LRUCache);

        // Add LRUCache as a named export
        wrapper.LRUCache = LRUCache;
        wrapper.default = LRUCache;

        return wrapper;
      }

      return LRUCache;
    } catch (e) {
      // Fall through to normal require
      return originalRequire.call(this, id);
    }
  }

  return originalRequire.call(this, id);
};

// Import print utilities
const fs = require('fs').promises;
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const http = require('http');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { dialog } = require('electron');

const execAsync = util.promisify(exec);

let mainWindow;
let nextProcess;
let staticServer = null; // HTTP server for serving static files in production
let isPortableMode = false;
let adminPinVerifiedAt = null; // Timestamp when PIN was last verified
const PIN_SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

// Portable Mode Detection
async function detectPortableMode() {
  try {
    const appPath = app.getAppPath();
    const appDir = path.dirname(appPath);

    // Check if app is running from a removable drive
    if (process.platform === 'win32') {
      // Windows: Check if the drive letter is not C: (system drive)
      const driveLetter = appDir.substring(0, 2).toUpperCase();
      if (driveLetter !== 'C:') {
        // Additional check: try to write a test file to verify it's writable
        try {
          const testFile = path.join(appDir, 'portable_test.tmp');
          await fs.writeFile(testFile, 'portable');
          await fs.unlink(testFile);
          isPortableMode = true;
          console.log(`Portable mode detected. App directory: ${appDir}`);
          return true;
        } catch (error) {
          // Not writable, not portable
          console.log('App directory not writable, running in installed mode');
          return false;
        }
      }
    } else if (process.platform === 'darwin') {
      // macOS: Check if running from /Volumes (removable drives)
      if (appDir.startsWith('/Volumes/')) {
        isPortableMode = true;
        console.log(`Portable mode detected (macOS). App directory: ${appDir}`);
        return true;
      }
    } else {
      // Linux: Check if running from /media or /mnt (removable drives)
      if (appDir.startsWith('/media/') || appDir.startsWith('/mnt/')) {
        isPortableMode = true;
        console.log(`Portable mode detected (Linux). App directory: ${appDir}`);
        return true;
      }
    }

    console.log('Running in installed mode');
    return false;
  } catch (error) {
    console.error('Error detecting portable mode:', error);
    return false;
  }
}

// Get database path based on mode
function getDatabasePath() {
  if (isPortableMode) {
    // In portable mode, store DB in app directory
    const appPath = app.getAppPath();
    const appDir = path.dirname(appPath);
    return path.join(appDir, 'data', 'customers.db');
  } else {
    // In installed mode, use user data directory
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'customers.db');
  }
}

// PIN verification and session management
function isAdminPinVerified() {
  if (!adminPinVerifiedAt) return false;

  const now = Date.now();
  const timeDiff = now - adminPinVerifiedAt;

  return timeDiff < PIN_SESSION_TIMEOUT;
}

function verifyAdminPin(pin) {
  if (!pin || pin.length < 4) {
    return { success: false, message: 'PIN must be at least 4 digits' };
  }

  if (!global.db) {
    return { success: false, message: 'Database not available' };
  }

  if (!global.db.isAdminPinSet()) {
    return { success: false, message: 'Admin PIN not set. Please set up PIN first.' };
  }

  if (global.db.verifyAdminPin(pin)) {
    adminPinVerifiedAt = Date.now();
    return { success: true, message: 'PIN verified successfully' };
  } else {
    return { success: false, message: 'Incorrect PIN' };
  }
}

function requireAdminPin() {
  return !isAdminPinVerified();
}

function setAdminPin(pin) {
  if (!pin || pin.length < 4) {
    return { success: false, message: 'PIN must be at least 4 digits' };
  }

  if (!global.db) {
    return { success: false, message: 'Database not available' };
  }

  global.db.setAdminPin(pin);
  adminPinVerifiedAt = Date.now(); // Auto-verify when setting PIN

  // Log audit event
  global.db.logAuditEvent('ADMIN_PIN_SET', null, 'Admin PIN was configured/changed');

  return { success: true, message: 'Admin PIN set successfully' };
}

// Settings validation and dynamic application
function validateSetting(key, value) {
  switch (key) {
    case 'shop_name':
      if (!value || value.trim().length === 0) {
        return { valid: false, message: 'Shop name cannot be empty' };
      }
      if (value.length > 100) {
        return { valid: false, message: 'Shop name too long (max 100 characters)' };
      }
      break;

    case 'shop_address':
      if (value && value.length > 200) {
        return { valid: false, message: 'Address too long (max 200 characters)' };
      }
      break;

    case 'invoice_prefix':
      if (!value || value.trim().length === 0) {
        return { valid: false, message: 'Invoice prefix cannot be empty' };
      }
      if (value.length > 10) {
        return { valid: false, message: 'Invoice prefix too long (max 10 characters)' };
      }
      if (!/^[A-Z0-9]+$/.test(value)) {
        return { valid: false, message: 'Invoice prefix must contain only uppercase letters and numbers' };
      }
      break;

    case 'printer_type':
      if (!['thermal', 'a4'].includes(value)) {
        return { valid: false, message: 'Invalid printer type. Must be "thermal" or "a4"' };
      }
      break;

    case 'backup_interval':
      if (!['manual', 'daily', 'weekly'].includes(value)) {
        return { valid: false, message: 'Invalid backup interval. Must be "manual", "daily", or "weekly"' };
      }
      break;

    case 'currency_symbol':
      if (value && value.length > 3) {
        return { valid: false, message: 'Currency symbol too long (max 3 characters)' };
      }
      break;

    case 'tax_rate':
      const taxRate = parseFloat(value);
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
        return { valid: false, message: 'Tax rate must be a number between 0 and 100' };
      }
      break;

    case 'invoice_footer':
      if (value && value.length > 500) {
        return { valid: false, message: 'Invoice footer too long (max 500 characters)' };
      }
      break;
  }

  return { valid: true };
}

function applySettingDynamically(key, value) {
  // Store setting globally for immediate access
  if (!global.appSettings) {
    global.appSettings = {};
  }
  global.appSettings[key] = value;

  // Apply setting-specific logic
  switch (key) {
    case 'printer_type':
      // Could trigger printer configuration changes
      console.log(`Printer type changed to: ${value}`);
      break;

    case 'backup_interval':
      // Could reschedule automatic backups
      console.log(`Backup interval changed to: ${value}`);
      break;

    case 'currency_symbol':
      // Update currency formatting globally
      console.log(`Currency symbol changed to: ${value}`);
      break;

    default:
      console.log(`Setting ${key} updated to: ${value}`);
  }
}

// Load settings on app startup
async function loadAppSettings() {
  try {
    if (!global.db) return;

    // Define default settings
    const defaultSettings = {
      shop_name: 'My Shop',
      shop_address: '123 Business St, City, State 12345',
      invoice_prefix: 'INV',
      printer_type: 'thermal', // 'thermal' or 'a4'
      backup_interval: 'daily', // 'manual', 'daily', 'weekly'
      currency_symbol: '₹',
      tax_rate: '0',
      invoice_footer: 'Thank you for your business!'
    };

    // Load settings from database with defaults
    const settings = {};
    for (const key of Object.keys(defaultSettings)) {
      const value = global.db.getSetting(key);
      settings[key] = value !== null ? value : defaultSettings[key];
    }

    global.appSettings = settings;
    console.log('App settings loaded:', Object.keys(settings));
  } catch (error) {
    console.error('Error loading app settings:', error);
  }
}

// Utility function for running heavy queries without blocking UI
function runHeavyQuery(queryFn, ...args) {
  return new Promise((resolve, reject) => {
    // Run the query in the next tick to prevent UI blocking
    setImmediate(async () => {
      try {
        const result = await queryFn(...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

function createErrorWindow(message) {
  // Create a simple error window without data URLs
  const errorWindow = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    resizable: false,
    title: 'Invoice Manager - Error',
    icon: path.join(__dirname, '../public/favicon.ico'),
  });

  // Load a simple HTML file or use a minimal inline approach
  const errorHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice Manager - Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
          }
          .container {
            max-width: 500px;
            padding: 2rem;
          }
          .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          .title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
          }
          .message {
            opacity: 0.9;
            margin-bottom: 2rem;
            line-height: 1.6;
          }
          .retry-btn {
            background: white;
            color: #667eea;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
            margin: 0.5rem;
          }
          .retry-btn:hover {
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">⚠️</div>
          <h1 class="title">Application Error</h1>
          <p class="message">${message}</p>
          <button class="retry-btn" onclick="window.location.reload()">Retry</button>
          <button class="retry-btn" onclick="window.close()">Close</button>
        </div>
      </body>
    </html>
  `;

  errorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);

  errorWindow.on('closed', () => {
    // Exit the app when error window is closed
    app.quit();
  });
}

async function createWindow() {
  // Standalone desktop app — hide native File/Edit/Window/Help menu bar
  Menu.setApplicationMenu(null);

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Billing Pro',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Check if we're in development or production mode
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    // Development mode: Start Next.js server and load from localhost
    const port = global.nextJsPort || 3000;
    console.log(`[DEV] Loading app from http://localhost:${port}`);

    try {
      await mainWindow.loadURL(`http://localhost:${port}`);
      console.log(`✅ Successfully loaded app on port ${port}`);
    } catch (error) {
      console.error(`❌ Failed to load app on port ${port}:`, error);
      createErrorWindow(`Failed to connect to application server on port ${port}.`);
    }

    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode: Start local HTTP server to serve static files
    // This is needed for Next.js routing to work correctly
    await startStaticFileServer();

    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 500));

    const port = global.staticServerPort || 3000;
    console.log(`[PROD] Loading app from http://localhost:${port}`);

    try {
      await mainWindow.loadURL(`http://localhost:${port}`);
      console.log(`✅ Successfully loaded production build from local server`);
    } catch (error) {
      console.error(`❌ Failed to load app:`, error);
      createErrorWindow(`Failed to load application: ${error.message}`);
    }
  }

  // Handle failed page loads
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
    // Only show error for network/server errors in development
    if (isDev && (errorCode === -102 || errorCode === -105)) { // ERR_CONNECTION_REFUSED, ERR_NAME_NOT_RESOLVED
      createErrorWindow(`Failed to connect to application server. Error: ${errorDescription} (Code: ${errorCode})`);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextJs() {
  // Start Next.js development server
  nextProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
  });

  nextProcess.on('close', (code) => {
    console.log(`Next.js process exited with code ${code}`);
  });
}

// Start HTTP server to serve static files in production
async function startStaticFileServer() {
  return new Promise((resolve, reject) => {
    try {
      // Find the out directory
      const outDir = path.join(__dirname, '..', 'out');
      const altOutDir = path.join(app.getAppPath(), 'out');

      let staticDir = null;
      if (fsSync.existsSync(outDir)) {
        staticDir = outDir;
      } else if (fsSync.existsSync(altOutDir)) {
        staticDir = altOutDir;
      } else {
        reject(new Error(`Static files directory not found. Checked:\n- ${outDir}\n- ${altOutDir}`));
        return;
      }

      console.log(`[PROD] Serving static files from: ${staticDir}`);

      // Find an available port starting from 3000
      const findAvailablePort = (startPort) => {
        return new Promise((resolvePort) => {
          const server = http.createServer();
          server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolvePort(port));
          });
          server.on('error', () => {
            // Port in use, try next
            findAvailablePort(startPort + 1).then(resolvePort);
          });
        });
      };

      findAvailablePort(3000).then((port) => {
        // Create HTTP server to serve static files
        staticServer = http.createServer((req, res) => {
          let filePath = path.join(staticDir, req.url === '/' ? 'index.html' : req.url);

          // Remove query string
          filePath = filePath.split('?')[0];

          // Security: prevent directory traversal
          const resolvedPath = path.resolve(filePath);
          const resolvedDir = path.resolve(staticDir);
          if (!resolvedPath.startsWith(resolvedDir)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
          }

          // Check if file exists
          fsSync.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
              // File not found, try serving index.html for client-side routing
              const indexPath = path.join(staticDir, 'index.html');
              fsSync.readFile(indexPath, (err, data) => {
                if (err) {
                  res.writeHead(404, { 'Content-Type': 'text/plain' });
                  res.end('Not Found');
                } else {
                  res.writeHead(200, { 'Content-Type': 'text/html' });
                  res.end(data);
                }
              });
            } else {
              // Determine content type
              const ext = path.extname(filePath).toLowerCase();
              const contentTypes = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon',
                '.woff': 'font/woff',
                '.woff2': 'font/woff2',
                '.ttf': 'font/ttf',
                '.eot': 'application/vnd.ms-fontobject',
              };

              const contentType = contentTypes[ext] || 'application/octet-stream';

              fsSync.readFile(filePath, (err, data) => {
                if (err) {
                  res.writeHead(500, { 'Content-Type': 'text/plain' });
                  res.end('Internal Server Error');
                } else {
                  res.writeHead(200, { 'Content-Type': contentType });
                  res.end(data);
                }
              });
            }
          });
        });

        staticServer.listen(port, 'localhost', () => {
          console.log(`[PROD] Static file server started on http://localhost:${port}`);
          global.staticServerPort = port;
          resolve(port);
        });

        staticServer.on('error', (err) => {
          console.error('[PROD] Static server error:', err);
          reject(err);
        });
      });
    } catch (error) {
      console.error('[PROD] Failed to start static server:', error);
      reject(error);
    }
  });
}

function checkNextJsReady() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 60; // Check for up to 60 seconds
    let lastCheckedPort = 3000;

    const checkServer = () => {
      attempts++;

      const port = lastCheckedPort;
      lastCheckedPort = port === 3000 ? 3001 : 3000; // Alternate between ports

      console.log(`Checking Next.js server on port ${port} (attempt ${attempts})...`);

      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'HEAD', // Use HEAD instead of GET for faster response
        timeout: 3000
      }, (res) => {
        console.log(`Port ${port} responded with status ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log(`✅ Next.js server is ready on port ${port}!`);
          resolve(port); // Return the port number
        } else {
          // Server responded but not ready, try again
          if (attempts < maxAttempts) {
            setTimeout(checkServer, 1000);
          } else {
            console.log('❌ Next.js server check timed out');
            resolve(false);
          }
        }
      });

      req.on('error', (error) => {
        console.log(`Port ${port} error: ${error.code}`);
        // Try the other port or continue checking
        if (attempts < maxAttempts) {
          setTimeout(checkServer, 500);
        } else {
          console.log('❌ Next.js server check timed out after all attempts');
          resolve(false);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        console.log(`Port ${port} timed out`);
        if (attempts < maxAttempts) {
          setTimeout(checkServer, 500);
        } else {
          console.log('❌ Next.js server check timed out');
          resolve(false);
        }
      });

      req.end();
    };

    // Start checking immediately
    checkServer();
  });
}

app.whenReady().then(async () => {
  // Detect portable mode before starting anything else
  await detectPortableMode();

  // Initialize database with integrity checking and auto-recovery
  const dbPath = getDatabasePath();
  let dbInitialized = false;
  let readOnlyMode = false;
  let recoveryMessage = null;

  try {
    // Check if database file exists and has content before running integrity checks
    const dbExists = fsSync.existsSync(dbPath);
    let dbHasContent = false;

    if (dbExists) {
      try {
        const stats = fsSync.statSync(dbPath);
        dbHasContent = stats.size > 1024; // At least 1KB of data
      } catch (error) {
        console.log('Could not check database file size:', error.message);
      }
    }

    // First, try to initialize database normally
    const dbModule = require('./db');
    const skipIntegrityCheck = !dbExists || !dbHasContent; // Skip for new/small databases
    const db = dbModule(dbPath, { skipIntegrityCheck });

    // For development and new databases, be more permissive
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isNewDatabase = !dbExists || !dbHasContent;

    if (skipIntegrityCheck || db.isDatabaseValid || isNewDatabase || isDevelopment) {
      // Database is valid, newly created, or we're in development mode
      global.db = db;
      dbInitialized = true;
      console.log(skipIntegrityCheck ? 'Database initialized (new or empty)' :
                  isNewDatabase ? 'Database initialized (new)' :
                  isDevelopment ? 'Database initialized (development mode)' :
                  'Database integrity check passed');
    } else {
      // Database is corrupted, try to recover
      console.log('Database integrity check failed, attempting recovery...');
      db.close();

      const recoveryResult = await performDatabaseRecovery(dbPath);
      if (recoveryResult.success) {
        // Recovery successful, reinitialize
        const recoveredDb = dbModule(recoveryResult.dbPath, { skipIntegrityCheck: true });
        global.db = recoveredDb;
        dbInitialized = true;
        recoveryMessage = recoveryResult.message;
        console.log('Database recovery successful:', recoveryResult.message);
      } else {
        // Recovery failed, try read-only mode
        console.log('Database recovery failed, attempting read-only mode...');
        try {
          const readOnlyDb = dbModule(dbPath, { readOnly: true, skipIntegrityCheck: true });
          global.db = readOnlyDb;
          dbInitialized = true;
          readOnlyMode = true;
          recoveryMessage = 'Database corrupted and no valid backups found. App opened in read-only mode.';
          console.log('Read-only mode activated');
        } catch (error) {
          console.error('Failed to open database in read-only mode:', error);
          recoveryMessage = 'Critical error: Database corrupted and cannot be opened. Please contact support.';
        }
      }
    }
  } catch (error) {
    console.error('Error during database initialization:', error);
    recoveryMessage = 'Error initializing database. App may not function correctly.';
  }

  // Store recovery status for IPC
  global.dbStatus = {
    initialized: dbInitialized,
    readOnly: readOnlyMode,
    recoveryMessage,
    dbPath
  };

  // Load app settings
  if (dbInitialized) {
    await loadAppSettings();

    // Set default PIN (5555) if not already set
    if (!global.db.isAdminPinSet()) {
      console.log('Setting default admin PIN to 5555');
      global.db.setAdminPin('5555');
    } else {
      console.log('Admin PIN already set');
    }

    // Verify PIN is working
    console.log('Testing PIN verification...');
    const testResult = global.db.verifyAdminPin('5555');
    console.log('PIN 5555 verification result:', testResult);
  }

  // Check if we're in development or production mode
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    // Development mode: Start Next.js server
    startNextJs();

    // Wait for Next.js server to be ready before creating window
    checkNextJsReady().then((readyPort) => {
      if (readyPort) {
        console.log(`🎉 Server ready on port ${readyPort}, creating window...`);
        // Store the detected port for createWindow to use
        global.nextJsPort = readyPort;
        createWindow();
      } else {
        console.error('❌ Next.js server failed to start');
        createErrorWindow('Next.js server failed to start. Please check the console for errors.');
      }
    }).catch((error) => {
      console.error('Failed to check Next.js server:', error);
      createErrorWindow('Failed to connect to application server.');
    });
  } else {
    // Production mode: Load static files directly
    console.log('Production mode: Loading static files...');
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup static server on app quit
app.on('before-quit', () => {
  if (staticServer) {
    console.log('[PROD] Closing static file server...');
    staticServer.close();
    staticServer = null;
  }
  if (nextProcess) {
    nextProcess.kill();
  }
});

// IPC handlers for customer operations
ipcMain.handle('add-customer', async (event, customer) => {
  if (global.dbStatus?.readOnly) {
    throw new Error('Cannot add customer: Database is in read-only mode due to corruption');
  }
  try {
    return global.db.addCustomer(customer.name, customer.phone);
  } catch (error) {
    console.error('Error adding customer:', error);
    throw error;
  }
});

ipcMain.handle('get-customers', async () => {
  try {
    return global.db.getAllCustomers();
  } catch (error) {
    console.error('Error getting customers:', error);
    throw error;
  }
});

ipcMain.handle('get-customers-with-stats', async () => {
  try {
    return global.db.getCustomersWithStats();
  } catch (error) {
    console.error('Error getting customers with stats:', error);
    throw error;
  }
});

// IPC handlers for invoice operations
ipcMain.handle('create-invoice', async (event, invoiceData) => {
  if (global.dbStatus?.readOnly) {
    throw new Error('Cannot create invoice: Database is in read-only mode due to corruption');
  }
  try {
    const { customerId, date, items } = invoiceData;
    const invoice = global.db.createInvoice(customerId, date, items);

    // Log audit event
    global.db.logAuditEvent('INVOICE_CREATED', invoice.id.toString(), `Invoice ${invoice.invoice_no} created for customer ${customerId}`);

    return invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
});

ipcMain.handle('get-invoices-by-customer', async (event, customerId) => {
  try {
    return global.db.getInvoicesByCustomer(customerId);
  } catch (error) {
    console.error('Error getting invoices by customer:', error);
    throw error;
  }
});

ipcMain.handle('get-invoice-with-items', async (event, invoiceId) => {
  try {
    return global.db.getInvoiceWithItems(invoiceId);
  } catch (error) {
    console.error('Error getting invoice with items:', error);
    throw error;
  }
});

ipcMain.handle('get-recent-invoices', async (event, limit = 5) => {
  try {
    const invoices = global.db.getRecentInvoices(limit);
    return invoices || [];
  } catch (error) {
    console.error('Error getting recent invoices:', error);
    return [];
  }
});

// Test printer scanning (for debugging)
ipcMain.handle('test-printer-scan', async () => {
  console.log('🧪 [MAIN] Test printer scan initiated');
  try {
    // Call the scan-printers function directly
    const scanPrinters = async () => {
      console.log('🔍 [TEST] Starting printer enumeration...');
      const printers = [];

      try {
        // Try PowerShell method first
        if (process.platform === 'win32') {
          try {
            console.log('🧪 [TEST] PowerShell printer detection...');
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);

            const { stdout } = await execAsync('powershell -Command "Get-Printer | Where-Object { $_.Name -notlike \'*Microsoft*\' -or $_.Name -like \'*PDF*\' } | Select-Object Name,DriverName,PrinterStatus,PortName | ConvertTo-Json"', { timeout: 8000 });

            if (stdout && stdout.trim() && stdout.trim() !== 'null') {
              const psPrinters = JSON.parse(stdout);
              const printerArray = Array.isArray(psPrinters) ? psPrinters : [psPrinters];

              printerArray.forEach(printer => {
                if (printer.Name && !printer.Name.includes('Fax') && !printer.Name.includes('OneNote')) {
                  const status = printer.PrinterStatus === 1 ? 'available' :
                               printer.PrinterStatus === 2 ? 'busy' :
                               printer.PrinterStatus === 3 ? 'offline' : 'available';

                  printers.push({
                    id: printer.Name,
                    name: printer.Name,
                    type: (printer.DriverName && printer.DriverName.toLowerCase().includes('thermal')) ||
                         printer.Name.toLowerCase().includes('thermal') ||
                         printer.Name.toLowerCase().includes('58mm') ||
                         (printer.PortName && printer.PortName.toLowerCase().includes('usb')) ? 'thermal' : 'a4',
                    status: status,
                    ip: null,
                    port: printer.PortName || null
                  });
                }
              });
              console.log('🧪 [TEST] PowerShell found', printerArray.length, 'printers');
            }
          } catch (psError) {
            console.warn('🧪 [TEST] PowerShell failed:', psError.message);
          }
        }

        // Add fallback printers if none found
        if (printers.length === 0) {
          console.log('🧪 [TEST] No printers found, adding fallbacks');
          printers.push(
            { id: 'Test Printer', name: 'Test Printer', type: 'a4', status: 'available', ip: null, port: null },
            { id: 'Thermal Test', name: 'Thermal Test', type: 'thermal', status: 'available', ip: null, port: null }
          );
        }

        return printers;
      } catch (error) {
        console.error('🧪 [TEST] Error in scan:', error);
        return [{ id: 'Error Fallback', name: 'Error Fallback Printer', type: 'a4', status: 'available', ip: null, port: null }];
      }
    };

    const result = await scanPrinters();
    console.log('🧪 [MAIN] Test scan result:', result);
    return result;
  } catch (error) {
    console.error('🧪 [MAIN] Test scan failed:', error);
    return [];
  }
});



// Print invoice function with enhanced design - A4 Landscape with Store Copy and Customer Copy side by side
// Supports multi-page printing for invoices with more than 25 items
function generateInvoiceHTML(invoice, settings = {}) {
  const { invoice_no, date, customer_name, customer_phone, items, total } = invoice;
  const {
    currency_symbol = '₹',
    invoice_footer = 'Thank you for your business!'
  } = settings;

  const invoiceDate = new Date(date);
  const formattedDate = invoiceDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });

  // Get Logo Base64 - using invlogo.png
  let logoBase64 = '';
  try {
    const logoPath = path.join(__dirname, '../public/invlogo.png');
    if (fsSync.existsSync(logoPath)) {
      logoBase64 = fsSync.readFileSync(logoPath).toString('base64');
    }
  } catch (err) {
    console.error('Error reading logo for HTML:', err);
  }

  // Split items into pages of 25 items each
  const itemsPerPage = 25;
  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;

  // Generate rows HTML for a specific page
  const generateRowsHtml = (pageIndex) => {
    const rows = [];
    const startIndex = pageIndex * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, items.length);

    for (let i = 0; i < itemsPerPage; i++) {
      const actualIndex = startIndex + i;
      const item = items[actualIndex];

      if (item && actualIndex < items.length) {
        const price = Number(item.price || 0);
        const qty = Number(item.qty || 0);
        const amount = price * qty;
        rows.push(`
            <tr>
              <td class="sno-col">${actualIndex + 1}</td>
              <td class="name-col">${item.item_name}</td>
              <td class="qty-col">${qty}</td>
              <td class="price-col">${currency_symbol}${price.toFixed(2)}</td>
              <td class="amount-col">${currency_symbol}${amount.toFixed(2)}</td>
            </tr>
        `);
      } else {
        rows.push(`
            <tr class="empty-row">
              <td class="sno-col">&nbsp;</td>
              <td class="name-col">&nbsp;</td>
              <td class="qty-col">&nbsp;</td>
              <td class="price-col">&nbsp;</td>
              <td class="amount-col">&nbsp;</td>
            </tr>
        `);
      }
    }
    return rows.join('');
  };

  // Generate invoice copy HTML for a specific page
  const generateCopyHTML = (copyType, pageIndex, isLastPage) => {
    const rowsHtml = generateRowsHtml(pageIndex);
    const isContinuation = pageIndex > 0;

    return `
    <div class="invoice-copy${isContinuation ? ' continuation' : ''}" role="region" aria-label="${copyType}">
      ${isContinuation ? `
      <div class="continuation-label">Continued — Page ${pageIndex + 1}/${totalPages}</div>
      ` : `
      <div class="header-top">
        <div class="date-left">
          <div class="date-value">${formattedDate}</div>
          ${totalPages > 1 ? `<div class="page-indicator">Page ${pageIndex + 1}/${totalPages}</div>` : ''}
        </div>
        <div class="customer-center">
          <div class="customer-name-header">${customer_name || 'Customer'}</div>
        </div>
        <div class="logo-right">
          ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" class="invoice-logo" />` : ''}
        </div>
      </div>
      `}

      <table class="items-table" role="table" aria-label="Invoice items">
        <colgroup>
          <col style="width:6%" />
          <col style="width:46%" />
          <col style="width:10%" />
          <col style="width:19%" />
          <col style="width:19%" />
        </colgroup>
        ${isContinuation ? '' : `
        <thead>
          <tr>
            <th class="sno-col">S.No</th>
            <th class="name-col">Name of Item</th>
            <th class="qty-col">Qty</th>
            <th class="price-col">Item Price</th>
            <th class="amount-col">Amount</th>
          </tr>
        </thead>
        `}
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      ${isLastPage ? `
      <div class="grand-total" role="note" aria-label="Grand total">
        <span class="grand-label">Grand Total:</span>
        <span class="total-amount">${currency_symbol}${total.toFixed(2)}</span>
      </div>

      <div class="footer-text">${invoice_footer}</div>
      ` : `
      <div class="continued-note">Continued on next page...</div>
      `}
    </div>
  `;
  };

  // Generate page HTML for a specific page index
  const generatePageHTML = (pageIndex) => {
    const isLastPage = pageIndex === totalPages - 1;
    return `
      <div class="print-page">
        ${generateCopyHTML('STORE COPY', pageIndex, isLastPage)}
        ${generateCopyHTML('CUSTOMER COPY', pageIndex, isLastPage)}
      </div>
    `;
  };

  // Generate all pages
  const allPagesHTML = [];
  for (let i = 0; i < totalPages; i++) {
    allPagesHTML.push(generatePageHTML(i));
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice_no}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        @page {
          size: A4 landscape;
          margin: 0;
        }

        @media print {
          html, body {
            width: 297mm;
            margin: 0;
            padding: 0;
          }

          .print-page {
            width: 297mm;
            height: 210mm;
            page-break-after: always;
            page-break-inside: avoid;
            display: flex;
            flex-direction: row;
            padding: 5mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-page:last-child {
            page-break-after: auto;
          }

          /* Prevent page breaks within invoice copies */
          .invoice-copy {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Do not auto-repeat table headers on printed pages */
          thead {
            display: table-row-group;
          }
        }

        html, body {
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: 10pt;
          line-height: 1.3;
          color: #000;
          background: #fff;
        }

        .print-page {
          width: 297mm;
          height: 200mm;
          max-height: 200mm;
          display: flex;
          flex-direction: row;
          padding: 5mm;
          page-break-after: always;
        }

        .print-page:last-child {
          page-break-after: auto;
        }

        .invoice-copy {
          flex: 1;
          border: 2px solid #000;
          padding: 3mm;
          margin: 0 2mm;
          display: flex;
          flex-direction: column;
          height: calc(200mm - 10mm);
          max-height: calc(200mm - 10mm);
          position: relative;
          overflow: hidden;
        }

        .invoice-copy:first-child {
          margin-left: 0;
        }

        .invoice-copy:last-child {
          margin-right: 0;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid #000;
          min-height: 50px;
        }

        .date-left {
          min-width: 80px;
          text-align: left;
        }

        .date-value {
          font-size: 10pt;
          font-weight: 500;
          color: #000;
        }

        .page-indicator {
          font-size: 8pt;
          color: #666;
          margin-top: 2px;
        }

        .customer-center {
          flex: 1;
          text-align: center;
          padding: 0 10px;
        }

        .customer-name-header {
          font-size: 14pt;
          font-weight: bold;
          color: #000;
          text-transform: uppercase;
        }

        .logo-right {
          min-width: 100px;
          max-width: 120px;
          height: 55px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .invoice-logo {
          width: auto;
          height: 100%;
          max-width: 120px;
          max-height: 55px;
          object-fit: contain;
          display: block;
        }

        .continuation-label {
          font-size: 9pt;
          font-weight: 600;
          margin-bottom: 2mm;
          padding-bottom: 1mm;
          border-bottom: 1px dashed #000;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1mm;
          flex: 1;
          table-layout: fixed;
          word-wrap: break-word;
          border: 1px solid #000;
          overflow: hidden;
        }

        .items-table th,
        .items-table td {
          padding: 2px 4px;
          vertical-align: middle;
          box-sizing: border-box;
          overflow: hidden;
          font-size: 8pt;
          border: 1px solid #000;
        }

        /* Fixed row height to keep receipts uniformly spaced regardless of item count */
        .items-table tr {
          height: 5.5mm;
        }

        .items-table .empty-row td {
          color: transparent;
        }

        .items-table th {
          background-color: transparent;
          font-weight: 600;
          font-size: 8pt;
          text-transform: uppercase;
        }

        .items-table td {
          font-size: 8pt;
          font-weight: normal;
        }

        .sno-col {
          width: 8%;
        }

        .name-col {
          width: 40%;
          text-align: left !important;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .qty-col {
          width: 12%;
          text-align: center;
        }

        .price-col {
          width: 18%;
          text-align: right;
        }

        .amount-col {
          width: 22%;
          text-align: right;
        }

        /* Ensure amounts don't overflow borders */
        .price-col, .amount-col {
          padding-right: 10px;
        }

        /* Grand total adjustments */
        .grand-total {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 2mm;
          background: transparent;
          border: 2px solid #000;
          margin-top: 2mm;
          margin-bottom: 1mm;
          font-size: 10pt;
          font-weight: 500;
        }

        .grand-total .total-amount {
          margin-left: 6mm;
          font-size: 12pt;
          font-weight: 600;
        }

        .footer-text {
          text-align: center;
          font-size: 7pt;
          margin-top: 1mm;
          padding-top: 1mm;
          border-top: 1px dashed #000;
          color: #000;
        }

        .continued-note {
          text-align: center;
          font-size: 9pt;
          font-style: italic;
          color: #666;
          margin-top: 2mm;
          padding: 2mm;
          border: 1px dashed #999;
        }
      </style>
    </head>
    <body>
      ${allPagesHTML.join('')}
    </body>
    </html>
  `;
}


async function printInvoice(invoice, selectedPrinterOverride) {
  let printWindow = null;

  try {
    console.log('🖨️ ===== STARTING PRINT PROCESS =====');
    console.log('🖨️ Invoice:', invoice.invoice_no, 'Printer override:', selectedPrinterOverride);

    if (!mainWindow) {
      console.error('🖨️ ERROR: Main window not available');
      throw new Error('Main window not available for printing');
    }

    console.log('🖨️ Creating print window...');
    printWindow = new BrowserWindow({
      show: false,
      width: 1123,
      height: 794,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    if (!printWindow) {
      console.error('🖨️ ERROR: Failed to create print window');
      throw new Error('Failed to create print window');
    }

    if (!printWindow.webContents) {
      console.error('🖨️ ERROR: Print window has no webContents');
      throw new Error('Failed to create print window webContents');
    }

    console.log('🖨️ Print window created successfully');

    const htmlContent = generateInvoiceHTML(invoice, global.appSettings);
    console.log('🖨️ Generated HTML content, length:', htmlContent.length);
    console.log('🖨️ HTML content preview:', htmlContent.substring(0, 200) + '...');

    if (!htmlContent || htmlContent.length < 100) {
      throw new Error('Generated HTML content is too short or empty');
    }

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    console.log('🖨️ Loaded HTML content into window');

    // Wait for the content to be ready - use both did-finish-load and dom-ready
    await new Promise((resolve) => {
      let resolved = false;
      const resolveOnce = () => {
        if (!resolved) {
          resolved = true;
          console.log('🖨️ Content is ready for printing');
          resolve();
        }
      };

      const timeout = setTimeout(() => {
        console.log('🖨️ Content load timeout (5s), proceeding anyway');
        resolveOnce();
      }, 5000);

      // DOM ready is more reliable for data URLs
      printWindow.webContents.once('dom-ready', () => {
        console.log('🖨️ DOM ready');
        clearTimeout(timeout);
        // Give a small delay for rendering
        setTimeout(resolveOnce, 500);
      });

      printWindow.webContents.once('did-finish-load', () => {
        console.log('🖨️ Content finished loading');
        clearTimeout(timeout);
        setTimeout(resolveOnce, 500);
      });

      printWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
        console.warn('🖨️ Content failed to load:', errorDescription, 'Error code:', errorCode);
        clearTimeout(timeout);
        // Still try to print even if load "failed" (data URLs might trigger this)
        setTimeout(resolveOnce, 1000);
      });
    });

    // Additional wait to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('🖨️ Ready to print after rendering delay');

    // Use the printer passed from billing page, or fall back to settings
    let deviceName = selectedPrinterOverride || global.db.getSetting('selected_printer') || '';
    console.log('🖨️ Selected printer override:', selectedPrinterOverride);
    console.log('🖨️ Saved printer setting:', global.db.getSetting('selected_printer'));
    console.log('🖨️ Final device name:', deviceName || 'No printer selected (will use default)');

    // If no printer is selected, try to get the default printer from Electron
    if (!deviceName) {
      try {
        if (printWindow && printWindow.webContents) {
          const printers = printWindow.webContents.getPrinters();
          console.log('🖨️ Found printers for default selection:', printers.length);
          const defaultPrinter = printers.find(p => p.isDefault);
          if (defaultPrinter) {
            deviceName = defaultPrinter.name;
            console.log('🖨️ Using default printer:', deviceName);
          } else {
            console.log('🖨️ No default printer found');
          }
        } else {
          console.warn('🖨️ Print window or webContents not available for default printer detection');
        }
      } catch (defaultError) {
        console.warn('🖨️ Could not get default printer:', defaultError.message);
      }
    }

    // First, check if the selected printer is actually available
    let availablePrinters = [];
    try {
      if (printWindow && printWindow.webContents) {
        availablePrinters = printWindow.webContents.getPrinters();
        console.log('🖨️ Available printers for validation:', availablePrinters.map(p => p.name));
      } else {
        console.warn('🖨️ Print window not available for printer validation');
      }
    } catch (printerError) {
      console.warn('🖨️ Error getting available printers:', printerError.message);
      availablePrinters = [];
    }

    const selectedPrinterExists = deviceName && availablePrinters.some(p => p.name === deviceName);

    if (deviceName && !selectedPrinterExists) {
      console.warn(`🖨️ Selected printer "${deviceName}" not found in available printers. Available:`, availablePrinters.map(p => p.name));
      // Try to find a printer with similar name (case-insensitive)
      const matchedPrinter = availablePrinters.find(p =>
        p.name.toLowerCase() === deviceName.toLowerCase() ||
        p.name.toLowerCase().includes(deviceName.toLowerCase()) ||
        deviceName.toLowerCase().includes(p.name.toLowerCase())
      );
      if (matchedPrinter) {
        console.log(`🖨️ Found matching printer: "${matchedPrinter.name}" (was looking for "${deviceName}")`);
        deviceName = matchedPrinter.name;
      } else {
        console.warn('🖨️ No matching printer found, will use default');
        deviceName = undefined;
      }
    }

    // Direct silent printing to selected printer
    try {
      console.log('🖨️ Attempting DIRECT SILENT PRINT to:', deviceName || 'default printer');

      // Prepare print options for direct silent printing
      const printOptions = {
        silent: true, // DIRECT SILENT PRINTING - NO DIALOG
        printBackground: false,
        deviceName: deviceName || undefined, // Use selected printer or undefined for default
        landscape: true,
        margins: {
          marginType: 'none' // No margins - CSS handles all spacing
        },
        pageSize: 'A4'
        // All pages will be printed for multi-page invoices
      };

      console.log('🖨️ Print options:', JSON.stringify(printOptions, null, 2));
      console.log('🖨️ webContents available:', !!printWindow.webContents);
      console.log('🖨️ print method available:', typeof printWindow.webContents.print);

      if (!printWindow.webContents) {
        throw new Error('Print window webContents is not available');
      }

      if (typeof printWindow.webContents.print !== 'function') {
        throw new Error('Print method is not available on webContents');
      }

      // Ensure content is fully loaded and rendered before printing
      console.log('🖨️ Waiting for final render...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to ensure rendering

      console.log('🖨️ Executing print command...');
      console.log('🖨️ Calling webContents.print() with options:', JSON.stringify(printOptions, null, 2));
      const result = await printWindow.webContents.print(printOptions);
      console.log('🖨️ Print command returned, result:', result);

      // Wait longer to ensure print job is actually sent to printer
      // Silent printing should return quickly, but we want to ensure the job is queued
      console.log('🖨️ Waiting for print job to be sent...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('🖨️ Print job should be sent, closing window...');
      if (!printWindow.isDestroyed()) {
        printWindow.close();
      }
      console.log('🖨️ Print window closed');

      // Aggressively refocus main windowf
      if (mainWindow && !mainWindow.isDestroyed()) {
        setImmediate(() => {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          // Force focus by briefly setting always on top
          mainWindow.setAlwaysOnTop(true);
          setTimeout(() => {
             mainWindow.setAlwaysOnTop(false);
             mainWindow.focus();
          }, 100);
        });
      }

      return { success: true, message: 'Invoice printed directly to printer', printResult: result };
    } catch (printError) {
      console.error('🖨️ ===== DIRECT PRINTING FAILED =====');
      console.error('🖨️ Error message:', printError.message);
      console.error('🖨️ Error stack:', printError.stack);
      console.error('🖨️ Error details:', printError);
      console.warn('🖨️ Available printers:', availablePrinters.map(p => ({ name: p.name, status: p.status })));
      console.log('🖨️ Device name used:', deviceName);
      console.log('🖨️ Print options used:', JSON.stringify(printOptions, null, 2));

      // Fallback 1: Try silent print with default printer
      try {
        console.log('🖨️ Fallback: trying silent print with default printer...');
        const fallbackResult = await printWindow.webContents.print({
          silent: true,
          printBackground: false,
          landscape: true,
          margins: {
            marginType: 'none' // No margins - CSS handles all spacing
          },
          pageSize: 'A4'
          // All pages will be printed for multi-page invoices
        });

        console.log('🖨️ Fallback print result:', fallbackResult);

        if (!printWindow.isDestroyed()) {
          printWindow.close();

          // Aggressively refocus main window
          if (mainWindow && !mainWindow.isDestroyed()) {
            setImmediate(() => {
               mainWindow.minimize(); // Toggle minimize/restore to force focus update
               setTimeout(() => {
                   if (mainWindow && !mainWindow.isDestroyed()) {
                       mainWindow.restore();
                       mainWindow.focus();
                   }
               }, 50);
            });
          }
        }

        return { success: true, message: 'Invoice printed to default printer (fallback)' };
      } catch (fallbackError) {
        console.error('🖨️ Fallback silent printing also failed:', fallbackError.message);

        // Fallback 2: Show print dialog as last resort
        try {
          console.log('🖨️ Last resort: showing print dialog...');
          printWindow.show();
          printWindow.focus();
          printWindow.setTitle('Print Invoice - Please select printer and print');

          const dialogResult = await printWindow.webContents.print({
            silent: false, // Show dialog
            printBackground: false,
            landscape: true,
            margins: {
              marginType: 'none' // No margins - CSS handles all spacing
            },
            pageSize: 'A4'
            // All pages will be printed for multi-page invoices
          });

          console.log('🖨️ Dialog print result:', dialogResult);

          // Close window after dialog interaction
          setTimeout(() => {
            if (!printWindow.isDestroyed()) {
              printWindow.close();

              // Refocus main window
              if (mainWindow) {
                if (!mainWindow.isDestroyed()) mainWindow.focus();
              }
            }
          }, 3000);

          return { success: true, message: 'Print dialog shown for manual printing' };
        } catch (dialogError) {
          console.error('🖨️ All printing methods failed:', dialogError.message);
          if (printWindow && !printWindow.isDestroyed()) {
            printWindow.close();
            // Refocus main window
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.focus();
            }
          }
          throw new Error(`Printing completely failed. Silent print: ${printError.message}, Dialog: ${dialogError.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error printing invoice:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);

    // Make sure to clean up the print window if it was created
    try {
      if (printWindow && !printWindow.isDestroyed()) {
        printWindow.destroy();
        console.log('🖨️ Cleaned up print window after error');

        // Refocus main window
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.focus();
        }
      }
    } catch (cleanupError) {
      console.warn('🖨️ Error cleaning up print window:', cleanupError.message);
    }

    throw error;
  }
}

// Generate PDF invoice by rendering the same HTML used for printing and converting to PDF
async function generateInvoicePDF(invoice) {
  try {
    const html = generateInvoiceHTML(invoice, global.appSettings || {});

    const { invoice_no } = invoice;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Invoice as PDF',
      defaultPath: `invoice_${invoice_no}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (result.canceled) {
      throw new Error('PDF save cancelled by user');
    }

    const pdfWindow = new BrowserWindow({
      show: false,
      width: 1123,  // A4 landscape width in pixels at 96dpi
      height: 794,  // A4 landscape height in pixels at 96dpi
      webPreferences: {
        contextIsolation: true,
        sandbox: false
      }
    });

    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    await new Promise((resolve) => {
      pdfWindow.webContents.once('dom-ready', resolve);
      setTimeout(resolve, 2000);
    });

    // Use A4 landscape for PDF
    const pdfOptions = {
      landscape: true,
      printBackground: true,
      pageSize: 'A4',
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
      // All pages will be included for multi-page invoices
    };

    const data = await pdfWindow.webContents.printToPDF(pdfOptions);
    fsSync.writeFileSync(result.filePath, data);

    if (!pdfWindow.isDestroyed()) pdfWindow.close();

    return { success: true, message: `Invoice saved as PDF: ${result.filePath}`, filePath: result.filePath };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// IPC handler for printing invoices
ipcMain.handle('print-invoice', async (event, invoiceId, selectedPrinter) => {
  console.log('🖨️ [IPC] print-invoice called with invoiceId:', invoiceId, 'printer:', selectedPrinter);
  try {
    // First, get the full invoice data with items
    const invoice = global.db.getInvoiceWithItems(invoiceId);
    if (!invoice) {
      console.error('🖨️ [IPC] Invoice not found for ID:', invoiceId);
      throw new Error('Invoice not found');
    }

    console.log('🖨️ [IPC] Invoice found:', invoice.invoice_no, 'Calling printInvoice function...');

    // Try to print the invoice - DO NOT fallback to PDF automatically
    // User explicitly requested printing, so we should report errors
    const result = await printInvoice(invoice, selectedPrinter);
    console.log('🖨️ [IPC] Print result:', result);
    return result;
  } catch (error) {
    console.error('🖨️ [IPC] Error in print invoice handler:', error);
    console.error('🖨️ [IPC] Error message:', error.message);
    console.error('🖨️ [IPC] Error stack:', error.stack);
    // Re-throw the error so frontend can handle it
    throw error;
  }
});

ipcMain.handle('generate-pdf', async (event, invoiceId) => {
  try {
    // First, get the full invoice data with items
    const invoice = global.db.getInvoiceWithItems(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Generate PDF
    const result = await generateInvoicePDF(invoice);
    return result;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
});

// USB Drive Detection and Backup Functions
async function detectRemovableDrives() {
  try {
    const drives = [];

    if (process.platform === 'win32') {
      // Windows: Check drive letters A-Z for removable drives
      for (let i = 65; i <= 90; i++) { // A to Z
        const driveLetter = String.fromCharCode(i);
        const drivePath = `${driveLetter}:\\`;

        try {
          // Check if drive exists and is removable
          const driveStats = await fs.stat(drivePath);

          // Try to determine if it's removable by checking for specific files/folders
          // or by attempting to write a test file (if we can)
          let isRemovable = false;

          try {
            // Check if it's a USB drive by looking for typical USB characteristics
            // Many USB drives have a specific folder structure or allow writing
            const testFile = path.join(drivePath, 'usb_test.tmp');
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
            isRemovable = true; // If we can write/delete, it's likely removable
          } catch (error) {
            // If we can't write, check if it's not a system drive
            if (!['C:', 'D:'].includes(driveLetter + ':')) {
              // Try to read directory to see if it's accessible
              await fs.readdir(drivePath);
              isRemovable = true; // Assume it's removable if accessible and not C: or D:
            }
          }

          if (isRemovable) {
            drives.push({
              letter: driveLetter + ':',
              mountpoint: drivePath,
              description: 'Removable Drive'
            });
          }
        } catch (error) {
          // Drive doesn't exist or not accessible, skip
          continue;
        }
      }
    } else if (process.platform === 'darwin') {
      // macOS: Check /Volumes for removable drives
      try {
        const volumes = await fs.readdir('/Volumes');
        for (const volume of volumes) {
          const volumePath = `/Volumes/${volume}`;
          try {
            // Check if it's a removable drive (skip system volumes)
            const stat = await fs.stat(volumePath);
            if (stat.isDirectory() && !['Macintosh HD', 'System'].includes(volume)) {
              drives.push({
                letter: volume,
                mountpoint: volumePath,
                description: 'Removable Drive'
              });
            }
          } catch (error) {
            continue;
          }
        }
      } catch (error) {
        console.error('Error detecting macOS drives:', error);
      }
    } else {
      // Linux: Check /media and /mnt for removable drives
      const mountPaths = ['/media', '/mnt'];
      for (const mountPath of mountPaths) {
        try {
          const items = await fs.readdir(mountPath);
          for (const item of items) {
            const itemPath = `${mountPath}/${item}`;
            try {
              const stat = await fs.stat(itemPath);
              if (stat.isDirectory()) {
                drives.push({
                  letter: item,
                  mountpoint: itemPath,
                  description: 'Removable Drive'
                });
              }
            } catch (error) {
              continue;
            }
          }
        } catch (error) {
          // Mount path doesn't exist, continue
          continue;
        }
      }
    }

    return drives;
  } catch (error) {
    console.error('Error detecting removable drives:', error);
    return [];
  }
}

async function createBackupFolder(drivePath) {
  const backupFolder = path.join(drivePath, 'BILLING_BACKUP');
  try {
    await fs.mkdir(backupFolder, { recursive: true });
    return backupFolder;
  } catch (error) {
    console.error('Error creating backup folder:', error);
    throw error;
  }
}

async function performBackup() {
  try {
    // Get database path (works for both portable and installed modes)
    const dbPath = getDatabasePath();

    // Detect removable drives
    const drives = await detectRemovableDrives();

    if (drives.length === 0) {
      console.warn('No removable drives found for backup');
      return { success: false, message: 'No removable USB drive detected' };
    }

    // Use the first available drive
    const drive = drives[0];
    console.log(`Using drive: ${drive.mountpoint}`);

    // Create backup folder
    const backupFolder = await createBackupFolder(drive.mountpoint);

    // Generate timestamped filename
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, -5); // Remove milliseconds and Z
    const backupFilename = `backup_${timestamp}.db`;
    const backupPath = path.join(backupFolder, backupFilename);

    // Copy database file
    await fs.copyFile(dbPath, backupPath);
    console.log(`Database backed up to: ${backupPath}`);

    // Log audit event
    global.db.logAuditEvent('BACKUP_CREATED', backupFilename, `Backup created on drive ${drive.letter}`);

    // Clean up old backups (keep only last 10)
    await cleanupOldBackups(backupFolder);

    return {
      success: true,
      message: `Backup created: ${backupFilename}`,
      drive: drive.letter,
      path: backupPath
    };

  } catch (error) {
    console.error('Error performing backup:', error);
    return { success: false, message: `Backup failed: ${error.message}` };
  }
}

async function cleanupOldBackups(backupFolder) {
  try {
    // Get all backup files
    const files = await fs.readdir(backupFolder);
    const backupFiles = files
      .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupFolder, file),
        stats: null
      }));

    // Get file stats for sorting by modification time
    for (const file of backupFiles) {
      try {
        file.stats = await fs.stat(file.path);
      } catch (error) {
        console.error(`Error getting stats for ${file.path}:`, error);
      }
    }

    // Filter out files without stats and sort by modification time (newest first)
    const validFiles = backupFiles
      .filter(file => file.stats)
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

    // Keep only the last 10 backups
    if (validFiles.length > 10) {
      const filesToDelete = validFiles.slice(10);
      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
          console.log(`Deleted old backup: ${file.name}`);
        } catch (error) {
          console.error(`Error deleting ${file.path}:`, error);
        }
      }
    }

  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

async function getBackupStatus() {
  try {
    const drives = await detectRemovableDrives();
    const hasDrive = drives.length > 0;

    let lastBackup = null;
    let backupCount = 0;

    if (hasDrive) {
      const drive = drives[0];
      const backupFolder = path.join(drive.mountpoint, 'BILLING_BACKUP');

      try {
        const files = await fs.readdir(backupFolder);
        const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.db'));

        if (backupFiles.length > 0) {
          // Get the most recent backup
          let newestFile = null;
          let newestTime = 0;

          for (const file of backupFiles) {
            try {
              const filePath = path.join(backupFolder, file);
              const stats = await fs.stat(filePath);
              if (stats.mtime.getTime() > newestTime) {
                newestTime = stats.mtime.getTime();
                newestFile = file;
              }
            } catch (error) {
              continue;
            }
          }

          if (newestFile) {
            lastBackup = new Date(newestTime).toLocaleString();
            backupCount = backupFiles.length;
          }
        }
      } catch (error) {
        // Backup folder doesn't exist yet
      }
    }

    return {
      hasDrive,
      driveLetter: hasDrive ? drives[0].letter : null,
      lastBackup,
      backupCount
    };

  } catch (error) {
    console.error('Error getting backup status:', error);
    return {
      hasDrive: false,
      driveLetter: null,
      lastBackup: null,
      backupCount: 0
    };
  }
}

// Export Functions
async function exportInvoicesToPDF(dateRange) {
  try {
    const { startDate, endDate } = dateRange;

    // Get invoices with items
    const invoices = global.db.getInvoicesByCustomer(null); // Get all invoices first
    const filteredInvoices = invoices.filter(invoice =>
      invoice.date >= startDate && invoice.date <= endDate
    );

    if (filteredInvoices.length === 0) {
      throw new Error('No invoices found in the selected date range');
    }

    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Invoices to PDF',
      defaultPath: `invoices_${startDate}_to_${endDate}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (result.canceled) return { success: false, message: 'Export cancelled' };

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fsSync.createWriteStream(result.filePath);
    doc.pipe(writeStream);

    // Header
    doc.fontSize(20).text('Invoice Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalInvoices = filteredInvoices.length;
    const avgValue = totalRevenue / totalInvoices;

    doc.fontSize(14).text('Summary:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10)
      .text(`Total Invoices: ${totalInvoices}`)
      .text(`Total Revenue: $${totalRevenue.toFixed(2)}`)
      .text(`Average Invoice Value: $${avgValue.toFixed(2)}`);
    doc.moveDown();

    // Invoice details
    filteredInvoices.forEach((invoice, index) => {
      if (index > 0) doc.addPage();

      doc.fontSize(14).text(`Invoice: ${invoice.invoice_no}`, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10)
        .text(`Date: ${new Date(invoice.date).toLocaleDateString()}`)
        .text(`Customer: ${invoice.customer_name}`)
        .text(`Total: $${invoice.total.toFixed(2)}`);
      doc.moveDown();

      // Get invoice items
      const invoiceWithItems = global.db.getInvoiceWithItems(invoice.id);
      if (invoiceWithItems?.items) {
        doc.fontSize(10).text('Items:', { underline: true });
        doc.moveDown(0.5);

        invoiceWithItems.items.forEach(item => {
          doc.fontSize(9)
            .text(`${item.item_name} - Qty: ${item.qty} - Price: $${item.price.toFixed(2)} - Amount: $${item.amount.toFixed(2)}`);
        });
      }

      doc.moveDown(2);
    });

    // Footer
    doc.fontSize(8).text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });

    doc.end();

    return new Promise((resolve) => {
      writeStream.on('finish', () => {
        resolve({ success: true, message: `PDF exported to ${result.filePath}` });
      });
      writeStream.on('error', (error) => {
        resolve({ success: false, message: `Export failed: ${error.message}` });
      });
    });

  } catch (error) {
    console.error('Error exporting invoices to PDF:', error);
    return { success: false, message: `Export failed: ${error.message}` };
  }
}

async function exportReportsToExcel(dateRange) {
  try {
    const { startDate, endDate } = dateRange;

    // Get all data
    const salesAnalytics = global.db.getSalesAnalytics(startDate, endDate);
    const topCustomers = global.db.getTopCustomers(startDate, endDate);
    const repeatCustomers = global.db.getRepeatCustomers(startDate, endDate);
    const allInvoices = global.db.getInvoicesByCustomer(null).filter(inv =>
      inv.date >= startDate && inv.date <= endDate
    );

    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Reports to Excel',
      defaultPath: `reports_${startDate}_to_${endDate}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (result.canceled) return { success: false, message: 'Export cancelled' };

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Invoice Management System';
    workbook.created = new Date();

    // Sales Summary Sheet
    const summarySheet = workbook.addWorksheet('Sales Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 15 }
    ];

    summarySheet.addRow(['Report Period', `${startDate} to ${endDate}`]);
    summarySheet.addRow(['Total Invoices', salesAnalytics.total_invoices]);
    summarySheet.addRow(['Total Revenue', salesAnalytics.total_revenue]);
    summarySheet.addRow(['Average Bill Value', salesAnalytics.avg_bill_value]);
    summarySheet.addRow(['Highest Bill', salesAnalytics.highest_bill]);

    // Style header row
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Top Customers Sheet
    const customersSheet = workbook.addWorksheet('Top Customers');
    customersSheet.columns = [
      { header: 'Customer Name', key: 'name', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Invoice Count', key: 'invoice_count', width: 15 },
      { header: 'Total Spent', key: 'total_spent', width: 15 }
    ];

    topCustomers.forEach(customer => {
      customersSheet.addRow({
        name: customer.name,
        phone: customer.phone,
        invoice_count: customer.invoice_count,
        total_spent: customer.total_spent
      });
    });

    // Style header
    customersSheet.getRow(1).font = { bold: true };
    customersSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Invoices Sheet
    const invoicesSheet = workbook.addWorksheet('Invoices');
    invoicesSheet.columns = [
      { header: 'Invoice No', key: 'invoice_no', width: 15 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Customer', key: 'customer_name', width: 25 },
      { header: 'Total', key: 'total', width: 12 }
    ];

    allInvoices.forEach(invoice => {
      invoicesSheet.addRow({
        invoice_no: invoice.invoice_no,
        date: invoice.date,
        customer_name: invoice.customer_name,
        total: invoice.total
      });
    });

    // Style header
    invoicesSheet.getRow(1).font = { bold: true };
    invoicesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Save workbook
    await workbook.xlsx.writeFile(result.filePath);

    return { success: true, message: `Excel report exported to ${result.filePath}` };

  } catch (error) {
    console.error('Error exporting reports to Excel:', error);
    return { success: false, message: `Export failed: ${error.message}` };
  }
}

async function exportCustomerLedgerToCSV() {
  try {
    // Get all customers with their lifetime value
    const customers = global.db.getCustomerLifetimeValue();

    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Customer Ledger to CSV',
      defaultPath: `customer_ledger_${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });

    if (result.canceled) return { success: false, message: 'Export cancelled' };

    // Create CSV content
    const csvHeader = 'Customer Name,Phone,Total Invoices,Lifetime Value,Avg Order Value,First Purchase,Last Purchase,Customer Age (Days)\n';
    const csvRows = customers.map(customer =>
      `"${customer.name}","${customer.phone}",${customer.total_invoices},${customer.lifetime_value?.toFixed(2) || 0},${customer.avg_order_value?.toFixed(2) || 0},"${customer.first_purchase || ''}","${customer.last_purchase || ''}",${customer.customer_age_days || 0}`
    ).join('\n');

    const csvContent = csvHeader + csvRows;

    // Write to file
    await fs.writeFile(result.filePath, csvContent, 'utf8');

    return { success: true, message: `Customer ledger exported to ${result.filePath}` };

  } catch (error) {
    console.error('Error exporting customer ledger to CSV:', error);
    return { success: false, message: `Export failed: ${error.message}` };
  }
}

// Restore Functions
async function restoreFromBackup() {
  try {
    // Detect drives and find backups
    const drives = await detectRemovableDrives();

    if (drives.length === 0) {
      return { success: false, message: 'No removable drives found' };
    }

    const drive = drives[0];
    const backupFolder = path.join(drive.mountpoint, 'BILLING_BACKUP');

    // Check if backup folder exists
    try {
      await fs.access(backupFolder);
    } catch (error) {
      return { success: false, message: 'No backup folder found on USB drive' };
    }

    // Get list of backup files
    const files = await fs.readdir(backupFolder);
    const backupFiles = files
      .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
      .sort()
      .reverse(); // Most recent first

    if (backupFiles.length === 0) {
      return { success: false, message: 'No backup files found' };
    }

    // Use the most recent backup
    const latestBackup = backupFiles[0];
    const backupPath = path.join(backupFolder, latestBackup);

    // Get current database path (works for both portable and installed modes)
    const dbPath = getDatabasePath();

    // Create backup of current database before restore
    const currentBackupPath = `${dbPath}.backup_${Date.now()}`;
    try {
      await fs.copyFile(dbPath, currentBackupPath);
    } catch (error) {
      console.warn('Could not create backup of current database:', error);
    }

    // Close current database connection
    db.close();

    // Copy backup file to database location
    await fs.copyFile(backupPath, dbPath);

    return {
      success: true,
      message: `Database restored from ${latestBackup}. App will restart.`,
      backupUsed: latestBackup,
      currentBackup: currentBackupPath
    };

  } catch (error) {
    console.error('Error restoring from backup:', error);
    return { success: false, message: `Restore failed: ${error.message}` };
  }
}

// Database recovery functions
async function performDatabaseRecovery(originalDbPath) {
  try {
    console.log('Starting database recovery process...');

    // Define search paths for backups
    const searchPaths = [];

    // Add portable backup folder if in portable mode
    if (isPortableMode) {
      const appPath = app.getAppPath();
      const appDir = path.dirname(appPath);
      searchPaths.push(path.join(appDir, 'BILLING_BACKUP'));
    }

    // Add system backup folder
    const userDataPath = app.getPath('userData');
    searchPaths.push(path.join(userDataPath, 'BILLING_BACKUP'));

    // Try to find removable drives and their backup folders
    const drives = await detectRemovableDrives();
    for (const drive of drives) {
      searchPaths.push(path.join(drive.mountpoint, 'BILLING_BACKUP'));
    }

    // Find the latest valid backup
    const dbModule = require('./db');
    const tempDb = dbModule(originalDbPath, { skipIntegrityCheck: true });
    const latestBackup = tempDb.findLatestValidBackup(searchPaths);
    tempDb.close();

    if (!latestBackup) {
      return {
        success: false,
        message: 'No valid backups found'
      };
    }

    console.log(`Found valid backup: ${latestBackup.path}`);

    // Create backup of corrupted database before replacing
    const corruptedBackupPath = `${originalDbPath}.corrupted_${Date.now()}`;
    try {
      await fs.copyFile(originalDbPath, corruptedBackupPath);
      console.log(`Corrupted database backed up to: ${corruptedBackupPath}`);
    } catch (error) {
      console.warn('Could not backup corrupted database:', error);
    }

    // Restore from backup
    await fs.copyFile(latestBackup.path, originalDbPath);
    console.log(`Database restored from: ${latestBackup.path}`);

    // Log audit event (using tempDb since main db might be corrupted)
    tempDb.logAuditEvent('DATABASE_RESTORED', latestBackup.name, `Database restored from backup: ${latestBackup.name}`);

    return {
      success: true,
      message: `Database restored from backup: ${latestBackup.name}`,
      dbPath: originalDbPath,
      backupUsed: latestBackup.name,
      backupTime: latestBackup.time
    };

  } catch (error) {
    console.error('Error during database recovery:', error);
    return {
      success: false,
      message: `Recovery failed: ${error.message}`
    };
  }
}

// IPC handlers for backup operations
ipcMain.handle('perform-backup', async () => {
  try {
    return await performBackup();
  } catch (error) {
    console.error('Error performing backup:', error);
    return { success: false, message: `Backup failed: ${error.message}` };
  }
});

ipcMain.handle('get-backup-status', async () => {
  try {
    return await getBackupStatus();
  } catch (error) {
    console.error('Error getting backup status:', error);
    return {
      hasDrive: false,
      driveLetter: null,
      lastBackup: null,
      backupCount: 0,
    };
  }
});

ipcMain.handle('restore-backup', async () => {
  try {
    if (requireAdminPin()) {
      return { success: false, message: 'Admin PIN verification required' };
    }
    return await restoreFromBackup();
  } catch (error) {
    console.error('Error restoring backup:', error);
    return { success: false, message: `Restore failed: ${error.message}` };
  }
});

ipcMain.handle('get-revenue-by-date', async (event, dateRange) => {
  try {
    if (!global.db) return [];
    const { startDate, endDate } = dateRange || {};
    return global.db.getRevenueByDate(startDate, endDate);
  } catch (error) {
    console.error('Error getting revenue by date:', error);
    return [];
  }
});

ipcMain.handle('get-products-paginated', async (event, options = {}) => {
  try {
    if (!global.db) return { items: [], total: 0, page: 1, pageSize: 50 };
    return global.db.getProductsPaginated(options);
  } catch (error) {
    console.error('Error getting paginated products:', error);
    return { items: [], total: 0, page: 1, pageSize: 50 };
  }
});

// IPC handlers for analytics operations
ipcMain.handle('get-sales-analytics', async (event, dateRange) => {
  try {
    const { startDate, endDate } = dateRange;
    return global.db.getSalesAnalytics(startDate, endDate);
  } catch (error) {
    console.error('Error getting sales analytics:', error);
    throw error;
  }
});

ipcMain.handle('get-top-customers', async (event, dateRange) => {
  try {
    const { startDate, endDate } = dateRange;
    return global.db.getTopCustomers(startDate, endDate);
  } catch (error) {
    console.error('Error getting top customers:', error);
    throw error;
  }
});

ipcMain.handle('get-repeat-customers', async (event, dateRange) => {
  try {
    const { startDate, endDate } = dateRange;
    return global.db.getRepeatCustomers(startDate, endDate);
  } catch (error) {
    console.error('Error getting repeat customers:', error);
    throw error;
  }
});

ipcMain.handle('get-inactive-customers', async (event, dateRange) => {
  try {
    const { startDate, endDate } = dateRange;
    // For inactive customers, we check up to the end date for all historical data
    // and then see who wasn't active in the selected period
    return global.db.getInactiveCustomers(endDate, startDate, endDate);
  } catch (error) {
    console.error('Error getting inactive customers:', error);
    throw error;
  }
});

ipcMain.handle('get-customer-lifetime-value', async () => {
  try {
    return global.db.getCustomerLifetimeValue();
  } catch (error) {
    console.error('Error getting customer lifetime value:', error);
    throw error;
  }
});

// IPC handlers for export operations (protected)
ipcMain.handle('export-invoices-pdf', async (event, dateRange) => {
  if (requireAdminPin()) {
    return { success: false, message: 'Admin PIN verification required' };
  }

  try {
    return await exportInvoicesToPDF(dateRange);
  } catch (error) {
    console.error('Error in PDF export IPC handler:', error);
    return { success: false, message: `Export failed: ${error.message}` };
  }
});

ipcMain.handle('export-reports-excel', async (event, dateRange) => {
  if (requireAdminPin()) {
    return { success: false, message: 'Admin PIN verification required' };
  }

  try {
    return await exportReportsToExcel(dateRange);
  } catch (error) {
    console.error('Error in Excel export IPC handler:', error);
    return { success: false, message: `Export failed: ${error.message}` };
  }
});

ipcMain.handle('export-customer-ledger-csv', async () => {
  if (requireAdminPin()) {
    return { success: false, message: 'Admin PIN verification required' };
  }

  try {
    return await exportCustomerLedgerToCSV();
  } catch (error) {
    console.error('Error in CSV export IPC handler:', error);
    return { success: false, message: `Export failed: ${error.message}` };
  }
});

// IPC handler to check portable mode
ipcMain.handle('is-portable-mode', async () => {
  return isPortableMode;
});

// IPC handler to get database status
ipcMain.handle('get-database-status', async () => {
  return {
    initialized: global.dbStatus?.initialized || false,
    readOnly: global.dbStatus?.readOnly || false,
    recoveryMessage: global.dbStatus?.recoveryMessage || null,
    dbPath: global.dbStatus?.dbPath || null,
    portableMode: isPortableMode
  };
});

// PIN management IPC handlers
ipcMain.handle('set-admin-pin', async (event, pin) => {
  try {
    return setAdminPin(pin);
  } catch (error) {
    console.error('Error setting admin PIN:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('verify-admin-pin', async (event, pin) => {
  try {
    console.log('IPC: verify-admin-pin called with pin:', pin ? pin.length + ' digits' : 'undefined');
    const result = verifyAdminPin(pin);
    console.log('IPC: verify-admin-pin result:', result);
    return result;
  } catch (error) {
    console.error('Error verifying admin PIN:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('is-admin-pin-set', async () => {
  try {
    return global.db ? global.db.isAdminPinSet() : false;
  } catch (error) {
    console.error('Error checking admin PIN status:', error);
    return false;
  }
});

ipcMain.handle('is-admin-pin-verified', async () => {
  return isAdminPinVerified();
});

// IPC handlers for settings management
ipcMain.handle('get-all-settings', async () => {
  try {
    if (!global.db) return {};

    // Define default settings
    const defaultSettings = {
      shop_name: 'My Shop',
      shop_address: '123 Business St, City, State 12345',
      invoice_prefix: 'INV',
      printer_type: 'thermal', // 'thermal' or 'a4'
      backup_interval: 'daily', // 'manual', 'daily', 'weekly'
      currency_symbol: '₹',
      tax_rate: '0',
      invoice_footer: 'Thank you for your business!'
    };

    // Get actual settings from database
    const settings = {};
    for (const key of Object.keys(defaultSettings)) {
      const value = global.db.getSetting(key);
      settings[key] = value !== null ? value : defaultSettings[key];
    }

    return settings;
  } catch (error) {
    console.error('Error getting settings:', error);
    return {};
  }
});

ipcMain.handle('update-setting', async (event, { key, value }) => {
  if (requireAdminPin()) {
    return { success: false, message: 'Admin PIN verification required' };
  }

  try {
    if (!global.db) {
      return { success: false, message: 'Database not available' };
    }

    // Validate setting based on key
    const validation = validateSetting(key, value);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    global.db.setSetting(key, value);

    // Log audit event
    global.db.logAuditEvent('SETTING_CHANGED', key, `Setting '${key}' updated to: ${value}`);

    // Apply setting dynamically if possible
    applySettingDynamically(key, value);

    return { success: true, message: 'Setting updated successfully' };
  } catch (error) {
    console.error('Error updating setting:', error);
    return { success: false, message: `Error updating setting: ${error.message}` };
  }
});

ipcMain.handle('reset-settings', async () => {
  if (requireAdminPin()) {
    return { success: false, message: 'Admin PIN verification required' };
  }

  try {
    if (!global.db) {
      return { success: false, message: 'Database not available' };
    }

    // Reset to defaults (delete all settings except admin_pin)
    const defaultSettings = {
      shop_name: 'My Shop',
      shop_address: '123 Business St, City, State 12345',
      invoice_prefix: 'INV',
      printer_type: 'thermal',
      backup_interval: 'daily',
      currency_symbol: '₹',
      tax_rate: '0',
      invoice_footer: 'Thank you for your business!'
    };

    // Get all current settings
    const allSettingsKeys = [
      'shop_name', 'shop_address', 'invoice_prefix', 'printer_type',
      'backup_interval', 'currency_symbol', 'tax_rate', 'invoice_footer'
    ];

    for (const key of allSettingsKeys) {
      const defaultValue = defaultSettings[key];
      global.db.setSetting(key, defaultValue);
    }

    // Log audit event
    global.db.logAuditEvent('SETTINGS_RESET', null, 'All settings reset to defaults');

    return { success: true, message: 'Settings reset to defaults' };
  } catch (error) {
    console.error('Error resetting settings:', error);
    return { success: false, message: `Error resetting settings: ${error.message}` };
  }
});

// Helper function to get product images directory
function getProductImagesDir() {
  let imagesDir;

  if (isPortableMode) {
    // In portable mode, store images in app directory
    const appPath = app.getAppPath();
    const appDir = path.dirname(appPath);
    imagesDir = path.join(appDir, 'data', 'product_images');
  } else {
    // In installed mode, use user data directory
    const userDataPath = app.getPath('userData');
    imagesDir = path.join(userDataPath, 'product_images');
  }

  // Create directory if it doesn't exist
  if (!fsSync.existsSync(imagesDir)) {
    fsSync.mkdirSync(imagesDir, { recursive: true });
  }

  return imagesDir;
}

// IPC handler to save product image
ipcMain.handle('save-product-image', async (event, { imageData, fileName }) => {
  try {
    const imagesDir = getProductImagesDir();
    const uniqueFileName = `${Date.now()}-${fileName}`;
    const imagePath = path.join(imagesDir, uniqueFileName);

    // imageData is base64 encoded, extract the actual data
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    fsSync.writeFileSync(imagePath, buffer);

    console.log('Product image saved to:', imagePath);

    // Return just the filename for portability - the get-product-image handler
    // will resolve the full path at runtime based on the current mode
    // We also return the full path for backwards compatibility
    return { success: true, imagePath: imagePath, fileName: uniqueFileName };
  } catch (error) {
    console.error('Error saving product image:', error);
    return { success: false, message: error.message };
  }
});

// IPC handler to get product image as base64 data URL
ipcMain.handle('get-product-image', async (event, imagePath) => {
  try {
    if (!imagePath) {
      return { success: false, message: 'No image path provided' };
    }

    let resolvedPath = imagePath;

    // Try to find the image in multiple locations
    if (!fsSync.existsSync(imagePath)) {
      // Get the filename from the original path
      const fileName = path.basename(imagePath);

      // Try different possible locations
      const possibleLocations = [
        // Current product images directory (respects portable mode)
        path.join(getProductImagesDir(), fileName),
        // Portable mode: data folder in app directory
        path.join(path.dirname(app.getAppPath()), 'data', 'product_images', fileName),
        // Installed mode: userData folder
        path.join(app.getPath('userData'), 'product_images', fileName),
      ];

      // Find the first location that exists
      for (const loc of possibleLocations) {
        if (fsSync.existsSync(loc)) {
          resolvedPath = loc;
          console.log(`Image found at alternate location: ${loc}`);
          break;
        }
      }

      // If still not found, return error
      if (!fsSync.existsSync(resolvedPath)) {
        console.log(`Image not found in any location. Original path: ${imagePath}`);
        console.log(`Tried locations:`, possibleLocations);
        return { success: false, message: 'Image not found' };
      }
    }

    const imageBuffer = fsSync.readFileSync(resolvedPath);
    const base64 = imageBuffer.toString('base64');

    // Detect image type from extension
    const ext = path.extname(resolvedPath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';

    const dataUrl = `data:${mimeType};base64,${base64}`;
    return { success: true, dataUrl };
  } catch (error) {
    console.error('Error reading product image:', error);
    return { success: false, message: error.message };
  }
});

// IPC handlers for products management
ipcMain.handle('add-product', async (event, productData) => {
  try {
    if (!global.db) {
      return { success: false, message: 'Database not available' };
    }

    const product = global.db.addProduct(productData);
    global.db.logAuditEvent('PRODUCT_ADDED', product.id, `Product "${product.name}" (SKU ${product.sku}) added`);
    return { success: true, message: 'Product added successfully', product };
  } catch (error) {
    console.error('Error adding product:', error);
    return { success: false, message: `Error adding product: ${error.message}` };
  }
});

ipcMain.handle('get-products', async () => {
  try {
    if (!global.db) return [];
    return global.db.getAllProducts();
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
});

ipcMain.handle('search-products', async (event, query, limit = 50) => {
  try {
    if (!global.db) return [];
    return global.db.searchProducts(query, limit);
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
});

ipcMain.handle('update-product', async (event, { id, productData }) => {
  try {
    if (!global.db) {
      return { success: false, message: 'Database not available' };
    }

    const success = global.db.updateProduct(id, productData);
    if (success) {
      const product = global.db.getProductById(id);
      global.db.logAuditEvent('PRODUCT_UPDATED', id, `Product updated: ${productData.name || id}`);
      return { success: true, message: 'Product updated successfully', product };
    }
    return { success: false, message: 'Product not found or update failed' };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, message: `Error updating product: ${error.message}` };
  }
});

ipcMain.handle('delete-product', async (event, id) => {
  try {
    if (!global.db) {
      return { success: false, message: 'Database not available' };
    }

    const success = global.db.deleteProduct(id);
    if (success) {
      global.db.logAuditEvent('PRODUCT_DELETED', id, 'Product deleted');
      return { success: true, message: 'Product deleted successfully' };
    }
    return { success: false, message: 'Product not found or delete failed' };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, message: `Error deleting product: ${error.message}` };
  }
});

ipcMain.handle('get-product-by-id', async (event, id) => {
  try {
    if (!global.db) return null;
    return global.db.getProductById(id);
  } catch (error) {
    console.error('Error getting product by ID:', error);
    return null;
  }
});

ipcMain.handle('get-product-by-sku', async (event, sku) => {
  try {
    if (!global.db) return null;
    return global.db.getProductBySku(sku);
  } catch (error) {
    console.error('Error getting product by SKU:', error);
    return null;
  }
});

ipcMain.handle('get-product-by-barcode', async (event, payload) => {
  try {
    if (!global.db) return null;
    return global.db.getProductByBarcode(payload);
  } catch (error) {
    console.error('Error getting product by barcode:', error);
    return null;
  }
});

ipcMain.handle('get-product-categories', async () => {
  try {
    if (!global.db) return [];
    return global.db.getAllCategories();
  } catch (error) {
    console.error('Error getting product categories:', error);
    return [];
  }
});

ipcMain.handle('add-product-category', async (event, name) => {
  try {
    if (!global.db) {
      return { success: false, message: 'Database not available' };
    }
    const category = global.db.addCategory(name);
    return { success: true, message: 'Category added', category };
  } catch (error) {
    console.error('Error adding category:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('delete-product-category', async (event, id) => {
  try {
    if (!global.db) {
      return { success: false, message: 'Database not available' };
    }
    const success = global.db.deleteCategory(id);
    return success
      ? { success: true, message: 'Category deleted' }
      : { success: false, message: 'Category not found' };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, message: error.message };
  }
});

// Inventory management
ipcMain.handle('adjust-inventory', async (event, data) => {
  try {
    if (!global.db) {
      return { success: false, message: 'Database not available' };
    }
    const product = global.db.adjustInventory(
      data.productId,
      data.qtyChange,
      data.type || 'adjust',
      data.note || ''
    );
    global.db.logAuditEvent(
      'INVENTORY_ADJUST',
      data.productId,
      `${data.type || 'adjust'} ${data.qtyChange} — ${data.note || ''}`
    );
    return { success: true, message: 'Stock updated', product };
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-inventory-summary', async () => {
  try {
    if (!global.db) {
      return {
        total_products: 0,
        total_units: 0,
        stock_value: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
      };
    }
    return global.db.getInventorySummary();
  } catch (error) {
    console.error('Error getting inventory summary:', error);
    throw error;
  }
});

ipcMain.handle('get-low-stock-products', async () => {
  try {
    if (!global.db) return [];
    return global.db.getLowStockProducts();
  } catch (error) {
    console.error('Error getting low stock products:', error);
    return [];
  }
});

ipcMain.handle('get-inventory-movements', async (event, options = {}) => {
  try {
    if (!global.db) return [];
    return global.db.getInventoryMovements(options.limit || 50, options.productId || null);
  } catch (error) {
    console.error('Error getting inventory movements:', error);
    return [];
  }
});

// IPC handlers for connections (printers and USB drives)
ipcMain.handle('scan-printers', async () => {
  console.log('🔍 [MAIN] Starting simplified printer scan...');
  const printers = [];

  try {
    // Method 1: Electron's built-in printer detection (most reliable)
    console.log('📋 Method 1: Electron getPrinters()');
    if (mainWindow && mainWindow.webContents) {
      try {
        const systemPrinters = mainWindow.webContents.getPrinters();
        console.log(`📋 Electron found ${systemPrinters.length} raw printers`);

        systemPrinters.forEach((printer) => {
          const isThermal = (printer.description?.toLowerCase().includes('thermal') ||
                    printer.name?.toLowerCase().includes('thermal') ||
                    printer.name?.toLowerCase().includes('58mm') ||
                    printer.name?.toLowerCase().includes('80mm') ||
                    printer.name?.toLowerCase().includes('pos') ||
                    printer.name?.toLowerCase().includes('receipt'));

          printers.push({
            id: printer.name,
            name: printer.displayName || printer.name,
            type: isThermal ? 'thermal' : 'a4',
            status: printer.status === 0 ? 'available' :
                    printer.status === 1 ? 'available' :
                    printer.status === 2 ? 'busy' :
                    printer.status === 3 ? 'offline' : 'available',
            ip: printer.options?.['printer-address'] || null,
            port: null,
            isDefault: printer.isDefault || false,
            source: 'electron'
          });
          console.log(`📋 Added Electron printer: ${printer.name}`);
        });
      } catch (electronErr) {
        console.warn('📋 Electron getPrinters failed:', electronErr.message);
      }
    }

    // Method 2: Simple PowerShell approach (most reliable for Windows)
    console.log('⚡ Method 2: PowerShell Get-Printer (simplified)');
    if (process.platform === 'win32' && printers.length === 0) {
      try {
        // Simple command that should work
        const { stdout } = await execAsync('"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -Command "Get-Printer | Where-Object { $_.Name -notlike \'*fax*\' -and $_.Name -notlike \'*OneNote*\' } | Select-Object Name,PortName | Format-Table -HideTableHeaders"', { timeout: 10000 });

        console.log('⚡ PowerShell raw output:', stdout);

        if (stdout && stdout.trim()) {
          // Parse the simple table format
          const lines = stdout.split('\n').filter(line => line.trim());
          lines.forEach(line => {
            const parts = line.trim().split(/\s{2,}/); // Split on multiple spaces
            if (parts.length >= 1 && parts[0]) {
              const name = parts[0].trim();
              const port = parts[1]?.trim() || '';

              // Skip if already found by Electron
              const exists = printers.some(p => p.name === name);
              if (!exists) {
                const isWSD = port.toLowerCase().includes('wsd');
                printers.push({
                  id: name,
                  name: isWSD ? `${name} (WiFi Direct)` : name,
                  type: name.toLowerCase().includes('thermal') ? 'thermal' : 'a4',
                  status: 'available',
                  ip: null,
                  port: port,
                  isDefault: false,
                  source: 'powershell'
                });
                console.log(`⚡ Added PowerShell printer: ${name} (Port: ${port})`);
              }
            }
          });
        }
      } catch (psError) {
        console.warn('⚡ PowerShell method failed:', psError.message);
      }
    }

    // Method 3: Always add essential fallback printers
    console.log('🔄 Method 3: Adding essential fallback printers');

    const essentialPrinters = [
      { id: 'microsoft-print-to-pdf', name: 'Microsoft Print to PDF', type: 'a4', status: 'available' },
      { id: 'microsoft-xps-document-writer', name: 'Microsoft XPS Document Writer', type: 'a4', status: 'available' },
      { id: 'default-printer', name: 'Default Printer', type: 'a4', status: 'available' },
      { id: 'thermal-printer-58mm', name: 'Thermal Printer (58mm)', type: 'thermal', status: 'available' },
      { id: 'thermal-printer-80mm', name: 'Thermal Printer (80mm)', type: 'thermal', status: 'available' }
    ];

    essentialPrinters.forEach(essential => {
      const exists = printers.some(p => p.name === essential.name);
      if (!exists) {
        printers.push({
          id: essential.id,
          name: essential.name,
          type: essential.type,
          status: essential.status,
          ip: null,
          port: null,
          isDefault: false,
          source: 'fallback'
        });
        console.log(`🔄 Added fallback printer: ${essential.name}`);
      }
    });

    console.log(`✅ Final result: ${printers.length} printers found`);
    printers.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.type}) - ${p.source}`);
    });

    return printers;

  } catch (error) {
    console.error('❌ Critical error in printer scanning:', error);
    // Ultimate fallback
    return [
      { id: 'microsoft-print-to-pdf', name: 'Microsoft Print to PDF', type: 'a4', status: 'available', ip: null, port: null, source: 'error-fallback' },
      { id: 'default-printer', name: 'Default Printer', type: 'a4', status: 'available', ip: null, port: null, source: 'error-fallback' }
    ];
  }
});

ipcMain.handle('test-printer-connection', async (event, printerId) => {
  try {
    // Mock printer connection test
    // In production, you'd actually test the printer connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, message: 'Printer connection successful' };
  } catch (error) {
    console.error('Error testing printer connection:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('test-print', async (event) => {
  try {
    console.log('🧪 Starting test print...');

    // Create a temporary hidden window for printing
    const workerWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Load a simple test page
    const testContent = `
      <html>
        <body style="font-family: monospace; padding: 20px;">
          <h1>Test Print</h1>
          <p>This is a test print from the Invoice Generator application.</p>
          <hr/>
          <p>Date: ${new Date().toLocaleString()}</p>
          <p>Printer connection successful.</p>
          <hr/>
          <p style="font-size: 10px;">End of test.</p>
        </body>
      </html>
    `;

    await workerWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(testContent));

    // Get printer settings
    const selectedPrinterId = global.db ? global.db.getSetting('selected_printer') : '';
    console.log('🖨️ Test print using printer:', selectedPrinterId || 'System Default');

    // Print
    // Note: print() in Electron provides a callback
    await new Promise((resolve, reject) => {
      workerWindow.webContents.print({
        silent: !!selectedPrinterId, // direct print if printer selected
        deviceName: selectedPrinterId || undefined,
        printBackground: false,
        margins: { marginType: 'default' }
      }, (success, errorType) => {
        if (!success) {
          console.error('Test print failed:', errorType);
          reject(new Error(errorType));
        } else {
          console.log('Test print command sent successfully');
          resolve(true);
        }
      });
    });

    // Close window after a delay
    setTimeout(() => {
      if (!workerWindow.isDestroyed()) workerWindow.close();
    }, 1000);

    return { success: true, message: 'Test print sent to printer' };
  } catch (error) {
    console.error('Test print error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('scan-usb-drives', async () => {
  console.log('Scanning for USB drives...');
  const drives = [];

  try {
    // Method 1: PowerShell for Windows
    if (process.platform === 'win32') {
      try {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        console.log('Using PowerShell for USB drive detection...');
        const { stdout } = await execAsync('powershell -Command "Get-Volume | Where-Object { $_.DriveType -eq \'Removable\' -and $_.DriveLetter } | Select-Object DriveLetter, FileSystemLabel, Size, SizeRemaining | ConvertTo-Json"', { timeout: 5000 });

        if (stdout && stdout.trim()) {
          const volumes = JSON.parse(stdout);
          const volumeArray = Array.isArray(volumes) ? volumes : [volumes];

          volumeArray.forEach(volume => {
            if (volume.DriveLetter) {
              const totalSize = volume.Size ? Math.round(volume.Size / (1024 * 1024 * 1024)) + 'GB' : 'Unknown';
              const available = volume.SizeRemaining ? Math.round(volume.SizeRemaining / (1024 * 1024 * 1024)) + 'GB' : 'Unknown';

                drives.push({
                id: `usb-${volume.DriveLetter}`,
                name: volume.FileSystemLabel || `USB Drive (${volume.DriveLetter}:)`,
                mountPoint: `${volume.DriveLetter}:`,
                size: totalSize,
                available: available,
                  status: 'mounted'
                });
            }
          });
        }
      } catch (psError) {
        console.warn('PowerShell USB detection failed:', psError.message);
      }
    }

    // Method 2: macOS detection
    else if (process.platform === 'darwin') {
      try {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        console.log('Using macOS diskutil for USB drive detection...');
        const { stdout } = await execAsync('diskutil list | grep external | head -10', { timeout: 5000 });

        if (stdout) {
          const lines = stdout.split('\n').filter(line => line.trim());
          for (const line of lines) {
            // Parse diskutil output for external drives
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              const diskId = parts[0];
              try {
                // Get mount point
                const { stdout: infoStdout } = await execAsync(`diskutil info ${diskId}`, { timeout: 3000 });
                const mountMatch = infoStdout.match(/Mount Point:\s*(.+)/);
                const sizeMatch = infoStdout.match(/Total Size:\s*([\d.]+)\s*GB/);

                if (mountMatch) {
                  const mountPoint = mountMatch[1].trim();
                  const size = sizeMatch ? sizeMatch[1] + 'GB' : 'Unknown';

            drives.push({
                    id: `usb-${diskId}`,
                    name: `USB Drive (${diskId})`,
                    mountPoint: mountPoint,
              size: size,
                    available: 'Unknown',
              status: 'mounted'
            });
          }
              } catch (infoError) {
                console.warn(`Failed to get info for disk ${diskId}:`, infoError.message);
              }
            }
          }
        }
      } catch (macError) {
        console.warn('macOS USB detection failed:', macError.message);
      }
    }

    // Method 3: Linux detection
    else if (process.platform === 'linux') {
      try {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        console.log('Using Linux lsblk for USB drive detection...');
        const { stdout } = await execAsync('lsblk -o NAME,MOUNTPOINT,SIZE,FSTYPE,RM,LABEL -J', { timeout: 5000 });

        if (stdout) {
          const data = JSON.parse(stdout);
          data.blockdevices.forEach(device => {
            if (device.rm === '1' && device.mountpoint) { // Removable and mounted
                  drives.push({
                id: `usb-${device.name}`,
                name: device.label || device.name || 'USB Drive',
                mountPoint: device.mountpoint,
                size: device.size || 'Unknown',
                    available: 'Unknown',
                    status: 'mounted'
                  });
            }
          });
        }
      } catch (linuxError) {
        console.warn('Linux USB detection failed:', linuxError.message);
      }
    }

    // Fallback: Add some mock USB drives for testing if none found
    if (drives.length === 0) {
      console.log('No USB drives detected, this is normal if no USB drives are connected');
      // Don't add fallback drives - just log that none were found
    }

  } catch (error) {
    console.error('Error scanning USB drives:', error);
  }

  console.log(`Found ${drives.length} USB drives:`, drives);
  return drives;
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

    if (!global.db) {
      return [];
    }

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

    if (!global.db) {
      return { invoices: [], total: 0 };
    }

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

    if (!global.db) {
      return { invoices: [], total: 0 };
    }

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

    if (!global.db) {
      return null;
    }

    // Use runHeavyQuery to prevent UI blocking during analytics computation
    const analyticsData = await runHeavyQuery(async () => {
      // Use optimized queries for better performance
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
    if (!global.db) {
      return { success: false, message: 'Database not available' };
    }

    const deleted = global.db.deleteInvoice(invoiceId);

    if (deleted) {
      // Log audit event
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
