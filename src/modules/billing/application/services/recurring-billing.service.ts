import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { NfseService } from '@/modules/nfse/application/services/nfse.service';
import { AuditService } from '@/modules/audit/application/services/audit.service';

const SYSTEM_ACTOR = { sub: 'SYSTEM_BILLING', email: 'system@oms.local', roles: ['SUPER_ADMIN'] };

@Injectable()
export class RecurringBillingService {
  private readonly logger = new Logger(RecurringBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nfseService: NfseService,
    private readonly auditService: AuditService
  ) {}

  @Cron(process.env.BILLING_CRON_SCHEDULE || '0 2 * * *')
  async processarFaturamentosRecorrentes(): Promise<void> {
    this.logger.log('🔄 Iniciando faturamento recorrente...');

    try {
      // 1. Buscar contratos que devem ser faturados
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const contratos = await this.prisma.contract.findMany({
        where: {
          status: 'ACTIVE',
          nextBillingDate: { lte: today },
          endDate: { gt: today }
        },
        include: { client: true }
      });

      this.logger.log(`📊 Encontrados ${contratos.length} contratos para faturar`);

      for (const contrato of contratos) {
        try {
          await this.faturarContrato(contrato);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`❌ Erro ao faturar contrato ${contrato.id}: ${message}`);
        }
      }

      this.logger.log('✅ Faturamento recorrente concluído');
    } catch (error) {
      const message2 = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erro fatal em faturamento recorrente: ${message2}`);
    }
  }

  /**
   * Fatura um contrato específico
   */
  private async faturarContrato(contrato: any): Promise<void> {
    this.logger.log(`💳 Faturando contrato ${contrato.id} (${contrato.code})`);

    try {
      // 2. Criar Service Order automaticamente
      const so = await this.prisma.serviceOrder.create({
        data: {
          clientId: contrato.clientId,
          serviceTypeId: contrato.serviceTypeId || 'default',
          title: `Faturamento Recorrente - ${contrato.title}`,
          description: `Manutenção/Suporte periódico conforme contrato ${contrato.code}`,
          priority: 'MEDIUM',
          status: 'COMPLETED',
          estimatedValue: contrato.monthlyValue,
          createdById: 'system'
        }
      });

      this.logger.log(`✅ SO criada: ${so.id}`);

      // 3. Gerar Invoice
      const invoice = await this.prisma.invoice.create({
        data: {
          serviceOrderId: so.id,
          clientId: contrato.clientId,
          contractId: contrato.id,
          grossAmount: contrato.monthlyValue,
          discountAmount: 0,
          taxAmount: 0,
          netAmount: contrato.monthlyValue,
          description: `Faturamento recorrente - ${contrato.title}`
        }
      });

      this.logger.log(`✅ Invoice criada: ${invoice.id}`);

      // 4. Emitir NFS-e se configurado
      if (contrato.generateNfse) {
        try {
          const nfse = await this.nfseService.emitirNfseComSo(so.id, invoice.id, SYSTEM_ACTOR as any);
          this.logger.log(`✅ NFS-e emitida: ${nfse.numero}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`⚠️ Erro ao emitir NFS-e: ${message} - continuando faturamento`);
        }
      }

      // 5. Calcular próximo faturamento
      const proximaData = this.calcularProximaData(
        contrato.billingFrequency || 'MONTHLY',
        contrato.billingDayOfMonth || 1,
        contrato.billingMonth
      );

      // 6. Atualizar contrato
      await this.prisma.contract.update({
        where: { id: contrato.id },
        data: {
          nextBillingDate: proximaData,
          lastBilledAt: new Date()
        }
      });

      this.logger.log(`📅 Próximo faturamento: ${proximaData.toLocaleDateString('pt-BR')}`);

      // 7. Auditoria
      await this.auditService.register({
        actorId: SYSTEM_ACTOR.sub,
        action: 'CONTRATO_FATURADO',
        resource: 'contract',
        resourceId: contrato.id,
        metadata: {
          serviceOrderId: so.id,
          invoiceId: invoice.id
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erro ao faturar contrato ${contrato.id}: ${message}`);
      throw error;
    }
  }

  /**
   * Calcula próxima data de faturamento
   */
  private calcularProximaData(
    frequencia: 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'ANNUAL',
    diaDoMes: number,
    mesDoAno?: number
  ): Date {
    const hoje = new Date();
    let proxima = new Date(hoje);

    switch (frequencia) {
      case 'MONTHLY':
        proxima.setMonth(proxima.getMonth() + 1);
        proxima.setDate(Math.min(diaDoMes, 28)); // Evitar erro em fevereiro
        break;

      case 'BIMONTHLY':
        proxima.setMonth(proxima.getMonth() + 2);
        proxima.setDate(Math.min(diaDoMes, 28));
        break;

      case 'QUARTERLY':
        proxima.setMonth(proxima.getMonth() + 3);
        proxima.setDate(Math.min(diaDoMes, 28));
        break;

      case 'ANNUAL':
        proxima.setFullYear(proxima.getFullYear() + 1);
        if (mesDoAno) {
          proxima.setMonth(mesDoAno - 1);
        }
        proxima.setDate(Math.min(diaDoMes, 28));
        break;
    }

    proxima.setHours(0, 0, 0, 0);
    return proxima;
  }
}
