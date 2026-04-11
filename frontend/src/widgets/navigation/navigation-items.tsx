import {
  Bell,
  Building2,
  Calendar,
  ClipboardList,
  FileBarChart2,
  Gauge,
  Settings2,
  ShieldCheck,
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
  {
    label: 'Dashboard',
    path: appRoutes.dashboard,
    icon: Gauge
  },
  {
    label: 'Service Orders',
    path: appRoutes.serviceOrders,
    icon: ClipboardList,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT'],
    section: 'OPERATIONS'
  },
  {
    label: 'Clients',
    path: appRoutes.clients,
    icon: Building2,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT'],
    section: 'OPERATIONS'
  },
  {
    label: 'Scheduling',
    path: appRoutes.schedules,
    icon: Calendar,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN'],
    section: 'OPERATIONS'
  },
  {
    label: 'Reports',
    path: appRoutes.reports,
    icon: FileBarChart2,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'],
    section: 'OPERATIONS'
  },
  {
    label: 'Notifications',
    path: appRoutes.notifications,
    icon: Bell,
    section: 'OPERATIONS'
  },
  {
    label: 'Users and Teams',
    path: appRoutes.users,
    icon: UserCog,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'],
    section: 'ADMIN'
  },
  {
    label: 'Audit',
    path: appRoutes.audit,
    icon: ShieldCheck,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER'],
    section: 'ADMIN'
  },
  {
    label: 'Settings',
    path: appRoutes.settings,
    icon: Settings2,
    roles: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'],
    section: 'ADMIN'
  }
];

