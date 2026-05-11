# ============================================================================
# INICIAR POSTGRESQL LOCALMENTE (SEM DOCKER)
# ============================================================================
# Execute como Admin

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     INICIAR POSTGRESQL LOCALMENTE (SEM DOCKER)               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Opção 1: Usar Services (Windows)
Write-Host "[1/2] Procurando PostgreSQL instalado..." -ForegroundColor Blue

$serviceExists = Get-Service -Name postgresql-* -ErrorAction SilentlyContinue

if ($serviceExists) {
    Write-Host "✅ PostgreSQL encontrado no Windows" -ForegroundColor Green
    Write-Host "⏳ Iniciando serviço..." -ForegroundColor Yellow

    foreach ($service in $serviceExists) {
        Start-Service -Name $service.Name -ErrorAction SilentlyContinue
        Write-Host "✅ Serviço iniciado: $($service.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "❌ PostgreSQL não encontrado nos serviços" -ForegroundColor Red
    Write-Host ""
    Write-Host "OPÇÕES:" -ForegroundColor Yellow
    Write-Host "1. Instale PostgreSQL:" -ForegroundColor Gray
    Write-Host "   https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Ou use arquivos SQL (sem banco de dados):" -ForegroundColor Gray
    Write-Host "   npm run prisma:migrate reset (usar SQLite ao invés)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Ou use PostgreSQL Online:" -ForegroundColor Gray
    Write-Host "   Consulte POSTGRES-ALTERNATIVAS.md" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""

# Verificar se PostgreSQL respondeu
Write-Host "[2/2] Testando conexão..." -ForegroundColor Blue
Start-Sleep -Seconds 3

$connected = $false
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.ConnectAsync("localhost", 5432).Wait(5000) | Out-Null
    if ($tcpClient.Connected) {
        $connected = $true
    }
    $tcpClient.Close()
} catch {
    $connected = $false
}

if ($connected) {
    Write-Host "✅ PostgreSQL conectado na porta 5432" -ForegroundColor Green
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║              ✅ PRONTO! AGORA INICIAR A APP ✅                ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Execute em outro terminal:" -ForegroundColor Cyan
    Write-Host "  npm run start:dev" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Não conseguiu conectar em localhost:5432" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique:" -ForegroundColor Yellow
    Write-Host "• Se PostgreSQL está instalado" -ForegroundColor Gray
    Write-Host "• Se o serviço postgresql está rodando" -ForegroundColor Gray
    Write-Host "• Se está usando porta 5432" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
