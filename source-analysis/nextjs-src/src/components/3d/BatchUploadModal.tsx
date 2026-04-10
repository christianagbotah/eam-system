'use client';

import { useState } from 'react';

export default function BatchUploadModal({ onClose, onSuccess }: any) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [machineId, setMachineId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleUpload = async () => {
    if (!files) return;

    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('models[]', file));
    if (machineId) formData.append('machine_id', machineId);

    const res = await fetch('/api/v1/eam/models/batch/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    setResults(data);
    setUploading(false);
    
    if (data.success.length > 0) {
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Batch Upload Models</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Models (GLB, GLTF, OBJ, FBX, STL)</label>
            <input
              type="file"
              multiple
              accept=".glb,.gltf,.obj,.fbx,.stl"
              onChange={(e) => setFiles(e.target.files)}
              className="w-full border rounded p-2"
            />
            {files && <div className="text-sm text-gray-600 mt-1">{files.length} files selected</div>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Machine ID (Optional)</label>
            <input
              type="text"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Leave empty for unassigned"
            />
          </div>

          {results && (
            <div className="border rounded p-4 space-y-2">
              <div className="text-green-600">✓ Success: {results.success.length}</div>
              <div className="text-red-600">✗ Failed: {results.failed.length}</div>
              {results.failed.map((f: any, i: number) => (
                <div key={i} className="text-sm text-red-500">{f.file}: {f.error}</div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleUpload}
            disabled={!files || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload All'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
