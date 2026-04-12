import { randomBytes } from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { hash } from 'bcrypt';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import { ListKnowledgeArticlesQueryDto } from '../../../knowledge-base/application/dto/knowledge-articles.dto';
import { KnowledgeBaseService } from '../../../knowledge-base/application/services/knowledge-base.service';
import { CreateServiceOrderDto } from '../../../service-orders/application/dto/create-service-order.dto';
import { ServiceOrdersService } from '../../../service-orders/application/services/service-orders.service';
import { CreatePortalTicketDto } from '../dto/portal.dto';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly serviceOrdersService: ServiceOrdersService,
    private readonly knowledgeBaseService: KnowledgeBaseService
  ) {}

  async openTicket(dto: CreatePortalTicketDto): Promise<Record<string, unknown>> {
    const serviceType = await this.resolvePortalServiceType(dto.serviceTypeId);

    const client = await this.resolvePortalClient(dto);
    const portalActor = await this.resolvePortalActor();

    const createOrderDto: CreateServiceOrderDto = {
      clientId: client.id,
      serviceTypeId: serviceType.id,
      locationAddressId: dto.locationAddressId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      customerNotes: `Solicitante: ${dto.requesterName} <${dto.requesterEmail}>`,
      geolocation: dto.geolocation
        ? {
            latitude: dto.geolocation.latitude,
            longitude: dto.geolocation.longitude
          }
        : undefined,
      attachments: dto.attachments
    };

    const serviceOrder = await this.serviceOrdersService.create(createOrderDto, portalActor);
    const trackingCode = await this.generateTrackingCode();

    await this.prisma.portalTicket.create({
      data: {
        trackingCode,
        serviceOrderId: serviceOrder.id,
        requesterName: dto.requesterName,
        requesterEmail: dto.requesterEmail.toLowerCase(),
        requesterPhone: dto.requesterPhone
      }
    });

    await this.auditService.register({
      actorId: portalActor.sub,
      action: 'PORTAL_TICKET_CREATED',
      resource: 'portal_ticket',
      resourceId: serviceOrder.id,
      metadata: {
        trackingCode,
        requesterEmail: dto.requesterEmail.toLowerCase()
      }
    });

    return {
      message: 'Chamado aberto com sucesso',
      trackingCode,
      serviceOrderId: serviceOrder.id,
      orderNumber: serviceOrder.orderNumber,
      status: serviceOrder.status
    };
  }

  async trackTicket(trackingCode: string, requesterEmail: string): Promise<Record<string, unknown>> {
    const ticket = await this.prisma.portalTicket.findFirst({
      where: {
        trackingCode: trackingCode.trim().toUpperCase(),
        requesterEmail: requesterEmail.trim().toLowerCase()
      }
    });

    if (!ticket) {
      throw new NotFoundException('Chamado nao encontrado para este codigo/e-mail');
    }

    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: ticket.serviceOrderId },
      include: {
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 15
        }
      }
    });
    if (!serviceOrder) {
      throw new NotFoundException('Ordem vinculada ao protocolo nao encontrada');
    }

    return {
      trackingCode: ticket.trackingCode,
      requesterName: ticket.requesterName,
      requesterEmail: ticket.requesterEmail,
      serviceOrder: {
        id: serviceOrder.id,
        orderNumber: serviceOrder.orderNumber,
        title: serviceOrder.title,
        description: serviceOrder.description,
        status: serviceOrder.status,
        priority: serviceOrder.priority,
        openedAt: serviceOrder.openedAt,
        scheduledStartAt: serviceOrder.scheduledStartAt,
        completedAt: serviceOrder.completedAt
      },
      statusHistory: serviceOrder.statusHistory
    };
  }

  async listPublicArticles(query: ListKnowledgeArticlesQueryDto): Promise<Record<string, unknown>> {
    return this.knowledgeBaseService.findAll({
      ...query,
      publishedOnly: true
    });
  }

  async getPublicArticle(slug: string): Promise<Record<string, unknown>> {
    return this.knowledgeBaseService.findPublicBySlug(slug);
  }

  private async resolvePortalClient(dto: CreatePortalTicketDto): Promise<{
    id: string;
    name: string;
  }> {
    const normalizedEmail = dto.requesterEmail.trim().toLowerCase();
    const normalizedTaxId = dto.clientTaxId?.trim();

    const existing = normalizedTaxId
      ? await this.prisma.client.findFirst({
          where: {
            taxId: normalizedTaxId,
            deletedAt: null
          }
        })
      : await this.prisma.client.findFirst({
          where: {
            email: normalizedEmail,
            deletedAt: null
          }
        });

    if (existing) {
      return {
        id: existing.id,
        name: existing.name
      };
    }

    const fallbackTaxId = `PORTAL-${Date.now()}-${randomBytes(2).toString('hex')}`;
    const created = await this.prisma.client.create({
      data: {
        type: 'INDIVIDUAL',
        name: dto.clientName ?? dto.requesterName,
        taxId: normalizedTaxId ?? fallbackTaxId,
        email: normalizedEmail,
        phone: dto.requesterPhone,
        contactName: dto.requesterName
      }
    });

    return {
      id: created.id,
      name: created.name
    };
  }

  private async resolvePortalActor(): Promise<JwtUserPayload> {
    const portalEmail = 'portal@oms.local';
    let user = await this.prisma.user.findUnique({
      where: { email: portalEmail }
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: portalEmail,
          fullName: 'Portal Autoatendimento',
          passwordHash: await hash(`Portal@${randomBytes(8).toString('hex')}`, 10),
          status: 'ACTIVE',
          jobTitle: 'Portal',
          department: 'Autoatendimento'
        }
      });
    }

    return {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      roles: ['CLIENT'],
      permissions: []
    };
  }

  private async generateTrackingCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `OS-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
      const exists = await this.prisma.portalTicket.findUnique({
        where: { trackingCode: code },
        select: { id: true }
      });
      if (!exists) {
        return code;
      }
    }

    throw new BadRequestException('Nao foi possivel gerar protocolo unico, tente novamente');
  }

  private async resolvePortalServiceType(serviceTypeId?: string): Promise<{
    id: string;
    code: string;
    name: string;
  }> {
    if (serviceTypeId) {
      const selected = await this.prisma.serviceType.findFirst({
        where: { id: serviceTypeId, active: true },
        select: { id: true, code: true, name: true }
      });
      if (!selected) {
        throw new NotFoundException('Tipo de servico informado nao encontrado/ativo');
      }
      return selected;
    }

    const firstActive = await this.prisma.serviceType.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, code: true, name: true }
    });
    if (firstActive) {
      return firstActive;
    }

    const category = await this.prisma.serviceCategory.upsert({
      where: { code: 'PORTAL' },
      update: { active: true, name: 'Portal' },
      create: {
        code: 'PORTAL',
        name: 'Portal',
        description: 'Categoria padrao para abertura publica'
      },
      select: { id: true }
    });

    const defaultServiceType = await this.prisma.serviceType.upsert({
      where: { code: 'PORTAL-GERAL' },
      update: {
        active: true,
        categoryId: category.id,
        name: 'Atendimento Geral Portal',
        estimatedDurationMinutes: 240
      },
      create: {
        code: 'PORTAL-GERAL',
        categoryId: category.id,
        name: 'Atendimento Geral Portal',
        description: 'Tipo de servico padrao para chamados do portal',
        estimatedDurationMinutes: 240,
        defaultPriority: 'MEDIUM',
        active: true
      },
      select: { id: true, code: true, name: true }
    });

    return defaultServiceType;
  }
}
