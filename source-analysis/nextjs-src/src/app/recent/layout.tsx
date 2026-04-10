import { PermissionGuard } from '@/components/PermissionGuard';

export default function RecentLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="recent.view">{children}</PermissionGuard>;
}
