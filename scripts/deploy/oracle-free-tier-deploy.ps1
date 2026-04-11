param(
  [Parameter(Mandatory = $true)]
  [string]$ServerHost,

  [Parameter(Mandatory = $true)]
  [string]$KeyPath,

  [string]$User = 'ubuntu',
  [string]$Domain = '',
  [string]$Email = '',
  [string]$RemotePath = '/opt/oms'
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  throw 'ssh nao encontrado no ambiente local.'
}

if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
  throw 'scp nao encontrado no ambiente local.'
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "Arquivo de chave nao encontrado: $KeyPath"
}

$resolvedKeyPath = (Resolve-Path -LiteralPath $KeyPath).Path

if ([string]::IsNullOrWhiteSpace($Domain)) {
  $Domain = $ServerHost
}

if ([string]::IsNullOrWhiteSpace($Email)) {
  if ($Domain -match '^\d{1,3}(\.\d{1,3}){3}$') {
    $Email = 'devops@example.com'
  }
  else {
    $Email = "devops@$Domain"
  }
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("oms-oracle-" + [guid]::NewGuid().ToString('N'))
$archivePath = Join-Path $tempDir 'oms-deploy.tar.gz'

New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "Empacotando projeto..."
Push-Location $projectRoot
try {
  & tar `
    --exclude='.git' `
    --exclude='node_modules' `
    --exclude='frontend/node_modules' `
    --exclude='dist' `
    --exclude='frontend/dist' `
    --exclude='coverage' `
    --exclude='frontend/coverage' `
    --exclude='.env' `
    --exclude='.env.production' `
    -czf $archivePath .
}
finally {
  Pop-Location
}

Write-Host "Transferindo pacote para Oracle Cloud..."
& scp -o StrictHostKeyChecking=accept-new -i $resolvedKeyPath $archivePath "$User@$ServerHost`:/tmp/oms-deploy.tar.gz"

$remoteScript = @'
set -euo pipefail

DOMAIN="__DOMAIN__"
EMAIL="__EMAIL__"
REMOTE_PATH="__REMOTE_PATH__"

if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg lsb-release tar gzip
fi

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl enable docker
  sudo systemctl start docker
fi

if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow OpenSSH || true
  sudo ufw allow 80/tcp || true
  sudo ufw allow 443/tcp || true
  sudo ufw --force enable || true
fi

sudo mkdir -p "$REMOTE_PATH"
sudo chown -R "$USER:$USER" "$REMOTE_PATH"
tar -xzf /tmp/oms-deploy.tar.gz -C "$REMOTE_PATH" --strip-components=1

cd "$REMOTE_PATH"
cp -n .env.production.example .env.production

ACCESS_SECRET="$(openssl rand -hex 48)"
REFRESH_SECRET="$(openssl rand -hex 48)"
DB_PASSWORD="$(openssl rand -hex 16)"

sed -i "s|^APP_DOMAIN=.*|APP_DOMAIN=$DOMAIN|" .env.production
sed -i "s|^CADDY_EMAIL=.*|CADDY_EMAIL=$EMAIL|" .env.production
sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN|" .env.production
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$DB_PASSWORD|" .env.production
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://oms:$DB_PASSWORD@postgres:5432/oms?schema=public|" .env.production
sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$ACCESS_SECRET|" .env.production
sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$REFRESH_SECRET|" .env.production

chmod +x scripts/deploy/*.sh
sudo ./scripts/deploy/deploy.sh

curl -fsS http://localhost/health >/dev/null
echo "DEPLOY_OK https://$DOMAIN"
'@

$remoteScript = $remoteScript.
  Replace('__DOMAIN__', $Domain).
  Replace('__EMAIL__', $Email).
  Replace('__REMOTE_PATH__', $RemotePath)

Write-Host "Executando deploy remoto..."
$remoteScript | & ssh -o StrictHostKeyChecking=accept-new -i $resolvedKeyPath "$User@$ServerHost" "bash -s"

Write-Host "Implantacao concluida em https://$Domain"

Remove-Item -LiteralPath $archivePath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
