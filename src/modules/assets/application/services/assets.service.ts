import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, type AssetMaintenanceStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import {
  CreateAssetDto,
  ListAssetsQueryDto,
  RegisterAssetMaintenanceDto,
  RegisterInventoryTransactionDto,
  UpdateAssetDto
} from '../dto/assets.dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async create(dto: CreateAssetDto, actor: JwtUserPayload): Promise<Record<string, unknown>> {
    await this.ensureUniqueCode(dto.code);
    await this.ensureUniqueSerial(dto.serialNumber);

    const created = await this.prisma.asset.create({
      data: {
        code: dto.code,
        name: dto.name,
        category: dto.category,
        description: dto.description,
        serialNumber: dto.serialNumber,
        brand: dto.brand,
        model: dto.model,
        status: dto.status,
        condition: dto.condition,
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
        acquisitionCost: dto.acquisitionCost,
        warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : undefined,
        depreciationEndDate: dto.depreciationEndDate ? new Date(dto.depreciationEndDate) : undefined,
        location: dto.location,
        supplierId: dto.supplierId,
        clientId: dto.clientId,
        contractId: dto.contractId,
        assignedTeamId: dto.assignedTeamId,
        assignedTechnicianId: dto.assignedTechnicianId,
        nextPreventiveAt: dto.nextPreventiveAt ? new Date(dto.nextPreventiveAt) : undefined,
        active: dto.active
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'ASSET_CREATED',
      resource: 'asset',
      resourceId: created.id,
      after: {
        code: created.code,
        name: created.name,
        status: created.status
      }
    });

    return created;
  }

  async findAll(query: ListAssetsQueryDto): Promise<{
    items: Record<string, unknown>[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: Prisma.AssetWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(typeof query.active === 'boolean' ? { active: query.active } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { serialNumber: { contains: query.search, mode: 'insensitive' } },
              { brand: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              taxId: true
            }
          }
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: this.buildOrderBy(query.sort)
      }),
      this.prisma.asset.count({ where })
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
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: true,
        maintenances: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        inventoryTransactions: {
          orderBy: { occurredAt: 'desc' },
          take: 30
        }
      }
    });

    if (!asset) {
      throw new NotFoundException('Ativo nao encontrado');
    }

    return asset;
  }

  async update(
    id: string,
    dto: UpdateAssetDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundException('Ativo nao encontrado');
    }

    if (dto.code && dto.code !== existing.code) {
      await this.ensureUniqueCode(dto.code);
    }

    if (dto.serialNumber && dto.serialNumber !== existing.serialNumber) {
      await this.ensureUniqueSerial(dto.serialNumber);
    }

    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        category: dto.category,
        description: dto.description,
        serialNumber: dto.serialNumber,
        brand: dto.brand,
        model: dto.model,
        status: dto.status,
        condition: dto.condition,
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
        acquisitionCost: dto.acquisitionCost,
        warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : undefined,
        depreciationEndDate: dto.depreciationEndDate ? new Date(dto.depreciationEndDate) : undefined,
        location: dto.location,
        supplierId: dto.supplierId,
        clientId: dto.clientId,
        contractId: dto.contractId,
        assignedTeamId: dto.assignedTeamId,
        assignedTechnicianId: dto.assignedTechnicianId,
        nextPreventiveAt: dto.nextPreventiveAt ? new Date(dto.nextPreventiveAt) : undefined,
        lastMaintenanceAt: dto.lastMaintenanceAt ? new Date(dto.lastMaintenanceAt) : undefined,
        active: dto.active
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'ASSET_UPDATED',
      resource: 'asset',
      resourceId: id,
      before: {
        code: existing.code,
        name: existing.name,
        status: existing.status
      },
      after: {
        code: updated.code,
        name: updated.name,
        status: updated.status
      }
    });

    return updated;
  }

  async remove(id: string, actor: JwtUserPayload): Promise<void> {
    const existing = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
      select: { id: true }
    });

    if (!existing) {
      throw new NotFoundException('Ativo nao encontrado');
    }

    await this.prisma.asset.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date()
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'ASSET_SOFT_DELETED',
      resource: 'asset',
      resourceId: id
    });
  }

  async registerMaintenance(
    assetId: string,
    dto: RegisterAssetMaintenanceDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, deletedAt: null }
    });

    if (!asset) {
      throw new NotFoundException('Ativo nao encontrado');
    }

    const status: AssetMaintenanceStatus =
      dto.status ?? (dto.finishedAt ? 'COMPLETED' : 'SCHEDULED');

    const maintenance = await this.prisma.assetMaintenance.create({
      data: {
        assetId,
        type: dto.type,
        status,
        scheduledAt: new Date(dto.scheduledAt),
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : undefined,
        performedById: dto.performedById ?? actor.sub,
        description: dto.description,
        cost: dto.cost,
        notes: dto.notes
      }
    });

    if (maintenance.finishedAt) {
      await this.prisma.asset.update({
        where: { id: assetId },
        data: {
          lastMaintenanceAt: maintenance.finishedAt,
          status: 'IN_STOCK'
        }
      });
    } else if (status === 'IN_PROGRESS') {
      await this.prisma.asset.update({
        where: { id: assetId },
        data: {
          status: 'MAINTENANCE'
        }
      });
    }

    await this.auditService.register({
      actorId: actor.sub,
      action: 'ASSET_MAINTENANCE_REGISTERED',
      resource: 'asset',
      resourceId: assetId,
      metadata: {
        maintenanceId: maintenance.id,
        status: maintenance.status,
        type: maintenance.type
      }
    });

    return maintenance;
  }

  async registerInventoryTransaction(
    assetId: string,
    dto: RegisterInventoryTransactionDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, deletedAt: null }
    });

    if (!asset) {
      throw new NotFoundException('Ativo nao encontrado');
    }

    const transaction = await this.prisma.inventoryTransaction.create({
      data: {
        assetId,
        type: dto.type,
        quantity: dto.quantity,
        fromLocation: dto.fromLocation,
        toLocation: dto.toLocation,
        reference: dto.reference,
        notes: dto.notes,
        recordedById: actor.sub,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined
      }
    });

    await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        location: dto.toLocation ?? asset.location,
        status: this.resolveAssetStatusAfterTransaction(dto.type, asset.status)
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'ASSET_INVENTORY_TRANSACTION_REGISTERED',
      resource: 'asset',
      resourceId: assetId,
      metadata: {
        transactionId: transaction.id,
        type: transaction.type,
        quantity: transaction.quantity
      }
    });

    return transaction;
  }

  private buildOrderBy(sort?: string): Prisma.AssetOrderByWithRelationInput {
    if (!sort) {
      return { createdAt: 'desc' };
    }

    const [field, direction] = sort.split(':');
    const allowedFields = new Set([
      'createdAt',
      'updatedAt',
      'code',
      'name',
      'category',
      'status',
      'nextPreventiveAt'
    ]);
    const safeField = allowedFields.has(field) ? field : 'createdAt';
    const safeDirection: Prisma.SortOrder = direction === 'asc' ? 'asc' : 'desc';

    return { [safeField]: safeDirection } as Prisma.AssetOrderByWithRelationInput;
  }

  private async ensureUniqueCode(code: string): Promise<void> {
    const existing = await this.prisma.asset.findUnique({
      where: { code },
      select: { id: true }
    });
    if (existing) {
      throw new ConflictException('Codigo de ativo ja cadastrado');
    }
  }

  private async ensureUniqueSerial(serialNumber?: string): Promise<void> {
    if (!serialNumber) {
      return;
    }

    const existing = await this.prisma.asset.findFirst({
      where: { serialNumber },
      select: { id: true }
    });
    if (existing) {
      throw new ConflictException('Numero de serie ja cadastrado');
    }
  }

  private resolveAssetStatusAfterTransaction(
    type: RegisterInventoryTransactionDto['type'],
    currentStatus: string
  ): 'IN_STOCK' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED' | 'DISPOSED' {
    if (type === 'INBOUND') {
      return 'IN_STOCK';
    }
    if (type === 'OUTBOUND') {
      return 'IN_USE';
    }
    if (type === 'TRANSFER') {
      return currentStatus as 'IN_STOCK' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED' | 'DISPOSED';
    }
    return currentStatus as 'IN_STOCK' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED' | 'DISPOSED';
  }
}
