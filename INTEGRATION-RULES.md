# 🔗 Regras de Integração Entre Módulos - OMS System

## 📋 Índice

1. [Dependências de Módulos](#dependências-de-módulos)
2. [Validações Obrigatórias](#validações-obrigatórias)
3. [Fluxos de Integração](#fluxos-de-integração)
4. [Resolução de Erros](#resolução-de-erros)
5. [Checklist de Implementação](#checklist-de-implementação)

---

## Dependências de Módulos

### 🎯 Estrutura de Dependência Hierárquica

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (núcleo)                            │
│                        ✓ Status: ACTIVE                         │
│                        ✓ deletedAt: null                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                ▼                     ▼
         ┌──────────────┐     ┌──────────────┐
         │   CLIENT     │     │  SERVICETYPE │
         │ (obrigatório)│     │ (obrigatório)│
         └──────┬───────┘     └──────┬───────┘
                │                    │
                └────────┬───────────┘
                         ▼
                ┌──────────────────┐
                │  SERVICEORDER    │
                │ (núcleo do fluxo)│
                └────────┬─────────┘
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
      ┌─────────┐  ┌────────┐  ┌──────────┐
      │CONTRACT │  │  TEAM  │  │   SLA    │
      │opcional │  │opcional│  │opcional  │
      └─────────┘  └────────┘  └──────────┘
            │            │
            ▼            ▼
       ┌──────────┐  ┌──────────────┐
       │ ADDRESS  │  │ TECHNICIAN   │
       │opcional  │  │ (deve estar  │
       └──────────┘  │  em TEAM)    │
                     └──────────────┘
            │
            ▼
      ┌──────────────┐
      │  INVOICE     │
      │(obrigatório: │
      │SO.COMPLETED) │
      └──────────────┘
```

---

## Validações Obrigatórias

### 1️⃣ CRIAR SERVICE ORDER

#### Campos Obrigatórios

| Campo | Tipo | Validação | Erro se Falhar |
|-------|------|-----------|-----------------|
| `clientId` | UUID | Deve existir, estar ativo e não deletado | `NotFoundException: Cliente não encontrado` |
| `serviceTypeId` | UUID | Deve existir, estar ativo | `NotFoundException: ServiceType inativo` |
| `title` | String | Min 1 char, preenchido | `BadRequestException: Título obrigatório` |
| `description` | String | Min 1 char, preenchido | `BadRequestException: Descrição obrigatória` |
| `createdById` | UUID | Extraído de JWT (actor.sub) | `UnauthorizedException: Usuário inválido` |

#### Campos Opcionais com Validação

| Campo | Se fornecido... | Validação | Erro |
|-------|-----------------|-----------|------|
| `parentServiceOrderId` | Deve referenciar outra SO | Existir, não COMPLETED/CANCELED | `BadRequestException: SO pai finalizada` |
| `contractId` | Deve referenciar Contract | Ativo, pertencer ao Client | `BadRequestException: Contrato inválido` |
| `slaId` | Deve referenciar SLA | Ativo | `NotFoundException: SLA inativo` |
| `assignedTeamId` | Deve referenciar Team | Ativo | `NotFoundException: Time inativo` |
| `assignedTechnicianId` | Deve estar NO TIME | Estar em teamId | `BadRequestException: Técnico não no time` |
| `locationAddressId` | Deve pertencer a Client | Não deletado, mesmo Client | `BadRequestException: Endereço inválido` |
| `linkedAssetId` | Deve estar ativo | Não deletado, ativo | `NotFoundException: Ativo inativo` |

#### ✅ Exemplo Válido

```json
{
  "clientId": "c-uuid-001",
  "serviceTypeId": "st-uuid-001",
  "title": "Manutenção de Servidor",
  "description": "Manutenção preventiva do servidor de produção",
  "contractId": "cont-uuid-001",
  "assignedTeamId": "team-uuid-001",
  "assignedTechnicianId": "user-uuid-tech-001",
  "linkedAssetId": "asset-uuid-001",
  "slaId": "sla-uuid-001"
}
```

#### ❌ Exemplos Inválidos

```json
// ERRO 1: Cliente não existe
{
  "clientId": "invalid-uuid",
  "serviceTypeId": "st-uuid-001",
  "title": "...",
  "description": "..."
}
// → NotFoundException: Cliente não encontrado

// ERRO 2: Técnico não está no time
{
  "clientId": "c-uuid-001",
  "serviceTypeId": "st-uuid-001",
  "title": "...",
  "description": "...",
  "assignedTeamId": "team-uuid-001",
  "assignedTechnicianId": "user-uuid-tech-002"  // Não membro do time
}
// → BadRequestException: Técnico não está vinculado ao time

// ERRO 3: Contrato de outro cliente
{
  "clientId": "c-uuid-001",
  "serviceTypeId": "st-uuid-001",
  "title": "...",
  "description": "...",
  "contractId": "cont-uuid-outro-cliente"
}
// → BadRequestException: Contrato não pertence a este cliente
```

---

### 2️⃣ EMITIR INVOICE

#### Condições Pré-requisito

| Condição | Status Atual | Requerido | Erro |
|----------|-------------|----------|------|
| ServiceOrder existe | Qualquer | `SIM` | `NotFoundException` |
| ServiceOrder não deletada | deletedAt | `NULL` | `NotFoundException` |
| ServiceOrder status | `COMPLETED` | `SIM` | `BadRequestException: SO não completa` |
| Valor bruto | grossAmount \|\| estimatedValue | `>0` | `BadRequestException: Valor inválido` |
| Desconto | discountAmount | `0-grossAmount` | `BadRequestException: Desconto inválido` |
| Imposto | taxAmount | `>= 0` | `BadRequestException: Imposto inválido` |
| Valor líquido | Calculado | `> 0` | `BadRequestException: Valor líquido negativo` |
| Invoice única | Existente | `NÃO` | `BadRequestException: Invoice já existe` |

#### ✅ Exemplo Válido

```json
{
  "serviceOrderId": "so-uuid-001",
  "grossAmount": 5000.00,
  "discountAmount": 500.00,
  "taxAmount": 750.00,
  "issueDate": "2026-04-12",
  "dueDate": "2026-05-12"
}
// Cálculo: 5000 - 500 + 750 = 5250 (líquido) ✓
```

#### ❌ Exemplos Inválidos

```json
// ERRO 1: SO não COMPLETED
{
  "serviceOrderId": "so-uuid-aberta",
  "grossAmount": 5000.00
}
// Status da SO: OPEN
// → BadRequestException: SO não está COMPLETED

// ERRO 2: Sem valor (estimatedValue null)
{
  "serviceOrderId": "so-uuid-001"
}
// SO.estimatedValue = null, grossAmount = undefined
// → BadRequestException: Valor bruto inválido

// ERRO 3: Desconto > grossAmount
{
  "serviceOrderId": "so-uuid-001",
  "grossAmount": 1000.00,
  "discountAmount": 1500.00
}
// → BadRequestException: Desconto não pode ser > valor bruto

// ERRO 4: Invoice já existe
{
  "serviceOrderId": "so-uuid-ja-invoice"
}
// Já existe Invoice com esse serviceOrderId
// → BadRequestException: Invoice já existe para esta SO
```

---

## Fluxos de Integração

### Fluxo 1: Criar Ordem → Completar → Emitir Nota

```
1. CRIAR SERVICE ORDER
   ├─ Validar Client (ativo, não deletado)
   ├─ Validar ServiceType (ativo)
   ├─ Validar Team se fornecido (ativo)
   ├─ Validar Technician in Team (compatibilidade)
   ├─ Validar Address (pertence a Client)
   ├─ Validar Contract (ativo, mesmo Client)
   ├─ Validar SLA (ativo)
   └─ ✓ ServiceOrder criada com status OPEN

2. TRANSICIONAR STATUS
   ├─ OPEN → UNDER_ANALYSIS
   ├─ UNDER_ANALYSIS → WAITING_APPROVAL
   ├─ WAITING_APPROVAL → SCHEDULED
   ├─ SCHEDULED → IN_TRANSIT
   ├─ IN_TRANSIT → IN_PROGRESS
   └─ IN_PROGRESS → COMPLETED ✓

3. EMITIR INVOICE
   ├─ Validar SO existe e está COMPLETED
   ├─ Validar estimatedValue ou grossAmount fornecido
   ├─ Validar desconto e imposto
   ├─ Validar não existe outra Invoice para esta SO
   └─ ✓ Invoice criada com status ISSUED
```

### Fluxo 2: Dados Herdados (Asset → Contract → SLA)

```
ServiceOrder tem:
├─ linkedAssetId (opcional)
│  └─ Asset tem:
│     ├─ contractId
│     └─ clientId
│
└─ Se Asset fornecido:
   ├─ contractId herdado de Asset
   │  └─ Contract tem slaId
   │     └─ SLA herdado para SO
   │
   └─ Se Address não fornecido:
      └─ Address herdado de Asset (primary)
```

### Fluxo 3: Validação de Compatibilidade

```
Atribuição de Technician:
└─ assignedTechnicianId + assignedTeamId fornecidos
   ├─ Validar User existe e ACTIVE
   ├─ Validar Team existe e ativo
   ├─ Validar TeamMember existe (technician ∈ team)
   └─ ✓ Compatível, pode atribuir

Schedule/Dispatch:
└─ Nova agenda com technicianId + teamId
   ├─ Se ambos fornecidos: validar compatibilidade
   ├─ Se só technicianId: validar que está em algum time
   ├─ Se só teamId: validar team ativo
   └─ ✓ Schedule criado
```

---

## Resolução de Erros

### Erro: "Cliente não encontrado"

```
Causa Provável:
1. clientId não existe no banco
2. Cliente foi deletado (soft delete)
3. Cliente está inativo (active = false)

Resolução:
1. Verificar ID: SELECT * FROM "Client" WHERE id = 'seu-id'
2. Se deletedAt != null → Cliente foi deletado
3. Se active = false → Ativar cliente
4. Se não existe → Criar novo cliente primeiro

Código de Exemplo:
  SELECT id, name, active, "deletedAt" FROM "Client" 
  WHERE id = 'uuid-aqui' AND "deletedAt" IS NULL;
```

### Erro: "Técnico não está vinculado ao time"

```
Causa Provável:
1. assignedTechnicianId não foi adicionado ao Team
2. TeamMember foi deletado ou desativado
3. assignedTeamId está errado

Resolução:
1. Verificar se técnico está em time:
   SELECT * FROM "TeamMember" 
   WHERE "userId" = 'tech-uuid' 
   AND "teamId" = 'team-uuid'

2. Se não encontrar: vincular técnico ao time
   POST /api/v1/teams/{teamId}/members
   { "userId": "tech-uuid" }

3. Se deletedAt != null: reativar TeamMember
4. Se active = false: ativar TeamMember
```

### Erro: "SO não está COMPLETED"

```
Causa Provável:
1. ServiceOrder ainda em progresso
2. Status errado (OPEN, IN_PROGRESS, etc)
3. SO foi cancelada ou reabert ida

Resolução:
1. Completar ServiceOrder primeiro:
   PUT /api/v1/service-orders/{id}/status
   { "newStatus": "COMPLETED" }

2. Verificar fluxo de status válido:
   OPEN → UNDER_ANALYSIS → ... → IN_PROGRESS → COMPLETED

3. Não pode emitir se status for:
   - OPEN, UNDER_ANALYSIS, WAITING_APPROVAL, SCHEDULED
   - IN_TRANSIT, PAUSED, WAITING_PARTS, WAITING_CUSTOMER
   - CANCELED, REOPENED
```

### Erro: "Contrato não pertence a este cliente"

```
Causa Provável:
1. Contract.clientId ≠ ServiceOrder.clientId
2. Contract foi deletado ou cancelado
3. Contract ID está errado

Resolução:
1. Verificar Contract:
   SELECT "clientId", status FROM "Contract" 
   WHERE id = 'contract-uuid'

2. Usar contrato do cliente certo ou não fornecer contractId
3. Se status = CANCELED → renovar ou criar novo contrato
```

### Erro: "Invoice já existe para esta SO"

```
Causa Provável:
1. Nota fiscal já foi emitida para esta SO
2. Tentativa de emitir segunda nota (não permitido)

Resolução:
1. Verificar Invoice existente:
   SELECT id, status FROM "Invoice" 
   WHERE "serviceOrderId" = 'so-uuid'

2. Opções:
   a) Usar Invoice existente (não emitir nova)
   b) Cancelar Invoice existente primeiro:
      PUT /api/v1/invoices/{id}/cancel
   c) Depois emitir nova Invoice
```

### Erro: "Valor bruto inválido"

```
Causa Provável:
1. grossAmount não fornecido
2. estimatedValue null na ServiceOrder
3. Valor <= 0 ou inválido

Resolução:
1. Fornecer grossAmount na request:
   { "serviceOrderId": "uuid", "grossAmount": 5000.00 }

2. Ou preencher estimatedValue na ServiceOrder:
   PUT /api/v1/service-orders/{id}
   { "estimatedValue": 5000.00 }

3. Validar: valor DEVE ser > 0
```

---

## Checklist de Implementação

### ✅ Antes de Criar Service Order

```
□ Cliente existe e está ATIVO
  → SELECT * FROM Client WHERE id = ? AND active = true AND deletedAt IS NULL

□ ServiceType existe e está ATIVO
  → SELECT * FROM ServiceType WHERE id = ? AND active = true

□ Se Team fornecido: Team existe e ativo
  → SELECT * FROM Team WHERE id = ? AND active = true

□ Se Technician fornecido:
  □ User existe e está ACTIVE
    → SELECT * FROM User WHERE id = ? AND status = 'ACTIVE' AND deletedAt IS NULL
  
  □ Technician está no Team
    → SELECT * FROM TeamMember WHERE userId = ? AND teamId = ? AND active = true

□ Se Address fornecido: pertence ao Client
  → SELECT * FROM Address WHERE id = ? AND clientId = ? AND deletedAt IS NULL

□ Se Contract fornecido:
  □ Contract ativo
    → SELECT * FROM Contract WHERE id = ? AND status = 'ACTIVE'
  
  □ Contract pertence ao Client
    → SELECT * FROM Contract WHERE id = ? AND clientId = ?

□ Se SLA fornecido: SLA existe e ativo
  → SELECT * FROM SLA WHERE id = ? AND active = true

□ Se Asset fornecido:
  □ Asset ativo
    → SELECT * FROM Asset WHERE id = ? AND active = true AND deletedAt IS NULL
  
  □ Asset pertence ao Client (ou sem cliente)
    → SELECT * FROM Asset WHERE id = ? AND (clientId = ? OR clientId IS NULL)
```

### ✅ Antes de Emitir Invoice

```
□ ServiceOrder existe
  → SELECT * FROM ServiceOrder WHERE id = ?

□ ServiceOrder NÃO está deletada
  → SELECT "deletedAt" FROM ServiceOrder WHERE id = ? AND "deletedAt" IS NULL

□ ServiceOrder status = COMPLETED
  → SELECT status FROM ServiceOrder WHERE id = ? AND status = 'COMPLETED'

□ Não existe outra Invoice para essa SO
  → SELECT COUNT(*) FROM Invoice WHERE "serviceOrderId" = ? AND "deletedAt" IS NULL

□ Valor bruto válido:
  □ Se grossAmount fornecido: > 0
  □ Ou SO.estimatedValue existe e > 0
    → SELECT "estimatedValue" FROM ServiceOrder WHERE id = ? AND "estimatedValue" > 0

□ Desconto válido: 0 ≤ desconto ≤ grossAmount

□ Imposto válido: imposto ≥ 0

□ Valor líquido válido: (bruto - desconto + imposto) > 0
```

### ✅ Antes de Atualizar Status

```
□ Transição é válida
  → Verificar ServiceOrderStatusPolicy para transição permitida

□ Se mudar para IN_PROGRESS: tem Technician atribuído?

□ Se mudar para COMPLETED: valores estimatedValue ok?

□ Se mudar para CANCELED: motivo fornecido?
```

---

## Resumo de Pontos Críticos

| Situação | Validação | Risco |
|----------|-----------|-------|
| **Client deletado** | `deletedAt IS NULL` | ❌ SO orfã, sem cliente |
| **ServiceType inativo** | `active = true` | ❌ SO não pode ser criada |
| **Technician não em Team** | `EXISTS(TeamMember)` | ❌ Agendamento impossível |
| **Address outro Cliente** | `clientId match` | ❌ SO com localização errada |
| **Contract cancelado** | `status = 'ACTIVE'` | ⚠️ Contrato inválido |
| **SO não COMPLETED** | `status = 'COMPLETED'` | ❌ Invoice não pode ser emitida |
| **Valor null** | `estimatedValue \|\| grossAmount` | ❌ Nota fiscal sem valor |
| **Invoice duplicada** | `COUNT(*) = 0` | ❌ Nota fiscal já existe |

---

## 🔒 Boas Práticas

1. **Sempre validar FK antes de persistir**
2. **Usar transações para operações multi-tabela**
3. **Soft delete é sua amigo: sempre checar deletedAt**
4. **Status deve ser transição válida (não jump aleatório)**
5. **Valores financeiros DEVEM ser validados antes**
6. **Compatibilidade technician-team é CRÍTICA**
7. **Documentar dependências no código (comentários)**

---

**Versão:** 1.0  
**Data:** 2026-04-12  
**Status:** ✅ Pronto para Implementação

