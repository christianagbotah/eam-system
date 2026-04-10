'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface RequestAdditionalHelpProps {
  workOrderId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestAdditionalHelp({ workOrderId, onClose, onSuccess }: RequestAdditionalHelpProps) {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<number[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableTechnicians();
  }, []);

  const loadAvailableTechnicians = async () => {
    try {
      const res = await api.get('/users/technicians/list');
      setTechnicians(res.data?.data || []);
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const toggleTechnician = (techId: number) => {
    setSelectedTechs(prev => 
      prev.includes(techId) ? prev.filter(id => id !== techId) : [...prev, techId]
    );
  };

  const handleSubmit = async () => {
    if (selectedTechs.length === 0) {
      alert('Please select at least one technician');
      return;
    }
    if (!reason.trim()) {
      alert('Please provide a reason for the request');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/work-order-team/${workOrderId}/request-help`, {
        technician_ids: selectedTechs,
        reason
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to request help');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Request Additional Help</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Additional Technicians</label>
          <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
            {technicians.map(tech => (
              <label key={tech.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTechs.includes(tech.id)}
                  onChange={() => toggleTechnician(tech.id)}
                  className="w-4 h-4"
                />
                <span>{tech.full_name || tech.username}</span>
                <span className="text-xs text-gray-500">({tech.trade || 'General'})</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Reason for Request *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            rows={4}
            placeholder="Explain why additional help is needed..."
          />
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
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            disabled={loading}
          >
            {loading ? 'Requesting...' : 'Request Help'}
          </button>
        </div>
      </div>
    </div>
  );
}
