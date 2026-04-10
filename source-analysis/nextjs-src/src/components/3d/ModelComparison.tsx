'use client';

import { useState } from 'react';
import ModelViewer from './ModelViewer';

export default function ModelComparison({ models }: { models: any[] }) {
  const [selectedModels, setSelectedModels] = useState<any[]>([]);

  const toggleModel = (model: any) => {
    if (selectedModels.find(m => m.id === model.id)) {
      setSelectedModels(selectedModels.filter(m => m.id !== model.id));
    } else if (selectedModels.length < 2) {
      setSelectedModels([...selectedModels, model]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Select 2 models to compare</h3>
        <div className="flex gap-2 flex-wrap">
          {models.map(model => (
            <button
              key={model.id}
              onClick={() => toggleModel(model)}
              className={`px-3 py-1 rounded ${
                selectedModels.find(m => m.id === model.id)
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border'
              }`}
            >
              {model.name}
            </button>
          ))}
        </div>
      </div>

      {selectedModels.length === 2 && (
        <div className="grid grid-cols-2 gap-4">
          {selectedModels.map(model => (
            <div key={model.id} className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">{model.name}</h4>
              <div className="h-[400px] bg-gray-100 rounded mb-4">
                <ModelViewer modelPath={model.file_path} />
              </div>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Format:</span> {model.format}</div>
                <div><span className="font-medium">Size:</span> {(model.file_size / 1024).toFixed(1)} KB</div>
                <div><span className="font-medium">Mappings:</span> {model.mappings_count || 0}</div>
                <div><span className="font-medium">Status:</span> {model.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
