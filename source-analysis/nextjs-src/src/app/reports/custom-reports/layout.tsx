import { PermissionGuard } from '@/components/PermissionGuard';

export default function CustomReportsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="reports.view">{children}</PermissionGuard>;
}
