const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function testPrinterDiscovery() {
  console.log('🧪 Testing printer discovery methods...\n');

  const results = {
    electron: [],
    powershell: [],
    cim: [],
    registry: [],
    bluetooth: []
  };

  try {
    // Test 1: Electron method (if we had a window)
    console.log('1. Electron method: Would use mainWindow.webContents.getPrinters()');
    console.log('   (Requires Electron window context)\n');

    // Test 2: PowerShell Get-Printer method
    console.log('2. Testing PowerShell Get-Printer method...');
    try {
      // Try different PowerShell paths
      const psPaths = [
        'powershell',
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe'
      ];

      let psStdout = '';
      let success = false;

      for (const psPath of psPaths) {
        try {
          console.log(`   Trying: ${psPath}`);
          const result = await execAsync(`"${psPath}" -NoProfile -Command "Get-Printer | Where-Object { $_.Name -notlike '*fax*' -and $_.Name -notlike '*OneNote*' } | Select-Object Name,DriverName,PrinterStatus,PortName,ComputerName,Datatype,Type | ConvertTo-Json -Compress"`, { timeout: 15000 });
          psStdout = result.stdout;
          success = true;
          console.log(`   ✅ Success with: ${psPath}`);
          break;
        } catch (pathError) {
          console.log(`   ❌ Failed with ${psPath}: ${pathError.message}`);
        }
      }

      if (success && psStdout && psStdout.trim() && psStdout.trim() !== 'null') {
        try {
          const psPrinters = JSON.parse(psStdout.trim());
          const printerArray = Array.isArray(psPrinters) ? psPrinters : [psPrinters];
          console.log(`   ✅ PowerShell found ${printerArray.length} printers`);
          printerArray.forEach(p => {
            console.log(`      - ${p.Name} (${p.PortName || 'Unknown'}) - Status: ${p.PrinterStatus}`);
          });
          results.powershell = printerArray;
        } catch (parseError) {
          console.log(`   ❌ PowerShell JSON parse failed: ${parseError.message}`);
          console.log(`   Raw output: ${psStdout.substring(0, 200)}`);
        }
      } else {
        console.log('   ❌ PowerShell returned empty/null result');
      }
    } catch (error) {
      console.log(`   ❌ PowerShell failed: ${error.message}`);
    }
    console.log('');

    // Test 3: PowerShell CIM method
    console.log('3. Testing PowerShell CIM method...');
    try {
      let cimStdout = '';
      let cimSuccess = false;

      for (const psPath of ['powershell', 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe']) {
        try {
          const result = await execAsync(`"${psPath}" -NoProfile -Command "Get-CimInstance Win32_Printer | Where-Object { $_.Name -notlike '*fax*' -and $_.Name -notlike '*OneNote*' } | Select-Object Name,DriverName,PrinterStatus,PortName,Network | ConvertTo-Json -Compress"`, { timeout: 15000 });
          cimStdout = result.stdout;
          cimSuccess = true;
          break;
        } catch (pathError) {
          // Continue to next path
        }
      }

      if (cimSuccess && cimStdout && cimStdout.trim() && cimStdout.trim() !== 'null') {
        try {
          const cimPrinters = JSON.parse(cimStdout.trim());
          const cimPrinterArray = Array.isArray(cimPrinters) ? cimPrinters : [cimPrinters];
          console.log(`   ✅ CIM found ${cimPrinterArray.length} printers`);
          cimPrinterArray.slice(0, 3).forEach(p => {
            console.log(`      - ${p.Name} (${p.PortName || 'Unknown'})`);
          });
          results.cim = cimPrinterArray;
        } catch (parseError) {
          console.log(`   ❌ CIM JSON parse failed: ${parseError.message}`);
        }
      } else {
        console.log('   ❌ CIM returned empty/null result');
      }
    } catch (error) {
      console.log(`   ❌ CIM failed: ${error.message}`);
    }
    console.log('');

    // Test 4: Registry network method
    console.log('4. Testing registry network method...');
    try {
      let regStdout = '';
      let regSuccess = false;

      for (const psPath of ['powershell', 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe']) {
        try {
          const result = await execAsync(`"${psPath}" -NoProfile -Command "Get-ChildItem 'HKCU:\\Printers\\Connections' -ErrorAction SilentlyContinue | Select-Object Name | ConvertTo-Json"`, { timeout: 5000 });
          regStdout = result.stdout;
          regSuccess = true;
          break;
        } catch (pathError) {
          // Continue to next path
        }
      }

      if (regSuccess && regStdout && regStdout.trim() && regStdout.trim() !== 'null') {
        try {
          const regPrinters = JSON.parse(regStdout.trim());
          const regPrinterArray = Array.isArray(regPrinters) ? regPrinters : [regPrinters];
          console.log(`   ✅ Registry found ${regPrinterArray.length} network connections`);
          regPrinterArray.slice(0, 2).forEach(p => {
            console.log(`      - ${p.Name}`);
          });
          results.registry = regPrinterArray;
        } catch (parseError) {
          console.log(`   ❌ Registry JSON parse failed: ${parseError.message}`);
        }
      } else {
        console.log('   ❌ Registry returned empty/null result');
      }
    } catch (error) {
      console.log(`   ❌ Registry failed: ${error.message}`);
    }
    console.log('');

    // Test 5: Bluetooth method
    console.log('5. Testing Bluetooth method...');
    try {
      let btStdout = '';
      let btSuccess = false;

      for (const psPath of ['powershell', 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe']) {
        try {
          const result = await execAsync(`"${psPath}" -NoProfile -Command "Get-PnpDevice | Where-Object { $_.Class -eq 'Printer' -and ($_.InstanceId -like '*bluetooth*' -or $_.InstanceId -like '*bth*') } | Select-Object FriendlyName,InstanceId,Status | ConvertTo-Json"`, { timeout: 10000 });
          btStdout = result.stdout;
          btSuccess = true;
          break;
        } catch (pathError) {
          // Continue to next path
        }
      }

      if (btSuccess && btStdout && btStdout.trim() && btStdout.trim() !== 'null') {
        try {
          const btPrinters = JSON.parse(btStdout.trim());
          const btPrinterArray = Array.isArray(btPrinters) ? btPrinters : [btPrinters];
          console.log(`   ✅ Bluetooth detection found ${btPrinterArray.length} devices`);
          btPrinterArray.forEach(p => {
            console.log(`      - ${p.FriendlyName} (${p.Status})`);
          });
          results.bluetooth = btPrinterArray;
        } catch (parseError) {
          console.log(`   ❌ Bluetooth JSON parse failed: ${parseError.message}`);
        }
      } else {
        console.log('   ❌ Bluetooth returned empty/null result');
      }
    } catch (error) {
      console.log(`   ❌ Bluetooth failed: ${error.message}`);
    }
    console.log('');

    // Summary
    console.log('📊 SUMMARY:');
    console.log(`   PowerShell: ${results.powershell.length} printers`);
    console.log(`   CIM: ${results.cim.length} printers`);
    console.log(`   Registry: ${results.registry.length} connections`);
    console.log(`   Bluetooth: ${results.bluetooth.length} devices`);
    console.log('');

    const uniquePrinters = new Set([
      ...results.powershell.map(p => p.Name),
      ...results.cim.map(p => p.Name),
      ...results.bluetooth.map(p => p.FriendlyName)
    ].filter(Boolean));

    console.log(`🎯 Total unique printers that should be detected: ${uniquePrinters.size}`);
    if (uniquePrinters.size > 0) {
      console.log('   Printers:', Array.from(uniquePrinters).join(', '));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPrinterDiscovery();
