import { PermissionGuard } from '@/components/PermissionGuard';

export default function QuickActionsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="quick_actions.view">{children}</PermissionGuard>;
}
