'use client';

import { useState } from 'react';
import AssetHierarchyTree from '@/components/asset/AssetHierarchyTree';
import Asset3DViewer from '@/components/asset/Asset3DViewer';
import AssetHealthMatrix from '@/components/asset/AssetHealthMatrix';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function GradeAPage() {
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const handleExport = () => {
    showToast.success('Grade-A data exported');
  };

  useKeyboardShortcuts({ onExport: handleExport });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Grade-A Features</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AssetHierarchyTree onNodeClick={setSelectedAsset} />
        
        {selectedAsset && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Selected Asset</h3>
              <p><strong>Name:</strong> {selectedAsset.asset_name}</p>
              <p><strong>Type:</strong> {selectedAsset.asset_type}</p>
              <p><strong>Status:</strong> {selectedAsset.status}</p>
            </div>
            <Asset3DViewer assetId={selectedAsset.id} />
          </div>
        )}
      </div>

      <AssetHealthMatrix />
    </div>
  );
}
