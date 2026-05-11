#!/bin/bash

# ============================================================================
# SCRIPT PARA SUBIR APLICAÃ‡ÃƒO NA REDE LOCAL
# ============================================================================

set -e

echo "========================================="
echo "INICIANDO APLICAÃ‡ÃƒO NA REDE LOCAL"
echo "========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# 1. OBTER IP LOCAL
# ============================================================================

echo -e "${BLUE}[1/5]${NC} Obtendo IP da rede local..."

# Detectar SO
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
elif [[ "$OSTYPE" == "darwin"* ]]; then
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    LOCAL_IP=$(ipconfig | grep -i "IPv4" | grep -v 127.0.0.1 | awk '{print $NF}' | head -1)
else
    LOCAL_IP="localhost"
fi

if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="localhost"
fi

echo -e "${GREEN}âœ“${NC} IP Local: ${YELLOW}$LOCAL_IP${NC}"
echo ""

# ============================================================================
# 2. VERIFICAR VARIÃVEIS DE AMBIENTE
# ============================================================================

echo -e "${BLUE}[2/5]${NC} Verificando arquivo .env..."

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}âš  .env nÃ£o encontrado. Criando a partir de .env.example...${NC}"
    cp .env.example .env

    # Atualizar hosts
    sed -i "s/API_HOST=0.0.0.0/API_HOST=0.0.0.0/" .env
    sed -i "s|FRONTEND_URL=http://localhost:3000|FRONTEND_URL=http://$LOCAL_IP:3000|" .env

    echo -e "${GREEN}âœ“${NC} .env criado"
else
    # Atualizar HOST
    if grep -q "API_HOST=localhost" .env; then
        sed -i "s/API_HOST=localhost/API_HOST=0.0.0.0/" .env
    fi

    echo -e "${GREEN}âœ“${NC} .env jÃ¡ existe"
fi

echo ""

# ============================================================================
# 3. VERIFICAR BANCO DE DADOS
# ============================================================================

echo -e "${BLUE}[3/5]${NC} Verificando banco de dados..."

# Tentar conectar ao banco
if timeout 5 bash -c "cat < /dev/null > /dev/tcp/localhost/5432" 2>/dev/null; then
    echo -e "${GREEN}âœ“${NC} PostgreSQL estÃ¡ rodando"
else
    echo -e "${YELLOW}âš  PostgreSQL nÃ£o estÃ¡ acessÃ­vel em localhost:5432${NC}"
    echo -e "${YELLOW}  Iniciando PostgreSQL em Docker...${NC}"

    # Verificar se Docker estÃ¡ instalado
    if command -v docker &> /dev/null; then
        # Verificar se container jÃ¡ existe
        if docker ps -a --format '{{.Names}}' | grep -q "^postgres-oms$"; then
            echo -e "  Iniciando container existente..."
            docker start postgres-oms 2>/dev/null || true
        else
            echo -e "  Criando novo container..."
            docker run -d \
                --name postgres-oms \
                -e POSTGRES_USER=postgres \
                -e POSTGRES_PASSWORD=postgres \
                -e POSTGRES_DB=oms \
                -p 5432:5432 \
                postgres:15-alpine
        fi

        # Aguardar inicializaÃ§Ã£o
        echo -e "  Aguardando inicializaÃ§Ã£o (10s)..."
        sleep 10

        echo -e "${GREEN}âœ“${NC} PostgreSQL iniciado"
    else
        echo -e "${RED}âœ—${NC} Docker nÃ£o encontrado"
        echo -e "${YELLOW}  Inicie o PostgreSQL manualmente e execute novamente${NC}"
        exit 1
    fi
fi

echo ""

# ============================================================================
# 4. PREPARAR APLICAÃ‡ÃƒO
# ============================================================================

echo -e "${BLUE}[4/5]${NC} Preparando aplicaÃ§Ã£o..."

# Instalar dependÃªncias (se necessÃ¡rio)
if [ ! -d "node_modules" ]; then
    echo -e "  Instalando dependÃªncias..."
    npm install
fi

# Gerar Prisma Client
echo -e "  Gerando Prisma Client..."
npm run prisma:generate

# Aplicar migrations
echo -e "  Aplicando migrations..."
npm run prisma:deploy || npm run prisma:migrate

echo -e "${GREEN}âœ“${NC} AplicaÃ§Ã£o preparada"
echo ""

# ============================================================================
# 5. INICIAR APLICAÃ‡ÃƒO
# ============================================================================

echo -e "${BLUE}[5/5]${NC} Iniciando aplicaÃ§Ã£o..."
echo ""

echo "========================================="
echo -e "${GREEN}âœ“ PRONTO PARA ACESSAR${NC}"
echo "========================================="
echo ""
echo -e "  ðŸŒ URL Local:     ${YELLOW}http://localhost:3000${NC}"
echo -e "  ðŸŒ IP da Rede:    ${YELLOW}http://$LOCAL_IP:3000${NC}"
echo ""
echo -e "  ðŸ“± Acesse de outro computador:"
echo -e "     ${YELLOW}http://$LOCAL_IP:3000${NC}"
echo ""
echo -e "  ðŸ”Œ API em:        ${YELLOW}http://$LOCAL_IP:3000/api${NC}"
echo -e "  ðŸ“š Swagger docs:  ${YELLOW}http://$LOCAL_IP:3000/docs${NC}"
echo ""
echo "========================================="
echo ""

# Iniciar aplicaÃ§Ã£o
npm run start:dev

