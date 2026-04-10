'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Download, Plus, Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function ControlPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await api.get('/control-plans');
      setPlans(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load control plans');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Plan Number', 'Product', 'Process', 'Version', 'Status'],
      ...plans.map(p => [p.plan_number, p.product, p.process, p.version, p.status])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `control-plans-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredPlans = plans.filter(p =>
    p.plan_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.product?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Control Plans</h1>
            <p className="text-gray-600 mt-1">Manage quality control plans</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Plan
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
              placeholder="Search control plans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500">Loading...</div>
          ) : filteredPlans.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">No control plans found</div>
          ) : (
            filteredPlans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{plan.plan_number}</h3>
                    <p className="text-sm text-gray-600 mt-1">{plan.product}</p>
                  </div>
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Process:</span>
                    <span className="font-semibold text-gray-900">{plan.process}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Version:</span>
                    <span className="font-semibold text-gray-900">{plan.version}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      plan.status === 'active' ? 'bg-green-100 text-green-800' :
                      plan.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {plan.status?.toUpperCase()}
                    </span>
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
