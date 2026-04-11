import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ServiceOrderStatus } from '@prisma/client';

import { REPOSITORY_TOKENS } from '../../../../common/constants/injection-tokens';
import type { ServiceOrdersRepository } from '../../domain/repositories/service-orders.repository';
import { ServiceOrderStatusPolicy } from '../../domain/services/service-order-status-policy.service';

@Injectable()
export class TransitionServiceOrderStatusUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.SERVICE_ORDERS_REPOSITORY)
    private readonly serviceOrdersRepository: ServiceOrdersRepository,
    private readonly statusPolicy: ServiceOrderStatusPolicy
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

    this.statusPolicy.ensureTransition(serviceOrder.status, input.toStatus);

    return this.serviceOrdersRepository.transitionStatus(input);
  }
}
