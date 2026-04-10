import { PermissionGuard } from '@/components/PermissionGuard';

export default function RolesLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="settings.view">{children}</PermissionGuard>;
}
