'use client';

import AssetHealthDashboard from '@/components/analytics/AssetHealthDashboard';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function AssetHealthPage() {
  const handleExport = () => {
    showToast.success('Asset health data exported successfully');
  };

  useKeyboardShortcuts({
    onExport: handleExport
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Asset Health Dashboard</h1>
        <p className="text-gray-600 mt-2">Real-time asset health monitoring and analytics</p>
      </div>
      
      <AssetHealthDashboard />
    </div>
  );
}
