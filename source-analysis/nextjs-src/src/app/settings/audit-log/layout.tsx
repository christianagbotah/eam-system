import { PermissionGuard } from '@/components/PermissionGuard';

export default function AuditLogLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="settings.view">{children}</PermissionGuard>;
}
