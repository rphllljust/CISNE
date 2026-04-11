import { create } from 'zustand';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastState {
  items: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push(toast) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    set((state) => ({
      items: [...state.items, { ...toast, id }]
    }));

    setTimeout(() => {
      set((state) => ({
        items: state.items.filter((item) => item.id !== id)
      }));
    }, 4500);
  },
  remove(id) {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id)
    }));
  }
}));


