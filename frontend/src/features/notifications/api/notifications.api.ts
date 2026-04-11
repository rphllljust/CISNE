import { useQuery } from '@tanstack/react-query';

import { httpClient } from '@/shared/api/http-client';
import { queryKeys } from '@/shared/constants/query-keys';
import type { PaginatedResult } from '@/shared/types/pagination';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  createdAt: string;
}

export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.notifications({ page, limit }),
    queryFn: async () => {
      const { data } = await httpClient.get<PaginatedResult<NotificationItem>>('/notifications/me', {
        params: { page, limit }
      });
      return data;
    }
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await httpClient.patch('/notifications/me/read', { notificationId });
}


