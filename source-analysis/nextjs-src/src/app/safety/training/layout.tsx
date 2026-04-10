import { PermissionGuard } from '@/components/PermissionGuard';

export default function SafetyTrainingLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="safety.view">{children}</PermissionGuard>;
}
