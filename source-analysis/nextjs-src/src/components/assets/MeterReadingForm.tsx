'use client';

import { useState } from 'react';
import { useAlert } from '@/contexts/AlertContext';
import api from '@/lib/api';

interface MeterReadingFormProps {
  meterId: number;
  meterName: string;
  currentValue?: number;
  unit?: string;
  onSuccess?: () => void;
}

export default function MeterReadingForm({ 
  meterId, 
  meterName, 
  currentValue, 
  unit = '',
  onSuccess 
}: MeterReadingFormProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || isNaN(Number(value))) {
      showError('Invalid Input', 'Please enter a valid numeric value');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/meters/${meterId}/reading`, {
        value: parseFloat(value)
      });

      if (response.data.success) {
        showSuccess('Success', 'Meter reading recorded successfully');
        setValue('');
        onSuccess?.();
      } else {
        showError('Error', response.data.error || 'Failed to record reading');
      }
    } catch (error: any) {
      showError('Error', error.response?.data?.error || 'Failed to record reading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Record Meter Reading</h3>
      <div className="mb-4">
        <p className="text-sm text-gray-600">Meter: {meterName}</p>
        {currentValue !== undefined && (
          <p className="text-sm text-gray-600">Current Value: {currentValue} {unit}</p>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Reading {unit && `(${unit})`}
          </label>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter meter reading"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Recording...' : 'Record Reading'}
        </button>
      </form>
    </div>
  );
}
