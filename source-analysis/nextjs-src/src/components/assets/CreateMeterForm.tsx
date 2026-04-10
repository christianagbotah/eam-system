'use client';

import { useState } from 'react';
import { useAlert } from '@/contexts/AlertContext';
import api from '@/lib/api';

interface CreateMeterFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateMeterForm({ onSuccess, onCancel }: CreateMeterFormProps) {
  const [formData, setFormData] = useState({
    asset_node_type: 'equipment',
    asset_node_id: '',
    meter_type: '',
    unit: '',
    value: '0'
  });
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/meters', {
        ...formData,
        asset_node_id: parseInt(formData.asset_node_id),
        value: parseFloat(formData.value)
      });

      if (response.data.success) {
        showSuccess('Success', 'Meter created successfully');
        onSuccess?.();
      } else {
        showError('Error', response.data.error || 'Failed to create meter');
      }
    } catch (error: any) {
      showError('Error', error.response?.data?.error || 'Failed to create meter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset Type
            </label>
            <select
              value={formData.asset_node_type}
              onChange={(e) => setFormData(prev => ({ ...prev, asset_node_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="equipment">Equipment</option>
              <option value="machine">Machine</option>
              <option value="assembly">Assembly</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset ID
            </label>
            <input
              type="number"
              value={formData.asset_node_id}
              onChange={(e) => setFormData(prev => ({ ...prev, asset_node_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter asset ID"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meter Type
            </label>
            <select
              value={formData.meter_type}
              onChange={(e) => setFormData(prev => ({ ...prev, meter_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select meter type</option>
              <option value="operating_hours">Operating Hours</option>
              <option value="production_count">Production Count</option>
              <option value="temperature">Temperature</option>
              <option value="pressure">Pressure</option>
              <option value="vibration">Vibration</option>
              <option value="energy_consumption">Energy Consumption</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., hrs, pcs, °C, bar"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Value
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.value}
            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
          />
        </div>

        <div className="flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Meter'}
          </button>
        </div>
      </form>
  );
}
