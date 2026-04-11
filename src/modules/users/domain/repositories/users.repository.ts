import type { UserStatus } from '@prisma/client';

export interface FindUsersParams {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  status?: UserStatus;
  role?: string;
}

export interface CreateUserRepositoryInput {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  jobTitle?: string;
  department?: string;
  status?: UserStatus;
  roleNames?: string[];
  teamIds?: string[];
}

export interface UpdateUserRepositoryInput {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  jobTitle?: string;
  department?: string;
  status?: UserStatus;
  passwordHash?: string;
  roleNames?: string[];
  teamIds?: string[];
}

export interface UserWithAccess {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  department: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  roles: string[];
  teamIds: string[];
}

export interface UsersRepository {
  findById(id: string): Promise<UserWithAccess | null>;
  findByEmail(email: string): Promise<UserWithAccess | null>;
  findMany(params: FindUsersParams): Promise<{ items: UserWithAccess[]; total: number }>;
  create(input: CreateUserRepositoryInput): Promise<UserWithAccess>;
  update(id: string, input: UpdateUserRepositoryInput): Promise<UserWithAccess>;
  softDelete(id: string): Promise<void>;
}
