'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function ToolTrackingPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">🔧 Tool & Consumable Tracking</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Tools Changed</div>
            <div className="text-base font-semibold">0</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Consumables Used</div>
            <div className="text-base font-semibold">0</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Cost</div>
            <div className="text-base font-semibold">$0.00</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-800">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Tool and consumable data is logged in production surveys. View aggregated usage and costs here.</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Tool Changes</h2>
          <div className="text-center py-8 text-gray-500">
            No tool changes recorded yet
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
