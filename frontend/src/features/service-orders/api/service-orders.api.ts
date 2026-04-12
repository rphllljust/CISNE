import { useQuery } from '@tanstack/react-query';

import type { ServiceOrder } from '@/entities/service-order/types';
import { httpClient } from '@/shared/api/http-client';
import type { PaginatedResult } from '@/shared/types/pagination';
import { queryKeys } from '@/shared/constants/query-keys';

export interface ServiceOrdersFilter {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
  assignedTechnicianId?: string;
}

export interface CreateServiceOrderInput {
  clientId: string;
  serviceTypeId: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTechnicianId?: string;
  assignedTeamId?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
}

export interface UpdateServiceOrderInput {
  title?: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTechnicianId?: string;
  assignedTeamId?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  internalNotes?: string;
  customerNotes?: string;
}

export interface ScheduleServiceOrderInput {
  scheduledStart: string;
  scheduledEnd: string;
  technicianId?: string;
  teamId?: string;
  notes?: string;
  rescheduledFromId?: string;
}

export async function createServiceOrder(payload: CreateServiceOrderInput): Promise<ServiceOrder> {
  const { data } = await httpClient.post<ServiceOrder>('/service-orders', payload);
  return data;
}

export async function updateServiceOrder(
  id: string,
  payload: UpdateServiceOrderInput
): Promise<ServiceOrder> {
  const { data } = await httpClient.patch<ServiceOrder>(`/service-orders/${id}`, payload);
  return data;
}

export async function transitionServiceOrderStatus(
  serviceOrderId: string,
  toStatus: string,
  reason?: string
): Promise<ServiceOrder> {
  const { data } = await httpClient.post<ServiceOrder>(
    `/service-orders/${serviceOrderId}/transition-status`,
    { toStatus, reason }
  );
  return data;
}

export async function scheduleServiceOrder(
  id: string,
  payload: ScheduleServiceOrderInput
): Promise<ServiceOrder> {
  const { data } = await httpClient.post<ServiceOrder>(`/service-orders/${id}/schedule`, payload);
  return data;
}

export async function checkInServiceOrder(id: string, at?: string): Promise<ServiceOrder> {
  const { data } = await httpClient.post<ServiceOrder>(`/service-orders/${id}/check-in`, {
    at: at ?? new Date().toISOString()
  });
  return data;
}

export async function checkOutServiceOrder(id: string, at?: string): Promise<ServiceOrder> {
  const { data } = await httpClient.post<ServiceOrder>(`/service-orders/${id}/check-out`, {
    at: at ?? new Date().toISOString()
  });
  return data;
}

/** @deprecated Use useAllowedTransitions hook instead */
export async function getAllowedTransitions(serviceOrderStatus: string): Promise<string[]> {
  const { data } = await httpClient.get<{ status: string; allowedTransitions: string[] }>(
    `/service-orders/meta/allowed-transitions/${serviceOrderStatus}`
  );
  return data.allowedTransitions;
}

export function useAllowedTransitions(serviceOrderStatus: string) {
  return useQuery({
    queryKey: ['service-orders', 'meta', 'allowed-transitions', serviceOrderStatus],
    queryFn: async () => {
      const { data } = await httpClient.get<{ status: string; allowedTransitions: string[] }>(
        `/service-orders/meta/allowed-transitions/${serviceOrderStatus}`
      );
      return data.allowedTransitions;
    },
    enabled: Boolean(serviceOrderStatus),
    staleTime: 5 * 60_000
  });
}

export function useServiceOrders(filter: ServiceOrdersFilter) {
  return useQuery({
    queryKey: queryKeys.serviceOrders(filter),
    queryFn: async () => {
      const { data } = await httpClient.get<PaginatedResult<ServiceOrder>>('/service-orders', {
        params: filter
      });
      return data;
    }
  });
}

export function useServiceOrderById(id: string) {
  return useQuery({
    queryKey: queryKeys.serviceOrderById(id),
    queryFn: async () => {
      const { data } = await httpClient.get<ServiceOrder>(`/service-orders/${id}`);
      return data;
    },
    enabled: Boolean(id)
  });
}


