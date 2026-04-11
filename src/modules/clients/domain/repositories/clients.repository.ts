import type { ClientType } from '@prisma/client';

export interface FindClientsParams {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  type?: ClientType;
  active?: boolean;
}

export interface ClientAddressInput {
  label?: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  isPrimary?: boolean;
}

export interface ClientContractInput {
  code: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  slaId?: string;
  serviceScope?: string;
}

export interface CreateClientRepositoryInput {
  type: ClientType;
  name: string;
  legalName?: string;
  taxId: string;
  email?: string;
  phone?: string;
  mobile?: string;
  contactName?: string;
  notes?: string;
  active?: boolean;
  addresses?: ClientAddressInput[];
  contract?: ClientContractInput;
}

export interface UpdateClientRepositoryInput {
  type?: ClientType;
  name?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  contactName?: string;
  notes?: string;
  active?: boolean;
  addresses?: ClientAddressInput[];
}

export interface ClientWithRelations {
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
  addresses: ClientAddressInput[];
  contracts: Array<{
    id: string;
    code: string;
    title: string;
    status: string;
    startDate: Date;
    endDate: Date | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientsRepository {
  findById(id: string): Promise<ClientWithRelations | null>;
  findByTaxId(taxId: string): Promise<ClientWithRelations | null>;
  findMany(params: FindClientsParams): Promise<{ items: ClientWithRelations[]; total: number }>;
  create(input: CreateClientRepositoryInput): Promise<ClientWithRelations>;
  update(id: string, input: UpdateClientRepositoryInput): Promise<ClientWithRelations>;
  softDelete(id: string): Promise<void>;
}
