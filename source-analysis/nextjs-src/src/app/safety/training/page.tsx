'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { GraduationCap, Download, Plus, Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function SafetyTrainingPage() {
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTrainings();
  }, []);

  const loadTrainings = async () => {
    try {
      const response = await api.get('/safety-training');
      setTrainings(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load training records');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Employee', 'Course', 'Date', 'Expiry', 'Status'],
      ...trainings.map(t => [t.employee_name, t.course, t.date, t.expiry_date, t.status])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safety-training-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredTrainings = trainings.filter(t =>
    t.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.course?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Safety Training</h1>
            <p className="text-gray-600 mt-1">Track employee safety certifications</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Training
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
              placeholder="Search training records..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : filteredTrainings.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No training records found</td></tr>
              ) : (
                filteredTrainings.map((training) => (
                  <tr key={training.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{training.employee_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{training.course}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{training.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{training.expiry_date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        training.status === 'valid' ? 'bg-green-100 text-green-800' :
                        training.status === 'expiring' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {training.status?.toUpperCase()}
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
