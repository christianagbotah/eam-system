import { PermissionGuard } from '@/components/PermissionGuard';

export default function SafetyReportsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="reports.view">{children}</PermissionGuard>;
}
