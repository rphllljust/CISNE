param(
  [string]$ProjectRoot = "c:\Users\rphll\Desktop\OS"
)

$watchApi = Join-Path $ProjectRoot "scripts\local\watchdog.ps1"
$watchFrontend = Join-Path $ProjectRoot "scripts\local\frontend-watchdog.ps1"

function Start-IfMissing([string]$scriptPath) {
  $escaped = [Regex]::Escape($scriptPath)
  $running = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -eq 'powershell.exe' -and $_.CommandLine -match "-File\s+$escaped(\s|$)"
  } | Select-Object -First 1

  if (-not $running) {
    Start-Process -FilePath powershell.exe -ArgumentList '-NoProfile','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',$scriptPath -WindowStyle Hidden | Out-Null
  }
}

if (Test-Path $watchApi) { Start-IfMissing -scriptPath $watchApi }
if (Test-Path $watchFrontend) { Start-IfMissing -scriptPath $watchFrontend }
