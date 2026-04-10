'use client';
import { useState, useEffect } from 'react';
import { productionSurveyAdvancedService, CAPA } from '@/services/productionSurveyAdvanced';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function CAPAPage() {
  const [capas, setCapas] = useState<CAPA[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCAPAs();
  }, []);

  const loadCAPAs = async () => {
    try {
      const response = await productionSurveyAdvancedService.getAllCAPAs();
      setCapas(response.data);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      verified: 'bg-purple-100 text-purple-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-base font-semibold mb-6">CAPA Management</h1>

      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Open</div>
          <div className="text-base font-semibold">{capas.filter(c => c.status === 'open').length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">In Progress</div>
          <div className="text-base font-semibold">{capas.filter(c => c.status === 'in_progress').length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-base font-semibold">{capas.filter(c => c.status === 'completed').length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Critical</div>
          <div className="text-base font-semibold text-red-600">{capas.filter(c => c.priority === 'critical').length}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">CAPA Code</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {capas.map((capa) => (
              <tr key={capa.capa_id} className="hover:bg-gray-50">
                <td className="px-3 py-2.5 text-sm font-medium">{capa.capa_code}</td>
                <td className="px-3 py-2.5 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${capa.capa_type === 'corrective' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                    {capa.capa_type}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm">{capa.issue_description.substring(0, 50)}...</td>
                <td className="px-3 py-2.5 text-sm">
                  <span className={`font-semibold ${getPriorityColor(capa.priority || 'medium')}`}>
                    {capa.priority?.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(capa.status || 'open')}`}>
                    {capa.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm">{capa.due_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
