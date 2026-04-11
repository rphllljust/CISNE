import { storageKeys } from '@/shared/constants/storage-keys';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(storageKeys.accessToken);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(storageKeys.refreshToken);
  },
  setTokens(tokens: SessionTokens): void {
    localStorage.setItem(storageKeys.accessToken, tokens.accessToken);
    localStorage.setItem(storageKeys.refreshToken, tokens.refreshToken);
  },
  clearTokens(): void {
    localStorage.removeItem(storageKeys.accessToken);
    localStorage.removeItem(storageKeys.refreshToken);
  }
};


