import { create } from 'zustand';
import type { PageName } from '@/types';

interface NavigationState {
  currentPage: PageName;
  pageParams: Record<string, string>;
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  navigate: (page: PageName, params?: Record<string, string>) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'dashboard',
  pageParams: {},
  sidebarOpen: true,
  mobileSidebarOpen: false,

  navigate: (page, params = {}) => set({ currentPage: page, pageParams: params, mobileSidebarOpen: false }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),

  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}));
