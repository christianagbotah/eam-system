'use client';
import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import api from '@/lib/api';

export default function ShiftHandoversPage() {
  const [handovers, setHandovers] = useState([]);

  useEffect(() => {
    api.get('/api/v1/eam/shift/handovers')
      .then(r => r.data)
      .then(d => setHandovers(d.data || []));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-base font-semibold mb-6">Shift Handovers</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">From Shift</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">To Shift</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produced</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {handovers.map((h: any) => (
              <tr key={h.id}>
                <td className="px-6 py-4">{h.handover_code}</td>
                <td className="px-6 py-4">{h.machine_id}</td>
                <td className="px-6 py-4">{h.from_shift}</td>
                <td className="px-6 py-4">{h.to_shift}</td>
                <td className="px-6 py-4">{h.produced_qty}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${h.status === 'Accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {h.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
