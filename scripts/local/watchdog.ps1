param(
  [string]$ProjectRoot = "c:\Users\rphll\Desktop\OS",
  [int]$Port = 3000,
  [int]$IntervalSeconds = 15
)

$runDir = Join-Path $ProjectRoot ".run"
$watchdogLog = Join-Path $runDir "watchdog.log"
$startScript = Join-Path $ProjectRoot "scripts\local\start-persistent.ps1"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

function Write-Log([string]$msg) {
  $line = "[$((Get-Date).ToString('s'))] $msg"
  Add-Content -Path $watchdogLog -Value $line -Encoding ASCII
}

Write-Log "Watchdog started"
while ($true) {
  try {
    $listening = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $Port }
    if (-not $listening) {
      Write-Log "Port $Port down, starting API"
      powershell.exe -NoProfile -ExecutionPolicy Bypass -File $startScript | Out-Null
      Start-Sleep -Seconds 6
    }
  } catch {
    Write-Log "Watchdog error: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds $IntervalSeconds
}
