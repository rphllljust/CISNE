import { useQuery } from '@tanstack/react-query';

import type { UserRole } from '@/entities/auth/types';
import type { UserDetail, UserItem } from '@/entities/user/types';
import { httpClient } from '@/shared/api/http-client';
import { queryKeys } from '@/shared/constants/query-keys';
import type { PaginatedResult } from '@/shared/types/pagination';

export interface UsersFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  roleNames?: UserRole[];
  teamIds?: string[];
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  roleNames?: UserRole[];
  teamIds?: string[];
}

export function useUsers(filter: UsersFilter) {
  return useQuery({
    queryKey: queryKeys.users(filter),
    queryFn: async () => {
      const { data } = await httpClient.get<PaginatedResult<UserItem>>('/users', { params: filter });
      return data;
    }
  });
}

export function useUserById(id: string) {
  return useQuery({
    queryKey: queryKeys.userById(id),
    queryFn: async () => {
      const { data } = await httpClient.get<UserDetail>(`/users/${id}`);
      return data;
    },
    enabled: Boolean(id)
  });
}

export async function createUser(payload: CreateUserInput): Promise<UserItem> {
  const { data } = await httpClient.post<UserItem>('/users', payload);
  return data;
}

export async function updateUser(id: string, payload: UpdateUserInput): Promise<UserItem> {
  const { data } = await httpClient.patch<UserItem>(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await httpClient.delete(`/users/${id}`);
}

