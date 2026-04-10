'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { ButtonHTMLAttributes } from 'react';

interface PermissionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  permission: string;
  children: React.ReactNode;
}

export default function PermissionButton({
  permission,
  children,
  ...props
}: PermissionButtonProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return null;
  }

  return <button {...props}>{children}</button>;
}
