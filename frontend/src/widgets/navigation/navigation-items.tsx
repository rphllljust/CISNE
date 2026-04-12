import {
  Bell,
  BookOpen,
  Building2,
  Calendar,
  ClipboardList,
  FileBarChart2,
  FileText,
  Gauge,
  GitPullRequest,
  Package,
  Settings2,
  ShieldCheck,
  Truck,
  UserCog
} from 'lucide-react';

import type { UserRole } from '@/entities/auth/types';
import { appRoutes } from '@/shared/constants/routes';

export interface NavigationItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number }>;
  roles?: UserRole[];
  section?: 'OPERATIONS' | 'ADMIN';
}

export const navigationItems: NavigationItem[] = [
  { label: 'Painel', path: appRoutes.dashboard, icon: Gauge },
  {
    label: 'Ordens de Servico',
    path: appRoutes.serviceOrders,
    icon: ClipboardList,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT'],
    section: 'OPERATIONS'
  },
  {
    label: 'Clientes',
    path: appRoutes.clients,
    icon: Building2,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT'],
    section: 'OPERATIONS'
  },
  {
    label: 'Agenda',
    path: appRoutes.schedules,
    icon: Calendar,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN'],
    section: 'OPERATIONS'
  },
  {
    label: 'Relatorios',
    path: appRoutes.reports,
    icon: FileBarChart2,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'],
    section: 'OPERATIONS'
  },
  {
    label: 'Notas Fiscais',
    path: appRoutes.invoices,
    icon: FileText,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'],
    section: 'OPERATIONS'
  },
  {
    label: 'Ativos',
    path: appRoutes.assets,
    icon: Package,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN'],
    section: 'OPERATIONS'
  },
  {
    label: 'Fornecedores',
    path: appRoutes.suppliers,
    icon: Truck,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'],
    section: 'OPERATIONS'
  },
  {
    label: 'Problemas',
    path: appRoutes.itsmProblems,
    icon: GitPullRequest,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'],
    section: 'OPERATIONS'
  },
  {
    label: 'Mudancas',
    path: appRoutes.itsmChanges,
    icon: GitPullRequest,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'],
    section: 'OPERATIONS'
  },
  {
    label: 'Base de Conhecimento',
    path: appRoutes.knowledgeBase,
    icon: BookOpen,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT'],
    section: 'OPERATIONS'
  },
  { label: 'Notificacoes', path: appRoutes.notifications, icon: Bell, section: 'OPERATIONS' },
  {
    label: 'Usuarios e Equipes',
    path: appRoutes.users,
    icon: UserCog,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'],
    section: 'ADMIN'
  },
  {
    label: 'Auditoria',
    path: appRoutes.audit,
    icon: ShieldCheck,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER'],
    section: 'ADMIN'
  },
  {
    label: 'Configuracoes',
    path: appRoutes.settings,
    icon: Settings2,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'],
    section: 'ADMIN'
  }
];
