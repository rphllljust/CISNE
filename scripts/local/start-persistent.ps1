param(
  [string]$ProjectRoot = "c:\Users\rphll\Desktop\OS"
)

$ErrorActionPreference = "Stop"
$runDir = Join-Path $ProjectRoot ".run"
$outLog = Join-Path $runDir "local-server.out.log"
$errLog = Join-Path $runDir "local-server.err.log"
$pidFile = Join-Path $runDir "local-server.pid"

New-Item -ItemType Directory -Force -Path $runDir | Out-Null

# Ensure Docker daemon and local Postgres container.
try {
  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    $dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktop) {
      Start-Process -FilePath $dockerDesktop | Out-Null
      for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 2
        docker info *> $null
        if ($LASTEXITCODE -eq 0) { break }
      }
    }
  }
  docker compose up -d postgres | Out-Null
} catch {
}

# Kill previous launched process (if exists) to avoid stale session.
if (Test-Path $pidFile) {
  $existingPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($existingPid) {
    Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
}

# Reuse existing logs if they are present.
$cmd = "set DATABASE_URL=postgresql://oms:oms@localhost:5432/oms?schema=public&& npm run start:dev"
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmd -WorkingDirectory $ProjectRoot -RedirectStandardOutput $outLog -RedirectStandardError $errLog -WindowStyle Hidden -PassThru
$proc.Id | Set-Content $pidFile
Write-Output "Started API with PID $($proc.Id)"
