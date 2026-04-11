export type UserRole =
  | 'SUPER_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'SUPERVISOR'
  | 'TECHNICIAN'
  | 'ATTENDANT'
  | 'CLIENT';

export interface AuthUser {
  sub: string;
  email: string;
  fullName: string;
  status: 'ACTIVE' | 'INACTIVE';
  roles: UserRole[];
  permissions: string[];
}

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';


