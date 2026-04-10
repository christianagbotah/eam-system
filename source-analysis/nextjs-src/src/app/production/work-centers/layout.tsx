import { PermissionGuard } from '@/components/PermissionGuard';

export default function WorkCentersLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permission="production.view">
      {children}
    </PermissionGuard>
  );
}
