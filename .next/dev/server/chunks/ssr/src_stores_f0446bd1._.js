module.exports = [
"[project]/src/stores/navigationStore.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useNavigationStore",
    ()=>useNavigationStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
;
;
const useNavigationStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        currentPage: 'dashboard',
        pageParams: {},
        sidebarOpen: true,
        mobileSidebarOpen: false,
        enabledModules: null,
        fetchModules: async ()=>{
            // Avoid duplicate fetches if already loaded
            if (get().enabledModules !== null) return;
            try {
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].get('/api/modules');
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
}),
"[project]/src/stores/preferencesStore.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "usePreferencesStore",
    ()=>usePreferencesStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
;
;
// Default preferences
const DEFAULT_PREFERENCES = {
    display: {
        defaultPage: 'dashboard',
        itemsPerPage: 25,
        compactMode: false
    },
    notifications: {
        soundEnabled: true,
        desktopNotifications: false
    },
    dateTime: {
        dateFormat: 'YYYY-MM-DD',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
};
// ============================================================================
// localStorage persistence helpers
// ============================================================================
const LS_KEY = 'eam_user_preferences';
function loadFromStorage() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return DEFAULT_PREFERENCES;
        const parsed = JSON.parse(raw);
        return {
            display: {
                ...DEFAULT_PREFERENCES.display,
                ...parsed.display
            },
            notifications: {
                ...DEFAULT_PREFERENCES.notifications,
                ...parsed.notifications
            },
            dateTime: {
                ...DEFAULT_PREFERENCES.dateTime,
                ...parsed.dateTime
            }
        };
    } catch  {
        return DEFAULT_PREFERENCES;
    }
}
function saveToStorage(prefs) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(prefs));
    } catch  {
    // Silently fail
    }
}
const usePreferencesStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        preferences: loadFromStorage(),
        isLoaded: false,
        isSaving: false,
        fetchPreferences: async ()=>{
            try {
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].get('/api/user/preferences');
                if (res.success && res.data) {
                    const merged = {
                        display: {
                            ...DEFAULT_PREFERENCES.display,
                            ...res.data.display
                        },
                        notifications: {
                            ...DEFAULT_PREFERENCES.notifications,
                            ...res.data.notifications
                        },
                        dateTime: {
                            ...DEFAULT_PREFERENCES.dateTime,
                            ...res.data.dateTime
                        }
                    };
                    saveToStorage(merged);
                    set({
                        preferences: merged,
                        isLoaded: true
                    });
                } else {
                    set({
                        isLoaded: true
                    });
                }
            } catch  {
                set({
                    isLoaded: true
                });
            }
        },
        savePreferences: async (prefs)=>{
            set({
                isSaving: true
            });
            try {
                // Merge with current preferences
                const current = get().preferences;
                const merged = {
                    display: {
                        ...current.display,
                        ...prefs.display
                    },
                    notifications: {
                        ...current.notifications,
                        ...prefs.notifications
                    },
                    dateTime: {
                        ...current.dateTime,
                        ...prefs.dateTime
                    }
                };
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].put('/api/user/preferences', merged);
                if (res.success) {
                    saveToStorage(merged);
                    set({
                        preferences: merged,
                        isSaving: false
                    });
                    return true;
                }
                set({
                    isSaving: false
                });
                return false;
            } catch  {
                set({
                    isSaving: false
                });
                return false;
            }
        },
        updatePreferences: (prefs)=>{
            const current = get().preferences;
            const merged = {
                display: {
                    ...current.display,
                    ...prefs.display
                },
                notifications: {
                    ...current.notifications,
                    ...prefs.notifications
                },
                dateTime: {
                    ...current.dateTime,
                    ...prefs.dateTime
                }
            };
            saveToStorage(merged);
            set({
                preferences: merged
            });
        },
        resetPreferences: ()=>{
            saveToStorage(DEFAULT_PREFERENCES);
            set({
                preferences: DEFAULT_PREFERENCES
            });
        }
    }));
}),
];

//# sourceMappingURL=src_stores_f0446bd1._.js.map