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
        <h1 className="text-2xl font-bold">Asset Health Dashboard</h1>
        <p className="text-gray-600 mt-1">Real-time asset health monitoring and analytics</p>
      </div>
      
      <AssetHealthDashboard />
    </div>
  );
}
