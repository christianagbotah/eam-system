import { PermissionGuard } from '@/components/PermissionGuard';

export default function PermitsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="safety.view">{children}</PermissionGuard>;
}
