import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { httpClient } from '@/shared/api/http-client';
import type { PaginatedResult } from '@/shared/types/pagination';

export type ArticleStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  status: ArticleStatus;
  version: number;
  tags?: string[];
  authorId: string;
  author?: { id: string; name: string };
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticlesFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface CreateArticleInput {
  title: string;
  content: string;
  tags?: string[];
}

const KEYS = {
  list: (p: object) => ['knowledge-base', p] as const,
  detail: (id: string) => ['knowledge-base', id] as const,
};

export function useArticles(filter: ArticlesFilter) {
  return useQuery({
    queryKey: KEYS.list(filter),
    queryFn: async () => {
      const { data } = await httpClient.get<PaginatedResult<KnowledgeArticle>>('/knowledge-base/articles', { params: filter });
      return data;
    }
  });
}

export function useArticleById(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await httpClient.get<KnowledgeArticle>(`/knowledge-base/articles/${id}`);
      return data;
    },
    enabled: Boolean(id)
  });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateArticleInput) => {
      const { data } = await httpClient.post<KnowledgeArticle>('/knowledge-base/articles', payload);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['knowledge-base'] })
  });
}

export function useUpdateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateArticleInput> & { id: string; status?: ArticleStatus }) => {
      const { data } = await httpClient.patch<KnowledgeArticle>(`/knowledge-base/articles/${id}`, payload);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['knowledge-base'] })
  });
}
