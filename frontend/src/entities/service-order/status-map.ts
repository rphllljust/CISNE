import type { ServiceOrderStatus } from './types';

export const serviceOrderStatusLabel: Record<ServiceOrderStatus, string> = {
  OPEN: 'Aberto',
  UNDER_ANALYSIS: 'Em analise',
  WAITING_APPROVAL: 'Aguardando aprovacao',
  SCHEDULED: 'Agendado',
  IN_TRANSIT: 'Em transito',
  IN_PROGRESS: 'Em andamento',
  PAUSED: 'Pausado',
  WAITING_PARTS: 'Aguardando pecas/material',
  WAITING_CUSTOMER: 'Aguardando cliente',
  COMPLETED: 'Concluido',
  CANCELED: 'Cancelado',
  REOPENED: 'Reaberto'
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
