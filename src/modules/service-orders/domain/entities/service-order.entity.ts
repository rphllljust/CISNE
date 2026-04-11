import type { Priority, ServiceOrderStatus } from '@prisma/client';

export interface ServiceOrderEntity {
  id: string;
  orderNumber: number;
  clientId: string;
  serviceTypeId: string;
  contractId?: string;
  slaId?: string;
  assignedTeamId?: string;
  assignedTechnicianId?: string;
  title: string;
  description: string;
  priority: Priority;
  status: ServiceOrderStatus;
  openedAt: Date;
  scheduledStartAt?: Date;
  scheduledEndAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  canceledAt?: Date;
  slaDueAt?: Date;
  slaBreached: boolean;
}
