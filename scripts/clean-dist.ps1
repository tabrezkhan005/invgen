# PowerShell script to clean dist directories on Windows
# Handles locked files by retrying with delays and using more aggressive methods

$ErrorActionPreference = "Continue"

# Kill any Electron processes first
Write-Host "Checking for running Electron processes..." -ForegroundColor Yellow
try {
    Get-Process | Where-Object { $_.ProcessName -like "*electron*" -or $_.ProcessName -like "*InvoiceGen*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
} catch {
    # Ignore errors
}

$dirsToClean = @("dist", "dist-new1", "out", ".next")

foreach ($dir in $dirsToClean) {
    if (Test-Path $dir) {
        Write-Host "Cleaning $dir..." -ForegroundColor Yellow

        # Try to remove files with retries
        $maxRetries = 5
        $retryCount = 0
        $success = $false

        while ($retryCount -lt $maxRetries -and -not $success) {
            try {
                # First, try to remove read-only attributes
                Get-ChildItem -Path $dir -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
                    try {
                        $_.Attributes = $_.Attributes -band (-bnot [System.IO.FileAttributes]::ReadOnly)
                    } catch {
                        # Ignore individual file errors
                    }
                }

                # Try using cmd rmdir first (more aggressive on Windows)
                if ($retryCount -ge 2) {
                    try {
                        $null = cmd /c "rmdir /s /q `"$dir`"" 2>&1
                        if (-not (Test-Path $dir)) {
                            Write-Host "✓ Successfully cleaned $dir (using rmdir)" -ForegroundColor Green
                            $success = $true
                            continue
                        }
                    } catch {
                        # Fall through to Remove-Item
                    }
                }

                # Then try PowerShell Remove-Item
                Remove-Item -Path $dir -Recurse -Force -ErrorAction Stop
                Write-Host "✓ Successfully cleaned $dir" -ForegroundColor Green
                $success = $true
            } catch {
                $retryCount++
                if ($retryCount -lt $maxRetries) {
                    $delay = $retryCount * 500
                    Write-Host "  Retry $retryCount/$maxRetries after ${delay}ms..." -ForegroundColor Yellow
                    Start-Sleep -Milliseconds $delay
                } else {
                    Write-Host "  ⚠ Warning: Could not fully clean $dir - some files may be locked" -ForegroundColor Red
                    Write-Host "  You may need to manually delete: $dir" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "  $dir does not exist, skipping..." -ForegroundColor Gray
    }
}

Write-Host "`nCleanup complete!" -ForegroundColor Green
