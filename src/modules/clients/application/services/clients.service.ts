import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';

import { REPOSITORY_TOKENS } from '../../../../common/constants/injection-tokens';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import type {
  ClientWithRelations,
  ClientsRepository
} from '../../domain/repositories/clients.repository';
import { CreateClientDto } from '../dto/create-client.dto';
import { ListClientsQueryDto } from '../dto/list-clients-query.dto';
import { UpdateClientDto } from '../dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @Inject(REPOSITORY_TOKENS.CLIENTS_REPOSITORY)
    private readonly clientsRepository: ClientsRepository,
    private readonly auditService: AuditService
  ) {}

  async create(dto: CreateClientDto, actor: JwtUserPayload): Promise<ClientWithRelations> {
    const existing = await this.clientsRepository.findByTaxId(dto.taxId);
    if (existing) {
      throw new ConflictException('CPF/CNPJ ja cadastrado');
    }

    const created = await this.clientsRepository.create({
      type: dto.type,
      name: dto.name,
      legalName: dto.legalName,
      taxId: dto.taxId,
      email: dto.email,
      phone: dto.phone,
      mobile: dto.mobile,
      contactName: dto.contactName,
      notes: dto.notes,
      active: dto.active,
      addresses: dto.addresses,
      contract: dto.contract
        ? {
            code: dto.contract.code,
            title: dto.contract.title,
            startDate: new Date(dto.contract.startDate),
            endDate: dto.contract.endDate ? new Date(dto.contract.endDate) : undefined,
            slaId: dto.contract.slaId,
            serviceScope: dto.contract.serviceScope
          }
        : undefined
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'CLIENT_CREATED',
      resource: 'client',
      resourceId: created.id,
      after: {
        type: created.type,
        name: created.name,
        taxId: created.taxId
      }
    });

    return created;
  }

  async findAll(query: ListClientsQueryDto): Promise<{
    items: ClientWithRelations[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { items, total } = await this.clientsRepository.findMany({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sort: query.sort,
      type: query.type,
      active: query.active
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

  async findById(id: string): Promise<ClientWithRelations> {
    const client = await this.clientsRepository.findById(id);
    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    return client;
  }

  async update(id: string, dto: UpdateClientDto, actor: JwtUserPayload): Promise<ClientWithRelations> {
    const existing = await this.clientsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    if (dto.taxId && dto.taxId !== existing.taxId) {
      const taxIdInUse = await this.clientsRepository.findByTaxId(dto.taxId);
      if (taxIdInUse) {
        throw new ConflictException('CPF/CNPJ ja cadastrado');
      }
    }

    const updated = await this.clientsRepository.update(id, {
      type: dto.type,
      name: dto.name,
      legalName: dto.legalName,
      taxId: dto.taxId,
      email: dto.email,
      phone: dto.phone,
      mobile: dto.mobile,
      contactName: dto.contactName,
      notes: dto.notes,
      active: dto.active,
      addresses: dto.addresses?.map((address) => ({
        label: address.label,
        street: address.street ?? '',
        number: address.number ?? '',
        complement: address.complement,
        district: address.district ?? '',
        city: address.city ?? '',
        state: address.state ?? '',
        zipCode: address.zipCode ?? '',
        country: address.country,
        isPrimary: address.isPrimary
      }))
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'CLIENT_UPDATED',
      resource: 'client',
      resourceId: updated.id,
      before: {
        name: existing.name,
        taxId: existing.taxId,
        active: existing.active
      },
      after: {
        name: updated.name,
        taxId: updated.taxId,
        active: updated.active
      }
    });

    return updated;
  }

  async remove(id: string, actor: JwtUserPayload): Promise<void> {
    const existing = await this.clientsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    await this.clientsRepository.softDelete(id);

    await this.auditService.register({
      actorId: actor.sub,
      action: 'CLIENT_SOFT_DELETED',
      resource: 'client',
      resourceId: id
    });
  }
}
