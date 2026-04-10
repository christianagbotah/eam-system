import { PermissionGuard } from '@/components/PermissionGuard';

export default function AuditsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="quality.view">{children}</PermissionGuard>;
}
