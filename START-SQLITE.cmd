@echo off
REM ============================================================================
REM INICIAR APLICAÇÃO COM SQLITE (SEM POSTGRESQL)
REM ============================================================================

setlocal enabledelayedexpansion

cd /d "%~dp0"

title Brasil Truck OS - SQLite

cls
color 0A

echo.
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║                                                                   ║
echo ║     🚀 BRASIL TRUCK OS - MODO SQLITE (SEM POSTGRESQL) 🚀        ║
echo ║                                                                   ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.

echo [1/4] Configurando ambiente...

REM Verificar se .env existe
if not exist ".env" (
    echo ⏳ Criando .env...
    copy .env.example .env >nul
)

REM Atualizar .env para SQLite
echo [2/4] Atualizando para SQLite...

REM Substituir DATABASE_URL para SQLite
powershell -Command "(Get-Content '.env') -replace 'DATABASE_URL=postgresql.*', 'DATABASE_URL=file:./prisma/dev.db' | Set-Content '.env'"

echo ✅ DATABASE_URL configurado para SQLite

echo.

REM Instalar dependências
if not exist "node_modules" (
    echo [3/4] Instalando dependências npm...
    call npm install
    if errorlevel 1 (
        color 0C
        echo ❌ Erro ao instalar dependências
        pause
        exit /b 1
    )
)

echo [3/4] Gerando Prisma...
call npm run prisma:generate >nul 2>&1

echo [4/4] Criando banco SQLite...
call npm run prisma:migrate reset -- --skip-generate >nul 2>&1

if errorlevel 1 (
    echo ⏳ Tentando aplicar migrations...
    call npm run prisma:migrate deploy >nul 2>&1
)

echo.
color 0A
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║                    ✅ PRONTO PARA ACESSAR ✅                    ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo 🗄️  Usando SQLite (arquivo: prisma/dev.db)
echo.
echo 🌐  http://localhost:3000
echo.
echo ⏸️   Pressione CTRL+C para parar
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.

npm run start:dev

pause
