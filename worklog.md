---
Task ID: 1
Agent: Main
Task: Fix React Error #185 — "Cannot update a component while rendering a different component"

Work Log:
- Analyzed the full codebase (~200+ component files) for patterns that cause React Error #185
- Identified 4 root causes and 1 additional issue
- Applied fixes to all identified issues
- Verified all files compile cleanly with bun build
- Verified dev server starts without errors

Stage Summary:
- **PRIMARY FIX**: `src/components/shared/Sidebar.tsx` — Replaced `queueMicrotask` + `useState` + `useEffect` with pure derived state (`useMemo`) for auto-expanding sidebar menus. The `queueMicrotask` was scheduling `setOpenMenus` during React's render phase in concurrent mode, causing Error #185 when it fired while another component (the page content) was rendering.
- **FIX 2**: `src/components/ui/searchable-select.tsx` — Stabilized `AsyncSearchableSelect.load` callback using `useRef` to store `fetchOptions`, preventing infinite re-render loops when parents pass inline functions.
- **FIX 3**: `src/components/EAMApp.tsx` — Replaced `useNavigationStore.getState()` call during render (line 442) with proper Zustand selector subscription (`sidebarOpen`).
- **FIX 4**: `src/hooks/use-toast.ts` — Wrapped `dispatch` → `listeners.forEach` in `React.startTransition()` to prevent synchronous setState cascading when `toast()` is called during another component's render.
- **FIX 5**: `src/components/modules/MaintenancePages.tsx` — Replaced `useAuthStore.getState().isAdmin()` in render with proper subscription-based `isAdmin()` from the store.

All changes are backward-compatible and do not alter any user-facing behavior.
