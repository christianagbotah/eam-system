'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface ForwardToSupervisorProps {
  workOrderId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ForwardToSupervisor({ workOrderId, onClose, onSuccess }: ForwardToSupervisorProps) {
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSupervisors();
  }, []);

  const loadSupervisors = async () => {
    try {
      const res = await api.get('/users/supervisors/list');
      setSupervisors(res.data?.data || []);
    } catch (error) {
      console.error('Error loading supervisors:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSupervisor) {
      alert('Please select a supervisor');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/work-order-team/${workOrderId}/forward`, {
        supervisor_id: selectedSupervisor
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to forward work order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Forward to Supervisor</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Supervisor *</label>
          <select
            value={selectedSupervisor || ''}
            onChange={(e) => setSelectedSupervisor(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Choose Supervisor</option>
            {supervisors.map(sup => (
              <option key={sup.id} value={sup.id}>
                {sup.full_name || sup.username} - {sup.department_name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Supervisor will assign technicians from their department
          </p>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Forwarding...' : 'Forward'}
          </button>
        </div>
      </div>
    </div>
  );
}
