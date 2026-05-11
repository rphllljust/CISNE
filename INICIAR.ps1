# ============================================================================
# INICIAR APLICAÇÃO - TUDO EM UM SÓ COMANDO
# ============================================================================
# Execute como Admin: .\INICIAR.ps1

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       🚀 BRASIL TRUCK OS - INICIALIZAÇÃO RÁPIDA 🚀            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# ETAPA 1: INICIAR POSTGRESQL
# ============================================================================

Write-Host "[1/4] Verificando PostgreSQL..." -ForegroundColor Blue

$postgresRunning = $false
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.ConnectAsync("localhost", 5432).Wait(3000) | Out-Null
    if ($tcpClient.Connected) {
        $postgresRunning = $true
    }
    $tcpClient.Close()
} catch {
    $postgresRunning = $false
}

if ($postgresRunning) {
    Write-Host "✅ PostgreSQL já está rodando" -ForegroundColor Green
} else {
    Write-Host "⏳ Iniciando PostgreSQL via Docker..." -ForegroundColor Yellow

    $dockerExists = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
    if ($dockerExists) {
        # Verificar se container existe
        $containerExists = docker ps -a --format "table {{.Names}}" 2>$null | Select-String "postgres-oms"

        if ($containerExists) {
            Write-Host "   Iniciando container existente..." -ForegroundColor Gray
            docker start postgres-oms 2>$null | Out-Null
        } else {
            Write-Host "   Criando novo container..." -ForegroundColor Gray
            docker run -d `
                --name postgres-oms `
                -e POSTGRES_USER=postgres `
                -e POSTGRES_PASSWORD=postgres `
                -e POSTGRES_DB=oms `
                -p 5432:5432 `
                postgres:15-alpine | Out-Null
        }

        Write-Host "   Aguardando inicialização..." -ForegroundColor Gray
        Start-Sleep -Seconds 10

        Write-Host "✅ PostgreSQL iniciado" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker não está disponível" -ForegroundColor Red
        Write-Host ""
        Write-Host "SOLUÇÃO:" -ForegroundColor Yellow
        Write-Host "1. Instale Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
        Write-Host "2. Ou inicie PostgreSQL manualmente (services.msc)" -ForegroundColor Gray
        Write-Host "3. Tente novamente" -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
}

Write-Host ""

# ============================================================================
# ETAPA 2: INSTALAR DEPENDÊNCIAS
# ============================================================================

Write-Host "[2/4] Preparando aplicação..." -ForegroundColor Blue

if (-not (Test-Path "node_modules")) {
    Write-Host "⏳ Instalando dependências..." -ForegroundColor Yellow
    npm install | Out-Null
    Write-Host "✅ Dependências instaladas" -ForegroundColor Green
} else {
    Write-Host "✅ Dependências já instaladas" -ForegroundColor Green
}

# Gerar Prisma
Write-Host "⏳ Gerando Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate 2>$null | Out-Null
Write-Host "✅ Prisma gerado" -ForegroundColor Green

# Aplicar migrations
Write-Host "⏳ Aplicando migrations..." -ForegroundColor Yellow
npm run prisma:deploy 2>$null | Out-Null
if (-not $?) {
    npm run prisma:migrate 2>$null | Out-Null
}
Write-Host "✅ Migrations aplicadas" -ForegroundColor Green

Write-Host ""

# ============================================================================
# ETAPA 3: EXIBIR INFORMAÇÕES
# ============================================================================

Write-Host "[3/4] Obtendo informações da rede..." -ForegroundColor Blue

$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*"
} | Select-Object -First 1

if ($ipAddresses) {
    $LOCAL_IP = $ipAddresses.IPAddress
} else {
    $LOCAL_IP = "localhost"
}

Write-Host "✅ IP Local: $LOCAL_IP" -ForegroundColor Green

Write-Host ""

# ============================================================================
# ETAPA 4: INICIAR APLICAÇÃO
# ============================================================================

Write-Host "[4/4] Iniciando aplicação..." -ForegroundColor Blue
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅ PRONTO PARA ACESSAR ✅                        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 URL Local:" -ForegroundColor Cyan
Write-Host "     http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "  🌐 IP da Rede:" -ForegroundColor Cyan
Write-Host "     http://$LOCAL_IP`:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "  📱 De outro computador (mesma rede WiFi):" -ForegroundColor Cyan
Write-Host "     http://$LOCAL_IP`:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "  🔌 API em:" -ForegroundColor Cyan
Write-Host "     http://localhost:3000/api" -ForegroundColor Yellow
Write-Host ""
Write-Host "  💡 Dica: Abra http://localhost:3000 enquanto isso está rodando" -ForegroundColor Green
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

npm run start:dev
