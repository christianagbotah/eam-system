import { PermissionGuard } from '@/components/PermissionGuard';

export default function TransactionsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="inventory.view">{children}</PermissionGuard>;
}
