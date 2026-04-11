import type { UserRole } from '@/entities/auth/types';

export interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  jobTitle: string | null;
  department: string | null;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail extends UserItem {
  avatarUrl: string | null;
  teamIds: string[];
}

