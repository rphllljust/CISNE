# 💰 Fluxo de Faturamento Recorrente (Contratos de Manutenção)

## 📋 Visão Geral

Faturamento automático para contratos de manutenção, suporte ou serviços periódicos. Executa em background, gera SO automaticamente, completa-a e emite invoice/NFS-e.

---

## 🔄 Ciclo de Vida

```
Contrato ATIVO
      ↓
[CRON JOB - Executa a cada 24h]
      ↓
Verificar contratos com data de faturamento = hoje
      ↓
Para CADA contrato:
      ├─ Criar Service Order automaticamente
      ├─ Vincular técnicos padrão
      ├─ Completar SO automaticamente (0 horas)
      ├─ Gerar Invoice com valores do contrato
      ├─ Emitir NFS-e (se configurado)
      ├─ Registrar auditoria
      └─ Notificar cliente + admin
      ↓
Incrementar data de próximo faturamento
      ↓
[Aguardar próximo ciclo]
```

---

## 📊 Tabela: Dados do Contrato

| Campo | Tipo | Obrigatório | Exemplo |
|-------|------|-------------|---------|
| `id` | UUID | ✅ | `contract-001` |
| `clientId` | UUID | ✅ | `cli-001` |
| `tipo` | `MENSAL` / `BIMESTRAL` / `TRIMESTRAL` / `ANUAL` | ✅ | `MENSAL` |
| `valorMensal` | Decimal | ✅ | 1500.00 |
| `dataProximoFaturamento` | Date | ✅ | 2026-05-21 |
| `dataFimVigencia` | Date | ✅ | 2027-04-21 |
| `tecnicosPadrao` | UUID[] | ⭕ | [`user-tech-001`] |
| `gerarNfse` | Boolean | ✅ | true |
| `gerarBoleto` | Boolean | ⭕ | true |
| `status` | `ATIVO` / `PAUSADO` / `ENCERRADO` | ✅ | `ATIVO` |

---

## 🗓️ Configuração de Frequência

```typescript
// Exemplo de configuração no contrato
{
  tipo: 'MENSAL',
  diaDoMes: 21,  // Fatura todo dia 21
  // Próximo: 21/05, 21/06, 21/07, etc
}

{
  tipo: 'BIMESTRAL',
  diaDoMes: 15,
  // Próximo: 15/05, 15/07, 15/09, etc
}

{
  tipo: 'ANUAL',
  diaDoMes: 1,
  mesDoAno: 4,  // 1º de abril
  // Próximo: 01/04/2027, 01/04/2028, etc
}
```

---

## 🚀 Implementação (Pseudocódigo)

```typescript
@Cron('0 2 * * *')  // Executa às 2h da manhã todo dia
async processarFaturamentosRecorrentes() {
  const logger = this.logger;
  
  logger.log('🔄 Iniciando faturamento recorrente...');
  
  // 1. Buscar contratos que vencem hoje
  const contratosVencidos = await this.prisma.contract.findMany({
    where: {
      status: 'ATIVO',
      dataProximoFaturamento: { lte: new Date() },
      dataFimVigencia: { gt: new Date() }
    },
    include: { client: true }
  });
  
  logger.log(`📊 Encontrados ${contratosVencidos.length} contratos para faturar`);
  
  for (const contrato of contratosVencidos) {
    try {
      // 2. Criar Service Order
      const so = await this.criarSOAutomatica(contrato);
      logger.log(`✅ SO criada: ${so.id}`);
      
      // 3. Completar SO imediatamente (sem execução real)
      await this.serviceOrderService.updateStatus(
        so.id,
        'COMPLETED',
        { sub: 'SYSTEM_BILLING' } // Usuário de sistema
      );
      logger.log(`✅ SO completada: ${so.id}`);
      
      // 4. Gerar Invoice
      const invoice = await this.invoiceService.emitirInvoice(
        so.id,
        {
          grossAmount: contrato.valorMensal,
          discountAmount: 0,
          taxAmount: 0
        },
        { sub: 'SYSTEM_BILLING' }
      );
      logger.log(`✅ Invoice criada: ${invoice.id}`);
      
      // 5. Emitir NFS-e se configurado
      if (contrato.gerarNfse) {
        try {
          const nfse = await this.nfseService.emitirNfseComSo(
            so.id,
            invoice.id,
            { sub: 'SYSTEM_BILLING' }
          );
          logger.log(`✅ NFS-e emitida: ${nfse.numero}`);
        } catch (error) {
          logger.error(`❌ Erro ao emitir NFS-e: ${error.message}`);
          // Não falhar o contrato se NFS-e falhar (retry manual)
        }
      }
      
      // 6. Gerar boleto se configurado
      if (contrato.gerarBoleto) {
        // Integração com gateway de pagamento
        await this.boletoService.gerarBoleto(invoice.id);
      }
      
      // 7. Atualizar data de próximo faturamento
      const proximaData = this.calcularProximaData(
        contrato.tipo,
        contrato.diaDoMes
      );
      
      await this.prisma.contract.update({
        where: { id: contrato.id },
        data: { dataProximoFaturamento: proximaData }
      });
      logger.log(`📅 Próximo faturamento: ${proximaData.toLocaleDateString('pt-BR')}`);
      
      // 8. Notificar cliente
      await this.notificationService.send({
        event: 'ContratoBillingGerado',
        data: {
          clientId: contrato.clientId,
          contractId: contrato.id,
          invoiceId: invoice.id,
          valor: contrato.valorMensal
        }
      });
      
      // 9. Auditoria
      await this.auditService.register({
        actorId: 'SYSTEM_BILLING',
        action: 'CONTRATO_FATURADO',
        resource: 'contract',
        resourceId: contrato.id
      });
      
    } catch (error) {
      logger.error(`❌ Erro ao faturar contrato ${contrato.id}: ${error.message}`);
      
      // Notificar admin sobre falha
      await this.notificationService.send({
        event: 'ContratoFaturamentoFalhou',
        data: {
          contractId: contrato.id,
          erro: error.message
        },
        channels: ['email']
      });
    }
  }
  
  logger.log('✅ Faturamento recorrente concluído');
}

// Helper: Calcular próxima data de faturamento
private calcularProximaData(
  tipo: 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'ANUAL',
  diaDoMes: number
): Date {
  const hoje = new Date();
  
  switch (tipo) {
    case 'MENSAL':
      return new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaDoMes);
    case 'BIMESTRAL':
      return new Date(hoje.getFullYear(), hoje.getMonth() + 2, diaDoMes);
    case 'TRIMESTRAL':
      return new Date(hoje.getFullYear(), hoje.getMonth() + 3, diaDoMes);
    case 'ANUAL':
      return new Date(hoje.getFullYear() + 1, hoje.getMonth(), diaDoMes);
    default:
      return hoje;
  }
}

// Helper: Criar SO automática
private async criarSOAutomatica(contrato: any) {
  return this.serviceOrderService.create({
    clientId: contrato.clientId,
    serviceTypeId: contrato.serviceTypeId,
    title: `Faturamento Recorrente - ${contrato.descricao}`,
    description: `Manutenção/Suporte periódico conforme contrato ${contrato.numero}`,
    estimatedValue: contrato.valorMensal,
    contractId: contrato.id,
    assignedTeamId: contrato.teamPadraoId,
    // Técnicos podem ser opcionais para contrato recorrente
    createdById: 'SYSTEM_BILLING',
    isRecurring: true  // Flag para marcar como gerado por faturamento
  }, { sub: 'SYSTEM_BILLING' });
}
```

---

## ⚠️ Cenários de Exceção

### Cenário 1: Contrato encerra no meio do mês

```
Data de vencimento do contrato: 15/05/2026
Próximo faturamento programado: 21/05/2026

Validação necessária:
├─ Se dataProximoFaturamento > dataFimVigencia:
│  └─ Não gerar faturamento (contrato encerrando)
│
└─ Se dataFimVigencia entre hoje e próximo faturamento:
   ├─ Faturar valor proporcional ao período
   └─ Marcar contrato como ENCERRADO
```

### Cenário 2: Cliente sem técnico padrão

```
Contrato.tecnicosPadrao = []

Ação:
├─ ✅ Criar SO sem atribuição (para revisão manual)
├─ ⚠️ Avisar em log
└─ 📧 Notificar admin para completar atribuição
```

### Cenário 3: Falha na emissão de NFS-e

```
gerarNfse = true
SEFAZ está offline

Ação:
├─ ✅ Faturamento continua (não bloqueia)
├─ 📧 Notificar admin
├─ 🔄 Retry automático em 6h
└─ 📋 Marcar NFS-e como "PENDENTE_SEFAZ"
```

### Cenário 4: Cliente deletado

```
Contrato refere cliente que foi deletado

Validação:
├─ Buscar com client.deletedAt IS NULL
└─ ✅ Pular automaticamente (seguro)
```

---

## 📈 Exemplo de Fluxo Prático

**Contrato:** Manutenção mensal | Cliente: Acme Corp | Valor: R$ 2.000 | Vence: 21/04/2026

**Dia 20/04, 23:59:**
- Faturamento recorrente ainda não acionado

**Dia 21/04, 02:00 (CRON):**
1. ✅ Busca contratos com dataProximoFaturamento = 21/04
2. ✅ Encontra contrato Acme Corp
3. ✅ Cria SO "Faturamento Recorrente - Manutenção Acme" (status: OPEN)
4. ✅ Completa SO (status: COMPLETED)
5. ✅ Gera Invoice de R$ 2.000
6. ✅ Emite NFS-e (n. 12345, código de verificação ABC123)
7. ✅ Gera boleto com vencimento 21/05
8. ✅ Próximo faturamento: 21/05/2026
9. 📧 Email ao cliente: "Sua fatura de manutenção está pronta"

**Dia 21/04, 02:30:**
- Dashboard mostra +1 SO e +1 Invoice gerados automaticamente
- Acme Corp vê boleto disponível no portal

---

## 🔧 Configuração do CRON

```bash
# .env
BILLING_CRON_SCHEDULE=0 2 * * *  # 02:00 todo dia
TIMEZONE=America/Sao_Paulo        # Usar timezone brasileiro

# app.module.ts
@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ...
  ]
})
export class AppModule {}
```

---

## 📊 Monitoramento

```sql
-- Contratos vencendo semana que vem
SELECT id, numero, dataProximoFaturamento, valorMensal
FROM "Contract"
WHERE dataProximoFaturamento BETWEEN now() AND now() + interval '7 days'
AND status = 'ATIVO'
ORDER BY dataProximoFaturamento;

-- Últimos faturamentos gerados
SELECT so.id, so.title, inv.netAmount, nfse.numero
FROM "ServiceOrder" so
LEFT JOIN "Invoice" inv ON so.id = inv."serviceOrderId"
LEFT JOIN "Nfse" nfse ON inv.id = nfse."invoiceId"
WHERE so."isRecurring" = true
ORDER BY so."createdAt" DESC
LIMIT 20;
```

---

## ✅ Checklist de Implementação

- [ ] Criar modelo `Contract` com campos: tipo, valorMensal, dataProximoFaturamento, status
- [ ] Implementar CRON com `@nestjs/schedule`
- [ ] Criar função `processarFaturamentosRecorrentes()`
- [ ] Adicionar validação de data de fim de vigência
- [ ] Integrar com `ServiceOrderService.create()`
- [ ] Integrar com `InvoiceService.emitir()`
- [ ] Integrar com `NfseService.emitirNfseComSo()`
- [ ] Criar notificações para cliente e admin
- [ ] Adicionar auditoria de faturamento
- [ ] Testes unitários (mock CRON)
- [ ] Testes E2E (contrato real)
- [ ] Documentar em README

---

**Versão:** 1.0  
**Status:** ✅ Pronto para implementação  
**Data:** 2026-04-21
