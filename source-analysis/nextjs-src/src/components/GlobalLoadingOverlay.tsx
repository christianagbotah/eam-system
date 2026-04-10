'use client';

import { useLoading } from '@/contexts/LoadingContext';

export default function GlobalLoadingOverlay() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl p-6 flex items-center gap-4 pointer-events-auto">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="text-gray-700 font-medium">Processing...</span>
      </div>
    </div>
  );
}