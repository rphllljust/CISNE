@echo off
REM ============================================================================
REM INICIAR APLICAÇÃO BRASIL TRUCK - WINDOWS BATCH
REM ============================================================================

cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║          🚀 BRASIL TRUCK OS - INICIALIZAÇÃO 🚀                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Mudar para diretório do projeto
cd /d %~dp0

REM Verificar Node.js
echo [1/3] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não encontrado
    echo Instale em: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js encontrado
)

echo.

REM Verificar dependências
echo [2/3] Verificando dependências...
if not exist "node_modules" (
    echo ⏳ Instalando npm packages...
    call npm install
    echo ✅ Dependências instaladas
) else (
    echo ✅ Dependências já instaladas
)

echo.

REM Iniciar aplicação
echo [3/3] Iniciando aplicação...
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║              ✅ APLICAÇÃO INICIANDO ✅                       ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 🌐 Abra no navegador:
echo    http://localhost:3000
echo.
echo ⏸️  CTRL+C para parar
echo.

npm run start:dev

pause
