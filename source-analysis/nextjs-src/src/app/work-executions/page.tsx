'use client';
import { useState, useEffect } from 'react';
import { Play, Pause, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

export default function WorkExecutionsPage() {
  const [executions, setExecutions] = useState([]);

  useEffect(() => {
    api.get('/api/v1/eam/work-executions')
      .then(r => r.data)
      .then(d => setExecutions(d.data || []));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-base font-semibold mb-6">Work Executions</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">WO</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {executions.map((ex: any) => (
              <tr key={ex.id}>
                <td className="px-6 py-4">{ex.execution_code}</td>
                <td className="px-6 py-4">{ex.work_order_id}</td>
                <td className="px-6 py-4">{ex.technician_id}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${ex.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {ex.status}
                  </span>
                </td>
                <td className="px-6 py-4">{ex.actual_hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
