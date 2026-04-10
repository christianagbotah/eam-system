import { PermissionGuard } from '@/components/PermissionGuard';

export default function ChecklistsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permission="operations.view">
      {children}
    </PermissionGuard>
  );
}
