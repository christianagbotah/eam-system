'use client';

import PermissionGuard from '@/components/guards/PermissionGuard';

export default function WorkOrdersLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard 
      permissions={['work_orders.view', 'work_orders.view_own', 'work_orders.view_all', 'work_orders.view_team']}
      requireAll={false}
    >
      {children}
    </PermissionGuard>
  );
}
