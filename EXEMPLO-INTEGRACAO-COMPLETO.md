# 📚 Exemplo Prático Completo - Fluxo de Integração End-to-End

## 🎯 Cenário: Criar SO → Completar → Faturar

Vamos acompanhar um exemplo real do início ao fim.

---

## ✅ Pré-requisitos (Verificação Inicial)

### Dados que precisamos existir:

```sql
-- 1. Cliente ativo
SELECT * FROM "Client" 
WHERE name = 'Acme Corporation' 
AND active = true 
AND "deletedAt" IS NULL;
-- Result: id = 'cli-001', name = 'Acme Corporation'

-- 2. ServiceType ativo
SELECT * FROM "ServiceType" 
WHERE name = 'Manutenção Preventiva' 
AND active = true;
-- Result: id = 'st-001'

-- 3. Time ativo
SELECT * FROM "Team" 
WHERE name = 'Time São Paulo' 
AND active = true;
-- Result: id = 'team-sp-001'

-- 4. Técnico cadastrado
SELECT * FROM "User" 
WHERE email = 'joao.silva@company.com' 
AND status = 'ACTIVE';
-- Result: id = 'user-tech-001'

-- 5. Técnico em TeamMember
SELECT * FROM "TeamMember" 
WHERE "userId" = 'user-tech-001' 
AND "teamId" = 'team-sp-001' 
AND active = true;
-- Result: Deve existir ✓

-- 6. Endereço do cliente
SELECT * FROM "Address" 
WHERE "clientId" = 'cli-001' 
AND "isPrimary" = true 
AND "deletedAt" IS NULL;
-- Result: id = 'addr-001'

-- 7. Admin para criar SO
SELECT * FROM "User" 
WHERE email = 'admin@oms.local' 
AND status = 'ACTIVE' 
AND role = 'SUPER_ADMIN';
-- Result: id = 'admin-uuid'
```

---

## 📝 Passo 1: Criar Service Order

### Request

```http
POST /api/v1/service-orders HTTP/1.1
Authorization: Bearer <JWT_TOKEN_ADMIN>
Content-Type: application/json

{
  "clientId": "cli-001",
  "serviceTypeId": "st-001",
  "title": "Manutenção Preventiva - Servidor Principal",
  "description": "Manutenção preventiva do servidor principal de produção incluindo limpeza, atualização de firmware e verificação de componentes.",
  "assignedTeamId": "team-sp-001",
  "assignedTechnicianId": "user-tech-001",
  "locationAddressId": "addr-001",
  "estimatedValue": 2500.00
}
```

### Validações Executadas (Backend)

```typescript
// 1. Validar Cliente
async validateClient('cli-001') {
  const client = await db.client.findUnique({ where: { id: 'cli-001' } });
  // ✓ Existe
  // ✓ active = true
  // ✓ deletedAt = null
  return client;
}

// 2. Validar ServiceType
async validateServiceType('st-001') {
  const st = await db.serviceType.findUnique({ where: { id: 'st-001' } });
  // ✓ Existe
  // ✓ active = true
  return st;
}

// 3. Validar Team
async validateTeam('team-sp-001') {
  const team = await db.team.findUnique({ where: { id: 'team-sp-001' } });
  // ✓ Existe
  // ✓ active = true
  return team;
}

// 4. CRÍTICO: Validar Technician em Team
async validateTechnicianInTeam('user-tech-001', 'team-sp-001') {
  const tm = await db.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId: 'user-tech-001',
        teamId: 'team-sp-001'
      }
    }
  });
  // ✓ Existe
  // ✓ active = true
  // ✓ deletedAt = null
  return tm;
}

// 5. Validar Address
async validateAddress('addr-001', 'cli-001') {
  const addr = await db.address.findUnique({ where: { id: 'addr-001' } });
  // ✓ Existe
  // ✓ clientId = 'cli-001' (mesmo cliente)
  // ✓ deletedAt = null
  return addr;
}

// 6. Criar SO dentro de transação
await db.$transaction(async (tx) => {
  const so = await tx.serviceOrder.create({
    data: {
      clientId: 'cli-001',
      serviceTypeId: 'st-001',
      title: 'Manutenção Preventiva - Servidor Principal',
      description: '...',
      assignedTeamId: 'team-sp-001',
      assignedTechnicianId: 'user-tech-001',
      locationAddressId: 'addr-001',
      estimatedValue: 2500.00,
      createdById: 'admin-uuid',
      status: 'OPEN'
    }
  });

  // 7. Registrar Auditoria
  await tx.audit.create({
    data: {
      entityType: 'SERVICE_ORDER',
      entityId: so.id,
      action: 'CREATE',
      userId: 'admin-uuid',
      changes: JSON.stringify(so),
      timestamp: new Date()
    }
  });

  // 8. Enviar Notificação
  await notificationService.send({
    event: 'ServiceOrderCreated',
    data: {
      serviceOrderId: so.id,
      clientId: 'cli-001',
      technician: 'João Silva',
      title: 'Manutenção Preventiva - Servidor Principal'
    },
    channels: ['email', 'websocket']
  });

  return so;
});
```

### Response ✅

```json
{
  "id": "so-20260421-001",
  "clientId": "cli-001",
  "serviceTypeId": "st-001",
  "title": "Manutenção Preventiva - Servidor Principal",
  "description": "Manutenção preventiva do servidor principal...",
  "status": "OPEN",
  "assignedTeamId": "team-sp-001",
  "assignedTechnicianId": "user-tech-001",
  "locationAddressId": "addr-001",
  "estimatedValue": 2500.00,
  "createdAt": "2026-04-21T10:30:00Z",
  "createdById": "admin-uuid",
  "updatedAt": "2026-04-21T10:30:00Z"
}
```

### Estado do Banco

```sql
-- Service Order criada
SELECT * FROM "ServiceOrder" WHERE id = 'so-20260421-001';
-- status = 'OPEN'

-- Auditoria registrada
SELECT * FROM "Audit" WHERE "entityId" = 'so-20260421-001' AND action = 'CREATE';

-- Notificação enviada
SELECT * FROM "Notification" 
WHERE event = 'ServiceOrderCreated' 
AND "entityId" = 'so-20260421-001'
ORDER BY "createdAt" DESC;
```

---

## 🔄 Passo 2: Transicionar Status

Acompanhando o progresso da SO ao longo dos dias:

### Transição 1: OPEN → UNDER_ANALYSIS

```http
PUT /api/v1/service-orders/so-20260421-001/status HTTP/1.1
Authorization: Bearer <JWT_TOKEN_MANAGER>

{
  "newStatus": "UNDER_ANALYSIS"
}
```

**Backend valida:**
- ✓ SO existe
- ✓ Status atual = OPEN
- ✓ Transição OPEN → UNDER_ANALYSIS é válida (policy)
- ✓ Registra auditoria
- ✓ Envia notificação

---

### Transição 2: UNDER_ANALYSIS → WAITING_APPROVAL

```http
PUT /api/v1/service-orders/so-20260421-001/status HTTP/1.1

{
  "newStatus": "WAITING_APPROVAL"
}
```

---

### Transição 3-6: Progredindo pelo fluxo

```
WAITING_APPROVAL → SCHEDULED (agendada para 2026-04-25)
       ↓
    Dispatch.create({
      serviceOrderId: 'so-20260421-001',
      technicianId: 'user-tech-001',
      teamId: 'team-sp-001',
      scheduledDate: '2026-04-25',
      startTime: '09:00',
      endTime: '17:00',
      location: 'Av. Paulista, 1000 - São Paulo'
    })
    ↓
SCHEDULED → IN_TRANSIT (técnico saiu para local)
       ↓
DISPATCH logs: { status: 'ON_WAY', location: '-23.5505, -46.6333' }
       ↓
IN_TRANSIT → IN_PROGRESS (chegou no local)
       ↓
    ✓ Technician começa atualizar campos
    ✓ Manutenção iniciada em 2026-04-25 09:15
    ✓ Peças trocadas: HDD 1TB, RAM 8GB
    ✓ Tempo gasto: 4 horas
```

---

### Transição Final: IN_PROGRESS → COMPLETED

```http
PUT /api/v1/service-orders/so-20260421-001/status HTTP/1.1

{
  "newStatus": "COMPLETED",
  "completionNotes": "Manutenção concluída com sucesso. Servidor testado e funcionando normalmente.",
  "actualValue": 2400.00
}
```

**Backend:**
- ✓ Valida transição
- ✓ Registra hora de conclusão
- ✓ Atualiza actualValue
- ✓ **Status agora = COMPLETED** → Permite emissão de invoice!
- ✓ Registra auditoria
- ✓ Envia notificação para cliente

**Estado do Banco:**

```sql
SELECT id, status, "completedAt", "actualValue" 
FROM "ServiceOrder" 
WHERE id = 'so-20260421-001';

-- Result:
-- id: so-20260421-001
-- status: COMPLETED ✓✓✓
-- completedAt: 2026-04-25 13:45:00
-- actualValue: 2400.00
```

---

## 💰 Passo 3: Emitir Invoice

Agora que SO está COMPLETED, podemos emitir a nota fiscal.

### Request

```http
POST /api/v1/invoices HTTP/1.1
Authorization: Bearer <JWT_TOKEN_ADMIN>
Content-Type: application/json

{
  "serviceOrderId": "so-20260421-001",
  "grossAmount": 2400.00,
  "discountAmount": 240.00,
  "taxAmount": 384.00,
  "issueDate": "2026-04-25",
  "dueDate": "2026-05-25"
}
```

### Validações Executadas (Backend)

```typescript
// 1. Validar SO existe
const so = await db.serviceOrder.findUnique({
  where: { id: 'so-20260421-001' }
});
// ✓ Existe
// ✓ Não deletada

// 2. CRÍTICO: Validar SO.status = COMPLETED
if (so.status !== 'COMPLETED') {
  throw new BadRequestException('SO não está COMPLETED');
}
// ✓ so.status = 'COMPLETED'

// 3. Validar valor bruto
const grossAmount = 2400.00;
if (grossAmount <= 0) {
  throw new BadRequestException('Valor bruto deve ser > 0');
}
// ✓ 2400 > 0

// 4. Validar desconto
const discountAmount = 240.00;
if (discountAmount < 0 || discountAmount > grossAmount) {
  throw new BadRequestException('Desconto inválido');
}
// ✓ 0 <= 240 <= 2400

// 5. Validar imposto
const taxAmount = 384.00;
if (taxAmount < 0) {
  throw new BadRequestException('Imposto inválido');
}
// ✓ 384 >= 0

// 6. Validar valor líquido
const netAmount = grossAmount - discountAmount + taxAmount;
// 2400 - 240 + 384 = 2544
if (netAmount <= 0) {
  throw new BadRequestException('Valor líquido negativo');
}
// ✓ 2544 > 0

// 7. CRÍTICO: Verificar se já existe invoice
const existingInvoice = await db.invoice.findUnique({
  where: { serviceOrderId_deletedAt: {
    serviceOrderId: 'so-20260421-001',
    deletedAt: null
  }}
});
if (existingInvoice) {
  throw new BadRequestException('Invoice já existe para esta SO');
}
// ✓ Não existe

// 8. Criar Invoice dentro de transação
await db.$transaction(async (tx) => {
  const invoice = await tx.invoice.create({
    data: {
      serviceOrderId: 'so-20260421-001',
      grossAmount: 2400.00,
      discountAmount: 240.00,
      taxAmount: 384.00,
      netAmount: 2544.00,
      issueDate: new Date('2026-04-25'),
      dueDate: new Date('2026-05-25'),
      status: 'ISSUED',
      createdById: 'admin-uuid'
    }
  });

  // 9. Registrar auditoria
  await tx.audit.create({
    data: {
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: 'CREATE',
      userId: 'admin-uuid',
      changes: JSON.stringify({
        serviceOrderId: 'so-20260421-001',
        grossAmount: 2400.00,
        netAmount: 2544.00,
        status: 'ISSUED'
      }),
      timestamp: new Date()
    }
  });

  // 10. Gerar documento de invoice
  await documentAutoService.generateInvoiceDocument({
    invoiceId: invoice.id,
    clientName: 'Acme Corporation',
    serviceTitle: 'Manutenção Preventiva - Servidor Principal',
    amount: 2544.00
  });

  // 11. Enviar notificações
  await notificationService.send({
    event: 'InvoiceCreated',
    data: {
      invoiceId: invoice.id,
      clientId: so.clientId,
      amount: 2544.00,
      dueDate: '2026-05-25'
    },
    channels: ['email', 'websocket']
  });

  return invoice;
});
```

### Response ✅

```json
{
  "id": "inv-20260425-001",
  "serviceOrderId": "so-20260421-001",
  "grossAmount": 2400.00,
  "discountAmount": 240.00,
  "taxAmount": 384.00,
  "netAmount": 2544.00,
  "status": "ISSUED",
  "issueDate": "2026-04-25",
  "dueDate": "2026-05-25",
  "createdAt": "2026-04-25T14:00:00Z",
  "createdById": "admin-uuid"
}
```

### Estado Final do Banco

```sql
-- Invoice criada
SELECT * FROM "Invoice" WHERE id = 'inv-20260425-001';
-- status = 'ISSUED', netAmount = 2544.00

-- SO marcada como faturada
SELECT "invoiceId" FROM "ServiceOrder" WHERE id = 'so-20260421-001';
-- invoiceId = 'inv-20260425-001'

-- Auditoria completa
SELECT action, "entityType", "updatedAt"
FROM "Audit"
WHERE "entityId" = 'so-20260421-001'
ORDER BY "updatedAt" DESC;
-- CREATE, STATUS_UPDATE (6x), UPDATE (actualValue)
```

---

## 📊 Fluxo Visual Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    Dia 1 (21/04/2026)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Admin] → API POST /service-orders                         │
│       ↓                                                       │
│  ✓ Validar Client (Acme Corp)                              │
│  ✓ Validar ServiceType (Manutenção)                        │
│  ✓ Validar Team (Time SP)                                   │
│  ✓ Validar Technician in Team (João Silva)                 │
│  ✓ Validar Address (Av. Paulista)                          │
│       ↓                                                       │
│  📝 ServiceOrder criada: SO-001                            │
│  Status: OPEN                                                │
│  Técnico atribuído: João Silva                             │
│  Valor estimado: R$ 2.500,00                               │
│       ↓                                                       │
│  📧 Email → Client + Team                                   │
│  📝 Auditoria: CREATE por Admin                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Dias 2-4 (22-24/04/2026)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Manager] → Status: UNDER_ANALYSIS                        │
│       ↓                                                       │
│  [Manager] → Status: WAITING_APPROVAL                      │
│       ↓                                                       │
│  [Dispatcher] → Schedule + Dispatch                        │
│  ├─ Agendado para: 25/04/2026                             │
│  ├─ Técnico: João Silva                                    │
│  └─ Localização: Av. Paulista, 1000                        │
│       ↓                                                       │
│  [Manager] → Status: SCHEDULED                             │
│                                                               │
│  📧 Email → Técnico: "Você foi atribuído a..."             │
│  📧 Email → Client: "Sua manutenção está agendada"        │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Dia 5 (25/04/2026)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  09:00 - Técnico sai para local                           │
│  [João] → Dispatch: Status IN_TRANSIT                     │
│  📍 Location: -23.5505, -46.6333                           │
│       ↓                                                       │
│  09:15 - Técnico chega no local                           │
│  [João] → SO Status: IN_PROGRESS                          │
│  ⏱️  Início: 09:15                                          │
│       ↓                                                       │
│  10:00 - 13:00 - Manutenção em progresso                 │
│  [João] → Updates:                                         │
│    ├─ Limpeza do servidor: ✓                              │
│    ├─ Trocou HDD 1TB: ✓                                   │
│    ├─ Trocou RAM 8GB: ✓                                   │
│    ├─ Firmware atualizado: ✓                              │
│    └─ Testes realizados: ✓                                │
│       ↓                                                       │
│  13:45 - Manutenção concluída                            │
│  [João] → SO Status: COMPLETED                           │
│  📋 Valor final: R$ 2.400,00                              │
│  ⏱️  Tempo gasto: 4h 30m                                    │
│       ↓                                                       │
│  ✓ Sistema permite emissão de invoice                      │
│  📧 Email → Admin: "SO completa, pronta para faturar"    │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Dia 5 (25/04/2026)                       │
│                  14:00 - Faturamento                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Admin] → API POST /invoices                              │
│       ↓                                                       │
│  ✓ Validar SO existe e NÃO deletada                       │
│  ✓ Validar SO.status === COMPLETED                        │
│  ✓ Validar grossAmount: 2.400 > 0                         │
│  ✓ Validar discount: 240 <= 2.400                         │
│  ✓ Validar tax: 384 >= 0                                  │
│  ✓ Validar netAmount: (2400 - 240 + 384) = 2544 > 0     │
│  ✓ Validar invoice única: COUNT = 0                      │
│       ↓                                                       │
│  💰 Invoice criada: INV-001                               │
│  Status: ISSUED                                             │
│  Valor líquido: R$ 2.544,00                               │
│  Vencimento: 25/05/2026                                    │
│       ↓                                                       │
│  📄 Documento gerado (PDF/NFS-e)                           │
│  📧 Email → Client: Nota fiscal anexada                   │
│  📧 Email → Admin: Invoice emitida com sucesso            │
│  📝 Auditoria: CREATE por Admin                           │
│                                                               │
│  ✅ FLUXO COMPLETO SUCESSO!                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Verificação de Dados no Banco

### Query Final Completa

```sql
-- Verificar toda a jornada
SELECT 
  so.id as "serviceOrderId",
  so.status,
  so."createdAt",
  so."completedAt",
  so."estimatedValue",
  so."actualValue",
  inv.id as "invoiceId",
  inv.status as "invoiceStatus",
  inv."netAmount",
  inv."issueDate",
  inv."dueDate"
FROM "ServiceOrder" so
LEFT JOIN "Invoice" inv ON so.id = inv."serviceOrderId"
WHERE so.id = 'so-20260421-001';

-- Result:
-- serviceOrderId | status    | createdAt  | completedAt | estimatedValue | actualValue | invoiceId   | invoiceStatus | netAmount | issueDate  | dueDate
-- so-20260421-001| COMPLETED | 21/04 10:30| 25/04 13:45 | 2500.00        | 2400.00     | inv-20260425| ISSUED        | 2544.00   | 25/04      | 25/05

-- Auditoria completa
SELECT 
  action,
  COUNT(*) as "count"
FROM "Audit"
WHERE "entityId" IN ('so-20260421-001', 'inv-20260425-001')
GROUP BY action;

-- Result:
-- action          | count
-- CREATE          | 2
-- STATUS_UPDATE   | 6
-- UPDATE          | 1

-- Notificações enviadas
SELECT 
  event,
  COUNT(*) as "count",
  MAX("createdAt") as "lastSent"
FROM "Notification"
WHERE "entityId" IN ('so-20260421-001', 'inv-20260425-001')
GROUP BY event;

-- Result:
-- event                    | count | lastSent
-- ServiceOrderCreated      | 1     | 21/04 10:30
-- ServiceOrderStatusChanged| 7     | 25/04 13:45
-- InvoiceCreated          | 1     | 25/04 14:00
```

---

## 🎯 Aprendizados Importantes

### ✅ O Que Funcionou

1. **Validação em camadas:**
   - DTOs validam formato
   - Service valida negócio
   - Repositório persiste

2. **Transações:**
   - SO, Auditoria, Notificação no mesmo $transaction
   - Se falhar, tudo é revertido

3. **Herança opcional:**
   - Asset pode fornecer Contract/SLA/Address
   - Mas podem ser fornecidos manualmente

4. **Compatibilidade:**
   - TeamMember valida se Technician ∈ Team
   - Impede agendamento inválido

5. **Invoice obrigatoriamente COMPLETED:**
   - Impede faturamento prematuro
   - Garante SO com dados finalizados

### ⚠️ Erros Comuns Evitados

1. **❌ Criar SO com cliente inativo**
   - ✅ Validado: client.active = true

2. **❌ Atribuir técnico que não está no time**
   - ✅ Validado: TeamMember existe

3. **❌ Faturar SO ainda em progresso**
   - ✅ Validado: status = COMPLETED

4. **❌ Emitir duas invoices para mesma SO**
   - ✅ Validado: COUNT(*) = 0

5. **❌ Invoice com valor negativo**
   - ✅ Validado: netAmount > 0

---

## 📚 Arquivos Relacionados

- **[FLUXO-INTEGRACAO-ANALISE.md](FLUXO-INTEGRACAO-ANALISE.md)** - Detalhes técnicos
- **[PADROES-INTEGRACAO.md](PADROES-INTEGRACAO.md)** - Como implementar similar
- **[TROUBLESHOOTING-INTEGRACAO.md](TROUBLESHOOTING-INTEGRACAO.md)** - Se algo der errado
- **[INTEGRATION-RULES.md](INTEGRATION-RULES.md)** - Regras completas

---

**Versão:** 1.0  
**Data:** 2026-04-21  
**Status:** ✅ Exemplo Funcional Completo
