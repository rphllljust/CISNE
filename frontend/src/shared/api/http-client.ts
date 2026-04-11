import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

import { env } from '@/shared/config/env';
import { tokenStorage } from '@/shared/lib/token-storage';

type RetryableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

const authFreePaths = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

export const publicClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20_000
});

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20_000
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const { data } = await publicClient.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { refreshToken }
      );

      tokenStorage.setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      });

      return data.accessToken;
    } catch {
      tokenStorage.clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestPath = originalRequest?.url ?? '';

    const isAuthFree = authFreePaths.some((path) => requestPath.includes(path));
    const isUnauthorized = error.response?.status === 401;

    if (!originalRequest || !isUnauthorized || originalRequest._retry || isAuthFree) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const newAccessToken = await refreshAccessToken();

    if (!newAccessToken) {
      tokenStorage.clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    originalRequest.headers = {
      ...originalRequest.headers,
      Authorization: `Bearer ${newAccessToken}`
    };

    return httpClient(originalRequest);
  }
);


