import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ServiceOrderStatus } from '@prisma/client';

import { REPOSITORY_TOKENS } from '../../../../common/constants/injection-tokens';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type { ServiceOrdersRepository } from '../../domain/repositories/service-orders.repository';
import { ServiceOrderStatusPolicy } from '../../domain/services/service-order-status-policy.service';

@Injectable()
export class TransitionServiceOrderStatusUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.SERVICE_ORDERS_REPOSITORY)
    private readonly serviceOrdersRepository: ServiceOrdersRepository,
    private readonly statusPolicy: ServiceOrderStatusPolicy,
    private readonly prisma: PrismaService
  ) {}

  async execute(input: {
    serviceOrderId: string;
    toStatus: ServiceOrderStatus;
    reason?: string;
    changedById: string;
    metadata?: Record<string, unknown>;
  }): Promise<unknown> {
    const serviceOrder = await this.serviceOrdersRepository.findById(input.serviceOrderId);
    if (!serviceOrder) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }

    if (input.toStatus === ServiceOrderStatus.COMPLETED || input.toStatus === ServiceOrderStatus.CANCELED) {
      const childLinks = await this.prisma.serviceOrderHierarchy.findMany({
        where: { parentServiceOrderId: input.serviceOrderId },
        select: { childServiceOrderId: true }
      });

      if (childLinks.length > 0) {
        const childIds = childLinks.map((item) => item.childServiceOrderId);
        const pendingChildren = await this.prisma.serviceOrder.count({
          where: {
            id: { in: childIds },
            status: { notIn: [ServiceOrderStatus.COMPLETED, ServiceOrderStatus.CANCELED] }
          }
        });

        if (pendingChildren > 0) {
          throw new BadRequestException(
            'Nao e possivel encerrar/cancelar OS pai enquanto houver OS filhas abertas'
          );
        }
      }
    }

    const configuredTransitions = await this.prisma.serviceOrderWorkflowTransition.findMany({
      where: {
        active: true,
        fromStatus: serviceOrder.status,
        OR: [{ serviceTypeId: serviceOrder.serviceTypeId }, { serviceTypeId: null }]
      },
      select: { toStatus: true }
    });

    if (configuredTransitions.length > 0) {
      const allowedByWorkflow = configuredTransitions.map((item) => item.toStatus);
      if (!allowedByWorkflow.includes(input.toStatus)) {
        throw new BadRequestException(
          `Transicao ${serviceOrder.status} -> ${input.toStatus} nao permitida no workflow configurado`
        );
      }
    } else {
      this.statusPolicy.ensureTransition(serviceOrder.status, input.toStatus);
    }

    return this.serviceOrdersRepository.transitionStatus(input);
  }
}
