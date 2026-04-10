import { PermissionGuard } from '@/components/PermissionGuard';

export default function ResourcePlanningLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permission="production.view">
      {children}
    </PermissionGuard>
  );
}
