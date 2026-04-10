import { PermissionGuard } from '@/components/PermissionGuard';

export default function SafetyInspectionsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="safety.view">{children}</PermissionGuard>;
}
