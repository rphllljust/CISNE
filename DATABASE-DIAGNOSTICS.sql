-- 🔍 QUERIES DE DIAGNÓSTICO - Identificar Problemas de Integração

-- ============================================================================
-- 1. VERIFICAR INTEGRIDADE REFERENCIAL
-- ============================================================================

-- 1.1 Service Orders órfãs (sem Client válido)
SELECT
  so.id,
  so.title,
  so.status,
  so."clientId",
  c.name as client_name,
  CASE WHEN c.id IS NULL THEN '❌ SEM CLIENT'
       WHEN c."deletedAt" IS NOT NULL THEN '❌ CLIENT DELETADO'
       WHEN c.active = false THEN '⚠️ CLIENT INATIVO'
       ELSE '✓ OK' END as status_client
FROM "ServiceOrder" so
LEFT JOIN "Client" c ON so."clientId" = c.id
WHERE c.id IS NULL
   OR c."deletedAt" IS NOT NULL
   OR c.active = false;

-- 1.2 Service Orders com ServiceType inválido
SELECT
  so.id,
  so.title,
  so."serviceTypeId",
  st.name as service_type_name,
  CASE WHEN st.id IS NULL THEN '❌ SERVICETYPE NÃO EXISTE'
       WHEN st.active = false THEN '⚠️ SERVICETYPE INATIVO'
       WHEN st."deletedAt" IS NOT NULL THEN '❌ SERVICETYPE DELETADO'
       ELSE '✓ OK' END as status
FROM "ServiceOrder" so
LEFT JOIN "ServiceType" st ON so."serviceTypeId" = st.id
WHERE st.id IS NULL
   OR st.active = false
   OR st."deletedAt" IS NOT NULL;

-- 1.3 Invoices com SO inválida
SELECT
  i.id as invoice_id,
  i."serviceOrderId",
  i.status as invoice_status,
  so.status as so_status,
  CASE WHEN so.id IS NULL THEN '❌ SO NÃO EXISTE'
       WHEN so."deletedAt" IS NOT NULL THEN '❌ SO DELETADA'
       WHEN so.status != 'COMPLETED' THEN '❌ SO NÃO COMPLETED (' || so.status || ')'
       ELSE '✓ OK' END as status
FROM "Invoice" i
LEFT JOIN "ServiceOrder" so ON i."serviceOrderId" = so.id
WHERE so.id IS NULL
   OR so."deletedAt" IS NOT NULL
   OR so.status != 'COMPLETED';

-- 1.4 Técnicos atribuídos mas não em Time
SELECT
  so.id as so_id,
  so.title,
  so."assignedTechnicianId",
  so."assignedTeamId",
  u.email as technician_email,
  t.name as team_name,
  CASE WHEN u.id IS NULL THEN '❌ TÉCNICO NÃO EXISTE'
       WHEN u.status != 'ACTIVE' THEN '⚠️ TÉCNICO INATIVO'
       WHEN tm.id IS NULL THEN '❌ TÉCNICO NÃO NO TIME'
       ELSE '✓ OK' END as status
FROM "ServiceOrder" so
LEFT JOIN "User" u ON so."assignedTechnicianId" = u.id
LEFT JOIN "Team" t ON so."assignedTeamId" = t.id
LEFT JOIN "TeamMember" tm ON u.id = tm."userId" AND t.id = tm."teamId" AND tm.active = true
WHERE so."assignedTechnicianId" IS NOT NULL
  AND so."assignedTeamId" IS NOT NULL
  AND (u.id IS NULL
       OR u.status != 'ACTIVE'
       OR tm.id IS NULL);

-- 1.5 Endereços de SO que não pertencem ao Client
SELECT
  so.id as so_id,
  so.title,
  so."locationAddressId",
  so."clientId",
  a.id as address_id,
  a."clientId" as address_client_id,
  CASE WHEN a.id IS NULL THEN '❌ ENDEREÇO NÃO EXISTE'
       WHEN a."deletedAt" IS NOT NULL THEN '❌ ENDEREÇO DELETADO'
       WHEN a."clientId" != so."clientId" THEN '❌ ENDEREÇO DE OUTRO CLIENT'
       ELSE '✓ OK' END as status
FROM "ServiceOrder" so
LEFT JOIN "Address" a ON so."locationAddressId" = a.id
WHERE so."locationAddressId" IS NOT NULL
  AND (a.id IS NULL
       OR a."deletedAt" IS NOT NULL
       OR a."clientId" != so."clientId");

-- 1.6 Contratos inválidos em Service Orders
SELECT
  so.id as so_id,
  so.title,
  so."contractId",
  so."clientId",
  c.status as contract_status,
  c."clientId" as contract_client_id,
  CASE WHEN c.id IS NULL THEN '❌ CONTRATO NÃO EXISTE'
       WHEN c."deletedAt" IS NOT NULL THEN '❌ CONTRATO DELETADO'
       WHEN c.status != 'ACTIVE' THEN '⚠️ CONTRATO NÃO ATIVO (' || c.status || ')'
       WHEN c."clientId" != so."clientId" THEN '❌ CONTRATO DE OUTRO CLIENT'
       ELSE '✓ OK' END as status
FROM "ServiceOrder" so
LEFT JOIN "Contract" c ON so."contractId" = c.id
WHERE so."contractId" IS NOT NULL
  AND (c.id IS NULL
       OR c."deletedAt" IS NOT NULL
       OR c.status != 'ACTIVE'
       OR c."clientId" != so."clientId");

-- ============================================================================
-- 2. VERIFICAR DADOS INCONSISTENTES
-- ============================================================================

-- 2.1 Service Orders com estimatedValue NULL (risco para Invoice)
SELECT
  id,
  title,
  status,
  "estimatedValue",
  "createdAt",
  CASE WHEN status = 'COMPLETED' AND "estimatedValue" IS NULL
       THEN '⚠️ RISCO: COMPLETA SEM VALOR'
       ELSE '✓ OK' END as risk
FROM "ServiceOrder"
WHERE "estimatedValue" IS NULL
ORDER BY "createdAt" DESC;

-- 2.2 Invoices com valores inconsistentes
SELECT
  id,
  "invoiceNumber",
  status,
  "grossAmount",
  "discountAmount",
  "taxAmount",
  ("grossAmount" - "discountAmount" + "taxAmount") as calculated_net,
  CASE WHEN "grossAmount" <= 0 THEN '❌ GROSS INVÁLIDO'
       WHEN "discountAmount" < 0 OR "discountAmount" > "grossAmount" THEN '❌ DESCONTO INVÁLIDO'
       WHEN "taxAmount" < 0 THEN '❌ IMPOSTO NEGATIVO'
       WHEN ("grossAmount" - "discountAmount" + "taxAmount") <= 0 THEN '❌ LÍQUIDO NEGATIVO'
       ELSE '✓ OK' END as validation
FROM "Invoice"
WHERE "grossAmount" <= 0
   OR "discountAmount" < 0
   OR "discountAmount" > "grossAmount"
   OR "taxAmount" < 0
   OR ("grossAmount" - "discountAmount" + "taxAmount") <= 0;

-- 2.3 Service Orders com status inválido para transição
SELECT
  id,
  title,
  status,
  "updatedAt",
  CASE
    WHEN status = 'CANCELED' THEN '⚠️ CANCELADA'
    WHEN status = 'COMPLETED' THEN '✓ COMPLETA'
    ELSE '⏳ EM ANDAMENTO'
  END as phase
FROM "ServiceOrder"
WHERE status IN ('CANCELED', 'COMPLETED', 'REOPENED')
ORDER BY "updatedAt" DESC
LIMIT 20;

-- ============================================================================
-- 3. VERIFICAR PERMISSÕES E ACESSO
-- ============================================================================

-- 3.1 Usuários inativos que criaram Service Orders
SELECT
  u.id,
  u.email,
  u.status,
  COUNT(so.id) as so_count,
  CASE WHEN u.status != 'ACTIVE' THEN '⚠️ USUÁRIO INATIVO'
       ELSE '✓ OK' END as status_user
FROM "User" u
LEFT JOIN "ServiceOrder" so ON u.id = so."createdById"
WHERE u.status != 'ACTIVE'
GROUP BY u.id, u.email, u.status
HAVING COUNT(so.id) > 0;

-- 3.2 Service Orders criadas por usuários deletados
SELECT
  so.id,
  so.title,
  so."createdById",
  u.email,
  CASE WHEN u.id IS NULL THEN '❌ CRIADOR DELETADO'
       WHEN u.status != 'ACTIVE' THEN '⚠️ CRIADOR INATIVO'
       ELSE '✓ OK' END as status
FROM "ServiceOrder" so
LEFT JOIN "User" u ON so."createdById" = u.id
WHERE u.id IS NULL OR u.status != 'ACTIVE';

-- ============================================================================
-- 4. VERIFICAR CHAVES ESTRANGEIRAS
-- ============================================================================

-- 4.1 Contagem de referências por tabela (para soft deletes)
SELECT
  'ServiceOrder' as table_name,
  COUNT(*) as total_records,
  SUM(CASE WHEN "deletedAt" IS NULL THEN 1 ELSE 0 END) as active_records,
  SUM(CASE WHEN "deletedAt" IS NOT NULL THEN 1 ELSE 0 END) as deleted_records
FROM "ServiceOrder"

UNION ALL

SELECT
  'Invoice',
  COUNT(*),
  SUM(CASE WHEN "deletedAt" IS NULL THEN 1 ELSE 0 END),
  SUM(CASE WHEN "deletedAt" IS NOT NULL THEN 1 ELSE 0 END)
FROM "Invoice"

UNION ALL

SELECT
  'Client',
  COUNT(*),
  SUM(CASE WHEN "deletedAt" IS NULL THEN 1 ELSE 0 END),
  SUM(CASE WHEN "deletedAt" IS NOT NULL THEN 1 ELSE 0 END)
FROM "Client"

UNION ALL

SELECT
  'User',
  COUNT(*),
  SUM(CASE WHEN "deletedAt" IS NULL THEN 1 ELSE 0 END),
  SUM(CASE WHEN "deletedAt" IS NOT NULL THEN 1 ELSE 0 END)
FROM "User";

-- 4.2 Contract-Client match validation
SELECT
  c.id as contract_id,
  c.name as contract_name,
  COUNT(so.id) as so_count,
  SUM(CASE WHEN so."clientId" != c."clientId" THEN 1 ELSE 0 END) as mismatched_so
FROM "Contract" c
LEFT JOIN "ServiceOrder" so ON c.id = so."contractId"
WHERE c."deletedAt" IS NULL
GROUP BY c.id, c.name
HAVING SUM(CASE WHEN so."clientId" != c."clientId" THEN 1 ELSE 0 END) > 0;

-- ============================================================================
-- 5. VERIFICAR CONFIGURAÇÕES E PARÂMETROS
-- ============================================================================

-- 5.1 Service Types ativos vs inativos
SELECT
  st.id,
  st.name,
  st.active,
  COUNT(so.id) as so_count,
  CASE WHEN st.active = false AND COUNT(so.id) > 0 THEN '⚠️ INATIVO MAS COM SO'
       WHEN st.active = true THEN '✓ OK'
       ELSE '⚠️ SEMUSO' END as status
FROM "ServiceType" st
LEFT JOIN "ServiceOrder" so ON st.id = so."serviceTypeId" AND so."deletedAt" IS NULL
GROUP BY st.id, st.name, st.active;

-- 5.2 Teams ativos e membros
SELECT
  t.id,
  t.name,
  t.active,
  COUNT(tm.id) as member_count,
  SUM(CASE WHEN tm.active = true THEN 1 ELSE 0 END) as active_members,
  CASE WHEN t.active = false THEN '⚠️ TIME INATIVO'
       WHEN COUNT(tm.id) = 0 THEN '⚠️ SEM MEMBROS'
       ELSE '✓ OK' END as status
FROM "Team" t
LEFT JOIN "TeamMember" tm ON t.id = tm."teamId"
GROUP BY t.id, t.name, t.active;

-- 5.3 SLAs em uso vs ativos
SELECT
  s.id,
  s.name,
  s.active,
  COUNT(so.id) as so_count,
  CASE WHEN s.active = false AND COUNT(so.id) > 0 THEN '⚠️ INATIVO MAS COM SO'
       WHEN s.active = true THEN '✓ OK'
       ELSE '✓ OK' END as status
FROM "SLA" s
LEFT JOIN "ServiceOrder" so ON s.id = so."slaId" AND so."deletedAt" IS NULL
GROUP BY s.id, s.name, s.active;

-- ============================================================================
-- 6. RELATÓRIO EXECUTIVO
-- ============================================================================

-- 6.1 Dashboard de Integridade
WITH so_stats AS (
  SELECT
    COUNT(*) as total_so,
    SUM(CASE WHEN "deletedAt" IS NULL THEN 1 ELSE 0 END) as active_so,
    SUM(CASE WHEN "clientId" IS NULL THEN 1 ELSE 0 END) as orphan_so,
    SUM(CASE WHEN status = 'COMPLETED' AND "estimatedValue" IS NULL THEN 1 ELSE 0 END) as risk_so
  FROM "ServiceOrder"
),
invoice_stats AS (
  SELECT
    COUNT(*) as total_inv,
    SUM(CASE WHEN "deletedAt" IS NULL THEN 1 ELSE 0 END) as active_inv,
    SUM(CASE WHEN "grossAmount" <= 0 THEN 1 ELSE 0 END) as invalid_amount
  FROM "Invoice"
),
user_stats AS (
  SELECT
    COUNT(*) as total_users,
    SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_users,
    SUM(CASE WHEN "deletedAt" IS NOT NULL THEN 1 ELSE 0 END) as deleted_users
  FROM "User"
),
client_stats AS (
  SELECT
    COUNT(*) as total_clients,
    SUM(CASE WHEN active = true THEN 1 ELSE 0 END) as active_clients,
    SUM(CASE WHEN "deletedAt" IS NOT NULL THEN 1 ELSE 0 END) as deleted_clients
  FROM "Client"
)
SELECT
  'Service Orders: ' || so_stats.active_so || '/' || so_stats.total_so || ' ativas' as metric,
  CASE WHEN so_stats.orphan_so > 0 THEN '❌ ' ELSE '✓ ' END ||
  so_stats.orphan_so || ' órfãs' as detail
FROM so_stats

UNION ALL

SELECT
  'Invoices: ' || invoice_stats.active_inv || '/' || invoice_stats.total_inv || ' ativas',
  CASE WHEN invoice_stats.invalid_amount > 0 THEN '❌ ' ELSE '✓ ' END ||
  invoice_stats.invalid_amount || ' com valores inválidos'
FROM invoice_stats

UNION ALL

SELECT
  'Users: ' || user_stats.active_users || '/' || user_stats.total_users || ' ativos',
  CASE WHEN user_stats.deleted_users > 0 THEN '⚠️ ' ELSE '✓ ' END ||
  user_stats.deleted_users || ' deletados'
FROM user_stats

UNION ALL

SELECT
  'Clients: ' || client_stats.active_clients || '/' || client_stats.total_clients || ' ativos',
  CASE WHEN client_stats.deleted_clients > 0 THEN '⚠️ ' ELSE '✓ ' END ||
  client_stats.deleted_clients || ' deletados'
FROM client_stats;

-- ============================================================================
-- INSTRUÇÕES DE USO
-- ============================================================================
/*

1. EXECUTAR TODAS AS QUERIES:
   - Copie cada query acima
   - Execute no psql ou DBeaver
   - Procure por ❌ (erros críticos) e ⚠️ (avisos)

2. PRIORIDADE DE CORREÇÃO:
   ❌ CRÍTICO:  Dados órfãos, valores inválidos
   ⚠️ ALTO:     Usuários inativos, contracts inválidos
   ℹ️ MÉDIO:    Técnicos não compatíveis com time

3. DEPOIS DE CORRIGIR:
   - Executar novamente para confirmar
   - Atualizar aplicação com validações do validator service
   - Testar fluxos completos (SO → Invoice)

*/
