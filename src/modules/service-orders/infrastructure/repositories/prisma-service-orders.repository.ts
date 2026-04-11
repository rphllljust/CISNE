import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Priority, ServiceOrderStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CreateServiceOrderInput,
  FindServiceOrdersParams,
  ScheduleInput,
  ServiceOrderView,
  ServiceOrdersRepository,
  TransitionStatusInput,
  UpdateServiceOrderInput
} from '../../domain/repositories/service-orders.repository';

@Injectable()
export class PrismaServiceOrdersRepository implements ServiceOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ServiceOrderView | null> {
    const serviceOrder = await this.prisma.serviceOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        statusHistory: {
          orderBy: {
            changedAt: 'desc'
          }
        }
      }
    });

    return serviceOrder ? this.mapView(serviceOrder) : null;
  }

  async findMany(params: FindServiceOrdersParams): Promise<{ items: ServiceOrderView[]; total: number }> {
    const where: Prisma.ServiceOrderWhereInput = {
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.clientId ? { clientId: params.clientId } : {}),
      ...(params.assignedTeamId ? { assignedTeamId: params.assignedTeamId } : {}),
      ...(params.assignedTechnicianId ? { assignedTechnicianId: params.assignedTechnicianId } : {}),
      ...(params.startDate || params.endDate
        ? {
            openedAt: {
              ...(params.startDate ? { gte: params.startDate } : {}),
              ...(params.endDate ? { lte: params.endDate } : {})
            }
          }
        : {}),
      ...(typeof params.slaBreached === 'boolean' ? { slaBreached: params.slaBreached } : {}),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
              { client: { name: { contains: params.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.serviceOrder.findMany({
        where,
        include: {
          statusHistory: {
            orderBy: {
              changedAt: 'desc'
            },
            take: 10
          }
        },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: this.buildOrderBy(params.sort)
      }),
      this.prisma.serviceOrder.count({ where })
    ]);

    return {
      items: items.map((item) => this.mapView(item)),
      total
    };
  }

  async create(input: CreateServiceOrderInput): Promise<ServiceOrderView> {
    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.create({
        data: {
          clientId: input.clientId,
          serviceTypeId: input.serviceTypeId,
          contractId: input.contractId,
          slaId: input.slaId,
          assignedTeamId: input.assignedTeamId,
          assignedTechnicianId: input.assignedTechnicianId,
          locationAddressId: input.locationAddressId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          status: input.status,
          openedAt: input.openedAt,
          scheduledStartAt: input.scheduledStartAt,
          scheduledEndAt: input.scheduledEndAt,
          windowStart: input.windowStart,
          windowEnd: input.windowEnd,
          internalNotes: input.internalNotes,
          customerNotes: input.customerNotes,
          slaDueAt: input.slaDueAt,
          createdById: input.createdById,
          updatedById: input.createdById,
          checklistItems: input.checklistItems?.length
            ? {
                createMany: {
                  data: input.checklistItems
                }
              }
            : undefined
        },
        include: {
          statusHistory: true
        }
      });

      await tx.serviceOrderStatusHistory.create({
        data: {
          serviceOrderId: order.id,
          fromStatus: null,
          toStatus: input.status,
          changedById: input.createdById,
          reason: 'Criacao da ordem de servico'
        }
      });

      return tx.serviceOrder.findFirstOrThrow({
        where: { id: order.id },
        include: {
          statusHistory: {
            orderBy: {
              changedAt: 'desc'
            }
          }
        }
      });
    });

    return this.mapView(created);
  }

  async update(id: string, input: UpdateServiceOrderInput): Promise<ServiceOrderView> {
    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        assignedTeamId: input.assignedTeamId,
        assignedTechnicianId: input.assignedTechnicianId,
        locationAddressId: input.locationAddressId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        scheduledStartAt: input.scheduledStartAt,
        scheduledEndAt: input.scheduledEndAt,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        internalNotes: input.internalNotes,
        customerNotes: input.customerNotes,
        updatedById: input.updatedById
      },
      include: {
        statusHistory: {
          orderBy: {
            changedAt: 'desc'
          }
        }
      }
    });

    return this.mapView(updated);
  }

  async transitionStatus(input: TransitionStatusInput): Promise<ServiceOrderView> {
    const transitioned = await this.prisma.$transaction(async (tx) => {
      const serviceOrder = await tx.serviceOrder.findFirst({
        where: { id: input.serviceOrderId, deletedAt: null }
      });

      if (!serviceOrder) {
        throw new NotFoundException('Ordem de servico nao encontrada');
      }

      const now = new Date();
      const updateData: Prisma.ServiceOrderUpdateInput = {
        status: input.toStatus,
        updatedBy: {
          connect: { id: input.changedById }
        }
      };

      if (input.toStatus === ServiceOrderStatus.IN_PROGRESS && !serviceOrder.startedAt) {
        updateData.startedAt = now;
      }

      if (input.toStatus === ServiceOrderStatus.COMPLETED) {
        updateData.completedAt = now;
        updateData.slaBreached = serviceOrder.slaDueAt ? now > serviceOrder.slaDueAt : false;
      }

      if (input.toStatus === ServiceOrderStatus.CANCELED) {
        updateData.canceledAt = now;
        updateData.cancellationReason = input.reason ?? 'Cancelada pelo operador';
      }

      if (input.toStatus === ServiceOrderStatus.REOPENED) {
        updateData.reopenedCount = { increment: 1 };
        updateData.completedAt = null;
        updateData.canceledAt = null;
      }

      await tx.serviceOrder.update({
        where: { id: input.serviceOrderId },
        data: updateData
      });

      await tx.serviceOrderStatusHistory.create({
        data: {
          serviceOrderId: input.serviceOrderId,
          fromStatus: serviceOrder.status,
          toStatus: input.toStatus,
          reason: input.reason,
          changedById: input.changedById,
          metadata: input.metadata as Prisma.InputJsonValue | undefined
        }
      });

      return tx.serviceOrder.findFirstOrThrow({
        where: { id: input.serviceOrderId },
        include: {
          statusHistory: {
            orderBy: {
              changedAt: 'desc'
            }
          }
        }
      });
    });

    return this.mapView(transitioned);
  }

  async createSchedule(input: ScheduleInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const serviceOrder = await tx.serviceOrder.findFirst({
        where: { id: input.serviceOrderId, deletedAt: null }
      });

      if (!serviceOrder) {
        throw new NotFoundException('Ordem de servico nao encontrada');
      }

      await tx.schedule.create({
        data: {
          serviceOrderId: input.serviceOrderId,
          teamId: input.teamId,
          technicianId: input.technicianId,
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
          windowStart: input.windowStart,
          windowEnd: input.windowEnd,
          notes: input.notes,
          rescheduledFromId: input.rescheduledFromId
        }
      });

      await tx.serviceOrder.update({
        where: { id: input.serviceOrderId },
        data: {
          assignedTeamId: input.teamId,
          assignedTechnicianId: input.technicianId,
          scheduledStartAt: input.scheduledStart,
          scheduledEndAt: input.scheduledEnd
        }
      });
    });
  }

  async registerCheckIn(serviceOrderId: string, at: Date): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const lastSchedule = await tx.schedule.findFirst({
        where: { serviceOrderId },
        orderBy: { createdAt: 'desc' }
      });

      if (lastSchedule) {
        await tx.schedule.update({
          where: { id: lastSchedule.id },
          data: {
            checkInAt: at,
            confirmationStatus: 'CONFIRMED',
            confirmedAt: at
          }
        });
      }

      const order = await tx.serviceOrder.findUnique({ where: { id: serviceOrderId } });
      if (!order) {
        throw new NotFoundException('Ordem de servico nao encontrada');
      }

      if (order.status !== ServiceOrderStatus.IN_PROGRESS) {
        await tx.serviceOrder.update({
          where: { id: serviceOrderId },
          data: {
            status: ServiceOrderStatus.IN_PROGRESS,
            startedAt: order.startedAt ?? at
          }
        });

        await tx.serviceOrderStatusHistory.create({
          data: {
            serviceOrderId,
            fromStatus: order.status,
            toStatus: ServiceOrderStatus.IN_PROGRESS,
            reason: 'Check-in do tecnico',
            changedById: order.assignedTechnicianId ?? order.updatedById ?? order.createdById
          }
        });
      }
    });
  }

  async registerCheckOut(serviceOrderId: string, at: Date): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const lastSchedule = await tx.schedule.findFirst({
        where: { serviceOrderId },
        orderBy: { createdAt: 'desc' }
      });

      if (lastSchedule) {
        await tx.schedule.update({
          where: { id: lastSchedule.id },
          data: {
            checkOutAt: at
          }
        });
      }

      const order = await tx.serviceOrder.findUnique({ where: { id: serviceOrderId } });
      if (!order) {
        throw new NotFoundException('Ordem de servico nao encontrada');
      }

      if (order.status === ServiceOrderStatus.IN_PROGRESS) {
        await tx.serviceOrder.update({
          where: { id: serviceOrderId },
          data: {
            status: ServiceOrderStatus.COMPLETED,
            completedAt: at,
            slaBreached: order.slaDueAt ? at > order.slaDueAt : false
          }
        });

        await tx.serviceOrderStatusHistory.create({
          data: {
            serviceOrderId,
            fromStatus: order.status,
            toStatus: ServiceOrderStatus.COMPLETED,
            reason: 'Check-out do tecnico',
            changedById: order.assignedTechnicianId ?? order.updatedById ?? order.createdById
          }
        });
      }
    });
  }

  private buildOrderBy(sort?: string): Prisma.ServiceOrderOrderByWithRelationInput {
    if (!sort) {
      return { openedAt: 'desc' };
    }

    const [field, direction] = sort.split(':');
    const allowedFields = new Set([
      'openedAt',
      'createdAt',
      'updatedAt',
      'priority',
      'status',
      'orderNumber',
      'slaDueAt'
    ]);
    const safeField = allowedFields.has(field) ? field : 'openedAt';
    const safeDirection: Prisma.SortOrder = direction === 'asc' ? 'asc' : 'desc';

    return { [safeField]: safeDirection } as Prisma.ServiceOrderOrderByWithRelationInput;
  }

  private mapView(serviceOrder: {
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
  }): ServiceOrderView {
    return {
      id: serviceOrder.id,
      orderNumber: serviceOrder.orderNumber,
      clientId: serviceOrder.clientId,
      serviceTypeId: serviceOrder.serviceTypeId,
      contractId: serviceOrder.contractId,
      slaId: serviceOrder.slaId,
      assignedTeamId: serviceOrder.assignedTeamId,
      assignedTechnicianId: serviceOrder.assignedTechnicianId,
      locationAddressId: serviceOrder.locationAddressId,
      title: serviceOrder.title,
      description: serviceOrder.description,
      priority: serviceOrder.priority,
      status: serviceOrder.status,
      openedAt: serviceOrder.openedAt,
      scheduledStartAt: serviceOrder.scheduledStartAt,
      scheduledEndAt: serviceOrder.scheduledEndAt,
      startedAt: serviceOrder.startedAt,
      completedAt: serviceOrder.completedAt,
      canceledAt: serviceOrder.canceledAt,
      windowStart: serviceOrder.windowStart,
      windowEnd: serviceOrder.windowEnd,
      internalNotes: serviceOrder.internalNotes,
      customerNotes: serviceOrder.customerNotes,
      cancellationReason: serviceOrder.cancellationReason,
      slaDueAt: serviceOrder.slaDueAt,
      slaBreached: serviceOrder.slaBreached,
      reopenedCount: serviceOrder.reopenedCount,
      createdById: serviceOrder.createdById,
      updatedById: serviceOrder.updatedById,
      createdAt: serviceOrder.createdAt,
      updatedAt: serviceOrder.updatedAt,
      statusHistory: serviceOrder.statusHistory.map((item) => ({
        id: item.id,
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        reason: item.reason,
        changedById: item.changedById,
        changedAt: item.changedAt
      }))
    };
  }
}
