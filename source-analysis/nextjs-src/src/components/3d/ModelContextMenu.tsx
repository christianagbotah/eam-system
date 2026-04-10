'use client';

import { useState, useEffect } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  model: any;
  onClose: () => void;
  onAction: (action: string) => void;
}

export default function ModelContextMenu({ x, y, model, onClose, onAction }: ContextMenuProps) {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  const actions = [
    { id: 'view', label: '👁️ View Details', color: 'text-blue-600' },
    { id: 'edit', label: '✏️ Edit', color: 'text-gray-700' },
    { id: 'clone', label: '📋 Clone', color: 'text-green-600' },
    { id: 'export', label: '📤 Export Mappings', color: 'text-purple-600' },
    { id: 'download', label: '⬇️ Download Model', color: 'text-indigo-600' },
    { id: 'delete', label: '🗑️ Delete', color: 'text-red-600' }
  ];

  return (
    <div
      className="fixed bg-white shadow-lg rounded-lg border py-1 z-50 min-w-[200px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b text-sm font-semibold text-gray-700">
        {model.name}
      </div>
      {actions.map(action => (
        <button
          key={action.id}
          onClick={() => {
            onAction(action.id);
            onClose();
          }}
          className={`w-full text-left px-3 py-2 hover:bg-gray-100 text-sm ${action.color}`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
