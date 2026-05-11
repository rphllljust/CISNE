# 📊 Análise do Fluxo de Integração - Sistema OMS
## Sumário Executivo

---

## 🎯 Visão Geral

O sistema OMS é um **Order Management System** modular baseado em **NestJS + React 19** com arquitetura **FSD (Feature-Sliced Design)**. O fluxo de integração funciona através de 18 módulos interconectados, sendo **Service Orders** o núcleo central.

### Stack Técnico
- **Backend:** NestJS, Prisma ORM, PostgreSQL
- **Frontend:** React 19, CSS Tokens
- **Arquitetura:** FSD (Feature-Sliced Design)
- **Padrões:** Service → Repository → Controller
- **Segurança:** JWT, RBAC, Rate Limiting

---

## 🔗 Fluxo Principal (Happy Path)

```
1. CRIAR SERVICE ORDER
   ↓ (Validar: Client, ServiceType, Team, Technician, Address, Contract, SLA, Asset)
   ↓ (Herança automática de Asset → Contract → SLA)
   ↓
2. TRANSICIONAR STATUS
   OPEN → UNDER_ANALYSIS → WAITING_APPROVAL → SCHEDULED 
   → IN_TRANSIT → IN_PROGRESS → COMPLETED
   ↓
3. EMITIR INVOICE
   ↓ (Validar: SO COMPLETED, Valor > 0, Único por SO)
   ↓
✅ SISTEMA OPERACIONAL
```

---

## 📚 Documentação Completa

### 1. **[FLUXO-INTEGRACAO-ANALISE.md](FLUXO-INTEGRACAO-ANALISE.md)** 📖
Análise detalhada com pseudocódigo e validações

**Contém:**
- ✅ Arquitetura de módulos (18 módulos)
- ✅ Fluxo 1: SO → Completar → Invoice
- ✅ Fluxo 2: Herança de dados (Asset → Contract → SLA)
- ✅ Fluxo 3: Compatibilidade Technician ↔ Team
- ✅ Integração entre módulos (tabela matriz)
- ✅ Validações obrigatórias (pseudocódigo completo)
- ✅ 7 erros críticos e como resolver

**Quando usar:**
- Entender o fluxo completo
- Implementar nova feature
- Onboarding de novo desenvolvedor

---

### 2. **[PADROES-INTEGRACAO.md](PADROES-INTEGRACAO.md)** 🏗️
Padrões arquiteturais e boas práticas

**Contém:**
- ✅ Padrão FSD por módulo
- ✅ Exemplo: Service com validação
- ✅ Padrão de repositório (interface + implementação Prisma)
- ✅ Validadores reutilizáveis
- ✅ Service de notificações (multi-canal)
- ✅ Auditoria com rastreamento de mudanças
- ✅ Custom exceptions
- ✅ Transações Prisma
- ✅ Segurança (validação, rate limiting, RBAC)
- ✅ Checklist: 10 práticas + 8 proibições

**Quando usar:**
- Desenvolver novo módulo
- Code review
- Manter consistência arquitetural

---

### 3. **[TROUBLESHOOTING-INTEGRACAO.md](TROUBLESHOOTING-INTEGRACAO.md)** 🔧
Guia prático de debugging e resolução de erros

**Contém:**
- ✅ 15+ erros comuns com solução
- ✅ Queries SQL para debugging
- ✅ Como verificar cada validação
- ✅ Problemas de herança de dados
- ✅ Health check completo do banco
- ✅ Monitoramento contínuo
- ✅ Rollback de operações
- ✅ Checklist de 11 itens para validação

**Quando usar:**
- SO não foi criada
- Invoice não está sendo emitida
- Erros estranhos em produção
- Verificação de dados

---

### 4. **[INTEGRATION-RULES.md](INTEGRATION-RULES.md)** 📋
Documento original com regras de integração (referência)

---

## 🎯 Pontos Críticos (5 Validações Obrigatórias)

| # | Validação | Local | Erro se Falhar |
|---|-----------|-------|---|
| 1️⃣ | Cliente existe + ativo + não deletado | CREATE SO | NotFoundException |
| 2️⃣ | Technician em TeamMember | CREATE SO | BadRequestException |
| 3️⃣ | SO.status === COMPLETED | CREATE INVOICE | BadRequestException |
| 4️⃣ | Invoice única por SO | CREATE INVOICE | BadRequestException |
| 5️⃣ | Valor líquido > 0 | CREATE INVOICE | BadRequestException |

---

## 📈 Diagrama Visual

### Fluxo de Integração
![Fluxo OMS](https://www.figma.com/online-whiteboard/create-diagram/b3a2849c-8af1-4812-84d6-932dc7f59d74?utm_source=claude)

### Mapa de Dependências
![Dependências](https://www.figma.com/online-whiteboard/create-diagram/9c6a5624-0776-49f0-902a-055c35f45cc2?utm_source=claude)

---

## 🚀 Quick Reference - Operações Principais

### 1. Criar Service Order

```bash
POST /api/v1/service-orders
{
  "clientId": "uuid-cliente",                    # ✓ Obrigatório
  "serviceTypeId": "uuid-tipo",                  # ✓ Obrigatório
  "title": "Manutenção de Servidor",            # ✓ Obrigatório
  "description": "...",                         # ✓ Obrigatório
  "contractId": "uuid-contrato",                # ○ Opcional (valida se fornecido)
  "assignedTeamId": "uuid-time",                # ○ Opcional
  "assignedTechnicianId": "uuid-tecnico",       # ○ Opcional (DEVE estar no Team)
  "locationAddressId": "uuid-endereco",         # ○ Opcional (DEVE pertencer ao Client)
  "linkedAssetId": "uuid-ativo",                # ○ Opcional (herança automática)
  "slaId": "uuid-sla"                           # ○ Opcional
}

# Resposta
{
  "id": "so-uuid",
  "status": "OPEN",
  "clientId": "uuid-cliente",
  "createdAt": "2026-04-21T..."
}
```

---

### 2. Transicionar Status

```bash
PUT /api/v1/service-orders/{id}/status
{
  "newStatus": "UNDER_ANALYSIS"
}

# Fluxo válido:
OPEN → UNDER_ANALYSIS → WAITING_APPROVAL → SCHEDULED 
→ IN_TRANSIT → IN_PROGRESS → COMPLETED
```

---

### 3. Emitir Invoice

```bash
POST /api/v1/invoices
{
  "serviceOrderId": "so-uuid",                  # ✓ Obrigatório
  "grossAmount": 5000.00,                       # ✓ > 0 (ou usar SO.estimatedValue)
  "discountAmount": 500.00,                     # ○ Default 0 (≤ grossAmount)
  "taxAmount": 750.00,                          # ○ Default 0 (≥ 0)
  "issueDate": "2026-04-21",                    # ○ Default hoje
  "dueDate": "2026-05-21"                       # ○ Default hoje + 30 dias
}

# Validações automáticas:
# - SO.status MUST be COMPLETED
# - netAmount = grossAmount - discount + tax (MUST be > 0)
# - Apenas UMA invoice por SO
```

---

### 4. Debugar Erro de Validação

```bash
# Erro: "Técnico não está no time"
# Solução:

# 1. Verificar
SELECT * FROM "TeamMember" 
WHERE "userId" = 'tech-uuid' AND "teamId" = 'team-uuid';

# 2. Se não existe, criar
INSERT INTO "TeamMember" ("userId", "teamId", "active", "createdAt")
VALUES ('tech-uuid', 'team-uuid', true, now());

# 3. Se existe mas deletado, recuperar
UPDATE "TeamMember" 
SET active = true, "deletedAt" = null 
WHERE "userId" = 'tech-uuid' AND "teamId" = 'team-uuid';
```

---

## 🔄 Fluxo de Herança de Dados

```
IF linkedAssetId fornecido:
  ├─ Asset.contractId → SO.contractId (se não fornecido)
  ├─ Contract.slaId → SO.slaId (se não fornecido)
  └─ Asset.addressId → SO.locationAddressId (se não fornecido)

Validação:
  ├─ Asset deve estar ativo
  ├─ Asset deve pertencer ao mesmo Client (ou ser público)
  ├─ Contract deve estar ACTIVE
  └─ SLA deve estar ativo
```

---

## 📊 Status da SO

```
┌─────────────────────────────────────┐
│         SERVICE ORDER STATUS        │
├─────────────────────────────────────┤
│ OPEN                  ← Inicial     │
│ UNDER_ANALYSIS                      │
│ WAITING_APPROVAL                    │
│ SCHEDULED                           │
│ IN_TRANSIT                          │
│ IN_PROGRESS                         │
│ COMPLETED             ← Pode faturar│
│                                     │
│ CANCELED  (terminal)                │
│ REOPENED  (volta para OPEN)        │
│ PAUSED    (pausada temporariamente) │
│ WAITING_PARTS (aguardando peças)   │
│ WAITING_CUSTOMER (aguardando cliente)│
└─────────────────────────────────────┘
```

---

## 🏢 Módulos do Sistema (18 Total)

```
Core (CRÍTICOS):
├─ SERVICE-ORDERS    ← Centro do fluxo
├─ INVOICES          ← Faturamento
├─ USERS             ← Usuários
├─ CLIENTS           ← Clientes

Operacional:
├─ DISPATCH          ← Agendamento
├─ ASSETS            ← Ativos
├─ ITSM              ← Ticketing

Suporte:
├─ TEAMS             ← Equipes
├─ NOTIFICATIONS     ← Alertas
├─ AUDIT             ← Rastreamento
├─ DOCUMENT-AUTO     ← Automatização

Analytics:
├─ DASHBOARD         ← Métricas
├─ REPORTS           ← Relatórios

Integrações:
├─ WEBHOOKS          ← APIs externas
├─ PORTAL            ← Portal cliente

Auxiliar:
├─ AUTH              ← Autenticação
├─ KNOWLEDGE-BASE    ← Base de conhecimento
├─ HEALTH            ← Health check
```

---

## ❌ 5 Erros Mais Comuns

| # | Erro | Causa | Solução |
|---|------|-------|--------|
| 1 | Cliente não encontrado | Client não existe/deletado/inativo | Validar no banco, reativar ou criar |
| 2 | Técnico não no time | TeamMember não existe | INSERT INTO TeamMember |
| 3 | SO não COMPLETED | Status ainda em progresso | Transicionar para COMPLETED |
| 4 | Invoice já existe | Duplicate check fallou | DELETE antiga ou usar existente |
| 5 | Valor bruto inválido | estimatedValue null | Fornecer grossAmount na request |

---

## 🔐 Segurança & Performance

### Autenticação
- JWT com claims (sub, role, email)
- Validação de scopes/permissões
- RBAC por role (admin, manager, technician, client)

### Validação
- Input validation (DTOs com class-validator)
- FK validation antes de persistir
- Soft delete (deletedAt) para dados sensíveis

### Performance
- Índices em FK (clientId, userId, serviceOrderId, etc)
- Lazy loading com includes
- Paginação em listagens
- Rate limiting em endpoints públicos

### Auditoria
- Log de todas as mudanças críticas
- Rastreamento de quem, o quê, quando
- Diferencial de mudanças (old vs new)

---

## 📋 Checklist Pré-Deployment

### Service Order
- [ ] Cliente existe + ativo (SELECT * FROM Client WHERE id = ?)
- [ ] ServiceType existe + ativo
- [ ] Se Team: existe + ativo
- [ ] Se Technician: em TeamMember + ativo
- [ ] Se Address: pertence ao Client + não deletado
- [ ] Se Contract: ativo + mesmo Client
- [ ] Se SLA: existe + ativo
- [ ] Se Asset: ativo + mesmo Client

### Invoice
- [ ] SO existe + não deletada
- [ ] SO.status === COMPLETED
- [ ] Valor bruto > 0 (ou estimatedValue)
- [ ] Desconto ≤ valor bruto
- [ ] Imposto ≥ 0
- [ ] Valor líquido > 0
- [ ] Invoice única (COUNT = 0)

### Geral
- [ ] Auditoria registrando mudanças
- [ ] Notificações sendo enviadas
- [ ] Logs estruturados
- [ ] Índices do banco otimizados
- [ ] Rate limiting ativo
- [ ] RBAC configurado

---

## 🎓 Como Usar Esta Documentação

### 👤 Desenvolvedor
1. Leia **FLUXO-INTEGRACAO-ANALISE.md** para entender fluxo
2. Consulte **PADROES-INTEGRACAO.md** ao implementar
3. Use **TROUBLESHOOTING-INTEGRACAO.md** ao debugar

### 👨‍💼 Arquiteto
1. Revise **FLUXO-INTEGRACAO-ANALISE.md** (arquitetura)
2. Verifique **PADROES-INTEGRACAO.md** (consistência)
3. Use diagrama visual para apresentações

### 🚨 DevOps/Oncall
1. Consulte **TROUBLESHOOTING-INTEGRACAO.md** primeira
2. Use queries SQL para debugging
3. Refira-se a **CHECKLIST** para verificação rápida

### 🧪 QA
1. Use **INTEGRATION-RULES.md** para testes
2. Valide 5 pontos críticos
3. Teste happy path + edge cases

---

## 📞 Suporte Rápido

**Pergunta:** "Como criar uma Service Order?"
→ Veja [FLUXO-INTEGRACAO-ANALISE.md](FLUXO-INTEGRACAO-ANALISE.md) - Fluxo 1

**Pergunta:** "Service Order não foi criada!"
→ Veja [TROUBLESHOOTING-INTEGRACAO.md](TROUBLESHOOTING-INTEGRACAO.md) - Erros ao Criar SO

**Pergunta:** "Qual é o padrão de código?"
→ Veja [PADROES-INTEGRACAO.md](PADROES-INTEGRACAO.md) - Padrão de Serviço

**Pergunta:** "Como implementar validação?"
→ Veja [PADROES-INTEGRACAO.md](PADROES-INTEGRACAO.md) - Padrão de Validação

---

## 📈 Métricas Importantes

```sql
-- SOs abertas
SELECT COUNT(*) FROM "ServiceOrder" 
WHERE status NOT IN ('COMPLETED', 'CANCELED') 
AND "deletedAt" IS NULL;

-- Taxa de conclusão
SELECT 
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) * 100 / COUNT(*) as taxa
FROM "ServiceOrder" 
WHERE "deletedAt" IS NULL;

-- Invoices do mês
SELECT SUM("netAmount") 
FROM "Invoice" 
WHERE DATE_TRUNC('month', "createdAt") = DATE_TRUNC('month', now())
AND "deletedAt" IS NULL;

-- Tempo médio SO
SELECT AVG(EXTRACT(DAY FROM ("completedAt" - "createdAt"))) as dias_medio
FROM "ServiceOrder" 
WHERE status = 'COMPLETED';
```

---

## 🔗 Links Rápidos

- 📖 [Análise Detalhada](FLUXO-INTEGRACAO-ANALISE.md)
- 🏗️ [Padrões de Código](PADROES-INTEGRACAO.md)
- 🔧 [Troubleshooting](TROUBLESHOOTING-INTEGRACAO.md)
- 📋 [Regras de Integração](INTEGRATION-RULES.md)
- 🎨 [Diagrama Visual](https://figma.com/board/b3a2849c-8af1-4812-84d6-932dc7f59d74)

---

## ✅ Status

- ✅ Documentação: Completa
- ✅ Exemplos: Pseudocódigo + SQL
- ✅ Diagramas: Visual + Mermaid
- ✅ Troubleshooting: 15+ cenários
- ✅ Padrões: Pronto para uso

---

**Versão:** 2.0  
**Data:** 2026-04-21  
**Autor:** Análise de Integração OMS  
**Status:** ✅ **PRONTO PARA PRODUÇÃO**

*Última atualização: 21/04/2026*
