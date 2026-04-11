import type { AuthUser } from '@/entities/auth/types';
import { httpClient, publicClient } from '@/shared/api/http-client';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<AuthUser, 'permissions'>;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export const authApi = {
  async login(payload: LoginInput): Promise<LoginResponse> {
    const { data } = await publicClient.post<LoginResponse>('/auth/login', payload);
    return data;
  },

  async refresh(payload: RefreshInput): Promise<{ accessToken: string; refreshToken: string }> {
    const { data } = await publicClient.post<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      payload
    );
    return data;
  },

  async forgotPassword(payload: ForgotPasswordInput): Promise<{ message: string }> {
    const { data } = await publicClient.post<{ message: string }>('/auth/forgot-password', payload);
    return data;
  },

  async resetPassword(payload: ResetPasswordInput): Promise<{ message: string }> {
    const { data } = await publicClient.post<{ message: string }>('/auth/reset-password', payload);
    return data;
  },

  async logout(refreshToken?: string): Promise<{ message: string }> {
    const { data } = await httpClient.post<{ message: string }>('/auth/logout', { refreshToken });
    return data;
  },

  async me(): Promise<AuthUser> {
    const { data } = await httpClient.get<AuthUser>('/auth/me');
    return data;
  }
};


