import { PermissionGuard } from '@/components/PermissionGuard';

export default function QualityReportsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="reports.view">{children}</PermissionGuard>;
}
