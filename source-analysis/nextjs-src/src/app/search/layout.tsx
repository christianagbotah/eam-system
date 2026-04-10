import { PermissionGuard } from '@/components/PermissionGuard';

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="search.view">{children}</PermissionGuard>;
}
