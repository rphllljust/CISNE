import { create } from 'zustand';

import type { AppTheme } from '@/shared/lib/theme-storage';
import { themeStorage } from '@/shared/lib/theme-storage';

interface UiState {
  theme: AppTheme;
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: themeStorage.getTheme(),
  sidebarOpen: false,

  toggleTheme() {
    const current = get().theme;
    const next = current === 'light' ? 'dark' : 'light';
    themeStorage.setTheme(next);
    set({ theme: next });
  },

  setSidebarOpen(open) {
    set({ sidebarOpen: open });
  }
}));


