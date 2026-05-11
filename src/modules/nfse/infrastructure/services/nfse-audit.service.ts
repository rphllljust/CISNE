import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export interface NfseAuditEntry {
  nfseId: string;
  operacao: 'EMISSAO' | 'CONSULTA' | 'CANCELAMENTO' | 'CORRECAO' | 'VALIDACAO' | 'REJEICAO';
  statusAnterior?: string;
  statusNovo: string;
  usuario: string;
  ip?: string;
  userAgent?: string;
  detalhes?: Record<string, any>;
}

/**
 * Serviço para auditoria detalhada de operações NFS-e
 * Rastreia todas as mudanças de status e operações críticas
 */
@Injectable()
export class NfseAuditService {
  private readonly logger = new Logger(NfseAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra uma operação NFS-e na auditoria
   */
  async registrar(entrada: NfseAuditEntry): Promise<void> {
    try {
      const timestamp = new Date();

      this.logger.log(
        `📝 Auditoria NFS-e [${entrada.nfseId}] - ${entrada.operacao}: ${entrada.statusAnterior || 'N/A'} → ${entrada.statusNovo}`
      );

      // Registra na auditoria geral
      const metadata = {
        nfseId: entrada.nfseId,
        operacao: entrada.operacao,
        statusAnterior: entrada.statusAnterior,
        statusNovo: entrada.statusNovo,
        ip: entrada.ip,
        userAgent: entrada.userAgent,
        ...entrada.detalhes
      };

      await this.prisma.auditLog.create({
        data: {
          actorId: entrada.usuario,
          action: `NFSE_${entrada.operacao}`,
          resource: 'nfse',
          resourceId: entrada.nfseId,
          metadata
        }
      });
    } catch (error) {
      this.logger.error(`❌ Erro ao registrar auditoria: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Obtém histórico de operações de uma NFS-e
   */
  async obterHistorico(nfseId: string): Promise<any[]> {
    try {
      return await this.prisma.auditLog.findMany({
        where: {
          resourceId: nfseId,
          action: {
            startsWith: 'NFSE_'
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      this.logger.error(`❌ Erro ao obter histórico: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Gera relatório de auditoria para período
   */
  async gerarRelatorio(dataInicio: Date, dataFim: Date): Promise<{
    totalOperacoes: number;
    operacoesPorTipo: Record<string, number>;
    operacoesPorStatus: Record<string, number>;
  }> {
    try {
      const auditLogs = await this.prisma.auditLog.findMany({
        where: {
          action: {
            startsWith: 'NFSE_'
          },
          createdAt: {
            gte: dataInicio,
            lte: dataFim
          }
        }
      });

      const operacoesPorTipo: Record<string, number> = {};
      const operacoesPorStatus: Record<string, number> = {};

      auditLogs.forEach((log) => {
        const tipo = log.action.replace('NFSE_', '');
        operacoesPorTipo[tipo] = (operacoesPorTipo[tipo] ?? 0) + 1;

        const status = (log.metadata as any)?.statusNovo || 'DESCONHECIDO';
        operacoesPorStatus[status] = (operacoesPorStatus[status] ?? 0) + 1;
      });

      return {
        totalOperacoes: auditLogs.length,
        operacoesPorTipo,
        operacoesPorStatus
      };
    } catch (error) {
      this.logger.error(`❌ Erro ao gerar relatório: ${error instanceof Error ? error.message : String(error)}`);
      return {
        totalOperacoes: 0,
        operacoesPorTipo: {},
        operacoesPorStatus: {}
      };
    }
  }

  /**
   * Verifica se uma operação é permitida baseado no histórico
   */
  async podeExecutarOperacao(
    nfseId: string,
    operacao: 'CONSULTA' | 'CANCELAMENTO' | 'CORRECAO'
  ): Promise<{ permitido: boolean; motivo?: string }> {
    try {
      const nfse = await this.prisma.nfse.findUnique({
        where: { id: nfseId }
      });

      if (!nfse) {
        return { permitido: false, motivo: 'NFS-e não encontrada' };
      }

      switch (operacao) {
        case 'CANCELAMENTO':
          if (nfse.statusNfse === 'CANCELADA') {
            return { permitido: false, motivo: 'NFS-e já está cancelada' };
          }
          if (nfse.statusNfse === 'RASCUNHO') {
            return { permitido: false, motivo: 'Não é possível cancelar NFS-e em rascunho' };
          }
          break;

        case 'CORRECAO':
          if (nfse.statusNfse === 'CANCELADA') {
            return { permitido: false, motivo: 'Não é possível corrigir NFS-e cancelada' };
          }
          break;

        case 'CONSULTA':
          if (nfse.statusNfse === 'RASCUNHO') {
            return { permitido: false, motivo: 'NFS-e ainda não foi emitida' };
          }
          break;
      }

      return { permitido: true };
    } catch (error) {
      this.logger.error(`❌ Erro ao verificar permissão: ${error instanceof Error ? error.message : String(error)}`);
      return { permitido: false, motivo: 'Erro ao verificar permissão' };
    }
  }
}
