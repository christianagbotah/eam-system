import { PermissionGuard } from '@/components/PermissionGuard';

export default function BackupLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="settings.view">{children}</PermissionGuard>;
}
