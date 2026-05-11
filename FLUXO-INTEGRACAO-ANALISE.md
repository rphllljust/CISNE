# 📊 Análise Detalhada do Fluxo de Integração - Sistema OMS

## 📍 Visão Geral

O sistema OMS é uma aplicação NestJS + React 19 com arquitetura modular baseada em FSD (Feature-Sliced Design). A integração entre módulos segue um fluxo hierárquico com 12 módulos principais interconectados.

---

## 🏗️ Arquitetura de Módulos

### Módulos Principais (18 total):

```
1. AUTH               → Autenticação e autorização
2. USERS             → Gerenciamento de usuários
3. CLIENTS           → Gerenciamento de clientes
4. ASSETS            → Gerenciamento de ativos
5. SERVICE-ORDERS    → Core - Ordens de serviço
6. INVOICES          → Core - Emissão de notas fiscais
7. DISPATCH          → Agendamento e despacho
8. ITSM              → Gestão de ticketing
9. DOCUMENT-AUTO     → Automatização de documentos
10. DASHBOARD        → Métricas e analytics
11. REPORTS          → Relatórios
12. NOTIFICATIONS    → Sistema de notificações
13. AUDIT            → Rastreamento de auditoria
14. KNOWLEDGE-BASE   → Base de conhecimento
15. PORTAL           → Portal de clientes
16. SUPPLIERS        → Gestão de fornecedores
17. WEBHOOKS         → Integrações externas
18. HEALTH           → Healthcheck
```

---

## 🔗 Fluxos de Integração Principais

### **Fluxo 1: Criação de Service Order → Completar → Emitir Invoice**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CRIAR SERVICE ORDER (service-orders module)             │
├─────────────────────────────────────────────────────────────┤
│ INPUT:                                                       │
│  ├─ clientId (FK → clients.id) ✓ OBRIGATÓRIO              │
│  ├─ serviceTypeId (FK → serviceTypes.id) ✓ OBRIGATÓRIO    │
│  ├─ title (string, 1+ chars) ✓ OBRIGATÓRIO                │
│  ├─ description (string, 1+ chars) ✓ OBRIGATÓRIO          │
│  ├─ createdById (FK → users.id, from JWT) ✓ OBRIGATÓRIO   │
│  ├─ contractId (FK → contracts.id) ○ OPCIONAL             │
│  ├─ assignedTeamId (FK → teams.id) ○ OPCIONAL            │
│  ├─ assignedTechnicianId (FK → users.id) ○ OPCIONAL      │
│  ├─ locationAddressId (FK → addresses.id) ○ OPCIONAL     │
│  ├─ linkedAssetId (FK → assets.id) ○ OPCIONAL            │
│  └─ slaId (FK → sla.id) ○ OPCIONAL                       │
│                                                             │
│ VALIDAÇÕES (service-orders service layer):                 │
│  ✓ Client existe + ativo + não deletado                   │
│  ✓ ServiceType existe + ativo                             │
│  ✓ Se Team: existe + ativo                                │
│  ✓ Se Technician: existe + em Team + ativo               │
│  ✓ Se Address: pertence ao Client + não deletado          │
│  ✓ Se Contract: ativo + pertence ao Client                │
│  ✓ Se SLA: existe + ativo                                 │
│  ✓ Se Asset: existe + ativo + mesmo Client                │
│                                                             │
│ OUTPUT:                                                      │
│  └─ ServiceOrder { id, status: OPEN, ... }                │
└─────────────────────────────────────────────────────────────┘

        ↓ (Fluxo temporal - semanas/dias)

┌─────────────────────────────────────────────────────────────┐
│ 2. TRANSICIONAR STATUS (service-orders service)            │
├─────────────────────────────────────────────────────────────┤
│ OPEN → UNDER_ANALYSIS → WAITING_APPROVAL → SCHEDULED       │
│ → IN_TRANSIT → IN_PROGRESS → COMPLETED                     │
│                                                             │
│ VALIDAÇÕES:                                                │
│  ✓ Transição válida (via ServiceOrderStatusPolicy)        │
│  ✓ Se IN_PROGRESS: Technician atribuído?                  │
│  ✓ Se COMPLETED: valores ok?                              │
│  ✓ Não pode pular status (OPEN → COMPLETED direto)       │
│                                                             │
│ OUTPUT:                                                      │
│  └─ ServiceOrder { status: COMPLETED, ... }               │
└─────────────────────────────────────────────────────────────┘

        ↓ (Imediato após COMPLETED)

┌─────────────────────────────────────────────────────────────┐
│ 3. EMITIR INVOICE (invoices module)                        │
├─────────────────────────────────────────────────────────────┤
│ INPUT:                                                       │
│  ├─ serviceOrderId (FK → service_orders.id) ✓ OBRIGATÓRIO │
│  ├─ grossAmount (decimal) ou SO.estimatedValue ✓ REQ      │
│  ├─ discountAmount (decimal) ○ DEFAULT 0                  │
│  ├─ taxAmount (decimal) ○ DEFAULT 0                       │
│  ├─ issueDate (date) ○ DEFAULT today                      │
│  └─ dueDate (date) ○ DEFAULT today + 30 dias             │
│                                                             │
│ VALIDAÇÕES (invoices service layer):                       │
│  ✓ ServiceOrder existe + não deletada                     │
│  ✓ ServiceOrder.status === COMPLETED                      │
│  ✓ grossAmount || estimatedValue > 0                      │
│  ✓ discountAmount ≤ grossAmount                           │
│  ✓ taxAmount ≥ 0                                          │
│  ✓ netAmount (bruto - desc + imposto) > 0                │
│  ✓ Não existe outra Invoice para esta SO                 │
│                                                             │
│ CÁLCULO:                                                    │
│  netAmount = grossAmount - discountAmount + taxAmount     │
│                                                             │
│ OUTPUT:                                                      │
│  └─ Invoice { id, status: ISSUED, netAmount, ... }        │
└─────────────────────────────────────────────────────────────┘
```

---

### **Fluxo 2: Herança de Dados (Asset → Contract → SLA)**

```
┌──────────────────────────────────────────────────────────────┐
│ SE linkedAssetId FORNECIDO NA SO                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ServiceOrder.linkedAssetId                                 │
│         ↓                                                     │
│         └─→ Asset { contractId, clientId, addressId }      │
│             ├─→ Asset.contractId                            │
│             │   └─→ Contract { slaId, status: ACTIVE }     │
│             │       └─→ Contract.slaId                      │
│             │           └─→ SLA { responseTime, ... }      │
│             │               → SO herda este SLA             │
│             │                                                │
│             └─→ Asset.addressId (se não fornecido)         │
│                 └─→ SO.locationAddressId herdado            │
│                                                               │
│ REGRAS:                                                       │
│  • Se Asset.contractId preenchido → SO.contractId = Asset  │
│  • Se Contract tem SLA ativo → SO.slaId = Contract.slaId   │
│  • Se SO.locationAddressId não fornecido:                  │
│    → SO.locationAddressId = Asset.addresses[0]            │
│  • Herança é automática ao criar SO                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

### **Fluxo 3: Compatibilidade Technician ↔ Team**

```
┌──────────────────────────────────────────────────────────────┐
│ VALIDAÇÃO DE COMPATIBILIDADE CRITICAL                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Cenário A: SO com Technician + Team fornecidos             │
│ ─────────────────────────────────────────────────────────   │
│  SO.assignedTechnicianId = "tech-uuid"                      │
│  SO.assignedTeamId = "team-uuid"                            │
│                                                               │
│  DEVE EXISTIR:                                              │
│  TeamMember {                                               │
│    userId = "tech-uuid"                                     │
│    teamId = "team-uuid"                                     │
│    active = true                                            │
│    deletedAt = null                                         │
│  }                                                            │
│                                                               │
│  SE FALHAR → ❌ BadRequestException                         │
│             "Técnico não está vinculado ao time"           │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Cenário B: SO com Technician (sem Team)                     │
│ ──────────────────────────────────────────                  │
│  SO.assignedTechnicianId = "tech-uuid"                      │
│  SO.assignedTeamId = null                                   │
│                                                               │
│  DEVE EXISTIR:                                              │
│  User { id = "tech-uuid", status = ACTIVE }               │
│  AND                                                         │
│  TeamMember { userId = "tech-uuid" } (em algum time)       │
│                                                               │
│  → Sistema busca o Team automaticamente?                    │
│    (Depende da regra de negócio)                           │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Cenário C: SO com Team (sem Technician)                     │
│ ──────────────────────────────────────────                  │
│  SO.assignedTechnicianId = null                             │
│  SO.assignedTeamId = "team-uuid"                            │
│                                                               │
│  DEVE EXISTIR:                                              │
│  Team { id = "team-uuid", active = true }                 │
│                                                               │
│  → Technician será atribuído depois (no Dispatch)          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Integração entre Módulos

### **1. SERVICE-ORDERS ↔ CLIENTS**

| Operação | Quando | Validação |
|----------|--------|-----------|
| CREATE SO | Sempre | `clients.findOne({ id, active: true, deletedAt: null })` |
| UPDATE SO | Se mudar clientId | Mesmo como CREATE |
| GET SO | Sempre | Verificar acesso ao Cliente |

**Arquivo relevante:** `src/modules/service-orders/application/services/service-orders.service.ts`

---

### **2. SERVICE-ORDERS ↔ USERS**

| Operação | Quando | Validação |
|----------|--------|-----------|
| CREATE SO | Atribuir Technician | `users.findOne({ id, status: ACTIVE, deletedAt: null })` |
| ASSIGN | Atribuição técnico | + validar em TeamMember |
| AUDIT | Todas as ops | Registrar createdById/updatedById |

---

### **3. SERVICE-ORDERS ↔ ASSETS**

| Operação | Quando | Validação |
|----------|--------|-----------|
| CREATE SO | Se linkedAssetId | `assets.findOne({ id, active: true, deletedAt: null })` |
| HERANÇA | Automático | Contract e SLA herdados do Asset |
| ADDRESS | Se não fornecido | Address primário do Asset |

---

### **4. SERVICE-ORDERS ↔ DISPATCH**

| Operação | Quando | Validação |
|----------|--------|-----------|
| CREATE Schedule | SO → IN_PROGRESS | Validar Technician + Team compatibilidade |
| DISPATCH | Enviar técnico | SO.status ∈ [SCHEDULED, IN_TRANSIT, IN_PROGRESS] |
| LOCATION | Routing | Usar SO.locationAddressId |

**Arquivo relevante:** `src/modules/dispatch/application/services/dispatch.service.ts`

---

### **5. SERVICE-ORDERS ↔ INVOICES**

| Operação | Quando | Validação |
|----------|--------|-----------|
| CREATE Invoice | SO → COMPLETED | Obrigatório status COMPLETED |
| AMOUNT | SO tem estimatedValue | Usar como valor padrão |
| UNIQUE | Sempre | Uma invoice por SO |

**Arquivo relevante:** `src/modules/invoices/application/services/invoices.service.ts`

---

### **6. SERVICE-ORDERS ↔ ITSM**

| Operação | Quando | Validação |
|----------|--------|-----------|
| CREATE Ticket | SO criada | Sincronizar dados entre sistemas |
| STATUS SYNC | SO muda status | Atualizar ticket correspondente |
| COMMENT | Interação | Bidirecional SO ↔ Ticket |

---

### **7. SERVICE-ORDERS ↔ NOTIFICATIONS**

| Operação | Quando | Dispara |
|----------|--------|---------|
| CREATE | SO criada | Notificar Cliente + Team |
| STATUS UPDATE | Qualquer mudança | Notificar interessados |
| COMPLETED | SO finalizada | Notificar para revisão |

---

### **8. SERVICE-ORDERS ↔ DOCUMENT-AUTO**

| Operação | Quando | Gera |
|----------|--------|------|
| TEMPLATE | SO criada | ASOs, relatórios |
| POPULATE | SO progride | Preencher com dados |
| ISSUE | SO COMPLETED | Gerar documentos finais |

---

### **9. SERVICE-ORDERS ↔ AUDIT**

| Operação | Quando | Registra |
|----------|--------|----------|
| LOG | Qualquer mudança | Quem, o quê, quando |
| TRACK CHANGES | STATUS update | Diff de campos |
| COMPLIANCE | Invoice emitida | Rastreamento completo |

---

### **10. DASHBOARD ↔ SERVICE-ORDERS**

| Métrica | Origem | Atualização |
|---------|--------|------------|
| SOs Abertas | COUNT SO where status IN [...] | Real-time |
| Taxa de Conclusão | SO COMPLETED / Total | Diário |
| SLA Compliance | SO com SLA | Real-time |
| Faturamento | SO → Invoice | Diário |

---

## ⚠️ Pontos Críticos de Validação

### **Validação Obrigatória na Criação de SO**

```typescript
// PSEUDO-CODE: Service Order Creation Validation

async createServiceOrder(dto: CreateServiceOrderDto, actor: JwtPayload) {
  // 1. CLIENT VALIDATION
  const client = await clients.findOne(dto.clientId);
  if (!client || !client.active || client.deletedAt) 
    throw NotFoundException('Cliente não encontrado');
  
  // 2. SERVICETYPE VALIDATION
  const serviceType = await serviceTypes.findOne(dto.serviceTypeId);
  if (!serviceType || !serviceType.active) 
    throw NotFoundException('ServiceType inativo');
  
  // 3. OPTIONAL TEAM VALIDATION
  if (dto.assignedTeamId) {
    const team = await teams.findOne(dto.assignedTeamId);
    if (!team || !team.active) 
      throw NotFoundException('Time inativo');
  }
  
  // 4. CRITICAL: TECHNICIAN IN TEAM VALIDATION
  if (dto.assignedTechnicianId && dto.assignedTeamId) {
    const teamMember = await teamMembers.findOne({
      userId: dto.assignedTechnicianId,
      teamId: dto.assignedTeamId,
    });
    if (!teamMember || !teamMember.active) 
      throw BadRequestException('Técnico não está no time');
  }
  
  // 5. ADDRESS VALIDATION
  if (dto.locationAddressId) {
    const address = await addresses.findOne(dto.locationAddressId);
    if (!address || address.clientId !== dto.clientId || address.deletedAt) 
      throw BadRequestException('Endereço inválido');
  }
  
  // 6. CONTRACT VALIDATION
  if (dto.contractId) {
    const contract = await contracts.findOne(dto.contractId);
    if (!contract || contract.status !== 'ACTIVE' || contract.clientId !== dto.clientId) 
      throw BadRequestException('Contrato inválido');
  }
  
  // 7. SLA VALIDATION
  if (dto.slaId) {
    const sla = await slas.findOne(dto.slaId);
    if (!sla || !sla.active) 
      throw NotFoundException('SLA inativo');
  }
  
  // 8. ASSET VALIDATION + INHERITANCE
  let inheritedContractId = dto.contractId;
  let inheritedSlaId = dto.slaId;
  let inheritedAddressId = dto.locationAddressId;
  
  if (dto.linkedAssetId) {
    const asset = await assets.findOne(dto.linkedAssetId);
    if (!asset || !asset.active || asset.deletedAt) 
      throw NotFoundException('Asset inativo');
    
    // Herança automática
    if (!inheritedContractId && asset.contractId) {
      inheritedContractId = asset.contractId;
    }
    if (!inheritedAddressId && asset.addressId) {
      inheritedAddressId = asset.addressId;
    }
  }
  
  // 9. CREATE SERVICE ORDER
  const serviceOrder = await serviceOrders.create({
    clientId: dto.clientId,
    serviceTypeId: dto.serviceTypeId,
    title: dto.title,
    description: dto.description,
    contractId: inheritedContractId,
    slaId: inheritedSlaId,
    locationAddressId: inheritedAddressId,
    assignedTeamId: dto.assignedTeamId,
    assignedTechnicianId: dto.assignedTechnicianId,
    linkedAssetId: dto.linkedAssetId,
    createdById: actor.sub,
    status: 'OPEN',
  });
  
  // 10. AUDIT LOG
  await audit.log({
    entityType: 'SERVICE_ORDER',
    entityId: serviceOrder.id,
    action: 'CREATE',
    userId: actor.sub,
    changes: { ...serviceOrder },
  });
  
  // 11. NOTIFY
  await notifications.send({
    event: 'ServiceOrderCreated',
    data: { serviceOrderId: serviceOrder.id, clientId },
  });
  
  return serviceOrder;
}
```

---

### **Validação na Emissão de Invoice**

```typescript
// PSEUDO-CODE: Invoice Creation Validation

async createInvoice(dto: CreateInvoiceDto, actor: JwtPayload) {
  // 1. SERVICE ORDER VALIDATION
  const serviceOrder = await serviceOrders.findOne(dto.serviceOrderId);
  if (!serviceOrder || serviceOrder.deletedAt) 
    throw NotFoundException('Service Order não encontrada');
  
  // 2. STATUS VALIDATION (CRITICAL)
  if (serviceOrder.status !== 'COMPLETED') 
    throw BadRequestException('SO não está COMPLETED');
  
  // 3. AMOUNT VALIDATION
  const grossAmount = dto.grossAmount || serviceOrder.estimatedValue;
  if (!grossAmount || grossAmount <= 0) 
    throw BadRequestException('Valor bruto inválido');
  
  // 4. DISCOUNT VALIDATION
  const discountAmount = dto.discountAmount || 0;
  if (discountAmount < 0 || discountAmount > grossAmount) 
    throw BadRequestException('Desconto inválido');
  
  // 5. TAX VALIDATION
  const taxAmount = dto.taxAmount || 0;
  if (taxAmount < 0) 
    throw BadRequestException('Imposto inválido');
  
  // 6. NET AMOUNT VALIDATION
  const netAmount = grossAmount - discountAmount + taxAmount;
  if (netAmount <= 0) 
    throw BadRequestException('Valor líquido negativo');
  
  // 7. DUPLICATE CHECK
  const existingInvoice = await invoices.findOne({
    serviceOrderId: dto.serviceOrderId,
  });
  if (existingInvoice && !existingInvoice.deletedAt) 
    throw BadRequestException('Invoice já existe para esta SO');
  
  // 8. CREATE INVOICE
  const invoice = await invoices.create({
    serviceOrderId: dto.serviceOrderId,
    grossAmount,
    discountAmount,
    taxAmount,
    netAmount,
    issueDate: dto.issueDate || new Date(),
    dueDate: dto.dueDate || addDays(new Date(), 30),
    status: 'ISSUED',
    createdById: actor.sub,
  });
  
  // 9. AUDIT LOG
  await audit.log({
    entityType: 'INVOICE',
    entityId: invoice.id,
    action: 'CREATE',
    userId: actor.sub,
    changes: { ...invoice },
  });
  
  // 10. NOTIFY
  await notifications.send({
    event: 'InvoiceCreated',
    data: { invoiceId: invoice.id, clientId: serviceOrder.clientId },
  });
  
  // 11. DOCUMENT AUTO
  await documentAuto.generateInvoiceDocument(invoice.id);
  
  return invoice;
}
```

---

## 🔍 Como Debugar Erros de Integração

### **Erro: "Cliente não encontrado"**

```bash
# 1. Verificar no banco
SELECT id, name, active, "deletedAt" 
FROM "Client" 
WHERE id = 'seu-uuid';

# 2. Se deletedAt != NULL → cliente foi soft-deleted
# 3. Se active = false → cliente está desativado
# 4. Se não retorna → cliente não existe
```

### **Erro: "Técnico não está no time"**

```bash
# 1. Verificar TeamMember
SELECT * FROM "TeamMember" 
WHERE "userId" = 'tech-uuid' AND "teamId" = 'team-uuid';

# 2. Se não encontrar → vincular técnico ao time
POST /api/v1/teams/{teamId}/members
{ "userId": "tech-uuid" }

# 3. Se deletedAt != NULL → TeamMember foi deletado
```

### **Erro: "SO não está COMPLETED"**

```bash
# 1. Verificar status
SELECT id, status FROM "ServiceOrder" WHERE id = 'so-uuid';

# 2. Se status != COMPLETED → completar SO primeiro
PUT /api/v1/service-orders/{id}/status
{ "newStatus": "COMPLETED" }

# 3. Verificar transição de status válida
```

### **Erro: "Invoice já existe"**

```bash
# 1. Verificar Invoice existente
SELECT id, status FROM "Invoice" 
WHERE "serviceOrderId" = 'so-uuid' AND "deletedAt" IS NULL;

# 2. Se existe → não emitir outra
# 3. Ou cancelar existente e criar nova
```

---

## 📋 Checklist de Implementação

### **Antes de Criar SO**
- ✅ Cliente existe e está ATIVO
- ✅ ServiceType existe e está ATIVO
- ✅ Se Team: existe e ativo
- ✅ Se Technician: em TeamMember + ACTIVE
- ✅ Se Address: pertence ao Client
- ✅ Se Contract: ACTIVE + mesmo Client
- ✅ Se SLA: existe e ativo
- ✅ Se Asset: ativo + mesmo Client

### **Antes de Emitir Invoice**
- ✅ SO existe + não deletada
- ✅ SO.status === COMPLETED
- ✅ Valor bruto > 0
- ✅ Desconto ≤ valor bruto
- ✅ Imposto ≥ 0
- ✅ Valor líquido > 0
- ✅ Invoice única por SO

---

## 🎯 Diagrama Visual

Veja o diagrama interativo em: https://www.figma.com/board/b3a2849c-8af1-4812-84d6-932dc7f59d74

---

**Versão:** 2.0  
**Data Análise:** 2026-04-21  
**Status:** ✅ Completo
