import type { ServiceOrderStatus } from './types';

export const serviceOrderStatusLabel: Record<ServiceOrderStatus, string> = {
  OPEN: 'Open',
  UNDER_ANALYSIS: 'Under analysis',
  WAITING_APPROVAL: 'Waiting approval',
  SCHEDULED: 'Scheduled',
  IN_TRANSIT: 'In transit',
  IN_PROGRESS: 'In progress',
  PAUSED: 'Paused',
  WAITING_PARTS: 'Waiting parts/material',
  WAITING_CUSTOMER: 'Waiting customer',
  COMPLETED: 'Completed',
  CANCELED: 'Canceled',
  REOPENED: 'Reopened'
};

export const serviceOrderStatusTone: Record<ServiceOrderStatus, 'blue' | 'orange' | 'green' | 'red' | 'gray'> = {
  OPEN: 'blue',
  UNDER_ANALYSIS: 'orange',
  WAITING_APPROVAL: 'orange',
  SCHEDULED: 'blue',
  IN_TRANSIT: 'blue',
  IN_PROGRESS: 'blue',
  PAUSED: 'orange',
  WAITING_PARTS: 'orange',
  WAITING_CUSTOMER: 'orange',
  COMPLETED: 'green',
  CANCELED: 'red',
  REOPENED: 'gray'
};

