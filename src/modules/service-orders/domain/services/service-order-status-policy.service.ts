import { BadRequestException, Injectable } from '@nestjs/common';
import { ServiceOrderStatus } from '@prisma/client';

@Injectable()
export class ServiceOrderStatusPolicy {
  private readonly transitions: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
    OPEN: ['UNDER_ANALYSIS', 'SCHEDULED', 'CANCELED'],
    UNDER_ANALYSIS: ['WAITING_APPROVAL', 'SCHEDULED', 'CANCELED'],
    WAITING_APPROVAL: ['SCHEDULED', 'CANCELED'],
    SCHEDULED: ['IN_TRANSIT', 'PAUSED', 'CANCELED'],
    IN_TRANSIT: ['IN_PROGRESS', 'PAUSED', 'WAITING_CUSTOMER', 'CANCELED'],
    IN_PROGRESS: ['PAUSED', 'WAITING_PARTS', 'WAITING_CUSTOMER', 'COMPLETED', 'CANCELED'],
    PAUSED: ['IN_PROGRESS', 'WAITING_PARTS', 'WAITING_CUSTOMER', 'CANCELED'],
    WAITING_PARTS: ['IN_PROGRESS', 'PAUSED', 'CANCELED'],
    WAITING_CUSTOMER: ['IN_PROGRESS', 'SCHEDULED', 'CANCELED'],
    COMPLETED: ['REOPENED'],
    CANCELED: ['REOPENED'],
    REOPENED: ['UNDER_ANALYSIS', 'SCHEDULED', 'CANCELED']
  };

  canTransition(from: ServiceOrderStatus, to: ServiceOrderStatus): boolean {
    return this.transitions[from].includes(to);
  }

  ensureTransition(from: ServiceOrderStatus, to: ServiceOrderStatus): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException({
        message: `Transicao invalida: ${from} -> ${to}`,
        allowedTransitions: this.transitions[from]
      });
    }
  }

  getAllowedTransitions(from: ServiceOrderStatus): ServiceOrderStatus[] {
    return this.transitions[from];
  }
}
