export type ServiceOrderStatus =
  | 'OPEN'
  | 'UNDER_ANALYSIS'
  | 'WAITING_APPROVAL'
  | 'SCHEDULED'
  | 'IN_TRANSIT'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'WAITING_PARTS'
  | 'WAITING_CUSTOMER'
  | 'COMPLETED'
  | 'CANCELED'
  | 'REOPENED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ServiceOrderStatusHistoryItem {
  id: string;
  fromStatus: ServiceOrderStatus | null;
  toStatus: ServiceOrderStatus;
  reason: string | null;
  changedById: string;
  changedAt: string;
}

export interface ServiceOrder {
  id: string;
  orderNumber: number;
  clientId: string;
  serviceTypeId: string;
  title: string;
  description: string;
  priority: Priority;
  status: ServiceOrderStatus;
  openedAt: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  slaDueAt: string | null;
  slaBreached: boolean;
  assignedTechnicianId: string | null;
  assignedTeamId: string | null;
  statusHistory: ServiceOrderStatusHistoryItem[];
}


