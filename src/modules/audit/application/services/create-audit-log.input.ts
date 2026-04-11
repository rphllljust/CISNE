export interface CreateAuditLogInput {
  actorId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  severity?: 'INFO' | 'WARN' | 'ERROR';
}
