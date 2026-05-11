param(
  [string]$ProjectRoot = "c:\Users\rphll\Desktop\OS"
)

$pidFile = Join-Path $ProjectRoot ".run\local-server.pid"
if (-not (Test-Path $pidFile)) {
  Write-Output "No PID file found"
  exit 0
}

$procId = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
if ($procId) {
  Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Output "Stopped local API process"
