'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import PermissionGuard from '@/components/guards/PermissionGuard';

export default function TechnicianLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedLayout allowedRoles={['technician']}>
      <PermissionGuard requiredPermissions={['work_orders.view', 'maintenance.execute']}>
        <DashboardLayout role="technician">{children}</DashboardLayout>
      </PermissionGuard>
    </ProtectedLayout>
  );
}
