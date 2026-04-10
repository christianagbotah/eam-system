'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Shield, Download, Plus, Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function SafetyInspectionsPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      const response = await api.get('/safety-inspections');
      setInspections(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load inspections');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Date', 'Area', 'Inspector', 'Score', 'Status'],
      ...inspections.map(i => [i.date, i.area, i.inspector, i.score, i.status])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safety-inspections-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredInspections = inspections.filter(i =>
    i.area?.toLowerCase().includes(search.toLowerCase()) ||
    i.inspector?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Safety Inspections</h1>
            <p className="text-gray-600 mt-1">Track workplace safety inspections</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Inspection
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
              placeholder="Search inspections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspector</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : filteredInspections.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No inspections found</td></tr>
              ) : (
                filteredInspections.map((inspection) => (
                  <tr key={inspection.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{inspection.date}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{inspection.area}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{inspection.inspector}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-semibold ${
                        inspection.score >= 90 ? 'text-green-600' :
                        inspection.score >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {inspection.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        inspection.status === 'passed' ? 'bg-green-100 text-green-800' :
                        inspection.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {inspection.status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
