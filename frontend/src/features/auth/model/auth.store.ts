import { create } from 'zustand';

import type { AuthUser, SessionStatus, UserRole } from '@/entities/auth/types';
import { authApi, type LoginInput } from '@/features/auth/api/auth.api';
import { tokenStorage } from '@/shared/lib/token-storage';

interface AuthState {
  user: AuthUser | null;
  status: SessionStatus;
  initialized: boolean;
  initializeSession: () => Promise<void>;
  signIn: (payload: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (roles?: UserRole[]) => boolean;
  hasPermission: (permission?: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',
  initialized: false,

  async initializeSession() {
    if (get().initialized) {
      return;
    }

    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      set({ status: 'unauthenticated', initialized: true, user: null });
      return;
    }

    try {
      const accessToken = tokenStorage.getAccessToken();

      if (!accessToken) {
        const refreshed = await authApi.refresh({ refreshToken });
        tokenStorage.setTokens(refreshed);
      }

      const user = await authApi.me();
      set({ user, status: 'authenticated', initialized: true });
    } catch {
      tokenStorage.clearTokens();
      set({ user: null, status: 'unauthenticated', initialized: true });
    }
  },

  async signIn(payload) {
    const session = await authApi.login(payload);
    tokenStorage.setTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken
    });

    const user = await authApi.me();

    set({
      user,
      status: 'authenticated',
      initialized: true
    });
  },

  async signOut() {
    try {
      await authApi.logout(tokenStorage.getRefreshToken() ?? undefined);
    } finally {
      tokenStorage.clearTokens();
      set({
        user: null,
        status: 'unauthenticated',
        initialized: true
      });
    }
  },

  hasRole(roles) {
    if (!roles || roles.length === 0) {
      return true;
    }

    const user = get().user;
    if (!user) {
      return false;
    }

    return roles.some((role) => user.roles.includes(role));
  },

  hasPermission(permission) {
    if (!permission) {
      return true;
    }

    const user = get().user;
    return Boolean(user?.permissions.includes(permission));
  }
}));


