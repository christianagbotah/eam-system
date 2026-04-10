'use client'
import { showToast } from '@/lib/toast'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export default function GltfCreatorPage() {
  const handleExport = () => {
    showToast.success('glTF model exported')
  }

  useKeyboardShortcuts({ onExport: handleExport })

  return (
    <div className="p-8">
      <h1 className="text-base font-semibold">glTF Creator</h1>
      <p>Loading...</p>
    </div>
  )
}
