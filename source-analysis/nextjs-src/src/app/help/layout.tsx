import { PermissionGuard } from '@/components/PermissionGuard';

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="help.view">{children}</PermissionGuard>;
}
