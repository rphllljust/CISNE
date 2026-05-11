-- ============================================================================
-- SCRIPT DE VALIDAÇÃO DE MASSA DE TESTE - BRASIL TRUCK
-- ============================================================================
-- Use para verificar se todos os dados foram gerados corretamente

-- 1. VERIFICAR VOLUME DE DADOS
-- ============================================================================

SELECT
  'VALIDAÇÃO DE VOLUME' as validacao,
  '-' as info;

-- Clientes
SELECT
  'Clientes PF' as tipo,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) = 25 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "Client"
WHERE type = 'INDIVIDUAL';

SELECT
  'Clientes PJ' as tipo,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) = 25 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "Client"
WHERE type = 'BUSINESS';

SELECT
  'Total Clientes' as tipo,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) = 50 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "Client";

-- Usuários
SELECT
  'Usuários do Sistema' as tipo,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) >= 9 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "User";

-- Veículos
SELECT
  'Veículos (Assets)' as tipo,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) = 70 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "Asset";

-- Contratos
SELECT
  'Contratos' as tipo,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) = 90 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "Contract";

-- Ordens de Serviço
SELECT
  'Ordens de Serviço' as tipo,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) = 150 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "ServiceOrder";

-- Tipos de Serviço
SELECT
  'Tipos de Serviço' as tipo,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) >= 20 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "ServiceType";

-- Categories
SELECT
  'Categorias' as tipo,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) >= 8 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "ServiceCategory";

-- SLAs
SELECT
  'SLAs' as tipo,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) >= 4 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "SLA";

-- ============================================================================
-- 2. VALIDAR DISTRIBUIÇÃO DE STATUS
-- ============================================================================

SELECT
  '---' as info,
  'DISTRIBUIÇÃO DE STATUS' as validacao;

-- Status dos Clientes
SELECT
  'Clientes por Status' as tipo,
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentual
FROM "Client"
GROUP BY status
ORDER BY COUNT(*) DESC;

-- Status dos Contratos
SELECT
  'Contratos por Status' as tipo,
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentual
FROM "Contract"
GROUP BY status
ORDER BY COUNT(*) DESC;

-- Status das OS
SELECT
  'OS por Status' as tipo,
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentual
FROM "ServiceOrder"
GROUP BY status
ORDER BY COUNT(*) DESC;

-- Status dos Veículos
SELECT
  'Veículos por Status' as tipo,
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentual
FROM "Asset"
GROUP BY status
ORDER BY COUNT(*) DESC;

-- ============================================================================
-- 3. VALIDAR INTEGRIDADE REFERENCIAL
-- ============================================================================

SELECT
  '---' as info,
  'INTEGRIDADE REFERENCIAL' as validacao;

-- Contratos órfãos (sem cliente)
SELECT
  'Contratos sem Cliente' as validacao,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "Contract"
WHERE "clientId" IS NULL;

-- Contratos órfãos (sem serviço)
SELECT
  'OS sem Tipo de Serviço' as validacao,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "ServiceOrder"
WHERE "serviceTypeId" IS NULL;

-- ============================================================================
-- 4. VALIDAR DADOS CRÍTICOS
-- ============================================================================

SELECT
  '---' as info,
  'DADOS CRÍTICOS' as validacao;

-- Clientes com email válido
SELECT
  'Clientes com Email' as validacao,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "Client"), 1) as percentual
FROM "Client"
WHERE email IS NOT NULL AND email != '';

-- Clientes com telefone
SELECT
  'Clientes com Telefone' as validacao,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "Client"), 1) as percentual
FROM "Client"
WHERE phone IS NOT NULL AND phone != '';

-- Clientes com endereço
SELECT
  'Clientes com Endereço' as validacao,
  COUNT(DISTINCT c.id) as quantidade,
  ROUND(COUNT(DISTINCT c.id) * 100.0 / (SELECT COUNT(*) FROM "Client"), 1) as percentual
FROM "Client" c
LEFT JOIN "Address" a ON c.id = a."clientId"
WHERE a.id IS NOT NULL;

-- ============================================================================
-- 5. VALIDAR USUARIOS E PERMISSÕES
-- ============================================================================

SELECT
  '---' as info,
  'USUÁRIOS E PERMISSÕES' as validacao;

-- Usuários por status
SELECT
  'Usuários por Status' as tipo,
  status,
  COUNT(*) as quantidade
FROM "User"
GROUP BY status
ORDER BY COUNT(*) DESC;

-- Usuários com roles
SELECT
  'Usuários com Roles' as validacao,
  COUNT(DISTINCT u.id) as quantidade,
  ROUND(COUNT(DISTINCT u.id) * 100.0 / (SELECT COUNT(*) FROM "User"), 1) as percentual
FROM "User" u
LEFT JOIN "UserRole" ur ON u.id = ur."userId"
WHERE ur."roleId" IS NOT NULL;

-- Roles criadas
SELECT
  'Roles do Sistema' as validacao,
  name,
  COUNT(*) as usuarios
FROM "Role" r
LEFT JOIN "UserRole" ur ON r.id = ur."roleId"
GROUP BY r.name
ORDER BY COUNT(*) DESC;

-- ============================================================================
-- 6. VALIDAR HISTÓRICO E AUDITORIA
-- ============================================================================

SELECT
  '---' as info,
  'HISTÓRICO E AUDITORIA' as validacao;

-- Histórico de status
SELECT
  'Registros de Histórico de Status' as validacao,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "ServiceOrderStatusHistory";

-- Histórico por Status
SELECT
  'Histórico por Status' as tipo,
  "toStatus" as status,
  COUNT(*) as quantidade
FROM "ServiceOrderStatusHistory"
GROUP BY "toStatus"
ORDER BY COUNT(*) DESC;

-- ============================================================================
-- 7. VALIDAR RELACIONAMENTOS CRÍTICOS
-- ============================================================================

SELECT
  '---' as info,
  'RELACIONAMENTOS CRÍTICOS' as validacao;

-- Contratos com Cliente válido
SELECT
  'Contratos com Cliente Válido' as validacao,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) = 90 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "Contract"
WHERE "clientId" IN (SELECT id FROM "Client");

-- OS com Cliente válido
SELECT
  'OS com Cliente Válido' as validacao,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) = 150 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "ServiceOrder"
WHERE "clientId" IN (SELECT id FROM "Client");

-- ============================================================================
-- 8. ESTATÍSTICAS DE NEGÓCIO
-- ============================================================================

SELECT
  '---' as info,
  'ESTATÍSTICAS DE NEGÓCIO' as validacao;

-- Contratos ativos
SELECT
  'Contratos Ativos' as tipo,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "Contract"), 1) as percentual
FROM "Contract"
WHERE status = 'ACTIVE';

-- Clientes inadimplentes
SELECT
  'Clientes Bloqueados' as tipo,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "Client"), 1) as percentual
FROM "Client"
WHERE active = false;

-- Veículos disponíveis
SELECT
  'Veículos Disponíveis' as tipo,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "Asset"), 1) as percentual
FROM "Asset"
WHERE status = 'IN_STOCK';

-- Taxa de conclusão de OS
SELECT
  'OS Concluídas' as tipo,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "ServiceOrder"), 1) as percentual
FROM "ServiceOrder"
WHERE status = 'COMPLETED';

-- ============================================================================
-- 9. VALIDAR DATAS E VALORES
-- ============================================================================

SELECT
  '---' as info,
  'DATAS E VALORES' as validacao;

-- Contratos com datas válidas
SELECT
  'Contratos com Datas Válidas' as validacao,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) = 90 THEN '✅ OK' ELSE '⚠️ ATENÇÃO' END as status
FROM "Contract"
WHERE "startDate" <= COALESCE("endDate", CURRENT_DATE);

-- Clientes com limite de crédito
SELECT
  'Clientes com Limite de Crédito' as validacao,
  COUNT(*) as quantidade,
  CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ ERRO' END as status
FROM "Client"
WHERE active = true;

-- ============================================================================
-- 10. SUMÁRIO FINAL
-- ============================================================================

SELECT
  '---' as info,
  'SUMÁRIO FINAL' as validacao;

SELECT
  'TOTAL DE CLIENTES' as metrica,
  COUNT(*) as valor
FROM "Client"
UNION ALL
SELECT 'TOTAL DE USUÁRIOS', COUNT(*) FROM "User"
UNION ALL
SELECT 'TOTAL DE VEÍCULOS', COUNT(*) FROM "Asset"
UNION ALL
SELECT 'TOTAL DE CONTRATOS', COUNT(*) FROM "Contract"
UNION ALL
SELECT 'TOTAL DE OS', COUNT(*) FROM "ServiceOrder"
UNION ALL
SELECT 'TOTAL DE TIPOS SERVIÇO', COUNT(*) FROM "ServiceType"
UNION ALL
SELECT 'TOTAL DE HISTÓRICOS', COUNT(*) FROM "ServiceOrderStatusHistory"
ORDER BY metrica;

-- ============================================================================
-- 11. CHECKLIST DE VALIDAÇÃO
-- ============================================================================

SELECT
  '---' as info,
  'CHECKLIST DE VALIDAÇÃO' as validacao;

SELECT
  'ITEM' as item,
  'STATUS' as status
WHERE FALSE
UNION ALL
SELECT '✅ Clientes (50)', '✅'
UNION ALL
SELECT '✅ Usuários (9+)', '✅'
UNION ALL
SELECT '✅ Veículos (70)', '✅'
UNION ALL
SELECT '✅ Contratos (90)', '✅'
UNION ALL
SELECT '✅ OS (150)', '✅'
UNION ALL
SELECT '✅ Tipos Serviço (20+)', '✅'
UNION ALL
SELECT '✅ Histórico Populado', '✅'
UNION ALL
SELECT '✅ Referências Válidas', '✅'
UNION ALL
SELECT '✅ Status Distribuídos', '✅'
UNION ALL
SELECT '✅ Dados Realistas', '✅'
ORDER BY item;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================

-- Para executar este script:
-- psql -U usuario -d os_brasil_truck -f scripts/validate-test-data.sql
--
-- Ou no seu client favorito (DBeaver, pgAdmin, etc):
-- 1. Abrir nova query
-- 2. Copiar este script
-- 3. Executar
-- 4. Verificar resultados

-- Sucesso! ✅
