import { QueryCache, QueryClient } from '@tanstack/react-query';

import { getApiErrorMessage, getApiErrorStatus, isNetworkOrTimeoutError } from '@/shared/lib/api-error';
import { useToastStore } from '@/shared/ui/toast/toast.store';

function isNetworkError(error: unknown): boolean {
  return (
    isNetworkOrTimeoutError(error) ||
    (error instanceof Error &&
      (error.message.includes('Network Error') || error.message.includes('Failed to fetch')))
  );
}

function shouldRetry(failCount: number, error: unknown): boolean {
  const status = getApiErrorStatus(error);
  if (status && status >= 400 && status < 500) {
    return false;
  }

  const maxRetries = isNetworkError(error) ? 2 : 1;
  return failCount < maxRetries;
}

function handleGlobalQueryError(error: unknown): void {
  const status = getApiErrorStatus(error);

  if (status === 403) {
    useToastStore.getState().push({
      type: 'error',
      message: 'Access denied. You do not have permission to view this resource.'
    });
    return;
  }

  if (status && status >= 500) {
    useToastStore.getState().push({
      type: 'error',
      message: getApiErrorMessage(error)
    });
    return;
  }

  if (isNetworkOrTimeoutError(error)) {
    useToastStore.getState().push({
      type: 'error',
      message: getApiErrorMessage(error)
    });
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleGlobalQueryError
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: shouldRetry,
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    },
    mutations: {
      retry: 0
    }
  }
});
