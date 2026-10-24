/**
 * Kill any running Electron processes before cleaning
 * This prevents file locking issues on Windows
 */

const { exec } = require('child_process');
const os = require('os');
const platform = os.platform();

function killElectronProcesses() {
  return new Promise((resolve, reject) => {
    if (platform === 'win32') {
      // Windows: Use taskkill to kill Electron processes
      exec('taskkill /F /IM electron.exe /T 2>nul || taskkill /F /IM InvoiceGen.exe /T 2>nul || taskkill /F /IM AMGOLD.exe /T 2>nul || echo No Electron processes found', (error) => {
        // Ignore errors - process might not be running
        resolve();
      });
    } else if (platform === 'darwin') {
      // macOS: Use pkill
      exec('pkill -f electron || true', (error) => {
        resolve();
      });
    } else {
      // Linux: Use pkill
      exec('pkill -f electron || true', (error) => {
        resolve();
      });
    }
  });
}

// Run if called directly
if (require.main === module) {
  killElectronProcesses()
    .then(() => {
      console.log('✓ Electron processes checked');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error killing Electron processes:', error);
      process.exit(1);
    });
}

module.exports = { killElectronProcesses };

