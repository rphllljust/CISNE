import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { httpClient } from '@/shared/api/http-client';
import type { PaginatedResult } from '@/shared/types/pagination';

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';

export interface Supplier {
  id: string;
  name: string;
  taxId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  contracts?: SupplierContract[];
}

export interface SupplierContract {
  id: string;
  supplierId: string;
  title: string;
  status: ContractStatus;
  startDate: string;
  endDate?: string;
  value?: number;
  renewalAlertDays?: number;
  notes?: string;
  createdAt: string;
}

export interface SuppliersFilter {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
}

export interface CreateSupplierInput {
  name: string;
  taxId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
}

const KEYS = {
  list: (p: object) => ['suppliers', p] as const,
  detail: (id: string) => ['suppliers', id] as const,
};

export function useSuppliers(filter: SuppliersFilter) {
  return useQuery({
    queryKey: KEYS.list(filter),
    queryFn: async () => {
      const { data } = await httpClient.get<PaginatedResult<Supplier>>('/suppliers', { params: filter });
      return data;
    }
  });
}

export function useSupplierById(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await httpClient.get<Supplier>(`/suppliers/${id}`);
      return data;
    },
    enabled: Boolean(id)
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSupplierInput) => {
      const { data } = await httpClient.post<Supplier>('/suppliers', payload);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['suppliers'] })
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateSupplierInput> & { id: string }) => {
      const { data } = await httpClient.patch<Supplier>(`/suppliers/${id}`, payload);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['suppliers'] })
  });
}
