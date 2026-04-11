import { useQuery } from '@tanstack/react-query';

import type { Client, ClientDetail, ClientType } from '@/entities/client/types';
import { httpClient } from '@/shared/api/http-client';
import { queryKeys } from '@/shared/constants/query-keys';
import type { PaginatedResult } from '@/shared/types/pagination';

export interface ClientsFilter {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
}

export interface CreateClientInput {
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
  addresses?: Array<{
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
  }>;
}

export interface UpdateClientInput {
  name?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  contactName?: string;
  notes?: string;
  active?: boolean;
}

export function useClients(filter: ClientsFilter) {
  return useQuery({
    queryKey: queryKeys.clients(filter),
    queryFn: async () => {
      const { data } = await httpClient.get<PaginatedResult<Client>>('/clients', { params: filter });
      return data;
    }
  });
}

export function useClientById(id: string) {
  return useQuery({
    queryKey: queryKeys.clientById(id),
    queryFn: async () => {
      const { data } = await httpClient.get<ClientDetail>(`/clients/${id}`);
      return data;
    },
    enabled: Boolean(id)
  });
}

export async function createClient(payload: CreateClientInput): Promise<Client> {
  const { data } = await httpClient.post<Client>('/clients', payload);
  return data;
}

export async function updateClient(id: string, payload: UpdateClientInput): Promise<Client> {
  const { data } = await httpClient.patch<Client>(`/clients/${id}`, payload);
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  await httpClient.delete(`/clients/${id}`);
}

