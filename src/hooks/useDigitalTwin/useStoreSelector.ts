'use client';

import { useEffect, useRef, useState } from 'react';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';

/**
 * Safe alternative to `useDigitalTwinStore(selector)` for use inside R3F Canvas children.
 *
 * ## Problem (Error #185)
 *
 * R3F v9+ uses its own React reconciler. Zustand's `useStore()` hook internally
 * calls `useSyncExternalStore`, which registers a subscription in the calling
 * reconciler's context. When the same Zustand store is subscribed to from
 * BOTH the main React reconciler (outer components) and the R3F reconciler
 * (Canvas children), the subscriptions cascade during React 19's concurrent
 * rendering, triggering an infinite setState loop — React Error #185:
 * "Maximum update depth exceeded."
 *
 * ## Solution
 *
 * This hook bypasses `useSyncExternalStore` entirely. Instead it uses Zustand's
 * vanilla `store.subscribe()` API inside a `useEffect`, with a reference-equality
 * guard to prevent redundant React state updates.
 *
 * ## Usage
 *
 * Replace:
 * ```tsx
 *   const sectionMode = useDigitalTwinStore((s) => s.sectionMode);  // ❌ Error #185 in R3F
 * ```
 *
 * With:
 * ```tsx
 *   const sectionMode = useStoreSelector((s) => s.sectionMode);      // ✅ Safe in R3F
 * ```
 *
 * For stable action references (never change between renders), use
 * `useDigitalTwinStore.getState().action()` at call time instead:
 * ```tsx
 *   onClick={() => useDigitalTwinStore.getState().selectMesh(name, id)}
 * ```
 */
export function useStoreSelector<T>(
  selector: (state: ReturnType<typeof useDigitalTwinStore.getState>) => T,
): T {
  const [value, setValue] = useState<T>(() =>
    selector(useDigitalTwinStore.getState()),
  );
  const selectorRef = useRef(selector);
  // selectorRef must always reflect the latest selector for the subscribe callback.
  // This ref assignment during render is safe: it only affects the subscribe
  // callback's closure (called asynchronously) — it does NOT influence the
  // rendered output, which depends solely on `value` (React state).
  // eslint-disable-next-line react-hooks/refs -- intentional: callback capture for async subscribe
  selectorRef.current = selector;

  useEffect(() => {
    const unsub = useDigitalTwinStore.subscribe((state) => {
      const next = selectorRef.current(state);
      setValue((prev) => (prev === next ? prev : next));
    });
    return unsub;
  }, []);

  return value;
}
