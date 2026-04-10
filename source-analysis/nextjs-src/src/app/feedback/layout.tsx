import { PermissionGuard } from '@/components/PermissionGuard';

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="feedback.view">{children}</PermissionGuard>;
}
