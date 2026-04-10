'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { CheckCircle, Download, Plus, Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function CAPAPage() {
  const [capas, setCapas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCAPAs();
  }, []);

  const loadCAPAs = async () => {
    try {
      const response = await api.get('/capa');
      setCapas(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load CAPAs');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['CAPA Number', 'Type', 'Issue', 'Action', 'Due Date', 'Status'],
      ...capas.map(c => [c.capa_number, c.type, c.issue, c.action, c.due_date, c.status])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capa-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredCAPAs = capas.filter(c =>
    c.capa_number?.toLowerCase().includes(search.toLowerCase()) ||
    c.issue?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CAPA Management</h1>
            <p className="text-gray-600 mt-1">Corrective and Preventive Actions</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New CAPA
            </button>
            <button onClick={exportCSV} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium inline-flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search CAPAs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredCAPAs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No CAPAs found</div>
          ) : (
            filteredCAPAs.map((capa) => (
              <div key={capa.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className={`w-6 h-6 flex-shrink-0 mt-1 ${
                    capa.status === 'completed' ? 'text-green-600' :
                    capa.status === 'in_progress' ? 'text-blue-600' :
                    'text-gray-400'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{capa.capa_number}</h3>
                        <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                          capa.type === 'corrective' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {capa.type?.toUpperCase()}
                        </span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        capa.status === 'completed' ? 'bg-green-100 text-green-800' :
                        capa.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {capa.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700">Issue:</p>
                      <p className="text-sm text-gray-600">{capa.issue}</p>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Action:</p>
                      <p className="text-sm text-gray-600">{capa.action}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <span className="text-xs text-gray-500">Due Date</span>
                        <p className="text-sm font-semibold text-gray-900">{capa.due_date}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Owner</span>
                        <p className="text-sm font-semibold text-gray-900">{capa.owner}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Priority</span>
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          capa.priority === 'high' ? 'bg-red-100 text-red-800' :
                          capa.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {capa.priority?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
