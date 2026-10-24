# Portable Mode Instructions

This application can run in portable mode, storing all data on the USB drive without requiring installation on the host computer.

## How Portable Mode Works

When the application detects it's running from a removable drive (USB stick), it automatically switches to portable mode:

- **Database Location**: `USB Drive/App Folder/data/customers.db`
- **No System Installation**: No registry entries or system files
- **Self-Contained**: All data stays on the USB drive

## Setting Up Portable Mode

1. **Copy the Application**:
   - Copy the entire application folder to your USB drive
   - Ensure the USB drive has enough space (recommended: 1GB+)

2. **First Run**:
   - Run the application from the USB drive
   - The app will automatically detect portable mode
   - A blue "Portable Mode" badge will appear

3. **Data Storage**:
   - All customer data, invoices, and backups are stored on the USB drive
   - No data is written to the host computer

## Features in Portable Mode

✅ All features work identically to installed version:
- Customer management
- Invoice creation and printing
- Analytics and reporting
- Data export (PDF, Excel, CSV)
- Automatic USB backups

✅ **Enhanced Backup Security**:
- Since data is already on USB, backups create additional copies
- Portable mode is inherently more secure for data portability

## Switching Between Modes

- **Installed Mode**: Run from system drive (C: on Windows)
- **Portable Mode**: Run from removable drive (USB stick)

The application automatically detects and adapts to the running environment.

## Troubleshooting

### App Doesn't Detect Portable Mode
- Ensure you're running from a removable drive
- Check that the drive is writable
- Try running as administrator (if on Windows)

### Data Not Saving
- Verify USB drive has sufficient space
- Check write permissions on the USB drive
- Ensure the drive isn't write-protected

### Performance Issues
- USB drives are slower than internal drives
- Large databases may be slower to load
- Consider using a fast USB 3.0 drive

## Backup Strategy for Portable Mode

Since your data is already on a removable drive, consider these backup strategies:

1. **Regular USB Backups**: The app creates automatic backups on the same USB drive
2. **External Backups**: Copy the entire app folder to cloud storage or external drive
3. **Multiple USB Copies**: Keep multiple USB drives with the application

## Security Notes

- Keep your USB drive secure and encrypted if containing sensitive business data
- Use strong passwords for any login features (when implemented)
- Regularly backup your USB drive contents
- Avoid running the app on untrusted computers

## Technical Details

**Portable Detection Logic**:
- Windows: Checks if drive letter is not C: and is writable
- macOS: Checks if running from `/Volumes/` directory
- Linux: Checks if running from `/media/` or `/mnt/` directories

**Database Path in Portable Mode**:
```
USB Drive/
└── App Folder/
    └── data/
        └── customers.db
```

**Backup Location in Portable Mode**:
```
USB Drive/
└── BILLING_BACKUP/
    └── backup_YYYY-MM-DD_HH-MM-SS.db
```













