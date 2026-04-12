import { useQuery } from '@tanstack/react-query';

import type { Priority, ServiceOrderStatus } from '@/entities/service-order/types';
import { httpClient } from '@/shared/api/http-client';
import { queryKeys } from '@/shared/constants/query-keys';

export interface ReportsFilter {
  startDate?: string;
  endDate?: string;
  status?: ServiceOrderStatus;
  priority?: Priority;
  teamId?: string;
  technicianId?: string;
  clientId?: string;
  search?: string;
}

export interface ReportsDashboardResponse {
  totals: {
    total: number;
    completed: number;
    canceled: number;
    inProgress: number;
  };
  kpis: {
    slaComplianceRate: number;
    reworkRate: number;
    averageResponseMinutes: number;
    durationAccuracyPercent: number;
  };
  byStatus: Array<{
    status: ServiceOrderStatus;
    total: number;
  }>;
}

export interface TechnicianEfficiencyResponse {
  technician?: {
    id: string;
    fullName: string;
    email: string;
  };
  message?: string;
  totals: {
    totalOrders: number;
    completedOrders: number;
    reworkCount: number;
    breachedOrders: number;
  };
  kpis: {
    averageCompletionMinutes: number;
    slaCompliancePercent: number;
  };
}

export function useReportsDashboard(filter: ReportsFilter) {
  return useQuery({
    queryKey: queryKeys.reportsDashboard(filter),
    queryFn: async () => {
      const { data } = await httpClient.get<ReportsDashboardResponse>('/reports/dashboard', {
        params: filter
      });
      return data;
    }
  });
}

export function useTechnicianEfficiency(technicianId: string, filter: ReportsFilter) {
  return useQuery({
    queryKey: queryKeys.reportsTechnicianEfficiency(technicianId, filter),
    queryFn: async () => {
      const { data } = await httpClient.get<TechnicianEfficiencyResponse>(
        `/reports/technicians/${technicianId}/efficiency`,
        { params: filter }
      );
      return data;
    },
    enabled: Boolean(technicianId)
  });
}

export async function exportServiceOrdersCsv(filter: ReportsFilter): Promise<string> {
  const { data } = await httpClient.get<string>('/reports/service-orders/export.csv', {
    params: filter,
    responseType: 'text'
  });
  return data;
}
