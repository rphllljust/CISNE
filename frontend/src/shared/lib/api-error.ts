import type { AxiosError } from 'axios';

export interface ApiErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error: string;
}

const statusMessages: Record<number, string> = {
  400: 'Invalid request.',
  401: 'Session expired. Please login again.',
  403: 'Access denied. You do not have permission for this action.',
  404: 'Resource not found.',
  409: 'Conflict: resource already exists.',
  422: 'Validation failed. Please review submitted data.',
  429: 'Too many requests. Please try again shortly.',
  500: 'Internal server error. Please try again in a moment.',
  502: 'Service unavailable. Please try again.',
  503: 'Service temporarily unavailable.',
  504: 'Request timeout. Check your network and retry.'
};

export function getApiErrorStatus(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    return status ?? null;
  }

  return null;
}

export function isNetworkOrTimeoutError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: string }).code;
    return code === 'ECONNABORTED' || code === 'ERR_NETWORK' || code === 'ECONNREFUSED';
  }

  return false;
}

export function getApiErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: string }).code;

    if (code === 'ECONNABORTED') {
      return 'Request timeout. Check your connection and try again.';
    }

    if (code === 'ERR_NETWORK' || code === 'ECONNREFUSED') {
      return 'Unable to reach server. Verify network and backend status.';
    }
  }

  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const status = axiosError.response?.status;
    const message = axiosError.response?.data?.message;

    if (Array.isArray(message)) {
      const firstMessage = message.find((item) => typeof item === 'string' && item.trim().length > 0);
      if (firstMessage) {
        return firstMessage;
      }
    }

    if (typeof message === 'string' && message.length > 0) {
      return message;
    }

    if (status && statusMessages[status]) {
      return statusMessages[status];
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error. Please try again.';
}

