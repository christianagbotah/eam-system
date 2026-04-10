import { PermissionGuard } from '@/components/PermissionGuard';

export default function TimeLogsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permission="operations.view">
      {children}
    </PermissionGuard>
  );
}
