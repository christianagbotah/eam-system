import { PermissionGuard } from '@/components/PermissionGuard';

export default function GeneralLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="settings.view">{children}</PermissionGuard>;
}
