'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Layers, Download, Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const response = await api.get('/production-batches');
      setBatches(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Batch Number', 'Product', 'Quantity', 'Status', 'Start Date', 'End Date'],
      ...batches.map(b => [b.batch_number, b.product, b.quantity, b.status, b.start_date, b.end_date])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-batches-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredBatches = batches.filter(b =>
    b.batch_number?.toLowerCase().includes(search.toLowerCase()) ||
    b.product?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Batch Tracking</h1>
            <p className="text-gray-600 mt-1">Track production batches</p>
          </div>
          <button onClick={exportCSV} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium inline-flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search batches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No batches found</div>
          ) : (
            filteredBatches.map((batch) => (
              <div key={batch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Layers className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{batch.batch_number}</h3>
                      <p className="text-sm text-gray-600 mt-1">{batch.product}</p>
                      <div className="grid grid-cols-4 gap-4 mt-4">
                        <div>
                          <span className="text-xs text-gray-500">Quantity</span>
                          <p className="text-sm font-semibold text-gray-900">{batch.quantity}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Start Date</span>
                          <p className="text-sm font-semibold text-gray-900">{batch.start_date}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">End Date</span>
                          <p className="text-sm font-semibold text-gray-900">{batch.end_date || 'In Progress'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Status</span>
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            batch.status === 'completed' ? 'bg-green-100 text-green-800' :
                            batch.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {batch.status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
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
