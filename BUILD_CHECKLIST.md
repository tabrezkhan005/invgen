# Build Checklist - Production Ready Distribution

## Pre-Build Steps

1. **Clean previous builds:**
   ```bash
   npm run clean
   ```

2. **Verify all dependencies are installed:**
   ```bash
   npm install
   ```

3. **Rebuild native modules:**
   ```bash
   npm run rebuild-native
   ```

## Build Process

Run the complete build:
```bash
npm run dist:win
```

This will:
- Clean previous builds
- Build Next.js frontend
- Generate icons
- Update dependencies configuration
- Rebuild native modules (better-sqlite3)
- Package Electron app

## Post-Build Verification

After build completes, verify the build:
```bash
npm run verify-build
```

## Critical Checks

The build must include:

✅ **Core Modules:**
- `better-sqlite3` with native binary (.node file)
- `pdfkit`
- `exceljs`
- `fontkit`
- `@swc/helpers` (for fontkit)
- `lru-cache` (for path-scurry)
- `path-scurry`

✅ **Module Resolution Fixes:**
- `electron/main.js` must contain `@swc/helpers` fix
- `electron/main.js` must contain `lru-cache` fix

✅ **Executable:**
- `InvoiceGen.exe` must exist in `dist-new1/win-unpacked/`

## Distribution

Once verified, the `dist-new1/win-unpacked` folder can be:
1. Copied to client systems
2. Run directly by double-clicking `InvoiceGen.exe`
3. No installation required (portable)

## Troubleshooting

If build fails:
1. Check for locked files - close all Electron/Node processes
2. Run `npm run clean:win` for aggressive cleanup
3. Verify all dependencies in `package.json` are installed
4. Check that `better-sqlite3` native binary was built correctly

