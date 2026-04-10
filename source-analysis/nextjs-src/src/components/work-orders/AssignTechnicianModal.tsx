'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

interface AssignTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (userId: number) => void;
  workOrderId: number;
  currentAssignee?: User;
}

export default function AssignTechnicianModal({
  isOpen,
  onClose,
  onAssign,
  workOrderId,
  currentAssignee
}: AssignTechnicianModalProps) {
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTechnicians();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(currentAssignee?.id || null);
    }
  }, [isOpen, currentAssignee]);

  const fetchTechnicians = async () => {
    try {
      const response = await api.get('/users');
      console.log('Users API Response:', response.data);
      const users = response.data.data || response.data || [];
      const techs = users.filter((u: User) => u.role?.toLowerCase() === 'technician');
      console.log('Filtered Technicians:', techs);
      setTechnicians(techs);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    try {
      await onAssign(selectedUserId);
      onClose();
    } catch (error) {
      console.error('Error assigning technician:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Assign Technician</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Technician
          </label>
          <select
            value={selectedUserId || ''}
            onChange={(e) => setSelectedUserId(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a technician...</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.full_name || tech.username} ({tech.role})
              </option>
            ))}
          </select>
        </div>

        {currentAssignee && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              Currently assigned to: <span className="font-medium">{currentAssignee.full_name || currentAssignee.username}</span>
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedUserId || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
