import {
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Priority, ServiceOrderStatus } from '@prisma/client';

import { REPOSITORY_TOKENS } from '../../../../common/constants/injection-tokens';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import type {
  ServiceOrderView,
  ServiceOrdersRepository
} from '../../domain/repositories/service-orders.repository';
import { ServiceOrderStatusPolicy } from '../../domain/services/service-order-status-policy.service';
import { CreateServiceOrderDto } from '../dto/create-service-order.dto';
import { FieldCheckDto } from '../dto/field-check.dto';
import { ListServiceOrdersQueryDto } from '../dto/list-service-orders-query.dto';
import { ScheduleServiceOrderDto } from '../dto/schedule-service-order.dto';
import { TransitionServiceOrderStatusDto } from '../dto/transition-service-order-status.dto';
import { UpdateServiceOrderDto } from '../dto/update-service-order.dto';
import { TransitionServiceOrderStatusUseCase } from '../use-cases/transition-service-order-status.use-case';

interface ChecklistTemplate {
  items?: Array<{ key: string; description: string; required?: boolean }>;
}

@Injectable()
export class ServiceOrdersService {
  constructor(
    @Inject(REPOSITORY_TOKENS.SERVICE_ORDERS_REPOSITORY)
    private readonly serviceOrdersRepository: ServiceOrdersRepository,
    private readonly transitionStatusUseCase: TransitionServiceOrderStatusUseCase,
    private readonly statusPolicy: ServiceOrderStatusPolicy,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  async create(dto: CreateServiceOrderDto, actor: JwtUserPayload): Promise<ServiceOrderView> {
    const [client, serviceType] = await Promise.all([
      this.prisma.client.findFirst({ where: { id: dto.clientId, deletedAt: null } }),
      this.prisma.serviceType.findUnique({
        where: { id: dto.serviceTypeId },
        include: { defaultSla: true }
      })
    ]);

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    if (!serviceType || !serviceType.active) {
      throw new NotFoundException('Tipo de servico nao encontrado/ativo');
    }

    const selectedSlaId = dto.slaId ?? serviceType.defaultSlaId;
    const selectedSla = selectedSlaId
      ? await this.prisma.sLA.findUnique({ where: { id: selectedSlaId } })
      : null;

    const openedAt = new Date();
    const status = dto.scheduledStartAt ? ServiceOrderStatus.SCHEDULED : ServiceOrderStatus.OPEN;

    const checklistTemplate = (serviceType.checklistTemplate ?? {}) as ChecklistTemplate;
    const checklistItems = (checklistTemplate.items ?? []).map((item) => ({
      itemKey: item.key,
      description: item.description,
      required: item.required ?? false
    }));

    const created = await this.serviceOrdersRepository.create({
      clientId: dto.clientId,
      serviceTypeId: dto.serviceTypeId,
      contractId: dto.contractId,
      slaId: selectedSlaId ?? undefined,
      assignedTeamId: dto.assignedTeamId,
      assignedTechnicianId: dto.assignedTechnicianId,
      locationAddressId: dto.locationAddressId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority ?? serviceType.defaultPriority ?? Priority.MEDIUM,
      status,
      openedAt,
      scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : undefined,
      scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : undefined,
      windowStart: dto.windowStart ? new Date(dto.windowStart) : undefined,
      windowEnd: dto.windowEnd ? new Date(dto.windowEnd) : undefined,
      internalNotes: dto.internalNotes,
      customerNotes: dto.customerNotes,
      slaDueAt: selectedSla ? new Date(openedAt.getTime() + selectedSla.resolutionTimeMinutes * 60000) : undefined,
      createdById: actor.sub,
      checklistItems
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SERVICE_ORDER_CREATED',
      resource: 'service_order',
      resourceId: created.id,
      after: {
        orderNumber: created.orderNumber,
        status: created.status,
        priority: created.priority
      }
    });

    if (created.assignedTechnicianId) {
      await this.notificationsService.createInternalNotification({
        userId: created.assignedTechnicianId,
        type: 'SERVICE_ORDER_ASSIGNED',
        title: `Nova OS #${created.orderNumber} atribuida`,
        message: `A ordem ${created.orderNumber} foi atribuida para sua execucao.`,
        payload: {
          serviceOrderId: created.id,
          status: created.status
        }
      });
    }

    return created;
  }

  async findAll(query: ListServiceOrdersQueryDto): Promise<{
    items: ServiceOrderView[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { items, total } = await this.serviceOrdersRepository.findMany({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sort: query.sort,
      status: query.status,
      priority: query.priority,
      clientId: query.clientId,
      assignedTeamId: query.assignedTeamId,
      assignedTechnicianId: query.assignedTechnicianId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      slaBreached: query.slaBreached
    });

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    };
  }

  async findById(id: string): Promise<ServiceOrderView> {
    const serviceOrder = await this.serviceOrdersRepository.findById(id);
    if (!serviceOrder) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }

    return serviceOrder;
  }

  async update(id: string, dto: UpdateServiceOrderDto, actor: JwtUserPayload): Promise<ServiceOrderView> {
    const current = await this.serviceOrdersRepository.findById(id);
    if (!current) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }

    const updated = await this.serviceOrdersRepository.update(id, {
      assignedTeamId: dto.assignedTeamId,
      assignedTechnicianId: dto.assignedTechnicianId,
      locationAddressId: dto.locationAddressId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : undefined,
      scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : undefined,
      windowStart: dto.windowStart ? new Date(dto.windowStart) : undefined,
      windowEnd: dto.windowEnd ? new Date(dto.windowEnd) : undefined,
      internalNotes: dto.internalNotes,
      customerNotes: dto.customerNotes,
      updatedById: actor.sub
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SERVICE_ORDER_UPDATED',
      resource: 'service_order',
      resourceId: id,
      before: {
        status: current.status,
        priority: current.priority
      },
      after: {
        status: updated.status,
        priority: updated.priority
      }
    });

    return updated;
  }

  async transitionStatus(
    id: string,
    dto: TransitionServiceOrderStatusDto,
    actor: JwtUserPayload
  ): Promise<ServiceOrderView> {
    const transitioned = (await this.transitionStatusUseCase.execute({
      serviceOrderId: id,
      toStatus: dto.toStatus,
      reason: dto.reason,
      changedById: actor.sub,
      metadata: {
        source: 'manual_transition'
      }
    })) as ServiceOrderView;

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SERVICE_ORDER_STATUS_TRANSITION',
      resource: 'service_order',
      resourceId: id,
      after: {
        toStatus: dto.toStatus,
        reason: dto.reason
      }
    });

    if (transitioned.assignedTechnicianId) {
      await this.notificationsService.createInternalNotification({
        userId: transitioned.assignedTechnicianId,
        type: 'SERVICE_ORDER_STATUS_UPDATED',
        title: `OS #${transitioned.orderNumber} atualizada`,
        message: `Status alterado para ${transitioned.status}.`,
        payload: {
          serviceOrderId: transitioned.id,
          status: transitioned.status
        }
      });
    }

    return transitioned;
  }

  async schedule(
    id: string,
    dto: ScheduleServiceOrderDto,
    actor: JwtUserPayload
  ): Promise<{ message: string }> {
    const serviceOrder = await this.serviceOrdersRepository.findById(id);
    if (!serviceOrder) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }

    if (serviceOrder.status !== ServiceOrderStatus.SCHEDULED) {
      this.statusPolicy.ensureTransition(serviceOrder.status, ServiceOrderStatus.SCHEDULED);
    }

    await this.serviceOrdersRepository.createSchedule({
      serviceOrderId: id,
      teamId: dto.teamId,
      technicianId: dto.technicianId,
      scheduledStart: new Date(dto.scheduledStart),
      scheduledEnd: new Date(dto.scheduledEnd),
      windowStart: dto.windowStart ? new Date(dto.windowStart) : undefined,
      windowEnd: dto.windowEnd ? new Date(dto.windowEnd) : undefined,
      notes: dto.notes,
      rescheduledFromId: dto.rescheduledFromId
    });

    if (serviceOrder.status !== ServiceOrderStatus.SCHEDULED) {
      await this.transitionStatusUseCase.execute({
        serviceOrderId: id,
        toStatus: ServiceOrderStatus.SCHEDULED,
        reason: 'Agendamento/reagendamento operacional',
        changedById: actor.sub,
        metadata: {
          source: 'schedule_operation'
        }
      });
    }

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SERVICE_ORDER_SCHEDULED',
      resource: 'service_order',
      resourceId: id,
      metadata: {
        scheduledStart: dto.scheduledStart,
        scheduledEnd: dto.scheduledEnd,
        teamId: dto.teamId,
        technicianId: dto.technicianId
      }
    });

    if (dto.technicianId) {
      await this.notificationsService.createInternalNotification({
        userId: dto.technicianId,
        type: 'SERVICE_ORDER_SCHEDULED',
        title: 'Novo agendamento atribuido',
        message: `OS ${id} agendada para ${dto.scheduledStart}.`,
        payload: {
          serviceOrderId: id,
          scheduledStart: dto.scheduledStart,
          scheduledEnd: dto.scheduledEnd
        }
      });
    }

    return { message: 'Agendamento registrado com sucesso' };
  }

  async registerCheckIn(
    id: string,
    dto: FieldCheckDto,
    actor: JwtUserPayload
  ): Promise<{ message: string }> {
    await this.ensureServiceOrderExists(id);
    await this.serviceOrdersRepository.registerCheckIn(id, dto.at ? new Date(dto.at) : new Date());

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SERVICE_ORDER_CHECKIN',
      resource: 'service_order',
      resourceId: id,
      metadata: {
        at: dto.at ?? new Date().toISOString()
      }
    });

    return { message: 'Check-in registrado com sucesso' };
  }

  async registerCheckOut(
    id: string,
    dto: FieldCheckDto,
    actor: JwtUserPayload
  ): Promise<{ message: string }> {
    await this.ensureServiceOrderExists(id);
    await this.serviceOrdersRepository.registerCheckOut(id, dto.at ? new Date(dto.at) : new Date());

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SERVICE_ORDER_CHECKOUT',
      resource: 'service_order',
      resourceId: id,
      metadata: {
        at: dto.at ?? new Date().toISOString()
      }
    });

    return { message: 'Check-out registrado com sucesso' };
  }

  getAllowedTransitions(currentStatus: ServiceOrderStatus): ServiceOrderStatus[] {
    return this.statusPolicy.getAllowedTransitions(currentStatus);
  }

  private async ensureServiceOrderExists(id: string): Promise<void> {
    const serviceOrder = await this.serviceOrdersRepository.findById(id);
    if (!serviceOrder) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }
  }
}
