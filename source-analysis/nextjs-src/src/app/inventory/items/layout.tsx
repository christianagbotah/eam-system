import { PermissionGuard } from '@/components/PermissionGuard';

export default function ItemsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="inventory.view">{children}</PermissionGuard>;
}
