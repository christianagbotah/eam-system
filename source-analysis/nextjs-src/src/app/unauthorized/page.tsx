'use client';

import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-3 flex items-center justify-center">
          <span className="text-4xl">🚫</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium"
          >
            Go Back
          </button>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
          >
            Login with Different Account
          </button>
        </div>
      </div>
    </div>
  );
}
