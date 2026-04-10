'use client';

import { useParams } from 'next/navigation';
import { useViewer3D } from '@/hooks/useViewer3D';
import AssetTreeViewer from '@/components/3d/AssetTreeViewer';
import Viewer3D from '@/components/3d/Viewer3D';
import ViewerControlsPanel from '@/components/3d/ViewerControls';
import BackButton from '@/components/BackButton';

export default function Viewer3DPage() {
  const params = useParams();
  const assetId = parseInt(params.id as string);
  
  const { viewerState, controls, viewerRef } = useViewer3D(assetId);

  const handleMeshClick = (meshId: string) => {
    controls.selectMesh(meshId);
  };

  const handleMeshHover = (meshId: string | null) => {
    controls.highlightMesh(meshId);
  };

  const handleTreeNodeClick = (meshId: string) => {
    controls.selectMesh(meshId);
  };

  const handleTreeNodeHover = (meshId: string | null) => {
    controls.highlightMesh(meshId);
  };

  const handleCameraChange = (camera: typeof viewerState.camera) => {
    // Sync camera state if needed
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-2xl font-bold text-gray-900">3D Asset Viewer</h1>
        </div>
        <div className="text-sm text-gray-600">
          Asset ID: {assetId}
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-80 flex-shrink-0">
          <AssetTreeViewer
            assetId={assetId}
            selectedMeshId={viewerState.selectedMeshId}
            highlightedMeshId={viewerState.highlightedMeshId}
            onNodeClick={handleTreeNodeClick}
            onNodeHover={handleTreeNodeHover}
          />
        </div>

        <div className="flex-1">
          <Viewer3D
            viewerState={viewerState}
            controls={controls}
            onMeshClick={handleMeshClick}
            onMeshHover={handleMeshHover}
            onCameraChange={handleCameraChange}
          />
        </div>

        <div className="w-64 flex-shrink-0">
          <ViewerControlsPanel
            viewerState={viewerState}
            controls={controls}
          />
        </div>
      </div>
    </div>
  );
}