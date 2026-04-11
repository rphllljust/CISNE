import type { Priority, ServiceOrderStatus } from '@prisma/client';

export interface FindServiceOrdersParams {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  status?: ServiceOrderStatus;
  priority?: Priority;
  clientId?: string;
  assignedTechnicianId?: string;
  assignedTeamId?: string;
  startDate?: Date;
  endDate?: Date;
  slaBreached?: boolean;
}

export interface CreateServiceOrderInput {
  clientId: string;
  serviceTypeId: string;
  contractId?: string;
  slaId?: string;
  assignedTeamId?: string;
  assignedTechnicianId?: string;
  locationAddressId?: string;
  title: string;
  description: string;
  priority: Priority;
  status: ServiceOrderStatus;
  openedAt: Date;
  scheduledStartAt?: Date;
  scheduledEndAt?: Date;
  windowStart?: Date;
  windowEnd?: Date;
  internalNotes?: string;
  customerNotes?: string;
  slaDueAt?: Date;
  createdById: string;
  checklistItems?: Array<{ itemKey: string; description: string; required: boolean }>;
}

export interface UpdateServiceOrderInput {
  assignedTeamId?: string;
  assignedTechnicianId?: string;
  locationAddressId?: string;
  title?: string;
  description?: string;
  priority?: Priority;
  scheduledStartAt?: Date;
  scheduledEndAt?: Date;
  windowStart?: Date;
  windowEnd?: Date;
  internalNotes?: string;
  customerNotes?: string;
  updatedById: string;
}

export interface TransitionStatusInput {
  serviceOrderId: string;
  toStatus: ServiceOrderStatus;
  reason?: string;
  changedById: string;
  metadata?: Record<string, unknown>;
}

export interface ScheduleInput {
  serviceOrderId: string;
  teamId?: string;
  technicianId?: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  windowStart?: Date;
  windowEnd?: Date;
  notes?: string;
  rescheduledFromId?: string;
}

export interface ServiceOrderView {
  id: string;
  orderNumber: number;
  clientId: string;
  serviceTypeId: string;
  contractId: string | null;
  slaId: string | null;
  assignedTeamId: string | null;
  assignedTechnicianId: string | null;
  locationAddressId: string | null;
  title: string;
  description: string;
  priority: Priority;
  status: ServiceOrderStatus;
  openedAt: Date;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  canceledAt: Date | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  internalNotes: string | null;
  customerNotes: string | null;
  cancellationReason: string | null;
  slaDueAt: Date | null;
  slaBreached: boolean;
  reopenedCount: number;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  statusHistory: Array<{
    id: string;
    fromStatus: ServiceOrderStatus | null;
    toStatus: ServiceOrderStatus;
    reason: string | null;
    changedById: string;
    changedAt: Date;
  }>;
}

export interface ServiceOrdersRepository {
  findById(id: string): Promise<ServiceOrderView | null>;
  findMany(params: FindServiceOrdersParams): Promise<{ items: ServiceOrderView[]; total: number }>;
  create(input: CreateServiceOrderInput): Promise<ServiceOrderView>;
  update(id: string, input: UpdateServiceOrderInput): Promise<ServiceOrderView>;
  transitionStatus(input: TransitionStatusInput): Promise<ServiceOrderView>;
  createSchedule(input: ScheduleInput): Promise<void>;
  registerCheckIn(serviceOrderId: string, at: Date): Promise<void>;
  registerCheckOut(serviceOrderId: string, at: Date): Promise<void>;
}
