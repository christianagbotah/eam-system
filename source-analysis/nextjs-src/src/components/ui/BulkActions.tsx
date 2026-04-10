import { useState } from 'react';

interface BulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  onExport: () => void;
  onClear: () => void;
}

export function BulkActions({ selectedCount, onDelete, onExport, onClear }: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
      <span className="text-blue-900 font-medium">{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</span>
      <div className="flex gap-2">
        <button onClick={onExport} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
          📥 Export Selected
        </button>
        <button onClick={onDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
          🗑️ Delete Selected
        </button>
        <button onClick={onClear} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm">
          Clear
        </button>
      </div>
    </div>
  );
}
