/**
 * Verify that the built application has all required dependencies
 * and can run without errors
 */

const fs = require('fs');
const path = require('path');

const appOutDir = process.argv[2] || path.join(__dirname, '..', 'distoctf2', 'win-unpacked');
const appPath = path.join(appOutDir, 'resources', 'app');

console.log('Verifying build integrity...\n');
console.log('App directory:', appPath);

const errors = [];
const warnings = [];

// Check critical modules
const criticalModules = [
  'better-sqlite3',
  'pdfkit',
  'exceljs',
  '@swc/helpers',
  'lru-cache',
  'fontkit',
  'path-scurry'
];

console.log('\n✓ Checking critical modules:');
for (const module of criticalModules) {
  const modulePath = path.join(appPath, 'node_modules', module);
  if (fs.existsSync(modulePath)) {
    console.log(`  ✓ ${module}`);
  } else {
    // Check nested locations
    const nestedPath = path.join(appPath, 'node_modules', 'fontkit', 'node_modules', module);
    if (fs.existsSync(nestedPath)) {
      console.log(`  ✓ ${module} (nested)`);
    } else {
      errors.push(`Missing critical module: ${module}`);
      console.log(`  ✗ ${module} - MISSING`);
    }
  }
}

// Check @swc/helpers specifically (for fontkit)
const swcHelpersPath = path.join(appPath, 'node_modules', '@swc', 'helpers');
const swcHelpersNested = path.join(appPath, 'node_modules', 'fontkit', 'node_modules', '@swc', 'helpers');
if (!fs.existsSync(swcHelpersPath) && !fs.existsSync(swcHelpersNested)) {
  errors.push('Missing @swc/helpers module (required by fontkit)');
  console.log('  ✗ @swc/helpers - MISSING');
}

// Check lru-cache (required by path-scurry)
const lruCachePath = path.join(appPath, 'node_modules', 'lru-cache');
if (!fs.existsSync(lruCachePath)) {
  errors.push('Missing lru-cache module (required by path-scurry)');
  console.log('  ✗ lru-cache - MISSING');
}

// Verify electron main.js has the fixes
console.log('\n✓ Checking module resolution fixes:');
const mainJsPath = path.join(appPath, 'electron', 'main.js');
if (fs.existsSync(mainJsPath)) {
  const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

  if (mainJsContent.includes('@swc/helpers') && mainJsContent.includes('applyDecoratedDescriptor')) {
    console.log('  ✓ @swc/helpers fix present');
  } else {
    warnings.push('@swc/helpers fix may be missing in main.js');
    console.log('  ⚠ @swc/helpers fix - NOT FOUND');
  }

  if (mainJsContent.includes('lru-cache') && mainJsContent.includes('LRUCache')) {
    console.log('  ✓ lru-cache fix present');
  } else {
    warnings.push('lru-cache fix may be missing in main.js');
    console.log('  ⚠ lru-cache fix - NOT FOUND');
  }
} else {
  errors.push('electron/main.js not found');
  console.log('  ✗ electron/main.js - MISSING');
}

// Check better-sqlite3 native binary
console.log('\n✓ Checking native binaries:');
const betterSqlite3Path = path.join(appPath, 'node_modules', 'better-sqlite3');
if (fs.existsSync(betterSqlite3Path)) {
  const nodeFile = path.join(betterSqlite3Path, 'build', 'Release', 'better_sqlite3.node');
  if (fs.existsSync(nodeFile)) {
    console.log('  ✓ better-sqlite3 native binary found');
  } else {
    // Try to find it elsewhere
    function findNodeFile(dir) {
      try {
        const files = fs.readdirSync(dir, { recursive: true });
        for (const file of files) {
          if (file.endsWith('.node')) {
            return path.join(dir, file);
          }
        }
      } catch (e) {
        // Ignore
      }
      return null;
    }

    const found = findNodeFile(betterSqlite3Path);
    if (found) {
      console.log(`  ✓ better-sqlite3 native binary found at: ${found}`);
    } else {
      errors.push('better-sqlite3 native binary not found');
      console.log('  ✗ better-sqlite3 native binary - MISSING');
    }
  }
} else {
  errors.push('better-sqlite3 module not found');
  console.log('  ✗ better-sqlite3 module - MISSING');
}

// Check executable
console.log('\n✓ Checking executable:');
const exePath = path.join(appOutDir, 'AMGOLD.exe');
if (fs.existsSync(exePath)) {
  console.log('  ✓ AMGOLD.exe found');
} else {
  errors.push('AMGOLD.exe not found');
  console.log('  ✗ AMGOLD.exe - MISSING');
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors.length === 0 && warnings.length === 0) {
  console.log('✓ Build verification PASSED - Ready for distribution!');
  process.exit(0);
} else {
  if (warnings.length > 0) {
    console.log('\n⚠ Warnings:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }
  if (errors.length > 0) {
    console.log('\n✗ Errors:');
    errors.forEach(e => console.log(`  - ${e}`));
    console.log('\n❌ Build verification FAILED - Fix errors before distribution!');
    process.exit(1);
  } else {
    console.log('\n⚠ Build has warnings but should work');
    process.exit(0);
  }
}
