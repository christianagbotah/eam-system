'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import SearchableSelect from '../SearchableSelect';

interface PMAssignFormProps {
  partId: number;
  partName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PMAssignForm({ partId, partName, onSuccess, onCancel }: PMAssignFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    frequency_type: 'time_based',
    interval_days: 30,
    interval_usage: 0,
    priority: 'medium',
    auto_generate_wo: true,
    checklist: [''],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createPMRule({
        part_id: partId,
        ...formData,
        checklist: formData.checklist.filter(item => item.trim()),
      });
      onSuccess();
    } catch (error) {
      alert('Failed to create PM rule');
    } finally {
      setLoading(false);
    }
  };

  const addChecklistItem = () => {
    setFormData({ ...formData, checklist: [...formData.checklist, ''] });
  };

  const updateChecklistItem = (index: number, value: string) => {
    const newChecklist = [...formData.checklist];
    newChecklist[index] = value;
    setFormData({ ...formData, checklist: newChecklist });
  };

  const removeChecklistItem = (index: number) => {
    setFormData({ ...formData, checklist: formData.checklist.filter((_, i) => i !== index) });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Assign PM Task</h3>
      <p className="text-sm text-gray-600 mb-6">Part: {partName}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <SearchableSelect
            value={formData.frequency_type}
            onChange={(val) => setFormData({ ...formData, frequency_type: val })}
            options={[
              { id: 'time_based', label: 'Time-Based' },
              { id: 'usage_based', label: 'Usage-Based' },
              { id: 'hybrid', label: 'Hybrid (Time + Usage)' }
            ]}
            placeholder="Select Frequency Type"
            label="Frequency Type"
          />
        </div>

        {(formData.frequency_type === 'time_based' || formData.frequency_type === 'hybrid') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Interval (Days)</label>
            <input
              type="number"
              value={formData.interval_days}
              onChange={(e) => setFormData({ ...formData, interval_days: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
        )}

        {(formData.frequency_type === 'usage_based' || formData.frequency_type === 'hybrid') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Interval (Usage Hours)</label>
            <input
              type="number"
              value={formData.interval_usage}
              onChange={(e) => setFormData({ ...formData, interval_usage: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
        )}

        <div>
          <SearchableSelect
            value={formData.priority}
            onChange={(val) => setFormData({ ...formData, priority: val })}
            options={[
              { id: 'low', label: 'Low' },
              { id: 'medium', label: 'Medium' },
              { id: 'high', label: 'High' },
              { id: 'critical', label: 'Critical' }
            ]}
            placeholder="Select Priority"
            label="Priority"
          />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.auto_generate_wo}
              onChange={(e) => setFormData({ ...formData, auto_generate_wo: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-generate work orders</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Checklist Items</label>
          <div className="space-y-2">
            {formData.checklist.map((item, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateChecklistItem(index, e.target.value)}
                  placeholder={`Item ${index + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeChecklistItem(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addChecklistItem}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            + Add Item
          </button>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create PM Rule'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
