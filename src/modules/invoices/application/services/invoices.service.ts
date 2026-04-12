import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InvoiceStatus, Prisma, ServiceOrderStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import { CancelInvoiceDto, EmitInvoiceDto, ListInvoicesQueryDto } from '../dto/invoices.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async emit(dto: EmitInvoiceDto, actor: JwtUserPayload): Promise<Record<string, unknown>> {
    const existing = await this.prisma.invoice.findUnique({
      where: { serviceOrderId: dto.serviceOrderId },
      select: { id: true, invoiceNumber: true, status: true }
    });
    if (existing) {
      throw new ConflictException(
        `Ja existe nota para esta OS (NF #${existing.invoiceNumber}, status ${existing.status})`
      );
    }

    const serviceOrder = await this.prisma.serviceOrder.findFirst({
      where: { id: dto.serviceOrderId, deletedAt: null },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        estimatedValue: true,
        clientId: true,
        contractId: true
      }
    });
    if (!serviceOrder) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }

    if (serviceOrder.status !== ServiceOrderStatus.COMPLETED) {
      throw new BadRequestException('A nota so pode ser emitida para OS concluida');
    }

    const grossAmount = dto.grossAmount ?? Number(serviceOrder.estimatedValue ?? 0);
    const discountAmount = dto.discountAmount ?? 0;
    const taxAmount = dto.taxAmount ?? 0;

    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
      throw new BadRequestException(
        'Valor bruto invalido. Informe grossAmount maior que zero ou estimatedValue na OS'
      );
    }
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      throw new BadRequestException('Desconto invalido');
    }
    if (!Number.isFinite(taxAmount) || taxAmount < 0) {
      throw new BadRequestException('Tributo invalido');
    }
    if (discountAmount > grossAmount) {
      throw new BadRequestException('Desconto nao pode ser maior que o valor bruto');
    }

    const netAmount = grossAmount - discountAmount + taxAmount;
    if (!Number.isFinite(netAmount) || netAmount <= 0) {
      throw new BadRequestException('Valor liquido invalido');
    }

    const created = await this.prisma.invoice.create({
      data: {
        serviceOrderId: serviceOrder.id,
        clientId: serviceOrder.clientId,
        contractId: serviceOrder.contractId ?? null,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        description: dto.description ?? null,
        grossAmount,
        discountAmount,
        taxAmount,
        netAmount,
        series: dto.series?.trim() || 'NFS',
        externalReference: dto.externalReference ?? null,
        status: InvoiceStatus.ISSUED,
        createdById: actor.sub,
        issuedById: actor.sub
      },
      include: this.invoiceInclude()
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'INVOICE_ISSUED',
      resource: 'invoice',
      resourceId: created.id,
      metadata: {
        invoiceNumber: created.invoiceNumber,
        serviceOrderId: created.serviceOrderId,
        serviceOrderNumber: created.serviceOrder?.orderNumber
      }
    });

    return this.mapInvoice(created);
  }

  async findAll(query: ListInvoicesQueryDto): Promise<{
    items: Record<string, unknown>[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: Prisma.InvoiceWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.serviceOrderId ? { serviceOrderId: query.serviceOrderId } : {}),
      ...(query.contractId ? { contractId: query.contractId } : {}),
      ...(query.startDate || query.endDate
        ? {
            issueDate: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {})
            }
          }
        : {})
    };

    if (query.search) {
      const searchNumber = Number(query.search);
      const orFilters: Prisma.InvoiceWhereInput[] = [
        { series: { contains: query.search, mode: 'insensitive' } },
        { externalReference: { contains: query.search, mode: 'insensitive' } },
        {
          serviceOrder: {
            title: { contains: query.search, mode: 'insensitive' }
          }
        },
        {
          client: {
            name: { contains: query.search, mode: 'insensitive' }
          }
        }
      ];

      if (Number.isInteger(searchNumber) && searchNumber > 0) {
        orFilters.push({ invoiceNumber: searchNumber });
      }

      where.OR = orFilters;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: this.invoiceInclude(),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: this.buildOrderBy(query.sort)
      }),
      this.prisma.invoice.count({ where })
    ]);

    return {
      items: items.map((item) => this.mapInvoice(item)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    };
  }

  async findById(id: string): Promise<Record<string, unknown>> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: this.invoiceInclude()
    });

    if (!invoice) {
      throw new NotFoundException('Nota nao encontrada');
    }

    return this.mapInvoice(invoice);
  }

  async cancel(id: string, dto: CancelInvoiceDto, actor: JwtUserPayload): Promise<Record<string, unknown>> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        status: true
      }
    });

    if (!invoice) {
      throw new NotFoundException('Nota nao encontrada');
    }

    if (invoice.status === InvoiceStatus.CANCELED) {
      throw new BadRequestException('Nota ja cancelada');
    }

    const canceled = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELED,
        canceledAt: new Date(),
        cancellationReason: dto.reason
      },
      include: this.invoiceInclude()
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'INVOICE_CANCELED',
      resource: 'invoice',
      resourceId: id,
      metadata: {
        reason: dto.reason
      }
    });

    return this.mapInvoice(canceled);
  }

  private buildOrderBy(sort?: string): Prisma.InvoiceOrderByWithRelationInput {
    if (!sort) {
      return { issueDate: 'desc' };
    }

    const [field, direction] = sort.split(':');
    const allowedFields = new Set([
      'invoiceNumber',
      'issueDate',
      'createdAt',
      'updatedAt',
      'status',
      'grossAmount',
      'netAmount'
    ]);
    const safeField = allowedFields.has(field) ? field : 'issueDate';
    const safeDirection: Prisma.SortOrder = direction === 'asc' ? 'asc' : 'desc';

    return { [safeField]: safeDirection } as Prisma.InvoiceOrderByWithRelationInput;
  }

  private invoiceInclude(): Prisma.InvoiceInclude {
    return {
      client: {
        select: {
          id: true,
          name: true,
          taxId: true
        }
      },
      contract: {
        select: {
          id: true,
          code: true,
          title: true,
          status: true
        }
      },
      serviceOrder: {
        select: {
          id: true,
          orderNumber: true,
          title: true,
          status: true,
          completedAt: true
        }
      }
    };
  }

  private toNumber(value: Prisma.Decimal | number): number {
    return typeof value === 'number' ? value : Number(value.toString());
  }

  private mapInvoice(invoice: {
    id: string;
    invoiceNumber: number;
    series: string;
    status: InvoiceStatus;
    serviceOrderId: string;
    clientId: string;
    contractId: string | null;
    issueDate: Date;
    dueDate: Date | null;
    description: string | null;
    grossAmount: Prisma.Decimal | number;
    discountAmount: Prisma.Decimal | number;
    taxAmount: Prisma.Decimal | number;
    netAmount: Prisma.Decimal | number;
    externalReference: string | null;
    canceledAt: Date | null;
    cancellationReason: string | null;
    createdById: string | null;
    issuedById: string | null;
    createdAt: Date;
    updatedAt: Date;
    client?: { id: string; name: string; taxId: string } | null;
    contract?: { id: string; code: string; title: string; status: string } | null;
    serviceOrder?: {
      id: string;
      orderNumber: number;
      title: string;
      status: ServiceOrderStatus;
      completedAt: Date | null;
    } | null;
  }): Record<string, unknown> {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      displayNumber: `${invoice.series}-${invoice.invoiceNumber}`,
      series: invoice.series,
      status: invoice.status,
      serviceOrderId: invoice.serviceOrderId,
      clientId: invoice.clientId,
      contractId: invoice.contractId,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      description: invoice.description,
      grossAmount: this.toNumber(invoice.grossAmount),
      discountAmount: this.toNumber(invoice.discountAmount),
      taxAmount: this.toNumber(invoice.taxAmount),
      netAmount: this.toNumber(invoice.netAmount),
      externalReference: invoice.externalReference,
      canceledAt: invoice.canceledAt,
      cancellationReason: invoice.cancellationReason,
      createdById: invoice.createdById,
      issuedById: invoice.issuedById,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      client: invoice.client ?? null,
      contract: invoice.contract ?? null,
      serviceOrder: invoice.serviceOrder ?? null
    };
  }
}
