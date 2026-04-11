import { useQuery } from '@tanstack/react-query';

import { httpClient } from '@/shared/api/http-client';
import { queryKeys } from '@/shared/constants/query-keys';
import type { PaginatedResult } from '@/shared/types/pagination';

export interface AuditLogItem {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  severity: string;
  createdAt: string;
  actor: { id: string; fullName: string; email: string } | null;
}

export interface AuditLogFilter {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
}

export function useAuditLogs(filter: AuditLogFilter) {
  return useQuery({
    queryKey: queryKeys.auditLogs(filter),
    queryFn: async () => {
      const { data } = await httpClient.get<PaginatedResult<AuditLogItem>>('/audit-logs', {
        params: filter
      });
      return data;
    }
  });
}


