import { storageKeys } from '@/shared/constants/storage-keys';

export type AppTheme = 'light' | 'dark';

export const themeStorage = {
  getTheme(): AppTheme {
    const theme = localStorage.getItem(storageKeys.theme);
    return theme === 'dark' ? 'dark' : 'light';
  },
  setTheme(theme: AppTheme): void {
    localStorage.setItem(storageKeys.theme, theme);
  }
};


