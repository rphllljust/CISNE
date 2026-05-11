# ============================================================================
# SCRIPT PARA SUBIR APLICAÇÃO NA REDE LOCAL (WINDOWS/POWERSHELL)
# ============================================================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "INICIANDO APLICAÇÃO NA REDE LOCAL" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# 1. OBTER IP LOCAL
# ============================================================================

Write-Host "[1/5] Obtendo IP da rede local..." -ForegroundColor Blue

$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*"
} | Select-Object -First 1

if ($ipAddresses) {
    $LOCAL_IP = $ipAddresses.IPAddress
} else {
    $LOCAL_IP = "localhost"
}

Write-Host "✓ IP Local: $LOCAL_IP" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 2. VERIFICAR VARIÁVEIS DE AMBIENTE
# ============================================================================

Write-Host "[2/5] Verificando arquivo .env..." -ForegroundColor Blue

if (-not (Test-Path ".env")) {
    Write-Host "⚠ .env não encontrado. Criando a partir de .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"

    # Atualizar FRONTEND_URL
    $envContent = Get-Content ".env" -Raw
    $envContent = $envContent -replace "FRONTEND_URL=http://localhost:3000", "FRONTEND_URL=http://$LOCAL_IP:3000"
    $envContent = $envContent -replace "API_HOST=0.0.0.0", "API_HOST=0.0.0.0"
    Set-Content ".env" $envContent

    Write-Host "✓ .env criado" -ForegroundColor Green
} else {
    Write-Host "✓ .env já existe" -ForegroundColor Green

    # Atualizar se necessário
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "FRONTEND_URL=http://localhost:3000") {
        $envContent = $envContent -replace "FRONTEND_URL=http://localhost:3000", "FRONTEND_URL=http://$LOCAL_IP:3000"
        Set-Content ".env" $envContent
        Write-Host "✓ FRONTEND_URL atualizado para IP da rede" -ForegroundColor Green
    }
}

Write-Host ""

# ============================================================================
# 3. VERIFICAR BANCO DE DADOS
# ============================================================================

Write-Host "[3/5] Verificando banco de dados..." -ForegroundColor Blue

$postgresRunning = $false
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.ConnectAsync("localhost", 5432).Wait(5000) | Out-Null
    if ($tcpClient.Connected) {
        $postgresRunning = $true
    }
    $tcpClient.Close()
} catch {
    $postgresRunning = $false
}

if ($postgresRunning) {
    Write-Host "✓ PostgreSQL está rodando" -ForegroundColor Green
} else {
    Write-Host "⚠ PostgreSQL não está acessível em localhost:5432" -ForegroundColor Yellow
    Write-Host "  Tentando iniciar via Docker..." -ForegroundColor Yellow

    # Verificar se Docker está instalado
    $dockerExists = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
    if ($dockerExists) {
        # Verificar se container existe
        $containerExists = docker ps -a --format "table {{.Names}}" | Select-String "postgres-oms"

        if ($containerExists) {
            Write-Host "  Iniciando container existente..." -ForegroundColor Yellow
            docker start postgres-oms 2>$null | Out-Null
        } else {
            Write-Host "  Criando novo container..." -ForegroundColor Yellow
            docker run -d `
                --name postgres-oms `
                -e POSTGRES_USER=postgres `
                -e POSTGRES_PASSWORD=postgres `
                -e POSTGRES_DB=oms `
                -p 5432:5432 `
                postgres:15-alpine
        }

        Write-Host "  Aguardando inicialização (10s)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10

        Write-Host "✓ PostgreSQL iniciado" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker não encontrado" -ForegroundColor Red
        Write-Host "  Opções:" -ForegroundColor Yellow
        Write-Host "  1. Instale Docker Desktop" -ForegroundColor Yellow
        Write-Host "  2. Inicie o PostgreSQL manualmente" -ForegroundColor Yellow
        Write-Host "  3. Configure DATABASE_URL no .env" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""

# ============================================================================
# 4. PREPARAR APLICAÇÃO
# ============================================================================

Write-Host "[4/5] Preparando aplicação..." -ForegroundColor Blue

# Verificar node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "  Instalando dependências..." -ForegroundColor Yellow
    npm install
}

# Gerar Prisma Client
Write-Host "  Gerando Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate

# Aplicar migrations
Write-Host "  Aplicando migrations..." -ForegroundColor Yellow
$migrationResult = npm run prisma:deploy 2>$null
if (-not $?) {
    Write-Host "  Executando migrate dev..." -ForegroundColor Yellow
    npm run prisma:migrate
}

Write-Host "✓ Aplicação preparada" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 5. EXIBIR INFORMAÇÕES
# ============================================================================

Write-Host "=========================================" -ForegroundColor Green
Write-Host "✓ PRONTO PARA ACESSAR" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 URL Local:     http://localhost:3000" -ForegroundColor Yellow
Write-Host "  🌐 IP da Rede:    http://$LOCAL_IP`:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "  📱 Acesse de outro computador:" -ForegroundColor Cyan
Write-Host "     http://$LOCAL_IP`:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "  🔌 API em:        http://$LOCAL_IP`:3000/api" -ForegroundColor Yellow
Write-Host "  📚 Swagger docs:  http://$LOCAL_IP`:3000/api" -ForegroundColor Yellow
Write-Host ""
Write-Host "  💡 Dica: Se não conseguir acessar de outro PC:" -ForegroundColor Cyan
Write-Host "     1. Verifique firewall do Windows" -ForegroundColor Gray
Write-Host "     2. Verifique se estão na mesma rede (WiFi/LAN)" -ForegroundColor Gray
Write-Host "     3. Ping $LOCAL_IP para testar conectividade" -ForegroundColor Gray
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Iniciando aplicação..." -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# 6. INICIAR APLICAÇÃO
# ============================================================================

npm run start:dev
