# 🔧 Guia de Troubleshooting - Fluxo de Integração OMS

## 📍 Índice Rápido

1. [Erros ao Criar Service Order](#erros-ao-criar-service-order)
2. [Erros ao Transicionar Status](#erros-ao-transicionar-status)
3. [Erros ao Emitir Invoice](#erros-ao-emitir-invoice)
4. [Erros de Agendamento (Dispatch)](#erros-de-agendamento-dispatch)
5. [Problemas de Dados Herdados](#problemas-de-dados-herdados)
6. [Problemas de Notificação](#problemas-de-notificação)
7. [Verificações de Banco de Dados](#verificações-de-banco-de-dados)

---

## ❌ Erros ao Criar Service Order

### Erro: "Cliente não encontrado"

**Possíveis causas:**
1. UUID do cliente está errado
2. Cliente foi deletado (soft delete)
3. Cliente está desativado
4. Cliente não existe no banco

**Como debugar:**

```bash
# 1. Verificar se cliente existe
SELECT id, name, active, "deletedAt" 
FROM "Client" 
WHERE id = 'uuid-do-cliente-aqui';

# 2. Resultado esperado:
# id | name | active | deletedAt
# ---|------|--------|----------
# uuid | X | true | null

# 3. Se deletedAt != NULL → cliente foi deletado
# 4. Se active = false → cliente está inativo
```

**Solução:**
```bash
# Reativar cliente
UPDATE "Client" 
SET active = true, "deletedAt" = null 
WHERE id = 'uuid-do-cliente-aqui';

# Ou criar novo cliente
POST /api/v1/clients
{
  "name": "Novo Cliente",
  "email": "cliente@example.com"
}
```

---

### Erro: "ServiceType inativo"

**Possíveis causas:**
1. ServiceType não existe
2. ServiceType está desativado
3. UUID errado

**Como debugar:**

```bash
# Verificar ServiceType
SELECT id, name, active, "deletedAt" 
FROM "ServiceType" 
WHERE id = 'uuid-do-servicetype';

# Se não retorna → não existe
# Se active = false → desativado
```

**Solução:**
```bash
# Reativar ServiceType
UPDATE "ServiceType" 
SET active = true 
WHERE id = 'uuid-do-servicetype';

# Ou listar ServiceTypes disponíveis
SELECT id, name, active 
FROM "ServiceType" 
WHERE active = true
ORDER BY name;
```

---

### Erro: "Técnico não está vinculado ao time" ⚠️ CRÍTICO

**Este é um dos erros mais comuns!**

**Possíveis causas:**
1. Técnico não foi adicionado ao Team
2. TeamMember foi deletado
3. TeamMember está inativo
4. IDs de técnico ou time estão trocados

**Como debugar:**

```bash
# 1. Verificar se existe TeamMember
SELECT * FROM "TeamMember" 
WHERE "userId" = 'uuid-tecnico' 
AND "teamId" = 'uuid-time';

# 2. Se não retorna → não existe
# 3. Se retorna com deletedAt != NULL → foi deletado
# 4. Se active = false → está inativo

# 5. Listar todos os teams do técnico
SELECT t.id, t.name, tm.active 
FROM "Team" t
JOIN "TeamMember" tm ON t.id = tm."teamId"
WHERE tm."userId" = 'uuid-tecnico'
AND tm."deletedAt" IS NULL
AND tm.active = true;
```

**Solução:**

```bash
# Adicionar técnico ao time
POST /api/v1/teams/{teamId}/members
{
  "userId": "uuid-tecnico"
}

# Ou reativar TeamMember existente
UPDATE "TeamMember" 
SET active = true, "deletedAt" = null 
WHERE "userId" = 'uuid-tecnico' 
AND "teamId" = 'uuid-time';

# Verificar membros ativos do time
SELECT u.id, u.name, tm.active
FROM "TeamMember" tm
JOIN "User" u ON tm."userId" = u.id
WHERE tm."teamId" = 'uuid-time'
AND tm.active = true
AND tm."deletedAt" IS NULL;
```

---

### Erro: "Endereço inválido"

**Possíveis causas:**
1. Endereço não existe
2. Endereço pertence a outro cliente
3. Endereço foi deletado

**Como debugar:**

```bash
# Verificar endereço
SELECT id, "clientId", street, "deletedAt" 
FROM "Address" 
WHERE id = 'uuid-endereco';

# Deve retornar o mesmo clientId da SO
```

**Solução:**
```bash
# Usar endereço correto do cliente
SELECT id, street, city 
FROM "Address" 
WHERE "clientId" = 'uuid-cliente' 
AND "deletedAt" IS NULL
ORDER BY "isPrimary" DESC;
```

---

### Erro: "Contrato inválido"

**Possíveis causas:**
1. Contrato não existe
2. Contrato pertence a outro cliente
3. Contrato está cancelado/inativo

**Como debugar:**

```bash
# Verificar contrato
SELECT id, "clientId", status, "deletedAt" 
FROM "Contract" 
WHERE id = 'uuid-contrato';

# Verificar se pertence ao mesmo cliente
SELECT id, "clientId", status 
FROM "Contract" 
WHERE "clientId" = 'uuid-cliente' 
AND status = 'ACTIVE'
AND "deletedAt" IS NULL;
```

---

## ❌ Erros ao Transicionar Status

### Erro: "Transição inválida"

**Fluxo permitido:**
```
OPEN → UNDER_ANALYSIS → WAITING_APPROVAL → SCHEDULED 
→ IN_TRANSIT → IN_PROGRESS → COMPLETED
```

**Possíveis causas:**
1. Tentou pular etapas
2. SO já foi finalizada/cancelada
3. Tentou voltar para status anterior

**Como debugar:**

```bash
# Verificar status atual
SELECT id, status, "createdAt" 
FROM "ServiceOrder" 
WHERE id = 'uuid-so';

# Verificar transições registradas
SELECT "newStatus", "updatedAt" 
FROM "Audit" 
WHERE "entityType" = 'SERVICE_ORDER'
AND "entityId" = 'uuid-so'
AND action = 'STATUS_UPDATE'
ORDER BY "updatedAt" DESC;
```

**Solução:**
```bash
# Seguir fluxo correto de status
# Se SO está em OPEN, próximo deve ser UNDER_ANALYSIS
PUT /api/v1/service-orders/{id}/status
{
  "newStatus": "UNDER_ANALYSIS"
}
```

---

### Erro: "SO foi reopenned/cancelada"

**Como debugar:**

```bash
# Verificar se SO foi reabert ida
SELECT status, "deletedAt" 
FROM "ServiceOrder" 
WHERE id = 'uuid-so';

# Verificar histórico de cancelamentos
SELECT * FROM "Audit"
WHERE "entityType" = 'SERVICE_ORDER'
AND "entityId" = 'uuid-so'
AND action IN ('CANCEL', 'REOPEN')
ORDER BY "updatedAt" DESC;
```

---

## ❌ Erros ao Emitir Invoice

### Erro: "SO não está COMPLETED"

**Possíveis causas:**
1. SO ainda está em progresso
2. SO foi cancelada
3. Status errado

**Como debugar:**

```bash
# Verificar status da SO
SELECT id, status 
FROM "ServiceOrder" 
WHERE id = 'uuid-so';

# Se não é COMPLETED → não pode emitir invoice
```

**Solução:**
```bash
# Completar a SO primeiro
PUT /api/v1/service-orders/{id}/status
{
  "newStatus": "COMPLETED"
}

# Depois emitir invoice
POST /api/v1/invoices
{
  "serviceOrderId": "uuid-so",
  "grossAmount": 5000.00,
  "discountAmount": 500.00,
  "taxAmount": 750.00
}
```

---

### Erro: "Valor bruto inválido"

**Possíveis causas:**
1. `grossAmount` não fornecido
2. `estimatedValue` na SO é null/0
3. Valor é negativo ou zero

**Como debugar:**

```bash
# Verificar estimatedValue da SO
SELECT id, "estimatedValue" 
FROM "ServiceOrder" 
WHERE id = 'uuid-so';

# Se null ou 0 → problema
```

**Solução:**
```bash
# Opção 1: Fornecer grossAmount na invoice
POST /api/v1/invoices
{
  "serviceOrderId": "uuid-so",
  "grossAmount": 5000.00
}

# Opção 2: Preencher estimatedValue na SO
PUT /api/v1/service-orders/{id}
{
  "estimatedValue": 5000.00
}
```

---

### Erro: "Desconto > valor bruto"

**Como debugar:**

```bash
# Verificar valores
SELECT 
  "grossAmount",
  "discountAmount",
  "grossAmount" - "discountAmount" as netAfterDiscount
FROM "Invoice" 
WHERE id = 'uuid-invoice';

# discountAmount DEVE ser <= grossAmount
```

**Solução:**
```bash
# Validar cálculo antes de submeter
grossAmount = 5000
discountAmount = 500   # ✓ OK (500 < 5000)
taxAmount = 750
netAmount = 5000 - 500 + 750 = 5250

# Se desconto for > 5000 → ERRO
```

---

### Erro: "Invoice já existe para esta SO" ⚠️

**Possíveis causas:**
1. Invoice já foi emitida
2. Tentativa de emitir duas invoices para mesma SO

**Como debugar:**

```bash
# Verificar invoices existentes
SELECT id, status, "deletedAt" 
FROM "Invoice" 
WHERE "serviceOrderId" = 'uuid-so';

# Se retorna com deletedAt IS NULL → já existe ativa
```

**Solução:**
```bash
# Opção 1: Usar invoice existente (não emitir nova)
GET /api/v1/invoices?serviceOrderId=uuid-so

# Opção 2: Cancelar invoice existente e criar nova
PUT /api/v1/invoices/{id}/cancel
# Depois:
POST /api/v1/invoices
{ ... }

# Opção 3: Verificar se foi deletada acidentalmente
SELECT id, status, "deletedAt" 
FROM "Invoice" 
WHERE "serviceOrderId" = 'uuid-so'
AND "deletedAt" IS NOT NULL;
# Se existe → pode recuperar ou criar nova
```

---

## ❌ Erros de Agendamento (Dispatch)

### Erro: "Agendamento falhou - técnico não em time"

**Mesmo erro da criação de SO!**

**Solução rápida:**
```bash
# Garantir que técnico está no time
INSERT INTO "TeamMember" ("userId", "teamId", "active", "createdAt")
VALUES ('uuid-tecnico', 'uuid-time', true, now())
ON CONFLICT ("userId", "teamId") DO UPDATE
SET active = true, "deletedAt" = null;
```

---

### Erro: "Time inativo"

**Como debugar:**

```bash
# Verificar team
SELECT id, name, active, "deletedAt" 
FROM "Team" 
WHERE id = 'uuid-time';
```

**Solução:**
```bash
# Reativar time
UPDATE "Team" 
SET active = true, "deletedAt" = null 
WHERE id = 'uuid-time';
```

---

## ❌ Problemas de Dados Herdados

### Cenário: Asset → Contract → SLA não herdados

**Como funciona a herança:**

```
ServiceOrder com linkedAssetId
    ↓
Asset existe?
    ↓
    Asset.contractId → SO.contractId (herdado)
    Asset.slaId → SO.slaId (herdado) *via Contract*
    Asset.addressId → SO.locationAddressId (herdado)
```

**Como debugar:**

```bash
# 1. Verificar Asset
SELECT id, "contractId", "clientId", "addressId" 
FROM "Asset" 
WHERE id = 'uuid-asset';

# 2. Verificar Contract do Asset
SELECT id, "slaId", status 
FROM "Contract" 
WHERE id = (SELECT "contractId" FROM "Asset" WHERE id = 'uuid-asset');

# 3. Verificar SLA do Contract
SELECT id, "responseTime" 
FROM "SLA" 
WHERE id = (
  SELECT "slaId" FROM "Contract" 
  WHERE id = (SELECT "contractId" FROM "Asset" WHERE id = 'uuid-asset')
);

# 4. Verificar SO criada com Asset
SELECT id, "linkedAssetId", "contractId", "slaId", "locationAddressId" 
FROM "ServiceOrder" 
WHERE "linkedAssetId" = 'uuid-asset';
```

**O que esperar:**
- Se Asset tem contractId → SO deve herdar
- Se Asset não tem contractId → SO.contractId fica null
- SLA deve vir do Contract (via Asset → Contract → SLA)

---

## ❌ Problemas de Notificação

### Notificações não estão sendo enviadas

**Como debugar:**

```bash
# 1. Verificar logs
docker logs os-app | grep -i "notificações\|error"

# 2. Verificar se fila de notificações tem items
SELECT COUNT(*) FROM "Notification" WHERE status = 'PENDING';

# 3. Verificar últimas notificações
SELECT id, event, status, "createdAt" 
FROM "Notification" 
ORDER BY "createdAt" DESC 
LIMIT 10;

# 4. Se muitas PENDING → fila pode estar travada
```

**Solução:**

```bash
# Reprocessar notificações pendentes
UPDATE "Notification" 
SET status = 'PENDING', "updatedAt" = now()
WHERE status IN ('FAILED', 'ERROR')
AND "updatedAt" < now() - interval '1 hour';

# Monitorar worker
docker logs os-notifications-worker -f

# Reiniciar worker se necessário
docker restart os-notifications-worker
```

---

## 📊 Verificações de Banco de Dados

### Health Check Completo

```bash
# 1. Verificar tabelas principais
SELECT COUNT(*) as clients FROM "Client" WHERE "deletedAt" IS NULL;
SELECT COUNT(*) as users FROM "User" WHERE "deletedAt" IS NULL;
SELECT COUNT(*) as service_orders FROM "ServiceOrder" WHERE "deletedAt" IS NULL;
SELECT COUNT(*) as invoices FROM "Invoice" WHERE "deletedAt" IS NULL;
SELECT COUNT(*) as teams FROM "Team" WHERE active = true;

# 2. Verificar SOs sem dependências
SELECT so.id, so.status 
FROM "ServiceOrder" so
LEFT JOIN "Client" c ON so."clientId" = c.id
WHERE c.id IS NULL
AND so."deletedAt" IS NULL;

# 3. Verificar SOs com Technician mas sem Team
SELECT id, "assignedTechnicianId", "assignedTeamId" 
FROM "ServiceOrder" 
WHERE "assignedTechnicianId" IS NOT NULL 
AND "assignedTeamId" IS NULL;

# 4. Verificar Invoices sem SO
SELECT i.id 
FROM "Invoice" i
LEFT JOIN "ServiceOrder" so ON i."serviceOrderId" = so.id
WHERE so.id IS NULL
AND i."deletedAt" IS NULL;

# 5. Contar SO por status
SELECT status, COUNT(*) 
FROM "ServiceOrder" 
WHERE "deletedAt" IS NULL 
GROUP BY status;

# 6. SOs abertas a mais de 30 dias
SELECT id, status, "createdAt" 
FROM "ServiceOrder" 
WHERE status NOT IN ('COMPLETED', 'CANCELED')
AND "createdAt" < now() - interval '30 days'
ORDER BY "createdAt" DESC;
```

### Otimizar Queries

```bash
# Criar índices se necessário
CREATE INDEX idx_serviceorder_clientid ON "ServiceOrder"("clientId");
CREATE INDEX idx_serviceorder_status ON "ServiceOrder"(status);
CREATE INDEX idx_invoice_serviceorderid ON "Invoice"("serviceOrderId");
CREATE INDEX idx_audit_entityid ON "Audit"("entityId");
CREATE INDEX idx_teamember_userid_teamid ON "TeamMember"("userId", "teamId");

# Verificar índices existentes
SELECT indexname FROM pg_indexes WHERE tablename = 'ServiceOrder';
```

---

## 🚨 Emergência: Rollback de Operação

### Se uma operação falhar e ficar inconsistente

```bash
# 1. Identificar SO problemática
SELECT id, status, "createdAt", "createdById" 
FROM "ServiceOrder" 
WHERE id = 'uuid-problema';

# 2. Ver histórico de mudanças
SELECT action, "newStatus", "updatedAt", "userId" 
FROM "Audit" 
WHERE "entityId" = 'uuid-problema'
ORDER BY "updatedAt" DESC;

# 3. Rollback de status
UPDATE "ServiceOrder" 
SET status = 'OPEN' 
WHERE id = 'uuid-problema';

# 4. Registrar na auditoria
INSERT INTO "Audit" ("entityType", "entityId", action, "userId", changes, "createdAt")
VALUES (
  'SERVICE_ORDER',
  'uuid-problema',
  'ROLLBACK',
  'admin-uuid',
  '{"reason": "manual rollback", "oldStatus": "COMPLETED"}',
  now()
);

# 5. Se foi emitida invoice errada - deletar
DELETE FROM "Invoice" 
WHERE "serviceOrderId" = 'uuid-problema'
AND "createdAt" > (now() - interval '1 hour');
```

---

## 📈 Monitoramento Contínuo

### Queries para Dashboard

```bash
# Fila de SOs abertas
SELECT 
  DATE(so."createdAt") as data,
  COUNT(*) as total,
  COUNTIF(so.status IN ('OPEN', 'UNDER_ANALYSIS')) as pendentes
FROM "ServiceOrder" so
WHERE so."deletedAt" IS NULL
GROUP BY DATE(so."createdAt")
ORDER BY data DESC
LIMIT 30;

# Taxa de conclusão por cliente
SELECT 
  c.name,
  COUNT(CASE WHEN so.status = 'COMPLETED' THEN 1 END) * 100 / COUNT(*) as conclusao_pct
FROM "Client" c
JOIN "ServiceOrder" so ON c.id = so."clientId"
WHERE so."deletedAt" IS NULL
AND so."createdAt" > now() - interval '30 days'
GROUP BY c.id, c.name
ORDER BY conclusao_pct DESC;

# Invoices por mês
SELECT 
  DATE_TRUNC('month', i."createdAt") as mes,
  COUNT(*) as invoices,
  SUM("netAmount") as total_faturado
FROM "Invoice" i
WHERE i."deletedAt" IS NULL
GROUP BY DATE_TRUNC('month', i."createdAt")
ORDER BY mes DESC;
```

---

## ✅ Checklist Rápido

- [ ] Cliente existe + ativo?
- [ ] ServiceType existe + ativo?
- [ ] Team existe + ativo?
- [ ] Technician em TeamMember?
- [ ] Address pertence ao cliente?
- [ ] Contract ativo + mesmo cliente?
- [ ] SO status == COMPLETED antes de invoice?
- [ ] Valor bruto > 0?
- [ ] Invoice única por SO?
- [ ] Notificações sendo enviadas?
- [ ] Auditoria registrando mudanças?

---

**Versão:** 1.0  
**Data:** 2026-04-21  
**Status:** ✅ Ready for Production
