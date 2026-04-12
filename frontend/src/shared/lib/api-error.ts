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
  400: 'Requisicao invalida.',
  401: 'Sessao expirada. Faca login novamente.',
  403: 'Acesso negado. Voce nao tem permissao para esta acao.',
  404: 'Recurso nao encontrado.',
  409: 'Conflito: recurso ja existe.',
  422: 'Validacao falhou. Revise os dados enviados.',
  429: 'Muitas requisicoes. Tente novamente em instantes.',
  500: 'Erro interno do servidor. Tente novamente em instantes.',
  502: 'Servico indisponivel. Tente novamente.',
  503: 'Servico temporariamente indisponivel.',
  504: 'Tempo limite da requisicao. Verifique sua rede e tente novamente.'
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
      return 'Tempo limite da requisicao. Verifique sua conexao e tente novamente.';
    }

    if (code === 'ERR_NETWORK' || code === 'ECONNREFUSED') {
      return 'Nao foi possivel acessar o servidor. Verifique a rede e o status do backend.';
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

  return 'Erro inesperado. Tente novamente.';
}
