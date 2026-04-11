import { Injectable } from '@nestjs/common';
import { Prisma, type ClientType } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  ClientWithRelations,
  ClientsRepository,
  CreateClientRepositoryInput,
  FindClientsParams,
  UpdateClientRepositoryInput
} from '../../domain/repositories/clients.repository';

@Injectable()
export class PrismaClientsRepository implements ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ClientWithRelations | null> {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        addresses: true,
        contracts: true
      }
    });

    return client ? this.mapClient(client) : null;
  }

  async findByTaxId(taxId: string): Promise<ClientWithRelations | null> {
    const client = await this.prisma.client.findFirst({
      where: { taxId, deletedAt: null },
      include: {
        addresses: true,
        contracts: true
      }
    });

    return client ? this.mapClient(client) : null;
  }

  async findMany(params: FindClientsParams): Promise<{ items: ClientWithRelations[]; total: number }> {
    const where: Prisma.ClientWhereInput = {
      deletedAt: null,
      ...(params.type ? { type: params.type as ClientType } : {}),
      ...(typeof params.active === 'boolean' ? { active: params.active } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { legalName: { contains: params.search, mode: 'insensitive' } },
              { taxId: { contains: params.search } },
              { contactName: { contains: params.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [clients, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        include: {
          addresses: true,
          contracts: true
        },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: this.buildOrderBy(params.sort)
      }),
      this.prisma.client.count({ where })
    ]);

    return {
      items: clients.map((client) => this.mapClient(client)),
      total
    };
  }

  async create(input: CreateClientRepositoryInput): Promise<ClientWithRelations> {
    const created = await this.prisma.client.create({
      data: {
        type: input.type,
        name: input.name,
        legalName: input.legalName,
        taxId: input.taxId,
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
        contactName: input.contactName,
        notes: input.notes,
        active: input.active ?? true,
        addresses: input.addresses?.length
          ? {
              createMany: {
                data: input.addresses.map((address) => ({
                  label: address.label,
                  street: address.street,
                  number: address.number,
                  complement: address.complement,
                  district: address.district,
                  city: address.city,
                  state: address.state,
                  zipCode: address.zipCode,
                  country: address.country ?? 'Brasil',
                  isPrimary: address.isPrimary ?? false
                }))
              }
            }
          : undefined,
        contracts: input.contract
          ? {
              create: {
                code: input.contract.code,
                title: input.contract.title,
                startDate: input.contract.startDate,
                endDate: input.contract.endDate,
                slaId: input.contract.slaId,
                status: 'ACTIVE',
                serviceScope: input.contract.serviceScope
              }
            }
          : undefined
      },
      include: {
        addresses: true,
        contracts: true
      }
    });

    return this.mapClient(created);
  }

  async update(id: string, input: UpdateClientRepositoryInput): Promise<ClientWithRelations> {
    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.addresses) {
        await tx.address.deleteMany({ where: { clientId: id } });
      }

      return tx.client.update({
        where: { id },
        data: {
          type: input.type,
          name: input.name,
          legalName: input.legalName,
          taxId: input.taxId,
          email: input.email,
          phone: input.phone,
          mobile: input.mobile,
          contactName: input.contactName,
          notes: input.notes,
          active: input.active,
          addresses: input.addresses
            ? {
                createMany: {
                  data: input.addresses.map((address) => ({
                    label: address.label,
                    street: address.street,
                    number: address.number,
                    complement: address.complement,
                    district: address.district,
                    city: address.city,
                    state: address.state,
                    zipCode: address.zipCode,
                    country: address.country ?? 'Brasil',
                    isPrimary: address.isPrimary ?? false
                  }))
                }
              }
            : undefined
        },
        include: {
          addresses: true,
          contracts: true
        }
      });
    });

    return this.mapClient(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.client.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false
      }
    });
  }

  private buildOrderBy(sort?: string): Prisma.ClientOrderByWithRelationInput {
    if (!sort) {
      return { createdAt: 'desc' };
    }

    const [field, direction] = sort.split(':');
    const allowedFields = new Set(['createdAt', 'updatedAt', 'name', 'taxId']);
    const safeField = allowedFields.has(field) ? field : 'createdAt';
    const safeDirection: Prisma.SortOrder = direction === 'asc' ? 'asc' : 'desc';

    return { [safeField]: safeDirection } as Prisma.ClientOrderByWithRelationInput;
  }

  private mapClient(client: {
    id: string;
    type: ClientType;
    name: string;
    legalName: string | null;
    taxId: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    contactName: string | null;
    notes: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    addresses: Array<{
      label: string | null;
      street: string;
      number: string;
      complement: string | null;
      district: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
      isPrimary: boolean;
    }>;
    contracts: Array<{
      id: string;
      code: string;
      title: string;
      status: string;
      startDate: Date;
      endDate: Date | null;
    }>;
  }): ClientWithRelations {
    return {
      id: client.id,
      type: client.type,
      name: client.name,
      legalName: client.legalName,
      taxId: client.taxId,
      email: client.email,
      phone: client.phone,
      mobile: client.mobile,
      contactName: client.contactName,
      notes: client.notes,
      active: client.active,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      addresses: client.addresses.map((address) => ({
        label: address.label ?? undefined,
        street: address.street,
        number: address.number,
        complement: address.complement ?? undefined,
        district: address.district,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        isPrimary: address.isPrimary
      })),
      contracts: client.contracts.map((contract) => ({
        id: contract.id,
        code: contract.code,
        title: contract.title,
        status: contract.status,
        startDate: contract.startDate,
        endDate: contract.endDate
      }))
    };
  }
}
