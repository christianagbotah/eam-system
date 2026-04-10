'use client';

import { useState, useEffect } from 'react';

const API_BASE = '/api/v1/eam';

export default function AssistanceRequests({ workOrderId }: { workOrderId: number }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [workOrderId]);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/maintenance-orders/${workOrderId}/assistance-requests`);
      const data = await res.json();
      setRequests(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (formData: any) => {
    try {
      const res = await fetch(`${API_BASE}/maintenance-orders/${workOrderId}/assistance-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchRequests();
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const approveRequest = async (requestId: number, technicianId: number) => {
    try {
      await fetch(`${API_BASE}/maintenance-orders/${workOrderId}/assistance-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: 1, assigned_technician_id: technicianId })
      });
      fetchRequests();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div className="p-4">Loading requests...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Assistance Requests ({requests.length})</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          {showForm ? 'Cancel' : '+ Request Help'}
        </button>
      </div>

      {showForm && (
        <RequestForm onSubmit={createRequest} onCancel={() => setShowForm(false)} />
      )}

      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="p-4 border rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold">{req.skill_required || 'General Assistance'}</div>
                <div className="text-sm text-gray-600">{req.reason}</div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                req.status === 'approved' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {req.status}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Urgency: <span className={`font-semibold ${
                req.urgency === 'high' ? 'text-red-600' : 'text-gray-600'
              }`}>{req.urgency}</span></span>
              {req.status === 'pending' && (
                <button
                  onClick={() => {
                    const techId = prompt('Enter Technician ID to assign:');
                    if (techId) approveRequest(req.id, parseInt(techId));
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Approve
                </button>
              )}
            </div>
          </div>
        ))}

        {requests.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No assistance requests
          </div>
        )}
      </div>
    </div>
  );
}

function RequestForm({ onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    requested_by: 1,
    skill_required: '',
    reason: '',
    urgency: 'medium'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 border rounded-lg bg-gray-50">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Skill Required</label>
          <input
            type="text"
            required
            placeholder="e.g., Electrical, Mechanical"
            className="w-full px-3 py-2 border rounded"
            value={formData.skill_required}
            onChange={(e) => setFormData({...formData, skill_required: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reason</label>
          <textarea
            required
            rows={3}
            placeholder="Describe why you need assistance"
            className="w-full px-3 py-2 border rounded"
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Urgency</label>
          <select
            className="w-full px-3 py-2 border rounded"
            value={formData.urgency}
            onChange={(e) => setFormData({...formData, urgency: e.target.value})}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
          Submit Request
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
