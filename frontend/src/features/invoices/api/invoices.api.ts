import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { httpClient } from '@/shared/api/http-client';
import type { PaginatedResult } from '@/shared/types/pagination';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  serviceOrderId: string;
  clientId: string;
  status: InvoiceStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  issuedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  serviceOrder?: {
    id: string;
    orderNumber: number;
    title: string;
  };
  client?: {
    id: string;
    name: string;
    taxId?: string;
  };
}

export interface InvoicesFilter {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface EmitInvoiceInput {
  serviceOrderId: string;
  discount?: number;
  tax?: number;
  notes?: string;
  dueDate?: string;
}

export interface CancelInvoiceInput {
  reason: string;
}

const KEYS = {
  list: (p: object) => ['invoices', p] as const,
  detail: (id: string) => ['invoices', id] as const,
};

export function useInvoices(filter: InvoicesFilter) {
  return useQuery({
    queryKey: KEYS.list(filter),
    queryFn: async () => {
      const { data } = await httpClient.get<PaginatedResult<Invoice>>('/invoices', { params: filter });
      return data;
    }
  });
}

export function useInvoiceById(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await httpClient.get<Invoice>(`/invoices/${id}`);
      return data;
    },
    enabled: Boolean(id)
  });
}

export function useEmitInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EmitInvoiceInput) => {
      const { data } = await httpClient.post<Invoice>('/invoices/emit', payload);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: CancelInvoiceInput & { id: string }) => {
      const { data } = await httpClient.post<Invoice>(`/invoices/${id}/cancel`, payload);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}
