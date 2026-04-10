'use client';

import { PermissionGuard } from '@/components/guards/PermissionGuard';

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['teams.view', 'users.view']} requireAll={false}>
      {children}
    </PermissionGuard>
  );
}
