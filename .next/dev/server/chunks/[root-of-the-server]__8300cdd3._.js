module.exports = [
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/tags-manifest.external.js [external] (next/dist/server/lib/incremental-cache/tags-manifest.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/tags-manifest.external.js", () => require("next/dist/server/lib/incremental-cache/tags-manifest.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/src/lib/db.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "db",
    ()=>db
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
;
const globalForPrisma = globalThis;
const db = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]();
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = db;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/src/lib/auth.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createSession",
    ()=>createSession,
    "deleteSession",
    ()=>deleteSession,
    "generateToken",
    ()=>generateToken,
    "getSession",
    ()=>getSession,
    "getSessionAsync",
    ()=>getSessionAsync,
    "getUserPlantId",
    ()=>getUserPlantId,
    "hasAnyPermission",
    ()=>hasAnyPermission,
    "hasPermission",
    ()=>hasPermission,
    "hasRole",
    ()=>hasRole,
    "isAdmin",
    ()=>isAdmin,
    "sessionCache",
    ()=>sessionCache,
    "warmSessionCache",
    ()=>warmSessionCache
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
;
// ============================================================================
// SESSION MANAGEMENT — DB-backed with in-memory LRU cache
// ============================================================================
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
// In-memory cache for fast token lookups (avoids DB query on every API call)
const globalForSessions = globalThis;
if (!globalForSessions.sessionCache) {
    globalForSessions.sessionCache = new Map();
}
const sessionCache = globalForSessions.sessionCache;
// Maximum cache entries before cleanup
const MAX_CACHE_SIZE = 500;
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
function generateToken() {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])();
}
async function createSession(userId) {
    // Fetch user with roles, permissions, and plant access
    const user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["db"].user.findUnique({
        where: {
            id: userId
        },
        include: {
            userRoles: {
                include: {
                    role: {
                        include: {
                            rolePermissions: {
                                include: {
                                    permission: true
                                }
                            }
                        }
                    }
                }
            },
            directPerms: {
                include: {
                    permission: true
                }
            }
        }
    });
    if (!user) throw new Error('User not found');
    // Collect role-based permissions
    const roleSlugsSet = new Set();
    const permissionSlugsSet = new Set();
    for (const ur of user.userRoles){
        roleSlugsSet.add(ur.role.slug);
        for (const rp of ur.role.rolePermissions){
            permissionSlugsSet.add(rp.permission.slug);
        }
    }
    // Apply direct permission overrides
    for (const up of user.directPerms){
        // Check expiry first
        if (up.expiresAt && new Date(up.expiresAt) < new Date()) {
            permissionSlugsSet.delete(up.permission.slug);
            continue;
        }
        if (up.isGranted) {
            permissionSlugsSet.add(up.permission.slug);
        } else {
            permissionSlugsSet.delete(up.permission.slug);
        }
    }
    // Admin role gets ALL permissions
    if (roleSlugsSet.has('admin')) {
        const allPermissions = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["db"].permission.findMany({
            select: {
                slug: true
            }
        });
        for (const p of allPermissions){
            permissionSlugsSet.add(p.slug);
        }
    }
    const uniquePermissions = [
        ...permissionSlugsSet
    ];
    const uniqueRoles = [
        ...roleSlugsSet
    ];
    const token = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const sessionData = {
        userId: user.id,
        username: user.username,
        roles: uniqueRoles,
        permissions: uniquePermissions,
        createdAt: now
    };
    // Persist to database
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["db"].session.create({
        data: {
            token,
            userId: user.id,
            roles: JSON.stringify(uniqueRoles),
            permissions: JSON.stringify(uniquePermissions),
            expiresAt
        }
    });
    // Cache in memory
    sessionCache.set(token, {
        data: sessionData,
        cachedAt: Date.now()
    });
    // Cleanup expired DB sessions (non-blocking, best-effort)
    cleanupExpiredSessions().catch(()=>{});
    return {
        token,
        session: sessionData
    };
}
function getSession(request) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return null;
    // 1. Check in-memory cache first (fast path)
    const cached = sessionCache.get(token);
    if (cached) {
        // Verify not expired
        const age = Date.now() - cached.cachedAt;
        if (age > SESSION_TTL_MS) {
            sessionCache.delete(token);
            return null;
        }
        return cached.data;
    }
    // 2. Fallback: synchronous return null (DB lookup is async, handled by middleware)
    // The middleware already validated the token, so route handlers can rely on getSession
    // returning the cached data. If cache is cold, the middleware populates it.
    return null;
}
async function getSessionAsync(token) {
    // 1. Check in-memory cache
    const cached = sessionCache.get(token);
    if (cached) {
        const age = Date.now() - cached.cachedAt;
        if (age > SESSION_TTL_MS) {
            sessionCache.delete(token);
            return null;
        }
        // Update lastSeen in DB (fire-and-forget)
        updateLastSeen(token).catch(()=>{});
        return cached.data;
    }
    // 2. Look up in database
    const dbSession = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["db"].session.findUnique({
        where: {
            token
        }
    });
    if (!dbSession) return null;
    // Check expiry
    if (new Date(dbSession.expiresAt) < new Date()) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["db"].session.delete({
            where: {
                id: dbSession.id
            }
        }).catch(()=>{});
        return null;
    }
    // Parse JSON fields
    let roles = [];
    let permissions = [];
    try {
        roles = JSON.parse(dbSession.roles);
        permissions = JSON.parse(dbSession.permissions);
    } catch  {
        return null;
    }
    const sessionData = {
        userId: dbSession.userId,
        username: '',
        roles,
        permissions,
        createdAt: dbSession.createdAt
    };
    // Populate cache
    sessionCache.set(token, {
        data: sessionData,
        cachedAt: Date.now()
    });
    // Evict old entries if cache is too large
    if (sessionCache.size > MAX_CACHE_SIZE) {
        const entries = [
            ...sessionCache.entries()
        ].sort((a, b)=>a[1].cachedAt - b[1].cachedAt);
        for(let i = 0; i < entries.length / 2; i++){
            sessionCache.delete(entries[i][0]);
        }
    }
    // Update lastSeen (fire-and-forget)
    updateLastSeen(token).catch(()=>{});
    return sessionData;
}
async function deleteSession(token) {
    // Remove from cache
    sessionCache.delete(token);
    // Remove from database
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["db"].session.deleteMany({
            where: {
                token
            }
        });
    } catch  {
    // Silently fail — cache is already cleared
    }
}
// Cleanup expired sessions from DB (runs periodically)
async function cleanupExpiredSessions() {
    try {
        const result = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["db"].session.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });
    // Silently cleaned up expired sessions
    } catch  {
    // Silently fail
    }
}
// Update lastSeen timestamp (fire-and-forget)
async function updateLastSeen(token) {
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["db"].session.update({
            where: {
                token
            },
            data: {
                lastSeen: new Date()
            }
        });
    } catch  {
    // Silently fail
    }
}
function hasPermission(session, permissionSlug) {
    return session.permissions.includes(permissionSlug);
}
function hasAnyPermission(session, permissionSlugs) {
    return permissionSlugs.some((s)=>session.permissions.includes(s));
}
function hasRole(session, roleSlug) {
    return session.roles.includes(roleSlug);
}
function isAdmin(session) {
    return session.roles.includes('admin');
}
async function getUserPlantId(userId) {
    const userPlant = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["db"].userPlant.findFirst({
        where: {
            userId,
            isPrimary: true
        }
    });
    return userPlant?.plantId ?? null;
}
async function warmSessionCache() {
    try {
        const activeSessions = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["db"].session.findMany({
            where: {
                expiresAt: {
                    gt: new Date()
                }
            }
        });
        for (const s of activeSessions){
            let roles = [];
            let permissions = [];
            try {
                roles = JSON.parse(s.roles);
                permissions = JSON.parse(s.permissions);
            } catch  {
                continue;
            }
            sessionCache.set(s.token, {
                data: {
                    userId: s.userId,
                    username: '',
                    roles,
                    permissions,
                    createdAt: s.createdAt
                },
                cachedAt: Date.now()
            });
        }
    // Session cache warmed successfully
    } catch  {
    // Silently fail — DB may not be ready during cold start
    }
}
}),
"[project]/src/proxy.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "proxy",
    ()=>proxy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [middleware] (ecmascript)");
;
;
/**
 * Auth & Plant-Scoping Proxy (Next.js 16 convention)
 *
 * Protects all /api/* routes (except public auth endpoints) by validating the Bearer token.
 * Applies security headers to all API responses.
 *
 * Public routes (no auth required):
 * - /api/auth/* — all auth endpoints
 *
 * Internal routes (X-PM-Cron-Secret header for server-to-server):
 * - /api/pm-schedules/check-due — PM cron job trigger
 */ const PUBLIC_PATHS = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password'
];
const INTERNAL_SECRET = process.env.PM_CRON_SECRET || 'eam-pm-cron-secret-2025';
// Security headers applied to all API responses
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
function withSecurityHeaders(response) {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)){
        response.headers.set(key, value);
    }
    return response;
}
async function proxy(request) {
    const { pathname } = request.nextUrl;
    // Only handle /api/* routes
    if (!pathname.startsWith('/api/')) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // Allow public auth endpoints
    if (PUBLIC_PATHS.some((p)=>pathname === p || pathname.startsWith(p + '/'))) {
        return withSecurityHeaders(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next());
    }
    // Allow internal PM cron endpoint (authenticated via secret header)
    if (pathname === '/api/pm-schedules/check-due') {
        const cronSecret = request.headers.get('x-pm-cron-secret');
        if (cronSecret === INTERNAL_SECRET) {
            return withSecurityHeaders(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next());
        }
    // If no secret header, fall through to normal auth check
    }
    // Check for Bearer token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
        return withSecurityHeaders(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: 'Authentication required'
        }, {
            status: 401
        }));
    }
    // Validate token via DB-backed session (with in-memory cache)
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["getSessionAsync"])(token);
    if (!session) {
        return withSecurityHeaders(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: 'Invalid or expired session'
        }, {
            status: 401
        }));
    }
    // Token is valid — attach session info + plant context to request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-session-user-id', session.userId);
    requestHeaders.set('x-session-roles', session.roles.join(','));
    requestHeaders.set('x-session-permissions', session.permissions.join(','));
    requestHeaders.set('x-user-plant-id', '');
    // Pass through X-Plant-ID as x-user-plant-id for downstream route handler convenience.
    const plantIdHeader = request.headers.get('X-Plant-ID');
    if (plantIdHeader) {
        requestHeaders.set('x-user-plant-id', plantIdHeader);
    }
    return withSecurityHeaders(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next({
        request: {
            headers: requestHeaders
        }
    }));
}
const config = {
    matcher: [
        '/api/:path*'
    ]
};
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__8300cdd3._.js.map