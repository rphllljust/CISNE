import { useQuery } from '@tanstack/react-query';

import type { DashboardOverview } from '@/entities/dashboard/types';
import { httpClient } from '@/shared/api/http-client';
import { queryKeys } from '@/shared/constants/query-keys';

export interface DashboardFilter {
  startDate?: string;
  endDate?: string;
}

async function fetchDashboardOverview(filter: DashboardFilter): Promise<DashboardOverview> {
  const { data } = await httpClient.get<DashboardOverview>('/dashboard/overview', {
    params: filter
  });

  return data;
}

export function useDashboardOverview(filter: DashboardFilter) {
  return useQuery({
    queryKey: queryKeys.dashboardOverview(filter),
    queryFn: () => fetchDashboardOverview(filter)
  });
}


