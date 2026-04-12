/**
 * MÓDULO 7: Monitoramento e Relatórios de Automação
 *
 * Métricas:
 * - Taxa de Automação: (OSs criadas automaticamente / Total OSs) × 100  → Meta: 90%
 * - Tempo Médio de Processamento: tempo entre recebimento e criação  → Meta: < 5 min
 * - Erro de Extração: (dados incorretos / total extraído) × 100  → Meta: < 2%
 * - Confirmação de Cliente: (confirmaram / total convidados) × 100  → Meta: > 85%
 *
 * Logs e Auditoria (7.2):
 * - Extrações com timestamp e operador
 * - Rastreamento de correções manuais
 * - Alerta sobre padrões anormais
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';

@Injectable()
export class AutomationMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dashboard de métricas de automação (MÓDULO 7.1)
   */
  async getAutomationDashboard(filter?: { startDate?: string; endDate?: string }): Promise<{
    automationRate: number;
    avgProcessingMinutes: number;
    extractionErrorRate: number;
    clientConfirmationRate: number;
    totalExtractions: number;
    totalAutoCreated: number;
    totalManualCorrections: number;
    lowConfidenceExtractions: number;
    anomalies: string[];
    bySourceType: Array<{ sourceType: string; count: number; avgConfidence: number }>;
  }> {
    const dateFilter = this.buildDateFilter(filter);

    const [
      totalOs,
      autoCreatedOs,
      totalExtractions,
      manualCorrections,
      lowConfidenceCount,
      confirmedSchedules,
      totalScheduled,
      sourceTypeStats
    ] = await Promise.all([
      this.prisma.serviceOrder.count({ where: { deletedAt: null, ...dateFilter } }),
      this.prisma.serviceOrder.count({ where: { deletedAt: null, autoCreated: true, ...dateFilter } }),
      this.prisma.documentExtraction.count({ where: dateFilter }),
      this.prisma.documentExtraction.count({ where: { manuallyCorrectd: true, ...dateFilter } }),
      this.prisma.documentExtraction.count({
        where: { overallConfidence: { lt: 0.6 }, ...dateFilter }
      }),
      this.prisma.schedule.count({
        where: { confirmationStatus: 'CONFIRMED', ...this.buildScheduleDateFilter(filter) }
      }),
      this.prisma.schedule.count({ where: this.buildScheduleDateFilter(filter) }),
      this.prisma.documentExtraction.groupBy({
        by: ['sourceType'],
        where: dateFilter as Prisma.DocumentExtractionWhereInput,
        _count: { _all: true },
        _avg: { overallConfidence: true }
      })
    ]);

    // Taxa de Automação
    const automationRate = totalOs > 0 ? Math.round((autoCreatedOs / totalOs) * 10000) / 100 : 0;

    // Erro de Extração (proporção de correções manuais)
    const extractionErrorRate =
      totalExtractions > 0 ? Math.round((manualCorrections / totalExtractions) * 10000) / 100 : 0;

    // Confirmação de Cliente
    const clientConfirmationRate =
      totalScheduled > 0 ? Math.round((confirmedSchedules / totalScheduled) * 10000) / 100 : 0;

    // Tempo médio de processamento
    const avgProcessingMinutes = await this.computeAvgProcessingMinutes(dateFilter);

    // Anomalias
    const anomalies = await this.detectAnomalies();

    return {
      automationRate,
      avgProcessingMinutes,
      extractionErrorRate,
      clientConfirmationRate,
      totalExtractions,
      totalAutoCreated: autoCreatedOs,
      totalManualCorrections: manualCorrections,
      lowConfidenceExtractions: lowConfidenceCount,
      anomalies,
      bySourceType: sourceTypeStats.map((row) => ({
        sourceType: row.sourceType,
        count: row._count._all,
        avgConfidence: Math.round(Number(row._avg.overallConfidence ?? 0) * 100) / 100
      }))
    };
  }

  /**
   * Log de extrações com rastreamento completo (MÓDULO 7.2)
   */
  async getExtractionAuditLog(page = 1, limit = 50): Promise<{
    items: unknown[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.documentExtraction.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          sourceType: true,
          overallConfidence: true,
          isComplete: true,
          missingFields: true,
          warnings: true,
          autoProcessed: true,
          manuallyCorrectd: true,
          correctedAt: true,
          serviceOrderId: true,
          resolvedClientId: true,
          createdAt: true,
          createdBy: { select: { fullName: true } },
          correctedBy: { select: { fullName: true } }
        }
      }),
      this.prisma.documentExtraction.count()
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Taxa de automação por período (MÓDULO 7.1 - para dashboard gráfico)
   */
  async getAutomationRateTimeSeries(days = 30): Promise<
    Array<{ date: string; total: number; autoCreated: number; rate: number }>
  > {
    const results: Array<{ date: string; total: number; autoCreated: number; rate: number }> = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const start = new Date(day.setHours(0, 0, 0, 0));
      const end = new Date(day.setHours(23, 59, 59, 999));

      const [total, autoCreated] = await Promise.all([
        this.prisma.serviceOrder.count({ where: { deletedAt: null, openedAt: { gte: start, lte: end } } }),
        this.prisma.serviceOrder.count({ where: { deletedAt: null, autoCreated: true, openedAt: { gte: start, lte: end } } })
      ]);

      results.push({
        date: start.toISOString().split('T')[0],
        total,
        autoCreated,
        rate: total > 0 ? Math.round((autoCreated / total) * 10000) / 100 : 0
      });
    }

    return results;
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  private async computeAvgProcessingMinutes(dateFilter: Record<string, unknown>): Promise<number> {
    const extractions = await this.prisma.documentExtraction.findMany({
      where: { autoProcessed: true, serviceOrderId: { not: null }, ...dateFilter },
      select: { createdAt: true, serviceOrderId: true }
    });

    if (!extractions.length) return 0;

    const durations = await Promise.all(
      extractions.map(async (e) => {
        const so = await this.prisma.serviceOrder.findUnique({
          where: { id: e.serviceOrderId! },
          select: { openedAt: true }
        });
        return so ? (so.openedAt.getTime() - e.createdAt.getTime()) / 60000 : null;
      })
    );

    const valid = durations.filter((d): d is number => d !== null && d >= 0);
    if (!valid.length) return 0;
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
  }

  private async detectAnomalies(): Promise<string[]> {
    const anomalies: string[] = [];
    const oneHourAgo = new Date(Date.now() - 3600000);

    // Alerta: > 50 OSs/hora (MÓDULO 8 - Volume alto)
    const recentCount = await this.prisma.serviceOrder.count({
      where: { openedAt: { gte: oneHourAgo } }
    });
    if (recentCount > 50) {
      anomalies.push(`Volume alto: ${recentCount} OSs criadas na última hora (threshold: 50)`);
    }

    // Alerta: múltiplas tentativas do mesmo documento (mesmo rawContent nos últimos 60min)
    const duplicates = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "DocumentExtraction"
      WHERE "createdAt" >= ${oneHourAgo}
      GROUP BY LEFT("rawContent", 200)
      HAVING COUNT(*) > 3
    `;
    if ((duplicates as Array<{ count: bigint }>).some((r) => Number(r.count) > 3)) {
      anomalies.push('Possível duplicação: múltiplas submissões do mesmo documento detectadas');
    }

    // Taxa de erro alta (> 5% nas últimas 2h)
    const twoHoursAgo = new Date(Date.now() - 7200000);
    const [recentExtractions, recentErrors] = await Promise.all([
      this.prisma.documentExtraction.count({ where: { createdAt: { gte: twoHoursAgo } } }),
      this.prisma.documentExtraction.count({
        where: { createdAt: { gte: twoHoursAgo }, overallConfidence: { lt: 0.4 } }
      })
    ]);
    if (recentExtractions > 10 && recentErrors / recentExtractions > 0.05) {
      anomalies.push(
        `Taxa de erro de extração elevada: ${Math.round((recentErrors / recentExtractions) * 100)}% nas últimas 2h`
      );
    }

    return anomalies;
  }

  private buildDateFilter(filter?: { startDate?: string; endDate?: string }): Record<string, unknown> {
    if (!filter?.startDate && !filter?.endDate) return {};
    return {
      createdAt: {
        ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
        ...(filter.endDate ? { lte: new Date(filter.endDate) } : {})
      }
    };
  }

  private buildScheduleDateFilter(filter?: { startDate?: string; endDate?: string }): Record<string, unknown> {
    if (!filter?.startDate && !filter?.endDate) return {};
    return {
      scheduledAt: {
        ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
        ...(filter.endDate ? { lte: new Date(filter.endDate) } : {})
      }
    };
  }
}
