import { PermissionGuard } from '@/components/PermissionGuard';

export default function LocationsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="inventory.view">{children}</PermissionGuard>;
}
