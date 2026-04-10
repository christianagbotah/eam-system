'use client';

import { useState, useEffect } from 'react';
import { Shield, Plus, CheckCircle, XCircle } from 'lucide-react';

export default function PermitManagementPage() {
  const [permits, setPermits] = useState([]);

  const loadPermits = async () => {
    const res = await fetch('/api/v1/eam/permits-to-work', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    if (data.status === 'success') setPermits(data.data);
  };

  const approvePermit = async (id: number) => {
    await fetch(`/api/v1/eam/permits-to-work/${id}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: 'Approved' })
    });
    loadPermits();
  };

  useEffect(() => { loadPermits(); }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-base font-semibold flex items-center gap-2">
          <Shield className="w-6 h-6" /> Permit to Work
        </h1>
        <button className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Permit
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Permit #</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Risk</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {permits.map((permit: any) => (
              <tr key={permit.id} className="border-t">
                <td className="px-4 py-3">{permit.permit_number}</td>
                <td className="px-4 py-3">{permit.permit_type}</td>
                <td className="px-4 py-3">{permit.location}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${permit.risk_level === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {permit.risk_level}
                  </span>
                </td>
                <td className="px-4 py-3">{permit.status}</td>
                <td className="px-4 py-3">
                  {permit.status === 'pending_approval' && (
                    <button onClick={() => approvePermit(permit.id)} className="text-green-600 hover:text-green-800">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
