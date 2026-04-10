import { PermissionGuard } from '@/components/PermissionGuard';

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="about.view">{children}</PermissionGuard>;
}
