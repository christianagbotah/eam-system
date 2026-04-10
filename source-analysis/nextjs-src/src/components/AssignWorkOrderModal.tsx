'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { X, User, Users } from 'lucide-react';

interface AssignWorkOrderModalProps {
  workOrderId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AssignWorkOrderModal({ workOrderId, onSuccess, onCancel }: AssignWorkOrderModalProps) {
  const [assignmentType, setAssignmentType] = useState<'supervisor' | 'technician'>('supervisor');
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const [supRes, techRes] = await Promise.all([
        api.get('/users?role=supervisor'),
        api.get('/users?role=technician')
      ]);
      
      if (supRes.data?.status === 'success') setSupervisors(supRes.data.data || []);
      if (techRes.data?.status === 'success') setTechnicians(techRes.data.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      alert.error('Error', 'Please select a user');
      return;
    }

    setLoading(true);
    try {
      const endpoint = assignmentType === 'supervisor' 
        ? `/work-orders/${workOrderId}/assign-supervisor`
        : `/work-orders/${workOrderId}/assign-technician`;
      
      const payload = assignmentType === 'supervisor'
        ? { supervisor_id: selectedUserId }
        : { technician_id: selectedUserId };

      await api.post(endpoint, payload);
      
      alert.success('Success', `Work order assigned to ${assignmentType}`);
      onSuccess();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to assign work order');
    } finally {
      setLoading(false);
    }
  };

  const userList = assignmentType === 'supervisor' ? supervisors : technicians;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex justify-between items-center rounded-t-xl">
          <h2 className="text-lg font-bold">Assign Work Order</h2>
          <button onClick={onCancel} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Assignment Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Assignment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setAssignmentType('supervisor'); setSelectedUserId(''); }}
                className={`p-3 rounded-lg border-2 transition-all ${
                  assignmentType === 'supervisor'
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <User className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-semibold">Supervisor</div>
                <div className="text-[10px] text-gray-500">Two-step assignment</div>
              </button>
              <button
                onClick={() => { setAssignmentType('technician'); setSelectedUserId(''); }}
                className={`p-3 rounded-lg border-2 transition-all ${
                  assignmentType === 'technician'
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <Users className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-semibold">Technician</div>
                <div className="text-[10px] text-gray-500">Direct assignment</div>
              </button>
            </div>
          </div>

          {/* User Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select {assignmentType === 'supervisor' ? 'Supervisor' : 'Technician'}
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">-- Select {assignmentType} --</option>
              {userList.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.username} {user.trade ? `(${user.trade})` : ''}
                </option>
              ))}
            </select>
            {userList.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">No {assignmentType}s available</p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              {assignmentType === 'supervisor' ? (
                <>
                  <strong>Two-step assignment:</strong> Supervisor will receive the work order and can then assign it to a technician.
                </>
              ) : (
                <>
                  <strong>Direct assignment:</strong> Technician will receive the work order immediately and can start work.
                </>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={loading || !selectedUserId}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
