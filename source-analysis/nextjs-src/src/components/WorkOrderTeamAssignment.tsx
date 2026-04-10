'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface WorkOrderTeamAssignmentProps {
  workOrderId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WorkOrderTeamAssignment({ workOrderId, onClose, onSuccess }: WorkOrderTeamAssignmentProps) {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<number[]>([]);
  const [teamLeaderId, setTeamLeaderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
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
    if (!teamLeaderId) {
      alert('Please select a team leader');
      return;
    }

    setLoading(true);
    try {
      // Assign team lead first
      await api.post(`/maintenance-orders/${workOrderId}/team`, {
        technician_id: teamLeaderId,
        role: 'team_lead',
        assigned_by: 1 // TODO: Get from auth
      });

      // Assign assistants
      for (const techId of selectedTechs.filter(id => id !== teamLeaderId)) {
        await api.post(`/maintenance-orders/${workOrderId}/team`, {
          technician_id: techId,
          role: 'assistant',
          assigned_by: 1 // TODO: Get from auth
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to assign team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Assign Team to Work Order</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Technicians</label>
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
          <label className="block text-sm font-medium mb-2">Team Leader *</label>
          <select
            value={teamLeaderId || ''}
            onChange={(e) => setTeamLeaderId(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Select Team Leader</option>
            {selectedTechs.map(techId => {
              const tech = technicians.find(t => t.id === techId);
              return tech ? (
                <option key={tech.id} value={tech.id}>
                  {tech.full_name || tech.username}
                </option>
              ) : null;
            })}
          </select>
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
            {loading ? 'Assigning...' : 'Assign Team'}
          </button>
        </div>
      </div>
    </div>
  );
}
