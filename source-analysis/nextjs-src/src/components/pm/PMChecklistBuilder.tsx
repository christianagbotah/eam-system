'use client';

import { useState } from 'react';
import { PMChecklist, PMChecklistItem } from '@/services/pmService';

interface PMChecklistBuilderProps {
  checklists: PMChecklist[];
  onChange: (checklists: PMChecklist[]) => void;
}

export default function PMChecklistBuilder({ checklists, onChange }: PMChecklistBuilderProps) {
  const [expandedChecklist, setExpandedChecklist] = useState<number | null>(null);

  const addChecklist = () => {
    const newChecklist: PMChecklist = {
      title: 'New Checklist',
      sequence: checklists.length + 1,
      items: []
    };
    onChange([...checklists, newChecklist]);
    setExpandedChecklist(checklists.length);
  };

  const updateChecklist = (index: number, checklist: PMChecklist) => {
    const updated = [...checklists];
    updated[index] = checklist;
    onChange(updated);
  };

  const removeChecklist = (index: number) => {
    onChange(checklists.filter((_, i) => i !== index));
    if (expandedChecklist === index) {
      setExpandedChecklist(null);
    }
  };

  const addItem = (checklistIndex: number) => {
    const checklist = checklists[checklistIndex];
    const newItem: PMChecklistItem = {
      item_text: 'New checklist item',
      item_type: 'yesno',
      required: false,
      sequence: (checklist.items?.length || 0) + 1
    };
    
    const updatedChecklist = {
      ...checklist,
      items: [...(checklist.items || []), newItem]
    };
    updateChecklist(checklistIndex, updatedChecklist);
  };

  const updateItem = (checklistIndex: number, itemIndex: number, item: PMChecklistItem) => {
    const checklist = checklists[checklistIndex];
    const updatedItems = [...(checklist.items || [])];
    updatedItems[itemIndex] = item;
    
    const updatedChecklist = {
      ...checklist,
      items: updatedItems
    };
    updateChecklist(checklistIndex, updatedChecklist);
  };

  const removeItem = (checklistIndex: number, itemIndex: number) => {
    const checklist = checklists[checklistIndex];
    const updatedItems = (checklist.items || []).filter((_, i) => i !== itemIndex);
    
    const updatedChecklist = {
      ...checklist,
      items: updatedItems
    };
    updateChecklist(checklistIndex, updatedChecklist);
  };

  const moveItem = (checklistIndex: number, itemIndex: number, direction: 'up' | 'down') => {
    const checklist = checklists[checklistIndex];
    const items = [...(checklist.items || [])];
    const newIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    
    if (newIndex >= 0 && newIndex < items.length) {
      [items[itemIndex], items[newIndex]] = [items[newIndex], items[itemIndex]];
      
      // Update sequences
      items.forEach((item, index) => {
        item.sequence = index + 1;
      });
      
      const updatedChecklist = {
        ...checklist,
        items
      };
      updateChecklist(checklistIndex, updatedChecklist);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">PM Checklists</h3>
        <button
          type="button"
          onClick={addChecklist}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Add Checklist
        </button>
      </div>

      <div className="space-y-3">
        {checklists.map((checklist, checklistIndex) => (
          <div key={checklistIndex} className="border rounded-lg">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedChecklist(
                expandedChecklist === checklistIndex ? null : checklistIndex
              )}
            >
              <div className="flex items-center space-x-3">
                <svg
                  className={`w-5 h-5 transform transition-transform ${
                    expandedChecklist === checklistIndex ? 'rotate-90' : ''
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-medium">{checklist.title}</div>
                  <div className="text-sm text-gray-600">
                    {checklist.items?.length || 0} items
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeChecklist(checklistIndex);
                }}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>

            {expandedChecklist === checklistIndex && (
              <div className="border-t p-4 space-y-4">
                {/* Checklist Title */}
                <div>
                  <label className="block text-sm font-medium mb-1">Checklist Title</label>
                  <input
                    type="text"
                    value={checklist.title}
                    onChange={(e) => updateChecklist(checklistIndex, {
                      ...checklist,
                      title: e.target.value
                    })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                {/* Checklist Items */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Checklist Items</h4>
                    <button
                      type="button"
                      onClick={() => addItem(checklistIndex)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(checklist.items || []).map((item, itemIndex) => (
                      <div key={itemIndex} className="border rounded p-3 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Item Text</label>
                            <input
                              type="text"
                              value={item.item_text}
                              onChange={(e) => updateItem(checklistIndex, itemIndex, {
                                ...item,
                                item_text: e.target.value
                              })}
                              className="w-full border rounded px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Type</label>
                            <select
                              value={item.item_type}
                              onChange={(e) => updateItem(checklistIndex, itemIndex, {
                                ...item,
                                item_type: e.target.value as PMChecklistItem['item_type']
                              })}
                              className="w-full border rounded px-3 py-2"
                            >
                              <option value="yesno">Yes/No</option>
                              <option value="passfail">Pass/Fail</option>
                              <option value="numeric">Numeric</option>
                              <option value="text">Text</option>
                              <option value="photo">Photo</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-4">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={item.required}
                                onChange={(e) => updateItem(checklistIndex, itemIndex, {
                                  ...item,
                                  required: e.target.checked
                                })}
                                className="mr-2"
                              />
                              <span className="text-sm">Required</span>
                            </label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => moveItem(checklistIndex, itemIndex, 'up')}
                              disabled={itemIndex === 0}
                              className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem(checklistIndex, itemIndex, 'down')}
                              disabled={itemIndex === (checklist.items?.length || 0) - 1}
                              className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(checklistIndex, itemIndex)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {checklists.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No checklists added yet.</p>
          <p className="text-sm">Click "Add Checklist" to create your first checklist.</p>
        </div>
      )}
    </div>
  );
}
