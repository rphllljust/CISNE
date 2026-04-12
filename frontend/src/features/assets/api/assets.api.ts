import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { httpClient } from '@/shared/api/http-client';
import type { PaginatedResult } from '@/shared/types/pagination';

export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';
export type AssetCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION' | 'CALIBRATION';
export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Asset {
  id: string;
  name: string;
  assetTag: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  status: AssetStatus;
  condition: AssetCondition;
  location?: string;
  purchaseDate?: string;
  warrantyExpiresAt?: string;
  nextMaintenanceAt?: string;
  supplierId?: string;
  clientId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; name: string };
  client?: { id: string; name: string };
  maintenances?: AssetMaintenance[];
}

export interface AssetMaintenance {
  id: string;
  assetId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  scheduledAt: string;
  completedAt?: string;
  technicianId?: string;
  cost?: number;
  notes?: string;
  createdAt: string;
}

export interface AssetsFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  condition?: string;
}

export interface CreateAssetInput {
  name: string;
  assetTag: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  location?: string;
  purchaseDate?: string;
  warrantyExpiresAt?: string;
  supplierId?: string;
  clientId?: string;
  notes?: string;
}

export interface CreateMaintenanceInput {
  type: MaintenanceType;
  description: string;
  scheduledAt: string;
  technicianId?: string;
  cost?: number;
  notes?: string;
}

const KEYS = {
  list: (p: object) => ['assets', p] as const,
  detail: (id: string) => ['assets', id] as const,
};

export function useAssets(filter: AssetsFilter) {
  return useQuery({
    queryKey: KEYS.list(filter),
    queryFn: async () => {
      const { data } = await httpClient.get<PaginatedResult<Asset>>('/assets', { params: filter });
      return data;
    }
  });
}

export function useAssetById(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await httpClient.get<Asset>(`/assets/${id}`);
      return data;
    },
    enabled: Boolean(id)
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAssetInput) => {
      const { data } = await httpClient.post<Asset>('/assets', payload);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['assets'] })
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateAssetInput> & { id: string }) => {
      const { data } = await httpClient.patch<Asset>(`/assets/${id}`, payload);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['assets'] })
  });
}

export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, ...payload }: CreateMaintenanceInput & { assetId: string }) => {
      const { data } = await httpClient.post<AssetMaintenance>(`/assets/${assetId}/maintenance`, payload);
      return data;
    },
    onSuccess: (_d, vars) => void qc.invalidateQueries({ queryKey: ['assets', vars.assetId] })
  });
}
