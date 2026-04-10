// Re-export from auth.ts for backward compatibility
export {
  getSession,
  deleteSession,
  hasPermission,
  hasAnyPermission,
  hasRole,
  isAdmin,
} from '@/lib/auth';

// The actual in-memory store is managed by src/lib/auth.ts
