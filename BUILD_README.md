# InvoiceGen - Production Build Guide

This guide explains how to build InvoiceGen for production distribution on Windows.

## Prerequisites

- Node.js 18+ and npm
- Windows 10/11 for building Windows installers
- Git

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Icons
```bash
npm run icons
```

### 3. Build Application
```bash
npm run build
```

### 4. Create Distribution Packages
```bash
# Create Windows installer (.exe)
npm run dist:win:installer

# Create portable ZIP version
npm run dist:win:zip

# Create both installer and ZIP
npm run dist:win
```

## Build Scripts Explained

| Script | Description |
|--------|-------------|
| `npm run icons` | Generate application icons from `public/app.png` |
| `npm run build` | Build Next.js frontend |
| `npm run dist:win` | Create both installer and ZIP for Windows |
| `npm run dist:win:installer` | Create only the Windows installer (.exe) |
| `npm run dist:win:zip` | Create only the portable ZIP version |
| `npm run clean` | Remove build artifacts |

## Output Files

After building, you'll find the following in the `dist/` folder:

### Windows Installer
- `InvoiceGen-Setup-0.1.0.exe` - Professional installer with setup wizard

### Portable ZIP
- `InvoiceGen-0.1.0-win.zip` - Portable version that can run from any folder

### Unpacked Version
- `win-unpacked/` - Development/testing version (not for distribution)

## Features

### ✅ Windows Installer (.exe)
- Professional NSIS-based installer
- Desktop and Start Menu shortcuts
- Automatic database setup
- Uninstall support
- Process detection (won't install if app is running)

### ✅ Portable ZIP Version
- Self-contained ZIP file
- No installation required
- Can run from USB drives
- All dependencies included

### ✅ SQLite Database Persistence
- Database stored in user's Documents folder (`Documents/InvoiceGen/`)
- Automatic backup during installation
- Data preserved during updates/uninstalls
- Portable mode support for removable drives

### ✅ Application Icons
- Generated from `public/app.png`
- Multiple sizes (16x16 to 1024x1024)
- Windows ICO format for installer
- Proper taskbar and desktop icons

## Installation Process

### For End Users

1. **Using Installer (.exe):**
   - Download `InvoiceGen-Setup-0.1.0.exe`
   - Run the installer
   - Follow setup wizard
   - Choose installation directory
   - App creates shortcuts and initial database

2. **Using Portable ZIP:**
   - Download `InvoiceGen-0.1.0-win.zip`
   - Extract to any folder
   - Run `InvoiceGen.exe`
   - Database created in same folder as executable

## Database Location

- **Installed Version:** `%USERPROFILE%\Documents\InvoiceGen\customers.db`
- **Portable Version:** `data\customers.db` (in same folder as executable)

## Troubleshooting

### Build Issues
- Ensure all dependencies are installed: `npm install`
- Clear build cache: `npm run clean`
- Regenerate icons: `npm run icons`

### Icon Issues
- Ensure `public/app.png` exists (preferably 1024x1024 or larger)
- For production, use professional icon design tools

### Database Issues
- Check file permissions in Documents folder
- For portable mode, ensure write access to installation directory

## Advanced Configuration

### Custom Build Options
Edit `package.json` build configuration:
```json
{
  "build": {
    "win": {
      "target": [
        {"target": "nsis", "arch": ["x64"]},
        {"target": "zip", "arch": ["x64"]}
      ]
    }
  }
}
```

### Environment Variables
```bash
# Build for different architectures
npm run dist:win -- --ia32  # 32-bit
npm run dist:win -- --x64   # 64-bit

# Skip publishing
npm run dist:win -- --publish=never
```

## Distribution Checklist

- [ ] Test installer on clean Windows system
- [ ] Verify database creation and persistence
- [ ] Test portable version on different drives
- [ ] Check all shortcuts work correctly
- [ ] Verify uninstaller preserves/removes data as expected
- [ ] Test app functionality after installation

## Support

For build issues, check:
1. Node.js version compatibility
2. Windows build environment
3. Antivirus software interference
4. File permissions

---

**Note:** This build system uses electron-builder for reliable, cross-platform Electron app packaging.











