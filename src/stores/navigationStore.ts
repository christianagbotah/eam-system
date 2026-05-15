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
  navigate: (page: PageName, params?: Record<string, string>, replace?: boolean) => void;
  goBack: () => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

// ============================================================================
// Browser history integration
// ============================================================================

const HISTORY_STATE_KEY = 'eam_nav';

function pushNavState(page: PageName, params: Record<string, string>, replace = false) {
  const url = buildUrl(page, params);
  const state = { page, params };

  if (replace) {
    window.history.replaceState(state, '', url);
  } else {
    window.history.pushState(state, '', url);
  }
}

function buildUrl(page: PageName, params: Record<string, string>): string {
  const base = `#/${page}`;
  const qs = new URLSearchParams(params).toString();
  return qs ? `${base}?${qs}` : base;
}

function parseHash(): { page: PageName; params: Record<string, string> } | null {
  const hash = window.location.hash; // e.g. #/dashboard?id=123
  if (!hash || hash === '#' || hash === '#/') {
    return null;
  }
  // Remove leading #/
  const path = hash.replace(/^#\/?/, '');
  const [pagePart, queryPart] = path.split('?');
  const page = pagePart as PageName;
  const params: Record<string, string> = {};
  if (queryPart) {
    const qs = new URLSearchParams(queryPart);
    qs.forEach((v, k) => { params[k] = v; });
  }
  return { page, params };
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
        // Safety: if no modules are enabled, keep null so all sidebar items remain visible
        // This prevents an empty Set from hiding every menu group
        if (enabled.size === 0) {
          // Don't update — stay null (show all)
          return;
        }
        set({ enabledModules: enabled });
      }
    } catch {
      // On error, keep null so all items stay visible (graceful fallback)
    }
  },

  navigate: (page, params = {}, replace = false) => {
    set({ currentPage: page, pageParams: params, mobileSidebarOpen: false });
    pushNavState(page, params, replace);
  },

  goBack: () => {
    // If there's history to go back to, let the browser handle it.
    // The popstate listener will catch it and update the store.
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // No browser history — navigate to dashboard as fallback
      get().navigate('dashboard', {}, true);
    }
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),

  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}));

// ============================================================================
// Global popstate listener — runs once, handles browser back/forward
// ============================================================================
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (event) => {
    // Try the state we pushed first
    if (event.state?.page) {
      const { page, params } = event.state;
      useNavigationStore.setState({
        currentPage: page as PageName,
        pageParams: params || {},
      });
      return;
    }

    // Fallback: parse the hash from URL
    const parsed = parseHash();
    if (parsed) {
      useNavigationStore.setState({
        currentPage: parsed.page,
        pageParams: parsed.params,
      });
    }
  });

  // On initial load, restore from URL hash if present
  const initial = parseHash();
  if (initial) {
    useNavigationStore.setState({
      currentPage: initial.page,
      pageParams: initial.params,
    });
  } else {
    // Set initial history entry so back button works from the first navigation
    pushNavState('dashboard', {}, true);
  }
}
