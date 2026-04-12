import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AttachmentCategory, GeoLocationSource, Prisma, Priority, ServiceOrderStatus } from '@prisma/client';

import { REPOSITORY_TOKENS } from '../../../../common/constants/injection-tokens';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { WebhooksService } from '../../../webhooks/application/services/webhooks.service';
import type {
  ServiceOrderView,
  ServiceOrdersRepository
} from '../../domain/repositories/service-orders.repository';
import { ServiceOrderStatusPolicy } from '../../domain/services/service-order-status-policy.service';
import { CreateServiceOrderDto } from '../dto/create-service-order.dto';
import { FieldCheckDto } from '../dto/field-check.dto';
import { ListServiceOrdersQueryDto } from '../dto/list-service-orders-query.dto';
import { ScheduleServiceOrderDto } from '../dto/schedule-service-order.dto';
import {
  CreateServiceOrderClassificationRuleDto,
  CreateServiceOrderTemplateDto,
  CreateWorkflowTransitionDto,
  ListDynamicFieldSchemaQueryDto,
  ListServiceOrderClassificationRuleQueryDto,
  ListServiceOrderTemplateQueryDto,
  ListWorkflowTransitionQueryDto,
  UpsertDynamicFieldSchemaDto
} from '../dto/service-order-config.dto';
import { TransitionServiceOrderStatusDto } from '../dto/transition-service-order-status.dto';
import { UpdateServiceOrderDto } from '../dto/update-service-order.dto';
import { TransitionServiceOrderStatusUseCase } from '../use-cases/transition-service-order-status.use-case';

interface ChecklistTemplate {
  items?: Array<{ key: string; description: string; required?: boolean }>;
}

interface ClassificationResult {
  matchedRuleId?: string;
  priority: Priority;
  category?: string;
  subcategory?: string;
  reason: string;
}

const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'video/mp4'
]);
const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_ATTACHMENTS_TOTAL_SIZE_BYTES = 200 * 1024 * 1024;

@Injectable()
export class ServiceOrdersService {
  constructor(
    @Inject(REPOSITORY_TOKENS.SERVICE_ORDERS_REPOSITORY)
    private readonly serviceOrdersRepository: ServiceOrdersRepository,
    private readonly transitionStatusUseCase: TransitionServiceOrderStatusUseCase,
    private readonly statusPolicy: ServiceOrderStatusPolicy,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly webhooksService: WebhooksService
  ) {}

  async create(dto: CreateServiceOrderDto, actor: JwtUserPayload): Promise<ServiceOrderView> {
    const template = dto.templateId
      ? await this.prisma.serviceOrderTemplate.findFirst({
          where: {
            id: dto.templateId,
            active: true
          }
        })
      : null;

    const resolvedServiceTypeId = dto.serviceTypeId ?? template?.serviceTypeId;
    if (!resolvedServiceTypeId) {
      throw new BadRequestException('Tipo de servico obrigatorio');
    }

    const [client, serviceType] = await Promise.all([
      this.prisma.client.findFirst({ where: { id: dto.clientId, deletedAt: null } }),
      this.prisma.serviceType.findUnique({
        where: { id: resolvedServiceTypeId },
        include: { defaultSla: true }
      })
    ]);

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    if (!serviceType || !serviceType.active) {
      throw new NotFoundException('Tipo de servico nao encontrado/ativo');
    }

    if (template && template.serviceTypeId !== resolvedServiceTypeId) {
      throw new BadRequestException('Template informado nao pertence ao tipo de servico');
    }

    const parentOrder = dto.parentServiceOrderId
      ? await this.prisma.serviceOrder.findFirst({
          where: { id: dto.parentServiceOrderId, deletedAt: null }
        })
      : null;
    if (dto.parentServiceOrderId && !parentOrder) {
      throw new NotFoundException('OS pai nao encontrada');
    }
    if (parentOrder && ['COMPLETED', 'CANCELED'].includes(parentOrder.status)) {
      throw new BadRequestException('Nao e permitido criar OS filha para OS pai encerrada/cancelada');
    }

    const mergedDynamicFields: Record<string, unknown> = {
      ...(((template?.defaultDynamicData ?? {}) as Record<string, unknown>) || {}),
      ...(dto.dynamicFields ?? {})
    };
    await this.validateDynamicFields(resolvedServiceTypeId, mergedDynamicFields);

    this.validateAttachments(dto.attachments);

    const linkedAsset = dto.linkedAssetId
      ? await this.prisma.asset.findFirst({
          where: { id: dto.linkedAssetId, deletedAt: null, active: true }
        })
      : null;
    if (dto.linkedAssetId && !linkedAsset) {
      throw new NotFoundException('Ativo informado nao encontrado/ativo');
    }
    if (linkedAsset?.clientId && linkedAsset.clientId !== dto.clientId) {
      throw new BadRequestException(
        'Ativo informado pertence a outro cliente e nao pode ser vinculado a esta OS'
      );
    }

    const inheritedLocationAddressId =
      !dto.locationAddressId && linkedAsset?.clientId
        ? await this.resolvePrimaryAddressId(linkedAsset.clientId)
        : undefined;

    const inheritedContractId = dto.contractId ?? linkedAsset?.contractId ?? undefined;
    const inheritedSlaId =
      dto.slaId ??
      (inheritedContractId
        ? (
            await this.prisma.contract.findUnique({
              where: { id: inheritedContractId },
              select: { slaId: true }
            })
          )?.slaId ??
          undefined
        : undefined);

    const selectedSlaId = inheritedSlaId ?? serviceType.defaultSlaId ?? undefined;
    const selectedSla = selectedSlaId
      ? await this.prisma.sLA.findUnique({ where: { id: selectedSlaId } })
      : null;

    const title = dto.title ?? template?.titleTemplate;
    const description = dto.description ?? template?.descriptionTemplate;
    if (!title || !description) {
      throw new BadRequestException(
        'Titulo e descricao sao obrigatorios (direto ou via template de OS)'
      );
    }

    const classification = await this.classifyServiceOrder({
      serviceTypeId: resolvedServiceTypeId,
      roles: actor.roles,
      searchableText: `${title} ${description} ${JSON.stringify(mergedDynamicFields)}`
    });

    const autoAssignment = await this.resolveAutoAssignment(
      serviceType,
      dto.assignedTeamId,
      dto.assignedTechnicianId
    );

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
      serviceTypeId: resolvedServiceTypeId,
      contractId: inheritedContractId,
      slaId: selectedSlaId,
      assignedTeamId: dto.assignedTeamId ?? autoAssignment.teamId,
      assignedTechnicianId: dto.assignedTechnicianId ?? autoAssignment.technicianId,
      locationAddressId: dto.locationAddressId ?? inheritedLocationAddressId,
      title,
      description,
      priority:
        dto.priority ??
        template?.defaultPriority ??
        classification.priority ??
        serviceType.defaultPriority ??
        Priority.MEDIUM,
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

    await this.persistServiceOrderContext(created.id, {
      actorId: actor.sub,
      parentServiceOrderId: dto.parentServiceOrderId,
      linkedAsset,
      geolocation: dto.geolocation,
      dynamicFields: mergedDynamicFields,
      attachments: dto.attachments,
      classification
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SERVICE_ORDER_CREATED',
      resource: 'service_order',
      resourceId: created.id,
      after: {
        orderNumber: created.orderNumber,
        status: created.status,
        priority: created.priority,
        matchedClassificationRuleId: classification.matchedRuleId
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

    await this.webhooksService.publishEvent('os.created', {
      serviceOrderId: created.id,
      orderNumber: created.orderNumber,
      clientId: created.clientId,
      status: created.status,
      priority: created.priority,
      assignedTechnicianId: created.assignedTechnicianId,
      assignedTeamId: created.assignedTeamId,
      openedAt: created.openedAt.toISOString()
    });

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

  async findContextById(id: string): Promise<Record<string, unknown>> {
    const serviceOrder = await this.serviceOrdersRepository.findById(id);
    if (!serviceOrder) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }

    const [classification, dynamicValues, geolocation, parentLink, childLinks, assetLinks] =
      await Promise.all([
        this.prisma.serviceOrderClassificationResult.findUnique({
          where: { serviceOrderId: id }
        }),
        this.prisma.serviceOrderDynamicFieldValue.findMany({
          where: { serviceOrderId: id }
        }),
        this.prisma.serviceOrderGeoLocation.findUnique({
          where: { serviceOrderId: id }
        }),
        this.prisma.serviceOrderHierarchy.findFirst({
          where: { childServiceOrderId: id }
        }),
        this.prisma.serviceOrderHierarchy.findMany({
          where: { parentServiceOrderId: id }
        }),
        this.prisma.serviceOrderAssetLink.findMany({
          where: { serviceOrderId: id },
          include: {
            asset: true
          }
        })
      ]);

    const childIds = childLinks.map((item) => item.childServiceOrderId);
    const children = childIds.length
      ? await this.prisma.serviceOrder.findMany({
          where: { id: { in: childIds } },
          select: {
            id: true,
            orderNumber: true,
            title: true,
            status: true
          }
        })
      : [];

    return {
      serviceOrder,
      classification,
      dynamicFields: dynamicValues,
      geolocation,
      hierarchy: {
        parentServiceOrderId: parentLink?.parentServiceOrderId ?? null,
        children
      },
      assets: assetLinks
    };
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

    // MÓDULO 4.1 - Notificações automáticas por WhatsApp nos eventos de OS
    await this.dispatchWhatsAppStatusNotification(transitioned, dto.toStatus);

    await this.webhooksService.publishEvent('os.status_changed', {
      serviceOrderId: transitioned.id,
      orderNumber: transitioned.orderNumber,
      status: transitioned.status,
      changedById: actor.sub
    });

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

    await this.webhooksService.publishEvent('os.scheduled', {
      serviceOrderId: id,
      scheduledStart: dto.scheduledStart,
      scheduledEnd: dto.scheduledEnd,
      technicianId: dto.technicianId,
      teamId: dto.teamId
    });

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

    await this.webhooksService.publishEvent('os.attendance_started', {
      serviceOrderId: id,
      technicianId: actor.sub,
      timestamp: dto.at ?? new Date().toISOString()
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

    await this.webhooksService.publishEvent('os.finished', {
      serviceOrderId: id,
      technicianId: actor.sub,
      timestamp: dto.at ?? new Date().toISOString()
    });

    return { message: 'Check-out registrado com sucesso' };
  }

  async createTemplate(
    dto: CreateServiceOrderTemplateDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: dto.serviceTypeId },
      select: { id: true, active: true }
    });
    if (!serviceType || !serviceType.active) {
      throw new NotFoundException('Tipo de servico nao encontrado/ativo');
    }

    const created = await this.prisma.serviceOrderTemplate.create({
      data: {
        name: dto.name,
        serviceTypeId: dto.serviceTypeId,
        titleTemplate: dto.titleTemplate,
        descriptionTemplate: dto.descriptionTemplate,
        defaultPriority: dto.defaultPriority,
        defaultDynamicData: dto.defaultDynamicData as Prisma.InputJsonValue | undefined,
        active: dto.active,
        createdById: actor.sub
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SERVICE_ORDER_TEMPLATE_CREATED',
      resource: 'service_order_template',
      resourceId: created.id
    });

    return created;
  }

  async listTemplates(query: ListServiceOrderTemplateQueryDto): Promise<Record<string, unknown>[]> {
    return this.prisma.serviceOrderTemplate.findMany({
      where: {
        ...(query.serviceTypeId ? { serviceTypeId: query.serviceTypeId } : {}),
        ...(typeof query.active === 'boolean' ? { active: query.active } : {})
      },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async createClassificationRule(
    dto: CreateServiceOrderClassificationRuleDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    if (dto.serviceTypeId) {
      const serviceType = await this.prisma.serviceType.findUnique({
        where: { id: dto.serviceTypeId },
        select: { id: true }
      });
      if (!serviceType) {
        throw new NotFoundException('Tipo de servico nao encontrado');
      }
    }

    const created = await this.prisma.serviceOrderClassificationRule.create({
      data: {
        name: dto.name,
        serviceTypeId: dto.serviceTypeId,
        requesterRole: dto.requesterRole,
        keywordPattern: dto.keywordPattern,
        priority: dto.priority,
        category: dto.category,
        subcategory: dto.subcategory,
        score: dto.score,
        enabled: dto.enabled
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SERVICE_ORDER_CLASSIFICATION_RULE_CREATED',
      resource: 'service_order_classification_rule',
      resourceId: created.id
    });

    return created;
  }

  async listClassificationRules(
    query: ListServiceOrderClassificationRuleQueryDto
  ): Promise<Record<string, unknown>[]> {
    return this.prisma.serviceOrderClassificationRule.findMany({
      where: {
        ...(query.serviceTypeId ? { serviceTypeId: query.serviceTypeId } : {}),
        ...(typeof query.enabled === 'boolean' ? { enabled: query.enabled } : {})
      },
      orderBy: [{ enabled: 'desc' }, { updatedAt: 'desc' }]
    });
  }

  async createWorkflowTransition(
    dto: CreateWorkflowTransitionDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const created = await this.prisma.serviceOrderWorkflowTransition.create({
      data: {
        serviceTypeId: dto.serviceTypeId,
        fromStatus: dto.fromStatus,
        toStatus: dto.toStatus,
        actionLabel: dto.actionLabel,
        autoAssign: dto.autoAssign,
        startSlaTimer: dto.startSlaTimer,
        triageAlertMinutes: dto.triageAlertMinutes,
        active: dto.active
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SERVICE_ORDER_WORKFLOW_TRANSITION_CREATED',
      resource: 'service_order_workflow_transition',
      resourceId: created.id
    });

    return created;
  }

  async listWorkflowTransitions(query: ListWorkflowTransitionQueryDto): Promise<Record<string, unknown>[]> {
    return this.prisma.serviceOrderWorkflowTransition.findMany({
      where: {
        ...(query.serviceTypeId ? { serviceTypeId: query.serviceTypeId } : {}),
        ...(query.fromStatus ? { fromStatus: query.fromStatus } : {}),
        ...(typeof query.active === 'boolean' ? { active: query.active } : {})
      },
      orderBy: [{ serviceTypeId: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async upsertDynamicFieldSchema(
    dto: UpsertDynamicFieldSchemaDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: dto.serviceTypeId },
      select: { id: true }
    });
    if (!serviceType) {
      throw new NotFoundException('Tipo de servico nao encontrado');
    }

    const upserted = await this.prisma.serviceOrderDynamicFieldSchema.upsert({
      where: {
        serviceTypeId_fieldKey: {
          serviceTypeId: dto.serviceTypeId,
          fieldKey: dto.fieldKey
        }
      },
      update: {
        label: dto.label,
        fieldType: dto.fieldType,
        required: dto.required,
        options: dto.options as Prisma.InputJsonValue | undefined,
        validation: dto.validation as Prisma.InputJsonValue | undefined,
        active: dto.active
      },
      create: {
        serviceTypeId: dto.serviceTypeId,
        fieldKey: dto.fieldKey,
        label: dto.label,
        fieldType: dto.fieldType,
        required: dto.required,
        options: dto.options as Prisma.InputJsonValue | undefined,
        validation: dto.validation as Prisma.InputJsonValue | undefined,
        active: dto.active
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SERVICE_ORDER_DYNAMIC_FIELD_SCHEMA_UPSERTED',
      resource: 'service_order_dynamic_field_schema',
      resourceId: upserted.id
    });

    return upserted;
  }

  async listDynamicFieldSchemas(
    query: ListDynamicFieldSchemaQueryDto
  ): Promise<Record<string, unknown>[]> {
    return this.prisma.serviceOrderDynamicFieldSchema.findMany({
      where: {
        serviceTypeId: query.serviceTypeId,
        ...(typeof query.active === 'boolean' ? { active: query.active } : {})
      },
      orderBy: { fieldKey: 'asc' }
    });
  }

  async getWorkflowActions(
    currentStatus: ServiceOrderStatus,
    serviceTypeId?: string
  ): Promise<
    Array<{
      fromStatus: ServiceOrderStatus;
      toStatus: ServiceOrderStatus;
      actionLabel: string;
      autoAssign: boolean;
      startSlaTimer: boolean;
      triageAlertMinutes: number | null;
      source: 'CONFIGURED' | 'DEFAULT';
    }>
  > {
    const configured = await this.prisma.serviceOrderWorkflowTransition.findMany({
      where: {
        active: true,
        fromStatus: currentStatus,
        OR: [{ serviceTypeId: serviceTypeId ?? '' }, { serviceTypeId: null }]
      },
      orderBy: [{ serviceTypeId: 'desc' }, { createdAt: 'asc' }]
    });

    if (configured.length > 0) {
      return configured.map((item) => ({
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        actionLabel: item.actionLabel,
        autoAssign: item.autoAssign,
        startSlaTimer: item.startSlaTimer,
        triageAlertMinutes: item.triageAlertMinutes,
        source: 'CONFIGURED'
      }));
    }

    return this.statusPolicy.getAllowedTransitions(currentStatus).map((toStatus) => ({
      fromStatus: currentStatus,
      toStatus,
      actionLabel: `TRANSITION_${currentStatus}_TO_${toStatus}`,
      autoAssign: false,
      startSlaTimer: false,
      triageAlertMinutes: null,
      source: 'DEFAULT'
    }));
  }

  async getAllowedTransitions(
    currentStatus: ServiceOrderStatus,
    serviceTypeId?: string
  ): Promise<ServiceOrderStatus[]> {
    const actions = await this.getWorkflowActions(currentStatus, serviceTypeId);
    return [...new Set(actions.map((item) => item.toStatus))];
  }

  private async ensureServiceOrderExists(id: string): Promise<void> {
    const serviceOrder = await this.serviceOrdersRepository.findById(id);
    if (!serviceOrder) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }
  }

  private async resolvePrimaryAddressId(clientId: string): Promise<string | undefined> {
    const primaryAddress = await this.prisma.address.findFirst({
      where: {
        clientId
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: { id: true }
    });

    return primaryAddress?.id;
  }

  private validateAttachments(attachments: CreateServiceOrderDto['attachments']): void {
    if (!attachments?.length) {
      return;
    }

    const totalBytes = attachments.reduce((sum, item) => {
      const normalizedMime = item.mimeType.trim().toLowerCase();
      if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(normalizedMime)) {
        throw new BadRequestException(`Tipo de anexo nao permitido: ${item.mimeType}`);
      }
      if (item.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
        throw new BadRequestException(
          `Arquivo ${item.originalFileName} excede o limite de 50MB por arquivo`
        );
      }
      return sum + item.sizeBytes;
    }, 0);

    if (totalBytes > MAX_ATTACHMENTS_TOTAL_SIZE_BYTES) {
      throw new BadRequestException('Tamanho total dos anexos excede 200MB por OS');
    }
  }

  private async validateDynamicFields(
    serviceTypeId: string,
    dynamicFields: Record<string, unknown>
  ): Promise<void> {
    const fieldSchemas = await this.prisma.serviceOrderDynamicFieldSchema.findMany({
      where: { serviceTypeId, active: true }
    });

    for (const schema of fieldSchemas) {
      const value = dynamicFields[schema.fieldKey];
      if (schema.required && (value === undefined || value === null || value === '')) {
        throw new BadRequestException(`Campo dinamico obrigatorio ausente: ${schema.label}`);
      }
      if (value !== undefined && value !== null) {
        this.validateDynamicFieldType(schema.fieldType, value, schema.label);
      }
    }
  }

  private validateDynamicFieldType(fieldType: string, value: unknown, label: string): void {
    const normalized = fieldType.trim().toLowerCase();
    if (normalized === 'text' || normalized === 'select') {
      if (typeof value !== 'string') {
        throw new BadRequestException(`Campo dinamico ${label} deve ser texto`);
      }
      return;
    }

    if (normalized === 'number') {
      if (typeof value !== 'number') {
        throw new BadRequestException(`Campo dinamico ${label} deve ser numero`);
      }
      return;
    }

    if (normalized === 'checkbox') {
      if (typeof value !== 'boolean') {
        throw new BadRequestException(`Campo dinamico ${label} deve ser booleano`);
      }
      return;
    }

    if (normalized === 'date') {
      const asDate = new Date(String(value));
      if (Number.isNaN(asDate.getTime())) {
        throw new BadRequestException(`Campo dinamico ${label} deve ser data valida`);
      }
      return;
    }

    if (normalized === 'geolocation') {
      if (typeof value !== 'object' || value === null) {
        throw new BadRequestException(`Campo dinamico ${label} deve ser objeto de geolocalizacao`);
      }
    }
  }

  private async classifyServiceOrder(input: {
    serviceTypeId: string;
    searchableText: string;
    roles: string[];
  }): Promise<ClassificationResult> {
    const roleFilters = input.roles.length
      ? [...input.roles.map((role) => ({ requesterRole: role })), { requesterRole: null }]
      : [{ requesterRole: null }];

    const rules = await this.prisma.serviceOrderClassificationRule.findMany({
      where: {
        enabled: true,
        AND: [
          {
            OR: [{ serviceTypeId: input.serviceTypeId }, { serviceTypeId: null }]
          },
          {
            OR: roleFilters
          }
        ]
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }]
    });

    const normalizedText = input.searchableText.toLowerCase();
    let best:
      | (ClassificationResult & {
          internalScore: number;
        })
      | null = null;

    for (const rule of rules) {
      const keywords = rule.keywordPattern
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0);
      if (keywords.length === 0) {
        continue;
      }

      const matches = keywords.filter((keyword) => normalizedText.includes(keyword)).length;
      if (matches === 0) {
        continue;
      }

      const internalScore = matches * rule.score;
      if (!best || internalScore > best.internalScore) {
        best = {
          matchedRuleId: rule.id,
          priority: rule.priority,
          category: rule.category ?? undefined,
          subcategory: rule.subcategory ?? undefined,
          reason: `Regra ${rule.name} aplicada (${matches}/${keywords.length} palavras-chave)`,
          internalScore
        };
      }
    }

    if (best) {
      return {
        matchedRuleId: best.matchedRuleId,
        priority: best.priority,
        category: best.category,
        subcategory: best.subcategory,
        reason: best.reason
      };
    }

    return {
      priority: Priority.MEDIUM,
      reason: 'Sem regra de classificação automática aplicável'
    };
  }

  private async resolveAutoAssignment(
    serviceType: { name: string; subcategory: string | null },
    assignedTeamId?: string,
    assignedTechnicianId?: string
  ): Promise<{ teamId?: string; technicianId?: string }> {
    if (assignedTeamId || assignedTechnicianId) {
      return {
        teamId: assignedTeamId,
        technicianId: assignedTechnicianId
      };
    }

    const specialtyHint = serviceType.subcategory ?? serviceType.name;
    const candidates = await this.prisma.teamMember.findMany({
      where: {
        active: true,
        team: {
          active: true
        },
        OR: [
          { specialty: { contains: specialtyHint, mode: 'insensitive' } },
          { specialty: null }
        ]
      },
      select: {
        teamId: true,
        userId: true
      }
    });

    if (!candidates.length) {
      return {};
    }

    const userIds = [...new Set(candidates.map((item) => item.userId))];
    const workload = await this.prisma.serviceOrder.groupBy({
      by: ['assignedTechnicianId'],
      where: {
        deletedAt: null,
        assignedTechnicianId: { in: userIds },
        status: { notIn: ['COMPLETED', 'CANCELED'] }
      },
      _count: {
        _all: true
      }
    });
    const workloadMap = new Map(
      workload
        .filter((item): item is typeof item & { assignedTechnicianId: string } =>
          Boolean(item.assignedTechnicianId)
        )
        .map((item) => [item.assignedTechnicianId, item._count._all])
    );

    const bestCandidate = [...candidates].sort((a, b) => {
      const aCount = workloadMap.get(a.userId) ?? 0;
      const bCount = workloadMap.get(b.userId) ?? 0;
      return aCount - bCount;
    })[0];

    return {
      teamId: bestCandidate.teamId,
      technicianId: bestCandidate.userId
    };
  }

  private async persistServiceOrderContext(
    serviceOrderId: string,
    input: {
      actorId: string;
      parentServiceOrderId?: string;
      linkedAsset: {
        id: string;
        location: string | null;
        contractId: string | null;
      } | null;
      geolocation?: CreateServiceOrderDto['geolocation'];
      dynamicFields: Record<string, unknown>;
      attachments?: CreateServiceOrderDto['attachments'];
      classification: ClassificationResult;
    }
  ): Promise<void> {
    await this.prisma.serviceOrderClassificationResult.create({
      data: {
        serviceOrderId,
        matchedRuleId: input.classification.matchedRuleId,
        priority: input.classification.priority,
        category: input.classification.category,
        subcategory: input.classification.subcategory,
        reason: input.classification.reason
      }
    });

    const dynamicFieldEntries = Object.entries(input.dynamicFields);
    if (dynamicFieldEntries.length > 0) {
      await this.prisma.serviceOrderDynamicFieldValue.createMany({
        data: dynamicFieldEntries.map(([fieldKey, value]) => ({
          serviceOrderId,
          fieldKey,
          value: value as Prisma.InputJsonValue
        }))
      });
    }

    if (input.geolocation) {
      await this.prisma.serviceOrderGeoLocation.create({
        data: {
          serviceOrderId,
          latitude: input.geolocation.latitude,
          longitude: input.geolocation.longitude,
          source: (input.geolocation.source ?? 'MANUAL') as GeoLocationSource
        }
      });
    }

    if (input.parentServiceOrderId) {
      await this.prisma.serviceOrderHierarchy.create({
        data: {
          parentServiceOrderId: input.parentServiceOrderId,
          childServiceOrderId: serviceOrderId
        }
      });
    }

    if (input.linkedAsset) {
      await this.prisma.serviceOrderAssetLink.create({
        data: {
          serviceOrderId,
          assetId: input.linkedAsset.id,
          inheritedLocation: input.linkedAsset.location ?? undefined,
          inheritedContractId: input.linkedAsset.contractId ?? undefined
        }
      });
    }

    if (input.attachments?.length) {
      await this.prisma.attachment.createMany({
        data: input.attachments.map((attachment) => ({
          serviceOrderId,
          uploaderId: input.actorId,
          fileName: attachment.fileName,
          originalFileName: attachment.originalFileName,
          mimeType: attachment.mimeType,
          sizeBytes: Math.floor(attachment.sizeBytes),
          storagePath: attachment.storagePath,
          category: attachment.category ?? AttachmentCategory.DOCUMENT
        }))
      });
    }
  }

  /**
   * MÓDULO 4.1 - Disparar notificação WhatsApp automática baseada no status da OS
   * Templates: OS_ABERTA, EM_ANDAMENTO, CONCLUSAO, etc.
   */
  private async dispatchWhatsAppStatusNotification(
    so: ServiceOrderView,
    toStatus: ServiceOrderStatus
  ): Promise<void> {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id: so.clientId },
        select: { name: true, phone: true, mobile: true }
      });

      const phone = client?.mobile ?? client?.phone;
      if (!phone) return;

      const BASE_URL = process.env.APP_BASE_URL ?? 'https://app.example.com';
      const trackingLink = `${BASE_URL}/portal/os/${so.id}`;

      const eventMap: Partial<Record<ServiceOrderStatus, { event: string; params: Record<string, string> }>> = {
        [ServiceOrderStatus.OPEN]: {
          event: 'OS_ABERTA',
          params: {
            cliente: client?.name ?? '',
            os: String(so.orderNumber),
            categoria: so.serviceTypeId ?? '',
            data: so.slaDueAt ? new Date(so.slaDueAt).toLocaleDateString('pt-BR') : 'a combinar',
            link: trackingLink
          }
        },
        [ServiceOrderStatus.IN_PROGRESS]: {
          event: 'EM_ANDAMENTO',
          params: {
            os: String(so.orderNumber),
            valor: '0,00'
          }
        },
        [ServiceOrderStatus.COMPLETED]: {
          event: 'CONCLUSAO',
          params: {
            os: String(so.orderNumber),
            tempo: so.completedAt && so.openedAt
              ? `${Math.round((new Date(so.completedAt).getTime() - new Date(so.openedAt).getTime()) / 60000)} min`
              : '-',
            valor: '0,00'
          }
        }
      };

      const entry = eventMap[toStatus];
      if (!entry) return;

      await this.notificationsService.notifyServiceOrderEvent(
        entry.event as Parameters<typeof this.notificationsService.notifyServiceOrderEvent>[0],
        entry.params,
        phone,
        so.clientId
      );
    } catch {
      // Não propagar erro de notificação para não bloquear o fluxo principal
    }
  }
}
