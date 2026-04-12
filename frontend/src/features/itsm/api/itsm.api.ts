import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { httpClient } from '@/shared/api/http-client';
import type { PaginatedResult } from '@/shared/types/pagination';

export type ProblemStatus = 'OPEN' | 'INVESTIGATING' | 'KNOWN_ERROR' | 'RESOLVED' | 'CLOSED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ChangeStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type ChangeType = 'STANDARD' | 'NORMAL' | 'EMERGENCY';

export interface ProblemRecord {
  id: string;
  title: string;
  description: string;
  status: ProblemStatus;
  riskLevel: RiskLevel;
  rootCause?: string;
  workaround?: string;
  resolvedAt?: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; name: string };
  changes?: ChangeRequest[];
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  type: ChangeType;
  status: ChangeStatus;
  riskLevel: RiskLevel;
  impact?: string;
  rollbackPlan?: string;
  scheduledAt?: string;
  implementedAt?: string;
  problemId?: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; name: string };
}

export interface ProblemsFilter { page?: number; limit?: number; search?: string; status?: string; }
export interface ChangesFilter { page?: number; limit?: number; search?: string; status?: string; type?: string; }

export interface CreateProblemInput {
  title: string;
  description: string;
  riskLevel?: RiskLevel;
  assignedToId?: string;
}

export interface CreateChangeInput {
  title: string;
  description: string;
  type: ChangeType;
  riskLevel?: RiskLevel;
  impact?: string;
  rollbackPlan?: string;
  scheduledAt?: string;
  problemId?: string;
  assignedToId?: string;
}

const KEYS = {
  problems: (p: object) => ['itsm', 'problems', p] as const,
  problemById: (id: string) => ['itsm', 'problems', id] as const,
  changes: (p: object) => ['itsm', 'changes', p] as const,
  changeById: (id: string) => ['itsm', 'changes', id] as const,
};

export function useProblems(filter: ProblemsFilter) {
  return useQuery({
    queryKey: KEYS.problems(filter),
    queryFn: async () => {
      const { data } = await httpClient.get<PaginatedResult<ProblemRecord>>('/itsm/problems', { params: filter });
      return data;
    }
  });
}

export function useProblemById(id: string) {
  return useQuery({
    queryKey: KEYS.problemById(id),
    queryFn: async () => {
      const { data } = await httpClient.get<ProblemRecord>(`/itsm/problems/${id}`);
      return data;
    },
    enabled: Boolean(id)
  });
}

export function useChanges(filter: ChangesFilter) {
  return useQuery({
    queryKey: KEYS.changes(filter),
    queryFn: async () => {
      const { data } = await httpClient.get<PaginatedResult<ChangeRequest>>('/itsm/changes', { params: filter });
      return data;
    }
  });
}

export function useChangeById(id: string) {
  return useQuery({
    queryKey: KEYS.changeById(id),
    queryFn: async () => {
      const { data } = await httpClient.get<ChangeRequest>(`/itsm/changes/${id}`);
      return data;
    },
    enabled: Boolean(id)
  });
}

export function useCreateProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProblemInput) => {
      const { data } = await httpClient.post<ProblemRecord>('/itsm/problems', payload);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['itsm', 'problems'] })
  });
}

export function useUpdateProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateProblemInput> & { id: string; status?: ProblemStatus; rootCause?: string; workaround?: string }) => {
      const { data } = await httpClient.patch<ProblemRecord>(`/itsm/problems/${id}`, payload);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['itsm'] })
  });
}

export function useCreateChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateChangeInput) => {
      const { data } = await httpClient.post<ChangeRequest>('/itsm/changes', payload);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['itsm', 'changes'] })
  });
}

export function useUpdateChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateChangeInput> & { id: string; status?: ChangeStatus }) => {
      const { data } = await httpClient.patch<ChangeRequest>(`/itsm/changes/${id}`, payload);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['itsm'] })
  });
}
