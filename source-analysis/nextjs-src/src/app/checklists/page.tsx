'use client';
import { useState, useEffect } from 'react';
import { CheckSquare } from 'lucide-react';
import api from '@/lib/api';

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState([]);

  useEffect(() => {
    api.get('/api/v1/eam/checklists')
      .then(r => r.data)
      .then(d => setChecklists(d.data || []));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-base font-semibold mb-6">Operator Checklists</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Checklists</div>
          <div className="text-base font-semibold">{checklists.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Pass Rate</div>
          <div className="text-base font-semibold text-green-600">95%</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Failed Items</div>
          <div className="text-base font-semibold text-red-600">12</div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {checklists.map((c: any) => (
              <tr key={c.id}>
                <td className="px-6 py-4">{c.checklist_code}</td>
                <td className="px-6 py-4">{c.machine_id}</td>
                <td className="px-6 py-4">{c.date}</td>
                <td className="px-6 py-4">{c.pass_percentage}%</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${c.status === 'Submitted' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                    {c.status}
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
