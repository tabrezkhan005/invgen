Write-Host "Checking available printers..."
Get-Printer | Where-Object { $_.Name -notlike '*fax*' -and $_.Name -notlike '*OneNote*' } | Select-Object Name,DriverName,PrinterStatus,PortName,ComputerName,Datatype,Type | Format-Table -AutoSize

Write-Host "`nChecking network printers..."
Get-Printer | Where-Object { $_.PortName -like '*192.168*' -or $_.PortName -like '*10.*' -or $_.PortName -like '*172.*' } | Select-Object Name,PortName | Format-Table -AutoSize

Write-Host "`nChecking WiFi Direct printers..."
Get-Printer | Where-Object { $_.Name -like '*HP*' -or $_.PortName -like '*WSD*' -or $_.PortName -like '*http*' } | Select-Object Name,PortName | Format-Table -AutoSize


