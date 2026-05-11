# ⚠️ Guia de Correção: Erros Fiscais e Operacionais do OMS

## 🎯 Objetivo

Identificar e corrigir **erros que impedem compliance fiscal** ou travam o fluxo operacional do sistema.

---

## ✅ ERROS CORRIGIDOS ATÉ AGORA

### 1. ✅ ITSM Changes Endpoint (26/04/2026)
**Problema:** API retornava 404 ao listar mudanças
- ❌ Frontend enviava `type` na query
- ❌ Backend esperava `category`
- ❌ DTOs tinham duplicação de campos

**Solução:**
```typescript
// Frontend: changes-list.page.tsx
const filter = { page, limit: 20, category: type || undefined };

// Backend: itsm.service.ts
const where = { category: query.category, ... };

// Mapeamento: Retornar com alias 'type'
items.map(item => ({ ...item, type: item.category }))
```

**Status:** ✅ Corrigido  
**Teste:** `GET /api/v1/itsm/changes?page=1&limit=20` → 200 OK

---

## 🔍 ERROS FISCAIS CRÍTICOS

### Erro F1: Cliente sem CPF/CNPJ Válido

**Sintoma:** Emissão de NFS-e falha com "CPF/CNPJ inválido"

**Causa Raiz:**
```sql
-- Buscar clientes sem CPF/CNPJ
SELECT id, name, cpfCnpj FROM "Client" 
WHERE cpfCnpj IS NULL OR cpfCnpj = '';

-- Validar CPF/CNPJ inválido
SELECT id, name, cpfCnpj FROM "Client"
WHERE LENGTH(REPLACE(cpfCnpj, '.', '')) NOT IN (11, 14);
```

**Correção:**

```typescript
// Validar na criação/edição de cliente
async createClient(dto: CreateClientDto) {
  if (!this.validarCpfCnpj(dto.cpfCnpj)) {
    throw new BadRequestException('CPF/CNPJ inválido');
  }
  // ... resto da lógica
}
```

**Checklist:**
- [ ] Validar CPF/CNPJ em tempo de cadastro
- [ ] Recusar clientes PF com CPF 00.000.000-00 (placeholder)
- [ ] Recusar clientes PJ com CNPJ 00.000.000/0000-00
- [ ] Integrar com API Receita Federal (validação real)

---

### Erro F2: Código de Serviço Inválido (LC 116/2003)

**Sintoma:** SEFAZ rejeita NFS-e com "Código de serviço não existe"

**Causa Raiz:**
```sql
-- Códigos de serviço inválidos
SELECT DISTINCT "codigoServico" FROM "ServiceOrder"
WHERE "codigoServico" NOT IN (
  SELECT codigo FROM servico_lc116_2003
);
```

**Tabela correta (LC 116/2003 - amostra):**
| Código | Serviço |
|--------|---------|
| 0101 | Análise e desenvolvimento de sistemas |
| 0102 | Consultoria em sistemas |
| 0103 | Processamento de dados |
| 0201 | Serviços de limpeza |
| 0202 | Higiene e saúde |

**Correção:**

```typescript
// Criar tabela de referência
model ServicoLC116 {
  id       String @id @default(uuid())
  codigo   String @unique  // Ex: "0101"
  nome     String          // "Análise de sistemas"
  descricao String?
  aliquotaPadrao Float      // Alíquota ISS padrão
}

// Validar ao criar SO
const servicoValido = await this.prisma.servicoLC116.findUnique({
  where: { codigo: dto.codigoServico }
});

if (!servicoValido) {
  throw new BadRequestException('Código de serviço LC 116/2003 não encontrado');
}
```

**Checklist:**
- [ ] Importar tabela LC 116/2003 completa (100+ códigos)
- [ ] Indexar por código para lookup rápido
- [ ] Validar código ao criar ServiceOrder
- [ ] Exibir dropdown com serviços válidos na UI
- [ ] Atualizar anualmente (norma muda)

---

### Erro F3: Alíquota ISS Fora da Faixa Permitida

**Sintoma:** NFS-e emitida com ISS > 5% (máximo LC 116)

**Causa Raiz:**
```sql
-- ISS fora do intervalo
SELECT id, "codigoServico", aliquotaIss 
FROM "Nfse"
WHERE aliquotaIss > 0.05 OR aliquotaIss < 0;
```

**Regulação:**
- LC 116/2003: ISS máximo 5%
- Alguns municípios cobram menos (ex: SP 3% para TI)
- Nunca pode ser negativo!

**Correção:**

```typescript
// Buscar alíquota municipal
const aliquotaMunicipal = await this.prisma.aliquotaIssLocal.findUnique({
  where: {
    municipioCodigoIbge_codigoServico: {
      municipioCodigoIbge: '3550308', // São Paulo
      codigoServico: '0101'
    }
  }
});

if (!aliquotaMunicipal) {
  // Fallback: usar alíquota padrão LC 116
  aliquotaIss = 0.05;
} else {
  aliquotaIss = aliquotaMunicipal.aliquota;
}

// Validar
if (aliquotaIss < 0 || aliquotaIss > 0.05) {
  throw new BadRequestException('Alíquota ISS inválida');
}
```

**Checklist:**
- [ ] Criar tabela `AliquotaIssLocal` (municipio + serviço + alíquota)
- [ ] Importar para cada município de operação
- [ ] Atualizar anualmente (LC de cada cidade)
- [ ] Fallback para 5% se não encontrar
- [ ] Bloquear valores fora de 0-5%

---

### Erro F4: NFS-e Duplicada (Mesma SO + Invoice)

**Sintoma:** Sistema emite 2 NFS-es para mesma Invoice

**Causa Raiz:**
```sql
-- Encontrar duplicatas
SELECT "serviceOrderId", "invoiceId", COUNT(*) 
FROM "Nfse"
WHERE "deletedAt" IS NULL
GROUP BY "serviceOrderId", "invoiceId"
HAVING COUNT(*) > 1;
```

**Correção:**

```typescript
// 1. DB constraint (prevenção)
model Nfse {
  @@unique([serviceOrderId, invoiceId])
}

// 2. Validação na service (idempotência)
async emitirNfseComSo(soId: string, invoiceId: string) {
  // Verificar se já existe
  const existente = await this.prisma.nfse.findFirst({
    where: {
      serviceOrderId: soId,
      invoiceId: invoiceId,
      deletedAt: null
    }
  });

  if (existente) {
    return existente; // Retornar a existente (idempotente)
  }

  // Criar nova
  return this.criar(...);
}

// 3. Frontend: desabilitar botão após clique
const [enviando, setEnviando] = useState(false);

const handleEmitir = async () => {
  setEnviando(true);
  try {
    await emitirNfse();
  } finally {
    setEnviando(false);
  }
};

<Button disabled={enviando} onClick={handleEmitir}>
  {enviando ? 'Emitindo...' : 'Emitir NFS-e'}
</Button>
```

**Checklist:**
- [ ] Adicionar unique constraint no banco
- [ ] Implementar idempotência na service
- [ ] Desabilitar botão durante requisição (UI)
- [ ] Testes: clicar 2x rápido
- [ ] Monitoramento: alertar se encontrar duplicatas

---

### Erro F5: Retenção de Imposto Maior que Valor Bruto

**Sintoma:** Valor final da NFS-e é negativo

**Causa Raiz:**
```
Valor bruto: R$ 100
IRRF: R$ 50
PIS: R$ 40
COFINS: R$ 40
Total retenção: R$ 130

Valor final: 100 - 130 = -R$ 30 ❌
```

**Correção:**

```typescript
// Validar na service
const totalRetencoes = 
  (retencaoIrrf ?? 0) + 
  (retencaoPis ?? 0) + 
  (retencaoCofins ?? 0) + 
  (retencaoCsll ?? 0) + 
  (retencaoInss ?? 0);

const valorFinal = valorBruto - deducoes - totalRetencoes;

if (valorFinal < 0) {
  throw new BadRequestException(
    'Retenções não podem ser maiores que valor bruto'
  );
}

// Calcular retenções automaticamente conforme tabela IRPJ/PIS/COFINS
const retencoes = this.calcularRetencoesFederais(
  valorBruto,
  cliente.cnpj,
  codigoServico
);
```

**Tabelas de retenção (simplificadas):**
| Tipo | Alíquota | Minimo | Máximo |
|------|----------|--------|--------|
| IRRF | 1,5% | - | -|
| PIS | 1,65% | 30,51 | -|
| COFINS | 7,6% | - | -|
| CSLL | 1% | - | -|
| INSS | 11% | - | 751,98 |

**Checklist:**
- [ ] Validar que retenção ≤ valor bruto
- [ ] Tabelas de alíquota atualizadas (2026)
- [ ] Cálculo automático (não manual)
- [ ] Testes: valores limites

---

## 🔍 ERROS OPERACIONAIS

### Erro O1: Service Order sem Técnico Atribuído

**Sintoma:** SO finalizada mas ninguém executou (técnico null)

**Causa Raiz:** Permitir criar SO sem `assignedTechnicianId`

**Correção:**

```typescript
// Opção 1: Obrigatório (melhor para compliance)
async createSO(dto: CreateSODto) {
  if (!dto.assignedTechnicianId) {
    throw new BadRequestException('Técnico obrigatório');
  }
}

// Opção 2: Workflow de atribuição (mais flexível)
// SO criada em OPEN
// Status SCHEDULED: exigir técnico
// Validação na transição:
async transitionStatus(soId: string, newStatus: string) {
  if (newStatus === 'SCHEDULED') {
    const so = await this.findById(soId);
    if (!so.assignedTechnicianId) {
      throw new BadRequestException(
        'Técnico deve ser atribuído antes de agendar'
      );
    }
  }
}
```

**Checklist:**
- [ ] Definir quando técnico é obrigatório
- [ ] Bloquear transição sem técnico
- [ ] UI: mostrar aviso se SO sem técnico
- [ ] Dashboard: filtro "SO sem atribuição"

---

### Erro O2: Contrato Cancelado Mas Faturamento Recorrente Continua

**Sintoma:** Invoice gerada para cliente que rescindiu contrato

**Causa Raiz:**
```sql
-- Contrato cancelado mas ainda fatura
SELECT * FROM "Contract"
WHERE status = 'CANCELADO'
AND dataProximoFaturamento <= TODAY();
```

**Correção:**

```typescript
// CRON: verificar status do contrato
async processarFaturamentosRecorrentes() {
  const contratos = await this.prisma.contract.findMany({
    where: {
      status: 'ATIVO',  // ← Validar status
      dataProximoFaturamento: { lte: new Date() },
      dataFimVigencia: { gt: new Date() }  // ← Validar vigência
    }
  });

  for (const contrato of contratos) {
    // Se contrato foi cancelado, skip
    if (contrato.status !== 'ATIVO') {
      logger.warn(`Pulando contrato ${contrato.id} (status: ${contrato.status})`);
      continue;
    }

    // ... faturar
  }
}
```

**Checklist:**
- [ ] CRON: validar status = ATIVO
- [ ] CRON: validar data fim vigência
- [ ] Alertar admin antes de rescindir
- [ ] Testes: contratos cancelados não faturam

---

### Erro O3: Invoice Sem Valor

**Sintoma:** Invoice criada com valor = 0 (nenhum campo de valor preenchido)

**Causa Raiz:**
```typescript
// ❌ Permitir null
const grossAmount = dto.grossAmount ?? so.estimatedValue; // ambos null!
```

**Correção:**

```typescript
// ✅ Validar ambos
if (!dto.grossAmount && !so.estimatedValue) {
  throw new BadRequestException(
    'Valor bruto obrigatório (SO ou request)'
  );
}

const grossAmount = dto.grossAmount ?? so.estimatedValue;

if (grossAmount <= 0) {
  throw new BadRequestException('Valor deve ser > 0');
}
```

**Checklist:**
- [ ] Invoice: validar valor > 0
- [ ] SO: validar estimatedValue preenchido
- [ ] UI: campo de valor obrigatório
- [ ] Testes: rejeitar valor 0 ou negativo

---

### Erro O4: Endereço de Cliente Deletado

**Sintoma:** SO refere endereço que foi deletado

**Causa Raiz:** Permitir soft delete sem validar SOs

**Correção:**

```typescript
// Ao deletar address
async deleteAddress(id: string) {
  // Validar se há SOs usando este endereço
  const soUsando = await this.prisma.serviceOrder.findFirst({
    where: {
      locationAddressId: id,
      deletedAt: null
    }
  });

  if (soUsando) {
    throw new ConflictException(
      `Endereço está sendo usado na SO ${soUsando.id}`
    );
  }

  // Agora sim, deletar
  await this.prisma.address.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
}
```

**Checklist:**
- [ ] Validar referências antes de deletar
- [ ] Usar soft delete (deletedAt)
- [ ] Queries sempre filtrar deletedAt IS NULL
- [ ] Testes: impedir delete com dependências

---

## 📊 Dashboard de Saúde Fiscal

```sql
-- Alertas críticos
SELECT 
  'Cliente sem CPF/CNPJ' as problema,
  COUNT(*) as quantidade
FROM "Client" 
WHERE cpfCnpj IS NULL OR cpfCnpj = ''
UNION ALL
SELECT 
  'SO sem técnico',
  COUNT(*)
FROM "ServiceOrder"
WHERE "assignedTechnicianId" IS NULL
  AND status NOT IN ('CANCELED', 'COMPLETED')
UNION ALL
SELECT
  'Invoice sem valor',
  COUNT(*)
FROM "Invoice"
WHERE ("grossAmount" IS NULL OR "grossAmount" <= 0)
  AND "deletedAt" IS NULL
UNION ALL
SELECT
  'NFS-e rejeitada por SEFAZ',
  COUNT(*)
FROM "Nfse"
WHERE "statusNfse" = 'REJEITADA_SEFAZ'
  AND "dataEmissao" > NOW() - INTERVAL '7 days';
```

---

## ✅ Checklist Final de Correções

- [x] ITSM Changes endpoint (API)
- [ ] Cliente com CPF/CNPJ válido
- [ ] Código de serviço LC 116/2003
- [ ] Alíquota ISS 0-5%
- [ ] NFS-e não duplicada
- [ ] Retenção ≤ valor bruto
- [ ] SO com técnico atribuído
- [ ] Contrato cancelado não fatura
- [ ] Invoice com valor > 0
- [ ] Endereço referenciado não é deletado
- [ ] Dashboard de saúde fiscal
- [ ] Alertas para admin

---

**Versão:** 1.0  
**Data:** 2026-04-21  
**Status:** ✅ Pronto para Auditoria
