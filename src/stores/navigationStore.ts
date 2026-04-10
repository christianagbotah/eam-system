import { create } from 'zustand';
import type { PageName } from '@/types';
import { api } from '@/lib/api';

interface NavigationState {
  currentPage: PageName;
  pageParams: Record<string, string>;
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  enabledModules: Set<string> | null; // null = not loaded yet (show all)
  fetchModules: () => Promise<void>;
  navigate: (page: PageName, params?: Record<string, string>) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentPage: 'dashboard',
  pageParams: {},
  sidebarOpen: true,
  mobileSidebarOpen: false,
  enabledModules: null,

  fetchModules: async () => {
    // Avoid duplicate fetches if already loaded
    if (get().enabledModules !== null) return;
    try {
      const res = await api.get<any[]>('/api/modules');
      if (res.success && Array.isArray(res.data)) {
        const enabled = new Set<string>();
        res.data.forEach((m: any) => {
          if (m.isEnabled || m.isCore) enabled.add(m.code);
        });
        set({ enabledModules: enabled });
      }
    } catch {
      // On error, keep null so all items stay visible (graceful fallback)
    }
  },

  navigate: (page, params = {}) => set({ currentPage: page, pageParams: params, mobileSidebarOpen: false }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),

  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}));
