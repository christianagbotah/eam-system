// Role-based redirect configuration
export const ROLE_REDIRECTS: Record<string, string> = {
  admin: '/admin/dashboard',
  manager: '/admin/dashboard',
  supervisor: '/admin/dashboard',
  planner: '/admin/dashboard',
  technician: '/technician/dashboard',
  operator: '/operator/dashboard',
  shop_attendant: '/shop-attendant/inventory',
};

export function getRoleDefaultPath(role: string): string {
  return ROLE_REDIRECTS[role] || '/admin/dashboard';
}

export function isAuthorizedForPath(role: string, path: string): boolean {
  // Admin has access to everything
  if (role === 'admin') return true;

  // Role-specific path restrictions
  const rolePathPatterns: Record<string, RegExp[]> = {
    technician: [
      /^\/technician\/.*/,
      /^\/admin\/notifications$/,
    ],
    operator: [
      /^\/operator\/.*/,
      /^\/admin\/notifications$/,
      /^\/admin\/downtime$/,
      /^\/admin\/meter-readings$/,
    ],
    shop_attendant: [
      /^\/shop-attendant\/.*/,
      /^\/admin\/inventory$/,
      /^\/admin\/notifications$/,
    ],
    supervisor: [
      /^\/admin\/.*/,
      /^\/supervisor\/.*/,
    ],
    manager: [
      /^\/admin\/.*/,
      /^\/manager\/.*/,
    ],
    planner: [
      /^\/admin\/.*/,
      /^\/planner\/.*/,
    ],
  };

  const patterns = rolePathPatterns[role] || [];
  return patterns.some(pattern => pattern.test(path));
}
