'use client'
import { redirect } from 'next/navigation'
import { usePathname } from 'next/navigation'
import ProtectedLayout from '@/components/ProtectedLayout'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import PermissionGuard from '@/components/guards/PermissionGuard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  if (pathname === '/admin') {
    redirect('/admin/dashboard')
  }
  
  return (
    <ProtectedLayout allowedRoles={['admin', 'manager', 'supervisor', 'technician', 'operator', 'planner', 'shop-attendant']}>
      <PermissionGuard requiredPermissions={['admin.access', 'settings.view', 'users.view']}>
        <DashboardLayout role="admin">{children}</DashboardLayout>
      </PermissionGuard>
    </ProtectedLayout>
  )
}
