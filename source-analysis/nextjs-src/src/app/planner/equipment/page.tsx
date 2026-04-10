'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlannerEquipmentPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/machine/machineLists');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading equipment...</p>
      </div>
    </div>
  );
}
