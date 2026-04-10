import { PermissionGuard } from '@/components/PermissionGuard';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="profile.view">{children}</PermissionGuard>;
}
