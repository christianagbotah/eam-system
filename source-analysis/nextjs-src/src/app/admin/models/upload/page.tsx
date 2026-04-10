'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ModelUploadModal from '@/components/3d/ModelUploadModal';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function ModelUploadPage() {
  const router = useRouter();
  const [selectedMachine, setSelectedMachine] = useState<any>(null);

  useKeyboardShortcuts({
    onClose: () => router.push('/admin/models')
  });

  const handleUpload = async (file: File, modelType: '2D' | '3D', machineId: number) => {
    showToast.success('Model uploaded successfully');
    router.push('/admin/models');
  };

  return (
    <div className="p-6">
      <h1 className="text-base font-semibold mb-6">Upload Model</h1>
      
      <div className="max-w-2xl">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Machine</label>
          <select
            value={selectedMachine?.id || ''}
            onChange={(e) => {
              // TODO: Load machine data
              setSelectedMachine({ id: parseInt(e.target.value), name: 'Machine Name' });
            }}
            className="w-full px-2.5 py-1.5 text-sm border rounded-lg"
          >
            <option value="">Select a machine...</option>
            <option value="1">CNC Machine #1</option>
            <option value="2">Hydraulic Press #2</option>
          </select>
        </div>

        {selectedMachine && (
          <ModelUploadModal
            isOpen={true}
            onClose={() => router.push('/admin/models')}
            onUpload={handleUpload}
            machineId={selectedMachine.id}
            machineName={selectedMachine.name}
          />
        )}
      </div>
    </div>
  );
}
