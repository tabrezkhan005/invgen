/**
 * Cross-platform cleanup script
 * Removes dist, dist-new1, out, and .next directories
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function removeDir(dirPath, retries = 5) {
  if (!fs.existsSync(dirPath)) {
    console.log(`  ${dirPath} does not exist, skipping...`);
    return true;
  }

  // Remove read-only files on Windows
  function removeReadOnly(dir) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            removeReadOnly(filePath);
          } else {
            // Remove read-only attribute
            try {
              fs.chmodSync(filePath, 0o666);
            } catch (e) {
              // Ignore chmod errors
            }
          }
        } catch (e) {
          // Skip files that can't be accessed
        }
      }
      // Remove read-only attribute from directory
      try {
        fs.chmodSync(dir, 0o777);
      } catch (e) {
        // Ignore chmod errors
      }
    } catch (e) {
      // Ignore errors during read-only removal
    }
  }

  // Try multiple times with delays
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Remove read-only attributes first
      removeReadOnly(dirPath);

      // On Windows, try using rmdir command first (more aggressive)
      if (os.platform() === 'win32' && attempt > 2) {
        try {
          execSync(`rmdir /s /q "${dirPath}"`, { stdio: 'ignore', timeout: 5000 });
          if (!fs.existsSync(dirPath)) {
            console.log(`✓ Removed ${dirPath} (using rmdir)`);
            return true;
          }
        } catch (e) {
          // Fall through to fs.rmSync
        }
      }

      // Try using Node.js fs.rmSync
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });

      // Verify it's actually gone
      if (!fs.existsSync(dirPath)) {
        console.log(`✓ Removed ${dirPath}`);
        return true;
      }
    } catch (error) {
      if (attempt < retries) {
        const delay = attempt * 500; // Increasing delay: 500ms, 1000ms, 1500ms, etc.
        console.log(`  Attempt ${attempt}/${retries} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        console.error(`✗ Failed to remove ${dirPath} after ${retries} attempts:`, error.message);

        // On Windows, provide helpful message
        if (os.platform() === 'win32') {
          console.log(`  💡 Tip: Try running: npm run clean:win`);
          console.log(`  Or manually delete the folder: ${dirPath}`);
        }
        return false;
      }
    }
  }

  return false;
}

// Directories to clean (default set, or from command line args)
const args = process.argv.slice(2);
const dirsToClean = args.length > 0 ? args : ['dist', 'dist-new1', 'dist-new2', 'dist-final', 'distoct_final', 'distoct1', 'distoct2', 'distoctf1', 'distoctf2', 'out', '.next'];

async function main() {
  console.log('Cleaning build directories...\n');

  let allSuccess = true;
  for (const dir of dirsToClean) {
    const dirPath = path.join(process.cwd(), dir);
    const success = await removeDir(dirPath);
    if (!success) {
      allSuccess = false;
    }
  }

  console.log('\nCleanup complete!');

  if (!allSuccess) {
    console.log('\n⚠ Some directories could not be removed. They may be locked by running processes.');
    console.log('  The build will continue, but you may encounter issues if files are locked.');
    if (os.platform() === 'win32') {
      console.log('  On Windows, you can also try: npm run clean:win');
    }
    // Don't exit with error - let the build continue
    // The build process will handle locked files
  }

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
