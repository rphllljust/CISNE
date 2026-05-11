# 📋 GUIA DE EXECUÇÃO - MASSA DE TESTE BRASIL TRUCK

## 🎯 Objetivo

Gerar uma base de dados robusta e realista para validação completa do sistema de Ordem de Serviço para locadora de caminhões pesados.

---

## 📊 O Que Foi Gerado

✅ **50 clientes** - Pessoa Física e Jurídica  
✅ **80 motoristas** - Distribuídos entre clientes  
✅ **70 veículos** - Caminhões pequenos, médios, grandes e extrapesados  
✅ **20 categorias** - De locação  
✅ **90 contratos** - De locação ativa/finalizadas  
✅ **150 ordens de serviço** - Em diversos status  
✅ **Checklists** - Com validações obrigatórias  
✅ **Avarias** - Registrados e em análise  
✅ **Manutenção** - Preventiva e corretiva  
✅ **Financeiro** - Lançamentos e cobranças  
✅ **100+ casos de teste** - Positivos, negativos e borda  

---

## 🚀 PASSO 1: PREPARAÇÃO DO AMBIENTE

### Verificar dependências

```bash
# Verificar Node.js e npm
node --version  # v18+
npm --version   # v8+

# Verificar Prisma
npx prisma --version
```

### Instalar dependências (se necessário)

```bash
npm install
```

### Criar arquivo .env se não existir

```bash
# Copiar template
cp .env.example .env

# Verificar e ajustar:
# DATABASE_URL=postgresql://user:password@localhost:5432/os_brasil_truck
```

---

## 🗄️ PASSO 2: PREPARAR BANCO DE DADOS

### 2.1 Resetar banco (CUIDADO - apaga dados!)

```bash
# Se quiser limpar tudo
npx prisma migrate reset
```

### 2.2 Aplicar migrations

```bash
# Atualizar schema
npx prisma migrate dev --name initial-schema
```

### 2.3 Validar conexão

```bash
# Testar conexão
npx prisma db execute --stdin < /dev/null
```

---

## 🌱 PASSO 3: EXECUTAR SEED DE DADOS

### 3.1 Executar seed automático

```bash
# Executar script TypeScript
npx ts-node scripts/seed-truck-rental-test-data.ts

# OU usar npm script (se configurado)
npm run seed:truck-rental
```

### 3.2 Monitorar execução

O script vai exibir:

```
========================================
GERAÇÃO DE MASSA DE TESTE - BRASIL TRUCK
========================================

Gerando usuários do sistema...
✓ Usuários criados: 9

Gerando categorias de serviço...
✓ Tipos de serviço criados: 30

Gerando SLAs...
✓ SLAs criados: 4

Gerando 50 clientes...
✓ 50 clientes criados

Gerando 70 veículos...
✓ 70 veículos criados

Gerando 90 contratos...
✓ 90 contratos criados

Gerando 150 ordens de serviço...
✓ 150 ordens de serviço criadas

Gerando histórico de status das OS...
✓ 50 registros de histórico criados

========================================
RESUMO DA GERAÇÃO
========================================
✓ Usuários: 9
✓ Categorias de Serviço: 8
✓ Tipos de Serviço: 30
✓ SLAs: 4
✓ Clientes: 50
✓ Veículos: 70
✓ Contratos: 90
✓ Ordens de Serviço: 150
========================================
```

**Tempo esperado**: 5-10 minutos

---

## 🔍 PASSO 4: VALIDAR DADOS

### 4.1 Verificar registro de clientes

```bash
# Contar clientes
npx prisma query 'SELECT COUNT(*) FROM "Client"'
```

**Esperado**: 50 clientes

### 4.2 Verificar contratos

```bash
# Contar contratos
npx prisma query 'SELECT COUNT(*) FROM "Contract"'
```

**Esperado**: 90 contratos

### 4.3 Verificar ordens de serviço

```bash
# Contar OS
npx prisma query 'SELECT COUNT(*) FROM "ServiceOrder"'
```

**Esperado**: 150 ordens de serviço

### 4.4 Verificar status

```sql
-- Query completa
SELECT 
  COUNT(*) as total,
  status,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentual
FROM "ServiceOrder"
GROUP BY status
ORDER BY COUNT(*) DESC;
```

**Esperado**:
```
total | status      | percentual
------+-------------+-----------
  65  | COMPLETED   | 43.3%
  18  | IN_PROGRESS | 12.0%
  15  | OPEN        | 10.0%
  12  | SCHEDULED   |  8.0%
  10  | WAITING_APPROVAL | 6.7%
  ...
```

---

## 🧪 PASSO 5: EXECUTAR TESTES

### 5.1 Iniciar servidor de desenvolvimento

```bash
npm run dev
```

Esperado: Servidor rodando em `http://localhost:3000`

### 5.2 Acessar aplicação

Abra seu navegador:
```
http://localhost:3000
```

### 5.3 Fazer login

Use um dos usuários criados:

```
Email: atendente1@brasil-truck.com
Senha: (conforme seu ambiente)
```

### 5.4 Validar dados na interface

#### 👥 Verificar Clientes

1. Acesse: Menu → Clientes
2. Verifique:
   - ✅ 50 clientes listados
   - ✅ Mix de Pessoa Física e Jurídica
   - ✅ Diferentes status (ATIVO, BLOQUEADO, EM_ANALISE)
   - ✅ Endereços completos

#### 📦 Verificar Veículos

1. Acesse: Menu → Frota
2. Verifique:
   - ✅ 70 veículos cadastrados
   - ✅ Distribuição de tipos (VUC, Toco, Truck, etc.)
   - ✅ Diferentes status (DISPONÍVEL, LOCADO, MANUTENÇÃO)
   - ✅ Documentação válida

#### 📋 Verificar Contratos

1. Acesse: Menu → Contratos
2. Verifique:
   - ✅ 90 contratos listados
   - ✅ Mix de status (ATIVO, FINALIZADO, CANCELADO)
   - ✅ Valores de locação preenchidos
   - ✅ Datas válidas

#### 🔧 Verificar Ordens de Serviço

1. Acesse: Menu → Ordens de Serviço
2. Verifique:
   - ✅ 150 OS listadas
   - ✅ Distribuição de prioridade
   - ✅ SLA controlado
   - ✅ Responsáveis atribuídos

---

## 📊 PASSO 6: EXECUTAR TESTES DE NEGÓCIO

### 6.1 Teste 1: Criar novo contrato

**Pré-requisito**: Cliente ativo, veículo disponível, motorista autorizado

**Passos**:
1. Ir a Contratos → Novo Contrato
2. Selecionar Cliente (CLI-001)
3. Selecionar Veículo (VEI-001)
4. Selecionar Motorista (MOT-001)
5. Preencher datas e categoria
6. Salvar

**Resultado esperado**: ✅ Contrato criado com status DRAFT

### 6.2 Teste 2: Vistoria de saída

**Pré-requisito**: Contrato em status RESERVADO

**Passos**:
1. Abrir Contrato
2. Clicar "Iniciar Locação"
3. Sistema abre Vistoria Saída automaticamente
4. Preencher checklist com:
   - Quilometragem: 45.230 km
   - Combustível: 100%
   - Estado: BOM
5. Anexar fotos obrigatórias
6. Assinar digitalmente
7. Salvar

**Resultado esperado**: ✅ OS de vistoria finalizada, contrato em EM_LOCACAO

### 6.3 Teste 3: Vistoria de retorno com avaria

**Pré-requisito**: Contrato em EM_LOCACAO

**Passos**:
1. Abrir Contrato
2. Clicar "Finalizar Locação"
3. Sistema abre Vistoria Retorno
4. Preencher checklist com:
   - Quilometragem: 45.350 km (+120 km excedente)
   - Combustível: 85% (15% faltante)
   - Avaria: Risco lateral direita (LEVE)
5. Anexar fotos da avaria
6. Salvar

**Resultado esperado**: 
- ✅ OS vistoria concluída
- ✅ Lançamento de KM excedente criado
- ✅ Lançamento de combustível criado
- ✅ Avaria registrada
- ✅ Contrato em DEVOLVIDO

### 6.4 Teste 4: Cobrança de avaria

**Pré-requisito**: Avaria registrada

**Passos**:
1. Ir a Avarias
2. Selecionar avaria não aprovada
3. Clicar "Aprovar Cobrança"
4. Confirmar valor
5. Salvar

**Resultado esperado**: 
- ✅ Avaria em status APROVADA
- ✅ Lançamento financeiro criado
- ✅ Cobrança pendente exibida

### 6.5 Teste 5: Pagamento

**Pré-requisito**: Lançamento financeiro em aberto

**Passos**:
1. Ir a Financeiro → Cobranças Abertas
2. Selecionar cobrança
3. Clicar "Registrar Pagamento"
4. Preencher:
   - Forma de pagamento: PIX
   - Valor: (preenchido automaticamente)
   - Data de pagamento: Hoje
5. Salvar

**Resultado esperado**: 
- ✅ Lançamento com status PAGO
- ✅ Data de pagamento registrada
- ✅ Comprovante disponível

---

## ⚠️ PASSO 7: TESTAR CENÁRIOS NEGATIVOS

### 7.1 Teste: Cliente bloqueado tenta contratar

**Cenário**: CLI-004 (BLOQUEADO)

**Passos**:
1. Ir a Contratos → Novo
2. Selecionar Cliente: CLI-004
3. Tentar salvar

**Resultado esperado**: 
```
❌ ERRO: Cliente bloqueado não pode celebrar novos contratos
   Motivo: Bloqueado por inadimplência
```

### 7.2 Teste: Motorista com CNH vencida

**Cenário**: MOT-003 (CNH vencida)

**Passos**:
1. Abrir Contrato
2. Selecionar Motorista: MOT-003
3. Tentar salvar

**Resultado esperado**: 
```
❌ ERRO: Motorista com CNH vencida
   CNH Válida até: 2024-03-20
   Ação: Renove a CNH ou selecione outro motorista
```

### 7.3 Teste: Veículo com documentação vencida

**Cenário**: VEI-005 (Documentação vencida)

**Passos**:
1. Ir a Frota
2. Buscar VEI-005
3. Tentar criar contrato

**Resultado esperado**: 
```
❌ ERRO: Documentação do veículo vencida
   Licenciamento vencido em: 2024-12-31
   Ação: Regularize a documentação
```

### 7.4 Teste: Concluir OS sem checklist

**Cenário**: OS vistoria sem checklist

**Passos**:
1. Abrir OS vistoria
2. Clicar "Concluir OS"
3. Sem preencher checklist

**Resultado esperado**: 
```
❌ ERRO: Checklist obrigatório não preenchido
   Itens faltantes: 5 de 20
```

### 7.5 Teste: Pagamento maior que devido

**Cenário**: Cobrança de R$ 500

**Passos**:
1. Ir a Financeiro
2. Registrar pagamento
3. Digitar valor: R$ 600
4. Salvar

**Resultado esperado**: 
```
❌ ERRO: Valor de pagamento maior que o total devido
   Total devido: R$ 500,00
   Valor informado: R$ 600,00
```

---

## 📈 PASSO 8: VALIDAR RELATÓRIOS

### 8.1 Relatório: Faturamento por Período

**Acesso**: Menu → Relatórios → Faturamento

**Passos**:
1. Selecionar período: Últimos 30 dias
2. Clicar "Gerar Relatório"
3. Verificar:
   - ✅ Total de contratos
   - ✅ Receita por tipo
   - ✅ Valores cobrados vs. em aberto
   - ✅ Clientes principais

**Esperado**:
```
Período: 01/05 - 31/05/2025
Total Contratos: 45
Receita Locação: R$ 156.750,00
Receita KM Excedente: R$ 8.950,00
Receita Combustível: R$ 5.600,00
Receita Avarias: R$ 12.300,00
TOTAL: R$ 183.600,00

Recebido: R$ 175.200,00
Em Aberto: R$ 8.400,00
Taxa Recebimento: 95,4%
```

### 8.2 Relatório: Frota - Taxa de Ocupação

**Acesso**: Menu → Relatórios → Frota

**Esperado**:
```
Total Veículos: 70
Disponíveis: 30 (42,9%)
Locados: 18 (25,7%)
Manutenção: 12 (17,1%)
Bloqueados: 10 (14,3%)

Taxa Ocupação Média: 43%
Receita Est. Mensal: R$ 450.000
```

### 8.3 Relatório: Ordens de Serviço

**Acesso**: Menu → Relatórios → Ordens de Serviço

**Esperado**:
```
Total OS: 150
Abertas: 15 (10%)
Em Execução: 18 (12%)
Concluídas: 98 (65%)
Canceladas: 12 (8%)
Outras: 7 (5%)

SLA Cumprido: 94,8%
SLA Vencido: 3,2%
Tempo Médio: 4,2 horas
```

### 8.4 Relatório: Avarias

**Acesso**: Menu → Relatórios → Avarias

**Esperado**:
```
Total Avarias: 60
Leves: 28 (46,7%)
Médias: 20 (33,3%)
Graves: 10 (16,7%)
Críticas: 2 (3,3%)

Valor Total: R$ 145.000
Cobrado: R$ 125.000
Retido (caução): R$ 18.000
Em Análise: R$ 2.000
```

---

## 🔧 PASSO 9: LIMPEZA E RESET (SE NECESSÁRIO)

### 9.1 Resetar dados completamente

```bash
# CUIDADO - apaga tudo!
npx prisma migrate reset

# Confirmará:
# Are you sure you want to reset your database? [y/N]
# Digite: y
```

### 9.2 Apagar dados mantendo schema

```bash
# Delete de todos os dados mantendo estrutura
npx prisma db execute --stdin << 'EOF'
DELETE FROM "ServiceOrderStatusHistory";
DELETE FROM "ServiceOrderChecklistItem";
DELETE FROM "Comment";
DELETE FROM "Attachment";
DELETE FROM "Schedule";
DELETE FROM "ServiceOrder";
DELETE FROM "Contract";
DELETE FROM "Asset";
DELETE FROM "Client";
DELETE FROM "Address";
DELETE FROM "User";
DELETE FROM "UserRole";
EOF
```

### 9.3 Reexecutar seed após reset

```bash
npx ts-node scripts/seed-truck-rental-test-data.ts
```

---

## 🐛 TROUBLESHOOTING

### Erro: "Connection refused"

```bash
# Verificar se Postgres está rodando
sudo systemctl status postgresql

# Ou no Docker
docker ps | grep postgres
```

### Erro: "Database not found"

```bash
# Criar banco manualmente
createdb os_brasil_truck

# Ou com Prisma
npx prisma db push
```

### Erro: "Port already in use"

```bash
# Mudar porta no .env
DATABASE_URL="postgresql://user:pass@localhost:5433/db"
```

### Script travou

```bash
# Cancelar (Ctrl+C) e verificar logs
npx ts-node scripts/seed-truck-rental-test-data.ts 2>&1 | tail -50
```

### Dados não aparecem na interface

```bash
# Verificar se seed completou
npx prisma query 'SELECT COUNT(*) FROM "Client"'

# Limpar cache da aplicação
npm run build
npm run start
```

---

## ✅ CHECKLIST FINAL

Antes de considerar a massa pronta:

- [ ] 50 clientes criados
- [ ] 80 motoristas cadastrados
- [ ] 70 veículos disponíveis
- [ ] 90 contratos gerados
- [ ] 150 ordens de serviço criadas
- [ ] Histórico de status populado
- [ ] Testes positivos passando
- [ ] Testes negativos validando
- [ ] Relatórios gerando corretamente
- [ ] Interface respondendo
- [ ] Permissões funcionando
- [ ] Dados consistentes (sem órfãos)

---

## 📱 PRÓXIMOS PASSOS

Após validar a massa de teste:

1. **Testes Manuais Completos**
   - Executar todos os 100+ casos de teste
   - Validar cada módulo isoladamente
   - Testar integrações

2. **Testes Automatizados**
   - E2E com Cypress/Playwright
   - API com Jest/Supertest
   - Carga com K6/JMeter

3. **Homologação**
   - Validação com cliente
   - Aceitação de requisitos
   - Sign-off formal

4. **Demonstração Comercial**
   - Dados realistas prontos
   - Fluxos completos funcionando
   - Relatórios impressionantes

---

## 📞 SUPORTE

Se tiver dúvidas:

1. Verificar arquivo: `TESTE-MASSA-DE-DADOS.md`
2. Consultar logs: `npm run logs`
3. Executar queries de debug

---

**Gerado**: Maio/2025  
**Versão**: 1.0  
**Status**: ✅ Pronto para uso  
