(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/stores/navigationStore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useNavigationStore",
    ()=>useNavigationStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
;
;
const useNavigationStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        currentPage: 'dashboard',
        pageParams: {},
        sidebarOpen: true,
        mobileSidebarOpen: false,
        enabledModules: null,
        fetchModules: async ()=>{
            // Avoid duplicate fetches if already loaded
            if (get().enabledModules !== null) return;
            try {
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].get('/api/modules');
                if (res.success && Array.isArray(res.data)) {
                    const enabled = new Set();
                    res.data.forEach((m)=>{
                        if (m.isEnabled || m.isCore) enabled.add(m.code);
                    });
                    set({
                        enabledModules: enabled
                    });
                }
            } catch  {
            // On error, keep null so all items stay visible (graceful fallback)
            }
        },
        navigate: (page, params = {})=>set({
                currentPage: page,
                pageParams: params,
                mobileSidebarOpen: false
            }),
        toggleSidebar: ()=>set((s)=>({
                    sidebarOpen: !s.sidebarOpen
                })),
        toggleMobileSidebar: ()=>set((s)=>({
                    mobileSidebarOpen: !s.mobileSidebarOpen
                })),
        setMobileSidebarOpen: (open)=>set({
                mobileSidebarOpen: open
            })
    }));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_stores_navigationStore_ts_e1cf3f41._.js.map