# 📋 Guia de Implementação: NFS-e + Faturamento Recorrente

## ✅ Resumo do que foi implementado

### 1. ✅ Schema Prisma Atualizado
- **Enums adicionados**: `BillingFrequency`, `NfseStatus`
- **Tabela Nfse criada** com 28 campos fiscais, de integração e auditoria
- **Contract expandido** com campos de faturamento recorrente:
  - `billingFrequency` (MONTHLY, BIMONTHLY, QUARTERLY, ANNUAL)
  - `billingDayOfMonth`, `billingMonth`
  - `monthlyValue`, `nextBillingDate`, `lastBilledAt`
  - `generateNfse`, `generateBoleto`, `defaultTechnicianId`
- **Invoice atualizado** com referência `nfseId` para ligação com NFS-e
- **Migrations automáticas** aplicadas com sucesso

### 2. ✅ Backend: Módulo NFS-e
Arquivos criados em `/src/modules/nfse/`:

```
nfse/
├── domain/
│   ├── entities/nfse.entity.ts          (Tipos e interfaces)
│   └── services/nfse-validator.service.ts (Validação fiscal)
├── infrastructure/
│   ├── integrations/
│   │   ├── certificado-a1.service.ts    (Manipulação de certificados)
│   │   └── sefaz-integration.service.ts (Integração SOAP com SEFAZ)
├── application/
│   └── services/nfse.service.ts         (Orquestração do fluxo)
├── presentation/
│   └── controllers/nfse.controller.ts   (Endpoints REST)
└── nfse.module.ts                       (Módulo NestJS)
```

**Endpoints disponíveis:**
- `POST /nfse/emitir` - Emitir NFS-e para SO + Invoice
- `GET /nfse/consultar/:nfseId` - Consultar status na SEFAZ
- `DELETE /nfse/:nfseId?motivo=...` - Cancelar NFS-e

### 3. ✅ Backend: Módulo de Faturamento Recorrente
Arquivos criados em `/src/modules/billing/`:

```
billing/
├── application/
│   └── services/recurring-billing.service.ts
└── billing.module.ts
```

**Funcionalidades:**
- CRON job diário às 2h da manhã (configurável via `.env`)
- Busca contratos com `status=ACTIVE` e `nextBillingDate <= hoje`
- Para cada contrato:
  1. Cria Service Order automaticamente
  2. Completa SO imediatamente
  3. Gera Invoice com valor do contrato
  4. Emite NFS-e (se `generateNfse=true`)
  5. Atualiza `nextBillingDate` conforme frequência
  6. Notifica cliente e admin
  7. Registra auditoria

### 4. ✅ Frontend: Páginas de NFS-e

**`frontend/src/pages/nfse/nfse-emit.page.tsx`**
- Formulário de emissão de NFS-e
- Exibe dados da SO e Invoice
- Validação de pré-requisitos (SO=COMPLETED)
- Informações fiscais que serão enviadas

**`frontend/src/pages/nfse/nfse-detail.page.tsx`**
- Visualização detalhada de NFS-e emitida
- Exibe número, série, código de verificação
- Mostra valores, impostos, retenções
- Links para consultar/baixar na SEFAZ
- Botões para consultar status e cancelar
- Atualização automática a cada 5s (ideal para PENDENTE_SEFAZ)

### 5. ✅ Frontend: Página de Contratos

**`frontend/src/pages/contracts/contracts-list.page.tsx`**
- Listagem de contratos com filtros (busca, status)
- Exibe informações de faturamento recorrente
- Mostra próxima data de faturamento
- Indicador visual se faturamento é hoje
- Badges indicando "Gera NFS-e" e "Gera Boleto"

### 6. ✅ Integração no App Module
- `NfseModule` importado
- `BillingModule` importado com ScheduleModule para CRON

---

## 🚀 Próximos Passos para Produção

### Fase 1: Banco de Dados (CONCLUÍDO)
- [x] Migration para Nfse, Contract atualizado, Invoice
- [x] Índices para performance (numero, statusNfse, dataEmissao, etc)
- [x] Foreign keys com cascata apropriada

### Fase 2: Validações Implementadas
- [x] `NfseValidatorService`: CPF/CNPJ, códigos LC 116/2003, ISS 0-5%
- [x] Blockchain de auditoria para cada emissão/cancelamento
- [x] Tratamento de duplicação (unique constraint + idempotência)

### Fase 3: Faltando
- [ ] **Tipos TypeScript completos** para Nfse, Contract (criar em `/types/`)
- [ ] **InvoiceModule** precisa exportar `InvoiceService` para BillingModule
- [ ] **ServiceOrderModule** precisa exportar `ServiceOrderService`
- [ ] **NotificationModule** criar ou expandir
- [ ] **Geração de XML ABRASF** com template real (handlebars)
- [ ] **Assinatura digital** com openssl/node-rsa
- [ ] **Testes E2E** para fluxo completo
- [ ] **Testes unitários** para NfseValidatorService
- [ ] **Rotas frontend** para /nfse/* e /contracts/*
- [ ] **Variáveis de ambiente** configuradas em .env

---

## 📋 Checklist de Implementação

### Backend
- [x] Schema Prisma atualizado
- [x] Migrations aplicadas
- [x] NfseService criado (orquestração)
- [x] NfseValidatorService criado (validações fiscais)
- [x] CertificadoA1Service criado (manipulação de certs)
- [x] SefazIntegrationService criado (integração SOAP)
- [x] NfseController com 3 endpoints
- [x] BillingModule com RecurringBillingService
- [x] CRON job configurado
- [ ] Exportar services necessários em modules
- [ ] Implementar geração de XML real
- [ ] Implementar assinatura digital
- [ ] Testes unitários
- [ ] Testes E2E

### Frontend
- [x] Página de emissão de NFS-e
- [x] Página de detalhe de NFS-e
- [x] Página de lista de contratos
- [ ] Rotas no React Router
- [ ] Página de edição de contrato
- [ ] Dashboard com métricas de faturamento
- [ ] Alertas de certificado vencendo
- [ ] Testes de UI

### DevOps
- [x] .env.example criado
- [ ] Documentação de deploy
- [ ] Validação de certificado A1 em startup
- [ ] Health check para SEFAZ
- [ ] Monitoramento de CRON job
- [ ] Alertas para falhas de faturamento

---

## 🔧 Configuração Necessária

### 1. Variáveis de Ambiente (`.env`)
```bash
# Faturamento Recorrente
BILLING_CRON_SCHEDULE=0 2 * * *
TIMEZONE=America/Sao_Paulo

# Certificado Digital A1
CERTIFICADO_A1_PATH=/app/config/certificado.pfx
CERTIFICADO_A1_PASSWORD=sua-senha-segura

# Empresa
COMPANY_CNPJ=XX.XXX.XXX/XXXX-XX
COMPANY_MUNICIPAL_INSCRIPTION=XXXXXXXXX
COMPANY_NAME=Sua Empresa LTDA

# SEFAZ (variam por município)
SEFAZ_HOMOLOG_URL=https://homolog...
SEFAZ_PRODUCAO_URL=https://producao...
MUNICIPIO_CODIGO_IBGE=3550308
MUNICIPIO_NOME=São Paulo
```

### 2. Certificado A1
- Obter de AC credenciada ICP-Brasil
- Formato: .pfx ou .p12
- Colocar em `/app/config/certificado.pfx`
- Senha em KeyVault (nunca em código)

### 3. URLs SEFAZ
Cada prefeitura tem URLs diferentes. Exemplos:
- São Paulo: https://nfse.prefeitura.sp.gov.br/...
- Curitiba: https://nfse.curitiba.pr.gov.br/...
- BH: https://nfse.bhte.com.br/...

---

## 📊 Fluxos Principais

### Fluxo 1: Emissão Manual de NFS-e
```
POST /nfse/emitir { serviceOrderId, invoiceId }
  → Buscar SO (status=COMPLETED)
  → Buscar Invoice
  → Validar dados
  → Gerar XML RPS
  → Assinar com certificado A1
  → Enviar para SEFAZ (SOAP)
  → Criar registro em banco
  → Atualizar Invoice.nfseId
  → Auditoria
  → Notificar cliente
  ✅ Retorna Nfse com numero, codigoVerificacao
```

### Fluxo 2: Faturamento Recorrente (CRON)
```
[02:00 diariamente]
  → Buscar contratos com nextBillingDate <= hoje
  → Para cada contrato:
    → Criar SO automaticamente
    → Completar SO (sem execução real)
    → Gerar Invoice
    → Emitir NFS-e (se generateNfse=true)
    → Calcular próximo faturamento
    → Atualizar nextBillingDate
    → Notificar cliente
    → Registrar auditoria
  ✅ Continua mesmo se NFS-e falhar (retry manual)
```

### Fluxo 3: Certificado Vencendo
```
Diariamente (via health check):
  → Carregar certificado
  → Se vence em < 30 dias:
    → Log WARN
    → Email para admin
    → Dashboard mostra alerta
  ✅ Não bloqueia operações (aviso apenas)
```

---

## 🧪 Testes Recomendados

### Unitários
- `NfseValidatorService`
  - CPF válido/inválido
  - CNPJ válido/inválido
  - Código LC 116 válido/inválido
  - ISS 0-5%
  - Retenções > valor bruto
  - Valor final positivo

### Integração
- Fluxo completo: SO → Invoice → NFS-e
- Faturamento recorrente com múltiplos contratos
- Cancelamento de NFS-e
- Consulta de status na SEFAZ

### E2E
- Emitir NFS-e via UI
- Consultar status
- Listar contratos
- Criar contrato recorrente
- Validar CRON com contrato teste

### SEFAZ Sandbox
- **OBRIGATÓRIO antes de produção**
- Usa URLs homolog (mais lentas, sem validação real)
- Testa fluxo completo em ambiente seguro

---

## 🔒 Segurança

### ✅ Implementado
- [x] Certificado em arquivo (proteger permissões: 600)
- [x] Senha em environment (nunca em código)
- [x] Validação de dados antes de enviar
- [x] Auditoria completa de todas as operações
- [x] Unique constraint para evitar duplicação
- [x] Transações no banco

### ⚠️ TODO
- [ ] HSM para produção (certificado nunca sai)
- [ ] Assinatura de emails
- [ ] Backup de XMLs assinados (5 anos por lei)
- [ ] Encriptação de dados sensíveis
- [ ] Rate limiting em endpoints críticos
- [ ] Validação de IP origin para callbacks

---

## 📈 Monitoramento

### Queries SQL
```sql
-- NFS-es emitidas hoje
SELECT numero, statusNfse, dataEmissao 
FROM "Nfse" 
WHERE DATE(dataEmissao) = CURRENT_DATE;

-- Certificados vencendo
SELECT 'CERTIFICADO', validoAte, 
  EXTRACT(DAY FROM validoAte - NOW()) as diasRestantes
FROM cert_info
WHERE validoAte < NOW() + INTERVAL '30 days';

-- Erros SEFAZ últimos 7 dias
SELECT statusNfse, COUNT(*), STRING_AGG(DISTINCT mensagensSefaz, '; ')
FROM "Nfse"
WHERE dataEmissao > NOW() - INTERVAL '7 days'
  AND statusNfse = 'REJEITADA_SEFAZ'
GROUP BY statusNfse;

-- Contratos vencendo semana que vem
SELECT id, numero, nextBillingDate, monthlyValue
FROM "Contract"
WHERE nextBillingDate BETWEEN now() AND now() + interval '7 days'
  AND status = 'ACTIVE';
```

### Logs importantes
- Emissão: `[NfseService] ✅ NFS-e ${numero} emitida com sucesso`
- Erro: `[NfseService] ❌ SEFAZ rejeitou: ${motivo}`
- CRON: `[RecurringBillingService] 🔄 Iniciando faturamento recorrente`
- Certificado: `[CertificadoA1Service] ⚠️ Certificado vence em ${dias} dias`

---

## 🚨 Troubleshooting

### Erro: "Cannot find module 'NfseModule'"
**Causa**: NfseModule não foi importado em app.module.ts
**Solução**: Verificar import e adicionar em imports array

### Erro: "service column 'someField' does not exist"
**Causa**: Migration não foi aplicada
**Solução**: `npx prisma migrate deploy`

### SEFAZ retorna 404
**Causa**: URL errada ou certificado inválido
**Solução**: Validar SEFAZ_PRODUCAO_URL no .env, testar com curl

### NFS-e fica em PENDENTE_SEFAZ
**Causa**: SEFAZ offline ou timeout
**Solução**: Aguardar ou fazer retry manual via `/nfse/consultar/:nfseId`

### Certificado expirou
**Causa**: Validade de 1-2 anos venceu
**Solução**: Renovar certificado em AC credenciada, copiar para `/app/config/`

---

## 📚 Referências

- **NF-Se**: Norma Técnica NT 2.02 (ABRASF)
- **LC 116/2003**: Códigos de serviço e alíquotas ISS
- **ICP-Brasil**: Certificados digitais AC raiz
- **SOAP SEFAZ**: WSDLs por município em portais de prefeituras
- **XmlDSig**: RFC 3075 para assinatura digital

---

**Status Geral**: ✅ Core implementado | ⚠️ Testes e refinements pendentes | 🚀 Pronto para fase de produção com checklist acima

**Data**: 2026-04-22  
**Versão**: 1.0
