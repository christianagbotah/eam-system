'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import AssetSidebar from '@/components/assets/AssetSidebar'
import { showToast } from '@/lib/toast'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

const ModelViewer = dynamic(() => import('@/components/assets/ModelViewer'), { ssr: false })

export default function ThreeDViewerPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState({ id: '', name: '' })

  const handleExport = () => {
    showToast.success('3D viewer data exported')
  }

  useKeyboardShortcuts({ onExport: handleExport, onClose: () => setSidebarOpen(false) })

  const handlePartClick = (partId: string, partName: string) => {
    setSelectedAsset({ id: partId, name: partName })
    setSidebarOpen(true)
  }

  return (
    <div className="relative h-screen">
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg">
        <h1 className="text-base font-semibold mb-2">3D Asset Viewer</h1>
        <p className="text-sm text-gray-600">Click on parts to view details</p>
      </div>

      <ModelViewer
        modelUrl="/models/sample.glb"
        onPartClick={handlePartClick}
      />

      <AssetSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        assetId={selectedAsset.id}
        partName={selectedAsset.name}
      />
    </div>
  )
}
