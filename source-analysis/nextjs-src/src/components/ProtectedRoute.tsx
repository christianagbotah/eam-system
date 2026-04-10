'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { checkAuth } from '@/middleware/auth';

export default function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const [authorized, setAuthorized] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = checkAuth();
    if (!auth) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
      setAuthorized(false);
      return;
    }
    if (allowedRoles && !allowedRoles.includes(auth.user.role)) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
  }, [pathname]);

  if (!authorized) {
    return null;
  }
  
  return <>{children}</>;
}
