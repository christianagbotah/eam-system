import { PermissionGuard } from '@/components/PermissionGuard';

export default function ProductionReportsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="reports.view">{children}</PermissionGuard>;
}
