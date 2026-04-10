'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Factory, Download, Plus, Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function WorkCentersPage() {
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    efficiency: '',
    status: 'active'
  });

  useEffect(() => {
    loadWorkCenters();
  }, []);

  const loadWorkCenters = async () => {
    try {
      const response = await api.get('/work-centers');
      setWorkCenters(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load work centers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/work-centers', formData);
      toast.success('Work center created successfully');
      setShowForm(false);
      setFormData({ name: '', capacity: '', efficiency: '', status: 'active' });
      loadWorkCenters();
    } catch (error) {
      toast.error('Failed to create work center');
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Name', 'Capacity', 'Efficiency', 'Utilization', 'Status'],
      ...workCenters.map(wc => [wc.name, wc.capacity, `${wc.efficiency}%`, `${wc.utilization}%`, wc.status])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-centers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredWorkCenters = workCenters.filter(wc =>
    wc.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Work Centers</h1>
            <p className="text-gray-600 mt-1">Manage production work centers</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Work Center
            </button>
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">New Work Center</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (units/day)</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Efficiency (%)</label>
                  <input
                    type="number"
                    value={formData.efficiency}
                    onChange={(e) => setFormData({ ...formData, efficiency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold"
                >
                  Create Work Center
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search work centers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500">Loading...</div>
          ) : filteredWorkCenters.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">No work centers found</div>
          ) : (
            filteredWorkCenters.map((wc) => (
              <div key={wc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{wc.name}</h3>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                      wc.status === 'active' ? 'bg-green-100 text-green-800' :
                      wc.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {wc.status?.toUpperCase()}
                    </span>
                  </div>
                  <Factory className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Capacity:</span>
                    <span className="font-semibold text-gray-900">{wc.capacity} units/day</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Efficiency:</span>
                    <span className="font-semibold text-green-600">{wc.efficiency}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Utilization:</span>
                    <span className="font-semibold text-blue-600">{wc.utilization || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${wc.utilization || 0}%` }}
                    />
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
