'use client';

import { useState } from 'react';

interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
  type: 'text' | 'photo' | 'measurement';
  value?: string;
  completed_at?: string;
  completed_by?: number;
}

interface ChecklistViewProps {
  checklist: ChecklistItem[];
  onUpdate: (checklist: ChecklistItem[]) => void;
  readOnly?: boolean;
}

export default function ChecklistView({ checklist, onUpdate, readOnly = false }: ChecklistViewProps) {
  const [items, setItems] = useState<ChecklistItem[]>(checklist || []);

  const handleCheck = (id: string) => {
    const updated = items.map(item => 
      item.id === id ? { ...item, completed_at: item.completed_at ? undefined : new Date().toISOString() } : item
    );
    setItems(updated);
    onUpdate(updated);
  };

  const handleValueChange = (id: string, value: string) => {
    const updated = items.map(item => item.id === id ? { ...item, value } : item);
    setItems(updated);
    onUpdate(updated);
  };

  const handlePhotoUpload = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('checklist_item_id', id);
    
    const updated = items.map(item => 
      item.id === id ? { ...item, value: URL.createObjectURL(file) } : item
    );
    setItems(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="border rounded-lg p-4 bg-white">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={!!item.completed_at}
              onChange={() => handleCheck(item.id)}
              disabled={readOnly}
              className="mt-1 h-5 w-5 text-blue-600 rounded"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`font-medium ${item.completed_at ? 'line-through text-gray-500' : ''}`}>
                  {item.text}
                </p>
                {item.required && <span className="text-red-500 text-xs">*Required</span>}
              </div>

              {item.type === 'text' && (
                <input
                  type="text"
                  value={item.value || ''}
                  onChange={(e) => handleValueChange(item.id, e.target.value)}
                  disabled={readOnly}
                  placeholder="Enter value..."
                  className="mt-2 w-full border rounded px-3 py-2 text-sm"
                />
              )}

              {item.type === 'measurement' && (
                <input
                  type="number"
                  value={item.value || ''}
                  onChange={(e) => handleValueChange(item.id, e.target.value)}
                  disabled={readOnly}
                  placeholder="Enter measurement..."
                  className="mt-2 w-full border rounded px-3 py-2 text-sm"
                />
              )}

              {item.type === 'photo' && (
                <div className="mt-2">
                  {item.value ? (
                    <div className="relative">
                      <img src={item.value} alt="Checklist item" className="w-32 h-32 object-cover rounded" />
                      {!readOnly && (
                        <button
                          onClick={() => handleValueChange(item.id, '')}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                        >×</button>
                      )}
                    </div>
                  ) : !readOnly && (
                    <label className="cursor-pointer inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm">
                      📷 Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handlePhotoUpload(item.id, e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              {item.completed_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Completed: {new Date(item.completed_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
