import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';

import { markNotificationAsRead, useNotifications } from '@/features/notifications/api/notifications.api';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { queryKeys } from '@/shared/constants/query-keys';
import { appRoutes } from '@/shared/constants/routes';
import { formatDateTime } from '@/shared/lib/date';
import { Alert, Breadcrumbs, Button, Card, EmptyState, PageHeader, Skeleton } from '@/shared/ui';
import { useToastStore } from '@/shared/ui/toast';

import '../pages.css';

export function NotificationsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const notificationsQuery = useNotifications();

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications({ page: 1, limit: 20 }) });
    },
    onError: (error) => {
      pushToast({ type: 'error', message: getApiErrorMessage(error) });
    }
  });

  const items = notificationsQuery.data?.items ?? [];
  const unreadCount = items.filter((n) => n.status !== 'READ').length;

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Inbox"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', to: appRoutes.dashboard },
              { label: 'Notifications' }
            ]}
          />
        }
        title="Notification center"
        subtitle="Live operation updates, SLA warnings and service status events."
        actions={
          unreadCount > 0 ? (
            <span className="priority-badge priority-medium">{unreadCount} unread</span>
          ) : null
        }
      />

      {notificationsQuery.isLoading ? (
        <div className="page-grid">
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </div>
      ) : notificationsQuery.isError ? (
        <Alert
          variant="danger"
          title="Notifications unavailable"
          message={getApiErrorMessage(notificationsQuery.error)}
          action={
            <Button variant="secondary" size="sm" onClick={() => void notificationsQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <Card>
          {items.length === 0 ? (
            <EmptyState
              icon={<Bell size={18} />}
              title="No notifications"
              description="New operation alerts will appear here."
            />
          ) : (
            <div className="notification-feed">
              {items.map((item) => {
                const isUnread = item.status !== 'READ';
                return (
                  <article key={item.id} className={`notification-item${isUnread ? ' notification-item-unread' : ''}`}>
                    <span className={`notification-dot${isUnread ? '' : ' notification-dot-read'}`} />
                    <div className="notification-body">
                      <p className="notification-title">{item.title}</p>
                      <p className="notification-message">{item.message}</p>
                      <span className="notification-time">{formatDateTime(item.createdAt)}</span>
                    </div>
                    {isUnread ? (
                      <div className="notification-actions">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={markReadMutation.isPending}
                          onClick={() => markReadMutation.mutate(item.id)}
                        >
                          Mark as read
                        </Button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </section>
  );
}

