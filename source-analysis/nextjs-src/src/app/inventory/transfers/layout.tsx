import { PermissionGuard } from '@/components/PermissionGuard';

export default function TransfersLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="inventory.view">{children}</PermissionGuard>;
}
