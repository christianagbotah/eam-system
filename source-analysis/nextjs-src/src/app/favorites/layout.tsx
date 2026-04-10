import { PermissionGuard } from '@/components/PermissionGuard';

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="favorites.view">{children}</PermissionGuard>;
}
