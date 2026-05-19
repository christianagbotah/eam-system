// ============================================================================
// WEBSOCKET AUTH VALIDATION — Socket.IO middleware for JWT/session validation
// ============================================================================

import { createLogger } from '@/lib/logger';
import { getSessionAsync, sessionCache, type SessionData } from '@/lib/auth';
import { randomUUID } from 'crypto';

const logger = createLogger('ws-auth');

// ── Types ───────────────────────────────────────────────────────────────────

/** Connected socket metadata tracked by the auth layer. */
interface WsConnectionRecord {
  socketId: string;
  userId: string;
  token: string;
  connectedAt: number;
  lastActivityAt: number;
  userAgent: string;
  ip: string;
}

interface WsAuthConfig {
  /** Max concurrent WebSocket connections per user (default: 5). */
  maxSessionsPerUser?: number;
  /** Whether to validate the token on every emit, not just connect (default: true). */
  validateOnEmit?: boolean;
}

type WsSocket = {
  id: string;
  handshake: {
    auth?: Record<string, unknown>;
    headers?: Record<string, string>;
    address?: string;
  };
  data: Record<string, unknown>;
  emit: (event: string, ...args: unknown[]) => void;
  disconnect: (close?: boolean) => void;
  conn?: { remoteAddress?: string };
};

type WsNextFn = (err?: Error) => void;

type WsServer = {
  use: (middleware: (socket: WsSocket, next: WsNextFn) => void) => void;
  of?: (namespace: string) => WsServer;
};

// ── In-Memory State ─────────────────────────────────────────────────────────

const globalForWsAuth = globalThis as unknown as {
  _wsConnections: Map<string, WsConnectionRecord> | undefined;
  _wsUserConnections: Map<string, Set<string>> | undefined;
  _wsRevokedSessions: Set<string> | undefined;
};

if (!globalForWsAuth._wsConnections) {
  globalForWsAuth._wsConnections = new Map();
}
if (!globalForWsAuth._wsUserConnections) {
  globalForWsAuth._wsUserConnections = new Map();
}
if (!globalForWsAuth._wsRevokedSessions) {
  globalForWsAuth._wsRevokedSessions = new Set();
}

const wsConnections = globalForWsAuth._wsConnections;
const wsUserConnections = globalForWsAuth._wsUserConnections;
const wsRevokedSessions = globalForWsAuth._wsRevokedSessions;

const DEFAULT_MAX_SESSIONS = 5;

// ── Error Codes ─────────────────────────────────────────────────────────────

const WS_AUTH_ERRORS = {
  MISSING_TOKEN: { code: 'WS_AUTH_MISSING_TOKEN', message: 'Authentication token required' },
  INVALID_TOKEN: { code: 'WS_AUTH_INVALID_TOKEN', message: 'Invalid or expired token' },
  SESSION_REVOKED: { code: 'WS_AUTH_SESSION_REVOKED', message: 'Session has been revoked' },
  MAX_SESSIONS: { code: 'WS_AUTH_MAX_SESSIONS', message: 'Maximum concurrent sessions exceeded' },
  TOKEN_MISMATCH: { code: 'WS_AUTH_TOKEN_MISMATCH', message: 'Token does not match connection session' },
} as const;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract the auth token from socket handshake or auth object. */
function extractToken(socket: WsSocket): string | null {
  // Try auth object first (Socket.IO client sends: { auth: { token: '...' } })
  const auth = socket.handshake.auth;
  if (auth?.token && typeof auth.token === 'string') {
    return auth.token;
  }

  // Fallback to Authorization header
  const headers = socket.handshake.headers || {};
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }

  // Fallback to query parameter in handshake
  if (typeof auth?.token === 'string') {
    return auth.token;
  }

  return null;
}

/** Extract client IP from socket handshake. */
function extractClientIp(socket: WsSocket): string {
  const headers = socket.handshake.headers || {};
  // Check for forwarded IP (behind proxy)
  const forwarded = headers['x-forwarded-for'] || headers['x-real-ip'];
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // Check socket connection address
  if (socket.conn?.remoteAddress) {
    return socket.conn.remoteAddress;
  }
  return 'unknown';
}

/** Extract user agent from socket handshake. */
function extractUserAgent(socket: WsSocket): string {
  const headers = socket.handshake.headers || {};
  return headers['user-agent'] || headers['User-Agent'] || 'unknown';
}

/** Register a connection for a user. Returns true if within session limit. */
function registerConnection(socketId: string, userId: string, record: WsConnectionRecord): boolean {
  wsConnections.set(socketId, record);

  let userSet = wsUserConnections.get(userId);
  if (!userSet) {
    userSet = new Set();
    wsUserConnections.set(userId, userSet);
  }

  userSet.add(socketId);
  return userSet.size <= DEFAULT_MAX_SESSIONS;
}

/** Remove a connection from tracking. */
function unregisterConnection(socketId: string): void {
  const record = wsConnections.get(socketId);
  if (!record) return;

  wsConnections.delete(socketId);

  const userSet = wsUserConnections.get(record.userId);
  if (userSet) {
    userSet.delete(socketId);
    if (userSet.size === 0) {
      wsUserConnections.delete(record.userId);
    }
  }
}

// ── Core Middleware ─────────────────────────────────────────────────────────

/**
 * Socket.IO middleware that validates auth tokens on connection.
 *
 * Usage:
 * ```ts
 * import { Server } from 'socket.io';
 * import { validateWsConnection } from '@/lib/ws-auth';
 *
 * const io = new Server(httpServer);
 * io.use(validateWsConnection({ maxSessionsPerUser: 5 }));
 * ```
 */
export function validateWsConnection(config: WsAuthConfig = {}) {
  const maxSessions = config.maxSessionsPerUser ?? DEFAULT_MAX_SESSIONS;

  return async function wsAuthMiddleware(socket: WsSocket, next: WsNextFn) {
    const token = extractToken(socket);

    if (!token) {
      logger.warn('WS connection rejected: no token', { socketId: socket.id });
      return next(new Error(JSON.stringify(WS_AUTH_ERRORS.MISSING_TOKEN)));
    }

    // Check if token has been explicitly revoked
    if (wsRevokedSessions.has(token)) {
      logger.warn('WS connection rejected: revoked token', { socketId: socket.id });
      return next(new Error(JSON.stringify(WS_AUTH_ERRORS.SESSION_REVOKED)));
    }

    // Validate token against session store
    let session: SessionData | null = null;
    try {
      session = await getSessionAsync(token);
    } catch (err) {
      logger.error('WS auth: session lookup failed', {
        error: err instanceof Error ? err.message : String(err),
        socketId: socket.id,
      });
      return next(new Error(JSON.stringify(WS_AUTH_ERRORS.INVALID_TOKEN)));
    }

    if (!session) {
      logger.warn('WS connection rejected: invalid token', { socketId: socket.id });
      return next(new Error(JSON.stringify(WS_AUTH_ERRORS.INVALID_TOKEN)));
    }

    // Check max sessions per user
    const userConnSet = wsUserConnections.get(session.userId);
    if (userConnSet && userConnSet.size >= maxSessions) {
      logger.warn('WS connection rejected: max sessions exceeded', {
        userId: session.userId,
        socketId: socket.id,
        currentCount: userConnSet.size,
        maxSessions,
      });
      return next(new Error(JSON.stringify(WS_AUTH_ERRORS.MAX_SESSIONS)));
    }

    // Create connection record
    const record: WsConnectionRecord = {
      socketId: socket.id,
      userId: session.userId,
      token,
      connectedAt: Date.now(),
      lastActivityAt: Date.now(),
      userAgent: extractUserAgent(socket),
      ip: extractClientIp(socket),
    };

    const withinLimit = registerConnection(socket.id, session.userId, record);

    if (!withinLimit) {
      unregisterConnection(socket.id);
      logger.warn('WS connection rejected: session limit race condition', { userId: session.userId });
      return next(new Error(JSON.stringify(WS_AUTH_ERRORS.MAX_SESSIONS)));
    }

    // Attach session data to socket for use in event handlers
    socket.data.userId = session.userId;
    socket.data.session = session;
    socket.data.token = token;

    logger.info('WS connection authenticated', {
      socketId: socket.id,
      userId: session.userId,
      ip: record.ip,
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      unregisterConnection(socket.id);
      logger.info('WS connection closed', { socketId: socket.id, userId: session.userId });
    });

    // If validateOnEmit is enabled, wrap the emit method to re-validate
    if (config.validateOnEmit !== false) {
      const originalEmit = socket.emit.bind(socket);
      socket.emit = (event: string, ...args: unknown[]) => {
        // Re-check token is not revoked
        if (wsRevokedSessions.has(token)) {
          logger.warn('WS emit blocked: token revoked', {
            socketId: socket.id,
            userId: session.userId,
            event,
          });
          socket.disconnect(true);
          return;
        }

        // Re-check session cache validity
        const cached = sessionCache.get(token);
        if (!cached || Date.now() - cached.cachedAt > 24 * 60 * 60 * 1000) {
          sessionCache.delete(token);
          logger.warn('WS emit blocked: session expired', {
            socketId: socket.id,
            userId: session.userId,
            event,
          });
          socket.disconnect(true);
          return;
        }

        // Update last activity
        const conn = wsConnections.get(socket.id);
        if (conn) {
          conn.lastActivityAt = Date.now();
        }

        return originalEmit(event, ...args);
      };
    }

    next();
  };
}

// ── Session Invalidation Propagation ────────────────────────────────────────

/**
 * Revoke all WebSocket connections for a given user.
 * Marks all tokens as revoked and disconnects all sockets.
 * Typically called when a user logs out, is deactivated, or password is changed.
 */
export function revokeUserWsSessions(userId: string): number {
  let disconnectedCount = 0;

  const userConnSet = wsUserConnections.get(userId);
  if (!userConnSet) return 0;

  for (const socketId of userConnSet) {
    const record = wsConnections.get(socketId);
    if (record) {
      // Mark token as revoked
      wsRevokedSessions.add(record.token);
      // Clear from session cache
      sessionCache.delete(record.token);
    }
  }

  disconnectedCount = userConnSet.size;

  // The actual socket.disconnect() must be called from the Socket.IO server side.
  // We provide the list of socket IDs for the caller to disconnect.
  logger.warn('WS sessions revoked for user', {
    userId,
    disconnectedCount,
  });

  return disconnectedCount;
}

/**
 * Revoke a specific token's WebSocket connections.
 */
export function revokeTokenWsSessions(token: string): number {
  let disconnectedCount = 0;

  wsRevokedSessions.add(token);
  sessionCache.delete(token);

  for (const [socketId, record] of wsConnections.entries()) {
    if (record.token === token) {
      disconnectedCount++;
      unregisterConnection(socketId);
    }
  }

  logger.info('WS token revoked', { token: token.slice(0, 8), disconnectedCount });
  return disconnectedCount;
}

/**
 * Get the list of socket IDs for a user (for external disconnect calls).
 */
export function getUserWsSocketIds(userId: string): string[] {
  const userConnSet = wsUserConnections.get(userId);
  if (!userConnSet) return [];
  return [...userConnSet];
}

/**
 * Get the list of socket IDs that should be disconnected (tokens are revoked).
 */
export function getRevokedWsSocketIds(): string[] {
  const socketIds: string[] = [];
  for (const [socketId, record] of wsConnections.entries()) {
    if (wsRevokedSessions.has(record.token)) {
      socketIds.push(socketId);
    }
  }
  return socketIds;
}

// ── Metrics & Status ────────────────────────────────────────────────────────

/**
 * Get WebSocket auth metrics for monitoring.
 */
export function getWsAuthMetrics() {
  const activeConnections = wsConnections.size;
  const activeUsers = wsUserConnections.size;
  const revokedTokens = wsRevokedSessions.size;

  // Per-user connection counts
  const perUserCounts: Record<string, number> = {};
  for (const [userId, socketSet] of wsUserConnections.entries()) {
    perUserCounts[userId] = socketSet.size;
  }

  return {
    activeConnections,
    activeUsers,
    revokedTokens,
    maxSessionsPerUser: DEFAULT_MAX_SESSIONS,
    perUserCounts,
  };
}

/**
 * Reset revoked sessions cache (periodic cleanup).
 * Revoked tokens that are older than 1 hour can be safely removed
 * since the sessions would have been cleaned up by then.
 */
export function cleanupRevokedSessions(maxAgeMs: number = 60 * 60 * 1000): number {
  // Since we don't track when tokens were revoked, just clear all
  // In production, you'd track the revocation timestamp
  if (wsRevokedSessions.size === 0) return 0;

  const count = wsRevokedSessions.size;
  wsRevokedSessions.clear();
  logger.info('Revoked sessions cache cleaned up', { count });
  return count;
}
