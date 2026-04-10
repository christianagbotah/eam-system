import { create } from 'zustand';
import type { User } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  permissions: string[];
  role: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  hasPermission: (slug: string) => boolean;
  hasAnyPermission: (slugs: string[]) => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  permissions: [],
  role: null,
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ user: User; token: string; permissions: string[] }>('/api/auth/login', { username, password });
      if (res.success && res.data) {
        localStorage.setItem('eam_token', res.data.token);
        set({
          user: res.data.user,
          permissions: res.data.permissions,
          role: res.data.user.roles?.[0]?.slug || null,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('eam_token');
    set({ user: null, isAuthenticated: false, permissions: [], role: null });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('eam_token');
    if (!token) return;
    set({ isLoading: true });
    try {
      const res = await api.get<{ user: User; permissions: string[] }>('/api/auth/me');
      if (res.success && res.data) {
        set({
          user: res.data.user,
          permissions: res.data.permissions,
          role: res.data.user.roles?.[0]?.slug || null,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        localStorage.removeItem('eam_token');
        set({ isLoading: false });
      }
    } catch {
      localStorage.removeItem('eam_token');
      set({ isLoading: false });
    }
  },

  hasPermission: (slug: string) => {
    const { permissions } = get();
    return Array.isArray(permissions) && permissions.includes(slug);
  },

  hasAnyPermission: (slugs: string[]) => {
    const { permissions } = get();
    return Array.isArray(permissions) && slugs.some(s => permissions.includes(s));
  },

  isAdmin: () => {
    const { role } = get();
    return role === 'admin';
  },
}));
