const fs = require('fs');
const path = require('path');

/**
 * After-pack hook for electron-builder
 * This script runs after electron-builder packs the app but before creating the installer
 */
module.exports = async function(context) {
  console.log('Running after-pack script...');

  const { appOutDir, packager } = context;
  const platform = packager.platform.name;
  const arch = packager.arch;

  console.log(`Platform: ${platform}, Architecture: ${arch}`);
  console.log(`Output directory: ${appOutDir}`);

  try {
    // Verify better-sqlite3 is included - check multiple possible locations
    const possiblePaths = [
      path.join(appOutDir, 'resources', 'app', 'node_modules', 'better-sqlite3'),
      path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3'),
      path.join(appOutDir, 'node_modules', 'better-sqlite3')
    ];

    let betterSqlite3Path = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        betterSqlite3Path = possiblePath;
        break;
      }
    }

    if (!betterSqlite3Path) {
      console.error('ERROR: better-sqlite3 module not found in build!');
      console.error('Checked paths:', possiblePaths);
      throw new Error('better-sqlite3 module missing from build');
    }
    console.log('✓ Verified better-sqlite3 module is included at:', betterSqlite3Path);

    // Check for native binary in multiple possible locations
    const nativeBinaryPaths = [
      path.join(betterSqlite3Path, 'build', 'Release', 'better_sqlite3.node'),
      path.join(betterSqlite3Path, 'build', 'better_sqlite3.node'),
      path.join(betterSqlite3Path, 'lib', 'binding', 'node-v' + process.versions.modules + '-win32-x64', 'better_sqlite3.node'),
      path.join(betterSqlite3Path, 'better_sqlite3.node')
    ];

    let nativeBinaryFound = false;
    for (const nativePath of nativeBinaryPaths) {
      if (fs.existsSync(nativePath)) {
        console.log('✓ Found better-sqlite3 native binary at:', nativePath);
        nativeBinaryFound = true;
        break;
      }
    }

    if (!nativeBinaryFound) {
      // Try to find any .node file in better-sqlite3 directory
      function findNodeFile(dir) {
        try {
          const files = fs.readdirSync(dir, { recursive: true });
          for (const file of files) {
            if (file.endsWith('.node')) {
              return path.join(dir, file);
            }
          }
        } catch (e) {
          // Ignore errors
        }
        return null;
      }

      const foundNode = findNodeFile(betterSqlite3Path);
      if (foundNode) {
        console.log('✓ Found better-sqlite3 native binary at:', foundNode);
        nativeBinaryFound = true;
      }
    }

    if (!nativeBinaryFound) {
      console.warn('WARNING: better-sqlite3 native binary not found, but module exists. This may cause runtime errors.');
      console.warn('The build will continue, but the app may fail to start.');
    }

    // Verify pdfkit is included
    const pdfkitPaths = [
      path.join(appOutDir, 'resources', 'app', 'node_modules', 'pdfkit'),
      path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'pdfkit'),
      path.join(appOutDir, 'node_modules', 'pdfkit')
    ];

    let pdfkitPath = null;
    for (const possiblePath of pdfkitPaths) {
      if (fs.existsSync(possiblePath)) {
        pdfkitPath = possiblePath;
        break;
      }
    }

    if (!pdfkitPath) {
      console.error('ERROR: pdfkit module not found in build!');
      throw new Error('pdfkit module missing from build');
    }
    console.log('✓ Verified pdfkit module is included at:', pdfkitPath);

    // Verify exceljs is included
    const exceljsPaths = [
      path.join(appOutDir, 'resources', 'app', 'node_modules', 'exceljs'),
      path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'exceljs'),
      path.join(appOutDir, 'node_modules', 'exceljs')
    ];

    let exceljsPath = null;
    for (const possiblePath of exceljsPaths) {
      if (fs.existsSync(possiblePath)) {
        exceljsPath = possiblePath;
        break;
      }
    }

    if (!exceljsPath) {
      console.error('ERROR: exceljs module not found in build!');
      throw new Error('exceljs module missing from build');
    }
    console.log('✓ Verified exceljs module is included at:', exceljsPath);

    // Verify @swc/helpers (required by fontkit)
    console.log('\n✓ Verifying @swc/helpers module:');
    const swcHelpersPaths = [
      path.join(appOutDir, 'resources', 'app', 'node_modules', '@swc', 'helpers'),
      path.join(appOutDir, 'resources', 'app', 'node_modules', 'fontkit', 'node_modules', '@swc', 'helpers')
    ];

    let swcHelpersFound = false;
    for (const swcPath of swcHelpersPaths) {
      if (fs.existsSync(swcPath)) {
        console.log('✓ @swc/helpers found at:', swcPath);
        swcHelpersFound = true;
        break;
      }
    }

    if (!swcHelpersFound) {
      console.error('ERROR: @swc/helpers module not found! This will cause fontkit errors.');
      throw new Error('@swc/helpers module missing from build');
    }

    // Verify lru-cache (required by path-scurry)
    console.log('\n✓ Verifying lru-cache module:');
    const lruCachePath = path.join(appOutDir, 'resources', 'app', 'node_modules', 'lru-cache');
    if (fs.existsSync(lruCachePath)) {
      console.log('✓ lru-cache found');
    } else {
      console.error('ERROR: lru-cache module not found! This will cause path-scurry errors.');
      throw new Error('lru-cache module missing from build');
    }

    // Verify fontkit (required by pdfkit)
    console.log('\n✓ Verifying fontkit module:');
    const fontkitPaths = [
      path.join(appOutDir, 'resources', 'app', 'node_modules', 'fontkit'),
      path.join(appOutDir, 'resources', 'app', 'node_modules', 'pdfkit', 'node_modules', 'fontkit')
    ];

    let fontkitFound = false;
    for (const fontkitPath of fontkitPaths) {
      if (fs.existsSync(fontkitPath)) {
        console.log('✓ fontkit found at:', fontkitPath);
        fontkitFound = true;
        break;
      }
    }

    if (!fontkitFound) {
      console.error('ERROR: fontkit module not found! This will cause pdfkit errors.');
      throw new Error('fontkit module missing from build');
    }

    // Verify module resolution fixes are in main.js
    console.log('\n✓ Verifying module resolution fixes in main.js:');
    const mainJsPath = path.join(appOutDir, 'resources', 'app', 'electron', 'main.js');
    if (fs.existsSync(mainJsPath)) {
      const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

      if (mainJsContent.includes('@swc/helpers') && mainJsContent.includes('applyDecoratedDescriptor')) {
        console.log('✓ @swc/helpers fix present in main.js');
      } else {
        console.error('ERROR: @swc/helpers fix missing in main.js!');
        throw new Error('Module resolution fix for @swc/helpers missing');
      }

      if (mainJsContent.includes('lru-cache') && mainJsContent.includes('LRUCache')) {
        console.log('✓ lru-cache fix present in main.js');
      } else {
        console.error('ERROR: lru-cache fix missing in main.js!');
        throw new Error('Module resolution fix for lru-cache missing');
      }
    } else {
      console.error('ERROR: electron/main.js not found!');
      throw new Error('main.js missing from build');
    }

    // Ensure data directory exists
    const dataDir = path.join(appOutDir, 'resources', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('Created data directory');
    }

    // Copy default database file
    const sourceDb = path.join(process.cwd(), 'data', 'customers.db');
    const targetDb = path.join(dataDir, 'customers.db');

    if (fs.existsSync(sourceDb)) {
      fs.copyFileSync(sourceDb, targetDb);
      console.log('Copied default database to app resources');
    } else {
      console.log('Warning: Default database not found, creating empty data directory');
    }

    // For Windows, create a batch file to run the app
    if (platform === 'win32') {
      const batchFile = path.join(appOutDir, 'AMGOLD.bat');
      const batchContent = `"${path.join(appOutDir, 'AMGOLD.exe')}"`;
      fs.writeFileSync(batchFile, batchContent);
      console.log('Created Windows batch file');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ After-pack script completed successfully');
    console.log('✓ All critical modules verified');
    console.log('✓ Module resolution fixes confirmed');
    console.log('✓ Build is ready for distribution!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('✗ Error in after-pack script:', error.message);
    console.error('✗ Build verification FAILED');
    console.error('='.repeat(60));
    throw error;
  }
};
