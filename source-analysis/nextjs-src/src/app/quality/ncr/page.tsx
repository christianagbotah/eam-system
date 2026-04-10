'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertCircle, Download, Plus, Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function NCRPage() {
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadNCRs();
  }, []);

  const loadNCRs = async () => {
    try {
      const response = await api.get('/ncr');
      setNcrs(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load NCRs');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['NCR Number', 'Date', 'Product', 'Issue', 'Severity', 'Status'],
      ...ncrs.map(n => [n.ncr_number, n.date, n.product, n.issue, n.severity, n.status])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ncr-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredNCRs = ncrs.filter(n =>
    n.ncr_number?.toLowerCase().includes(search.toLowerCase()) ||
    n.product?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Non-Conformance Reports</h1>
            <p className="text-gray-600 mt-1">Track quality issues and resolutions</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New NCR
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
              placeholder="Search NCRs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredNCRs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No NCRs found</div>
          ) : (
            filteredNCRs.map((ncr) => (
              <div key={ncr.id} className={`bg-white rounded-xl shadow-sm border-l-4 p-6 ${
                ncr.severity === 'critical' ? 'border-red-500' :
                ncr.severity === 'major' ? 'border-orange-500' :
                'border-yellow-500'
              }`}>
                <div className="flex items-start gap-4">
                  <AlertCircle className={`w-6 h-6 flex-shrink-0 mt-1 ${
                    ncr.severity === 'critical' ? 'text-red-600' :
                    ncr.severity === 'major' ? 'text-orange-600' :
                    'text-yellow-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{ncr.ncr_number}</h3>
                        <p className="text-sm text-gray-600 mt-1">{ncr.product}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        ncr.status === 'closed' ? 'bg-green-100 text-green-800' :
                        ncr.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ncr.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-3">{ncr.issue}</p>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <span className="text-xs text-gray-500">Date</span>
                        <p className="text-sm font-semibold text-gray-900">{ncr.date}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Severity</span>
                        <p className="text-sm font-semibold text-red-600">{ncr.severity?.toUpperCase()}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Reported By</span>
                        <p className="text-sm font-semibold text-gray-900">{ncr.reported_by}</p>
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
