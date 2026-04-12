import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import {
  CreateSupplierContractDto,
  CreateSupplierDto,
  ListExpiringSupplierContractsQueryDto,
  ListSuppliersQueryDto,
  UpdateSupplierDto
} from '../dto/suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async create(dto: CreateSupplierDto, actor: JwtUserPayload): Promise<Record<string, unknown>> {
    const existing = await this.prisma.supplier.findUnique({
      where: { taxId: dto.taxId },
      select: { id: true }
    });
    if (existing) {
      throw new ConflictException('Fornecedor ja cadastrado com este documento');
    }

    const created = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        legalName: dto.legalName,
        taxId: dto.taxId,
        email: dto.email,
        phone: dto.phone,
        contactName: dto.contactName,
        notes: dto.notes,
        active: dto.active
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SUPPLIER_CREATED',
      resource: 'supplier',
      resourceId: created.id
    });

    return created;
  }

  async findAll(query: ListSuppliersQueryDto): Promise<{
    items: Record<string, unknown>[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: Prisma.SupplierWhereInput = {
      deletedAt: null,
      ...(typeof query.active === 'boolean' ? { active: query.active } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { legalName: { contains: query.search, mode: 'insensitive' } },
              { taxId: { contains: query.search } },
              { contactName: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        include: {
          contracts: {
            orderBy: { endDate: 'asc' },
            take: 5
          }
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: this.buildOrderBy(query.sort)
      }),
      this.prisma.supplier.count({ where })
    ]);

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

  async findById(id: string): Promise<Record<string, unknown>> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      include: {
        contracts: {
          orderBy: { createdAt: 'desc' }
        },
        assets: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 30
        }
      }
    });

    if (!supplier) {
      throw new NotFoundException('Fornecedor nao encontrado');
    }

    return supplier;
  }

  async update(
    id: string,
    dto: UpdateSupplierDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existing) {
      throw new NotFoundException('Fornecedor nao encontrado');
    }

    if (dto.taxId && dto.taxId !== existing.taxId) {
      const taxInUse = await this.prisma.supplier.findUnique({
        where: { taxId: dto.taxId },
        select: { id: true }
      });
      if (taxInUse) {
        throw new ConflictException('Documento ja vinculado a outro fornecedor');
      }
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        legalName: dto.legalName,
        taxId: dto.taxId,
        email: dto.email,
        phone: dto.phone,
        contactName: dto.contactName,
        notes: dto.notes,
        active: dto.active
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SUPPLIER_UPDATED',
      resource: 'supplier',
      resourceId: id
    });

    return updated;
  }

  async remove(id: string, actor: JwtUserPayload): Promise<void> {
    const existing = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException('Fornecedor nao encontrado');
    }

    await this.prisma.supplier.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date()
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SUPPLIER_SOFT_DELETED',
      resource: 'supplier',
      resourceId: id
    });
  }

  async addContract(
    supplierId: string,
    dto: CreateSupplierContractDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, deletedAt: null },
      select: { id: true }
    });
    if (!supplier) {
      throw new NotFoundException('Fornecedor nao encontrado');
    }

    const created = await this.prisma.supplierContract.create({
      data: {
        supplierId,
        contractCode: dto.contractCode,
        title: dto.title,
        status: dto.status,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        monthlyValue: dto.monthlyValue,
        renewalAlertDays: dto.renewalAlertDays,
        notes: dto.notes
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'SUPPLIER_CONTRACT_CREATED',
      resource: 'supplier_contract',
      resourceId: created.id,
      metadata: {
        supplierId
      }
    });

    return created;
  }

  async listExpiringContracts(
    query: ListExpiringSupplierContractsQueryDto
  ): Promise<Record<string, unknown>[]> {
    const today = new Date();
    const endDate = new Date(today.getTime() + query.daysAhead * 24 * 60 * 60 * 1000);

    return this.prisma.supplierContract.findMany({
      where: {
        endDate: {
          gte: today,
          lte: endDate
        },
        status: {
          in: ['DRAFT', 'ACTIVE', 'SUSPENDED']
        },
        supplier: {
          deletedAt: null
        }
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            taxId: true,
            contactName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { endDate: 'asc' }
    });
  }

  private buildOrderBy(sort?: string): Prisma.SupplierOrderByWithRelationInput {
    if (!sort) {
      return { createdAt: 'desc' };
    }

    const [field, direction] = sort.split(':');
    const allowedFields = new Set(['createdAt', 'updatedAt', 'name', 'taxId']);
    const safeField = allowedFields.has(field) ? field : 'createdAt';
    const safeDirection: Prisma.SortOrder = direction === 'asc' ? 'asc' : 'desc';

    return { [safeField]: safeDirection } as Prisma.SupplierOrderByWithRelationInput;
  }
}
