param(
  [string]$ProjectRoot = "c:\Users\rphll\Desktop\OS",
  [int]$Port = 5173
)

$runDir = Join-Path $ProjectRoot ".run"
$outLog = Join-Path $runDir "frontend.out.log"
$errLog = Join-Path $runDir "frontend.err.log"
$pidFile = Join-Path $runDir "frontend.pid"
$frontendDir = Join-Path $ProjectRoot "frontend"

New-Item -ItemType Directory -Force -Path $runDir | Out-Null

# If something is already listening on frontend port, keep current state.
$existing = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $Port } | Select-Object -First 1
if ($existing) {
  Write-Output "Frontend already listening on port $Port"
  exit 0
}

if (Test-Path $pidFile) {
  $existingPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($existingPid) {
    Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
}

$cmd = "npm run dev -- --host 0.0.0.0 --port $Port"
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmd -WorkingDirectory $frontendDir -RedirectStandardOutput $outLog -RedirectStandardError $errLog -WindowStyle Hidden -PassThru
$proc.Id | Set-Content $pidFile
Write-Output "Started frontend with PID $($proc.Id)"
