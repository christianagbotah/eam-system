import { PermissionGuard } from '@/components/PermissionGuard';

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="changelog.view">{children}</PermissionGuard>;
}
