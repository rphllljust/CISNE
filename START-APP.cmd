@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

title Brasil Truck OS - Aplicacao

cls
color 0A

echo.
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║                                                                   ║
echo ║          🚀 BRASIL TRUCK OS - INICIANDO APLICAÇÃO 🚀            ║
echo ║                                                                   ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.

REM Verificar PostgreSQL
echo [VERIFICAÇÃO] Checando PostgreSQL na porta 5432...
netstat -ano 2>nul | findstr :5432 >nul
if errorlevel 1 (
    color 0C
    echo ⚠️  AVISO: PostgreSQL não detectado na porta 5432
    echo.
    echo SOLUÇÃO:
    echo 1. Docker: docker run -d --name postgres-oms -e POSTGRES_USER=postgres ^
    echo            -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=oms -p 5432:5432 ^
    echo            postgres:15-alpine
    echo.
    echo 2. Ou abrir Services (services.msc) e iniciar PostgreSQL
    echo.
    echo Aguardando 10 segundos...
    timeout /t 10 /nobreak
    color 0A
) else (
    echo ✅ PostgreSQL está rodando
)

echo.

REM Instalar dependências se necessário
if not exist "node_modules" (
    echo [INSTALAÇÃO] npm packages...
    call npm install
    if errorlevel 1 (
        color 0C
        echo ❌ Erro ao instalar dependências
        pause
        exit /b 1
    )
)

echo [GERAÇÃO] Prisma Client...
call npm run prisma:generate >nul 2>&1

echo [MIGRATIONS] Aplicando...
call npm run prisma:deploy >nul 2>&1
if errorlevel 1 (
    call npm run prisma:migrate >nul 2>&1
)

echo.
color 0A
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║                     ✅ PRONTO PARA ACESSAR ✅                    ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo 🌐  http://localhost:3000
echo.
echo 📱  Rede Local: Obtenha seu IP com: ipconfig ^| findstr "IPv4"
echo.
echo ⏸️   Pressione CTRL+C para parar a aplicação
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.

npm run start:dev

pause
