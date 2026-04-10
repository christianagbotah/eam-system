import { PermissionGuard } from '@/components/PermissionGuard';

export default function AdjustmentsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="inventory.view">{children}</PermissionGuard>;
}
