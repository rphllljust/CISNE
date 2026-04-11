export const queryKeys = {
  authMe: ['auth', 'me'] as const,
  dashboardOverview: (params: object) => ['dashboard', 'overview', params] as const,
  serviceOrders: (params: object) => ['service-orders', params] as const,
  serviceOrderById: (id: string) => ['service-orders', id] as const,
  clients: (params: object) => ['clients', params] as const,
  clientById: (id: string) => ['clients', id] as const,
  users: (params: object) => ['users', params] as const,
  userById: (id: string) => ['users', id] as const,
  notifications: (params: object) => ['notifications', params] as const,
  auditLogs: (params: object) => ['audit-logs', params] as const
};

