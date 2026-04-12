/**
 * MÓDULO 3.1 - Fluxo de Aprovação de Orçamento
 * Se valor > R$5.000 → requer aprovação do gerente + notificação automática
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { WebhooksService } from '../../../webhooks/application/services/webhooks.service';
import { BudgetApprovalDto } from '../dto/document-automation.dto';

@Injectable()
export class BudgetApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly webhooksService: WebhooksService
  ) {}

  /**
   * Aprovar ou rejeitar orçamento de OS (MÓDULO 3 step 3)
   */
  async processApproval(dto: BudgetApprovalDto, actor: JwtUserPayload): Promise<{
    serviceOrderId: string;
    decision: string;
    processedAt: string;
  }> {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: dto.serviceOrderId, deletedAt: null },
      include: { client: { select: { name: true } } }
    });

    if (!so) throw new NotFoundException('Ordem de serviço não encontrada');
    if (!so.budgetRequiresApproval) {
      throw new BadRequestException('Esta OS não requer aprovação de orçamento');
    }
    if (so.budgetApprovalStatus !== 'PENDING') {
      throw new BadRequestException(`Orçamento já processado: ${so.budgetApprovalStatus}`);
    }

    await this.prisma.serviceOrder.update({
      where: { id: dto.serviceOrderId },
      data: {
        budgetApprovalStatus: dto.decision,
        budgetApprovedById: actor.sub,
        budgetApprovedAt: new Date(),
        budgetRejectionReason: dto.decision === 'REJECTED' ? (dto.reason ?? null) : null
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: `BUDGET_${dto.decision}`,
      resource: 'service_order',
      resourceId: dto.serviceOrderId,
      metadata: { decision: dto.decision, reason: dto.reason }
    });

    // Notificar criador da OS sobre decisão do orçamento
    if (so.createdById) {
      await this.notificationsService.createInternalNotification({
        userId: so.createdById,
        title: `Orçamento ${dto.decision === 'APPROVED' ? 'aprovado' : 'rejeitado'} — OS #${so.orderNumber}`,
        message:
          dto.decision === 'APPROVED'
            ? `O orçamento da OS #${so.orderNumber} (${so.client.name}) foi aprovado.`
            : `O orçamento da OS #${so.orderNumber} foi rejeitado. Motivo: ${dto.reason ?? 'não informado'}`,
        type: 'BUDGET_DECISION',
        payload: { serviceOrderId: dto.serviceOrderId, decision: dto.decision }
      });
    }

    await this.webhooksService.publishEvent('service_order.budget_decision', {
      serviceOrderId: dto.serviceOrderId,
      orderNumber: so.orderNumber,
      decision: dto.decision,
      decidedBy: actor.sub,
      reason: dto.reason
    });

    return {
      serviceOrderId: dto.serviceOrderId,
      decision: dto.decision,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Listar OSs com orçamento pendente de aprovação
   */
  async listPendingApprovals(page = 1, limit = 20): Promise<{
    items: unknown[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where = {
      deletedAt: null,
      budgetRequiresApproval: true,
      budgetApprovalStatus: 'PENDING'
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.serviceOrder.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          title: true,
          estimatedValue: true,
          priority: true,
          openedAt: true,
          client: { select: { name: true } },
          serviceType: { select: { name: true } },
          createdBy: { select: { fullName: true } }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { estimatedValue: 'desc' }
      }),
      this.prisma.serviceOrder.count({ where })
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }
}
