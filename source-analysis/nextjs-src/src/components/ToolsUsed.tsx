'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { Wrench, Plus, Trash2, Clock } from 'lucide-react';

interface ToolUsed {
  id: number;
  tool_name: string;
  tool_code?: string;
  source_type: string;
  quantity_used: number;
  usage_duration_minutes?: number;
  recorded_by_name: string;
  notes?: string;
  created_at: string;
}

interface ToolsUsedProps {
  workOrderId: number;
  userRole: string;
  readOnly?: boolean;
}

export default function ToolsUsed({ workOrderId, userRole, readOnly = false }: ToolsUsedProps) {
  const [toolsUsed, setToolsUsed] = useState<ToolUsed[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTools, setNewTools] = useState<any[]>([]);

  useEffect(() => {
    loadToolsUsed();
    if (!readOnly) {
      loadSuggestions();
    }
  }, [workOrderId]);

  const loadToolsUsed = async () => {
    try {
      const response = await api.get(`/work-orders/${workOrderId}/tools-used`);
      setToolsUsed(response.data.data || []);
    } catch (error) {
      console.error('Error loading tools used:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await api.get(`/work-orders/${workOrderId}/tools-used/suggestions`);
      const unrecorded = (response.data.data || []).filter((s: any) => !s.already_recorded);
      setSuggestions(unrecorded);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleAddFromSuggestions = () => {
    const toolsToAdd = suggestions.map(s => ({
      tool_id: s.tool_id,
      tool_name: s.tool_name,
      tool_code: s.tool_code,
      source_type: 'REQUESTED',
      tool_request_id: s.request_id,
      quantity_used: s.issued_quantity,
      usage_duration_minutes: null,
      notes: `From request ${s.request_number}`
    }));
    setNewTools(toolsToAdd);
    setShowAddModal(true);
  };

  const handleAddPersonalTool = () => {
    setNewTools([{
      tool_id: null,
      tool_name: '',
      tool_code: '',
      source_type: 'PERSONAL',
      tool_request_id: null,
      quantity_used: 1,
      usage_duration_minutes: null,
      notes: ''
    }]);
    setShowAddModal(true);
  };

  const handleSaveTools = async () => {
    const validTools = newTools.filter(t => t.tool_name.trim());
    if (validTools.length === 0) {
      alert.error('Error', 'Please enter at least one tool');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/work-orders/${workOrderId}/tools-used`, { tools: validTools });
      alert.success('Success', 'Tools recorded successfully');
      setShowAddModal(false);
      setNewTools([]);
      loadToolsUsed();
      loadSuggestions();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to record tools');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await alert.confirm('Delete Tool', 'Remove this tool from the record?');
    if (!confirmed) return;

    try {
      await api.delete(`/tools-used/${id}`);
      alert.success('Success', 'Tool removed');
      loadToolsUsed();
      loadSuggestions();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to delete');
    }
  };

  const getSourceBadge = (source: string) => {
    const badges: Record<string, string> = {
      REQUESTED: 'bg-blue-100 text-blue-800',
      PERSONAL: 'bg-green-100 text-green-800',
      SHOP_FLOOR: 'bg-purple-100 text-purple-800',
      OTHER: 'bg-gray-100 text-gray-800'
    };
    return badges[source] || badges.OTHER;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">🔧 Tools Used</h3>
        {!readOnly && (userRole === 'technician' || userRole === 'planner') && (
          <div className="flex gap-2">
            {suggestions.length > 0 && (
              <button
                onClick={handleAddFromSuggestions}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Issued Tools ({suggestions.length})
              </button>
            )}
            <button
              onClick={handleAddPersonalTool}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Personal Tool
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
              {!readOnly && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {toolsUsed.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 5 : 6} className="px-4 py-8 text-center text-gray-500">
                  No tools recorded yet
                </td>
              </tr>
            ) : (
              toolsUsed.map((tool) => (
                <tr key={tool.id}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{tool.tool_name}</div>
                    {tool.tool_code && <div className="text-xs text-gray-500">{tool.tool_code}</div>}
                    {tool.notes && <div className="text-xs text-gray-600 mt-1">{tool.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSourceBadge(tool.source_type)}`}>
                      {tool.source_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{tool.quantity_used}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {tool.usage_duration_minutes ? `${tool.usage_duration_minutes} min` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tool.recorded_by_name}</td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(tool.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Record Tools Used</h3>
            
            <div className="space-y-3">
              {newTools.map((tool, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tool Name *</label>
                      <input
                        type="text"
                        value={tool.tool_name}
                        onChange={(e) => {
                          const updated = [...newTools];
                          updated[idx].tool_name = e.target.value;
                          setNewTools(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., Wrench, Screwdriver"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tool Code</label>
                      <input
                        type="text"
                        value={tool.tool_code}
                        onChange={(e) => {
                          const updated = [...newTools];
                          updated[idx].tool_code = e.target.value;
                          setNewTools(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                      <select
                        value={tool.source_type}
                        onChange={(e) => {
                          const updated = [...newTools];
                          updated[idx].source_type = e.target.value;
                          setNewTools(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="PERSONAL">Personal</option>
                        <option value="REQUESTED">Requested</option>
                        <option value="SHOP_FLOOR">Shop Floor</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={tool.quantity_used}
                        onChange={(e) => {
                          const updated = [...newTools];
                          updated[idx].quantity_used = parseInt(e.target.value) || 1;
                          setNewTools(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                      <input
                        type="number"
                        min="0"
                        value={tool.usage_duration_minutes || ''}
                        onChange={(e) => {
                          const updated = [...newTools];
                          updated[idx].usage_duration_minutes = e.target.value ? parseInt(e.target.value) : null;
                          setNewTools(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={tool.notes}
                      onChange={(e) => {
                        const updated = [...newTools];
                        updated[idx].notes = e.target.value;
                        setNewTools(updated);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Optional notes"
                    />
                  </div>
                  
                  {newTools.length > 1 && (
                    <button
                      onClick={() => setNewTools(newTools.filter((_, i) => i !== idx))}
                      className="text-red-600 text-sm hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              
              <button
                onClick={() => setNewTools([...newTools, {
                  tool_id: null,
                  tool_name: '',
                  tool_code: '',
                  source_type: 'PERSONAL',
                  tool_request_id: null,
                  quantity_used: 1,
                  usage_duration_minutes: null,
                  notes: ''
                }])}
                className="text-blue-600 text-sm hover:text-blue-800 font-medium"
              >
                + Add Another Tool
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveTools}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Tools'}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewTools([]);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
