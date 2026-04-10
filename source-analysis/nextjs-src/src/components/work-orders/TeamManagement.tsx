'use client';

import { useState, useEffect } from 'react';

const API_BASE = '/api/v1/eam';

export default function TeamManagement({ workOrderId }: { workOrderId: number }) {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, [workOrderId]);

  const fetchTeam = async () => {
    try {
      const res = await fetch(`${API_BASE}/maintenance-orders/${workOrderId}/team`);
      const data = await res.json();
      setTeam(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignTeamMember = async (formData: any) => {
    try {
      const res = await fetch(`${API_BASE}/maintenance-orders/${workOrderId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchTeam();
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const removeTeamMember = async (memberId: number) => {
    if (!confirm('Remove this team member?')) return;
    try {
      await fetch(`${API_BASE}/maintenance-orders/${workOrderId}/team/${memberId}`, {
        method: 'DELETE'
      });
      fetchTeam();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div className="p-4">Loading team...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Team Members ({team.length})</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showAddForm ? 'Cancel' : '+ Add Member'}
        </button>
      </div>

      {showAddForm && (
        <AddTeamMemberForm onSubmit={assignTeamMember} onCancel={() => setShowAddForm(false)} />
      )}

      <div className="space-y-3">
        {team.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="font-semibold">Technician #{member.technician_id}</div>
              <div className="text-sm text-gray-600">
                Assigned: {new Date(member.assigned_date).toLocaleDateString()}
              </div>
              {member.labor_hours > 0 && (
                <div className="text-sm text-gray-600">Hours: {member.labor_hours}</div>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className={`px-2 py-1 rounded text-xs ${
                member.role === 'team_lead' ? 'bg-blue-100 text-blue-800' :
                member.role === 'assistant' ? 'bg-green-100 text-green-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {member.role.replace('_', ' ')}
              </span>
              <span className={`px-2 py-1 rounded text-xs ${
                member.status === 'working' ? 'bg-blue-100 text-blue-800' :
                member.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {member.status}
              </span>
              <button
                onClick={() => removeTeamMember(member.id)}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {team.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No team members assigned yet
          </div>
        )}
      </div>
    </div>
  );
}

function AddTeamMemberForm({ onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    technician_id: '',
    role: 'assistant',
    assigned_by: 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 border rounded-lg bg-gray-50">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Technician ID</label>
          <input
            type="number"
            required
            className="w-full px-3 py-2 border rounded"
            value={formData.technician_id}
            onChange={(e) => setFormData({...formData, technician_id: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            className="w-full px-3 py-2 border rounded"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            <option value="team_lead">Team Lead</option>
            <option value="assistant">Assistant</option>
            <option value="specialist">Specialist</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Assign
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
