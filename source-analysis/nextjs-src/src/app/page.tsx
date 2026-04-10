'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuth } from '@/middleware/auth';
import { getRoleDefaultPath } from '@/lib/roleRedirects';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const auth = checkAuth();
    if (!auth) {
      router.replace('/login');
    } else {
      const defaultPath = getRoleDefaultPath(auth.user.role);
      router.replace(defaultPath);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
