'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Download, Plus, Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function ShiftHandoverPage() {
  const [handovers, setHandovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    shift: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    issues: '',
    actions_required: ''
  });

  useEffect(() => {
    loadHandovers();
  }, []);

  const loadHandovers = async () => {
    try {
      const response = await api.get('/shift-handovers');
      setHandovers(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load handovers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/shift-handovers', formData);
      toast.success('Handover created successfully');
      setShowForm(false);
      setFormData({ shift: '', date: new Date().toISOString().split('T')[0], notes: '', issues: '', actions_required: '' });
      loadHandovers();
    } catch (error) {
      toast.error('Failed to create handover');
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Date', 'Shift', 'Notes', 'Issues', 'Actions Required'],
      ...handovers.map(h => [h.date, h.shift, h.notes, h.issues, h.actions_required])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift-handovers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredHandovers = handovers.filter(h =>
    h.shift?.toLowerCase().includes(search.toLowerCase()) ||
    h.notes?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shift Handover</h1>
            <p className="text-gray-600 mt-1">Document shift transitions and issues</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Handover
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
            <h2 className="text-xl font-bold mb-4">New Shift Handover</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Shift</option>
                    <option value="morning">Morning (6AM-2PM)</option>
                    <option value="afternoon">Afternoon (2PM-10PM)</option>
                    <option value="night">Night (10PM-6AM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="General shift notes..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issues</label>
                <textarea
                  value={formData.issues}
                  onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Any issues encountered..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actions Required</label>
                <textarea
                  value={formData.actions_required}
                  onChange={(e) => setFormData({ ...formData, actions_required: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Actions for next shift..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold"
                >
                  Create Handover
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
              placeholder="Search handovers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredHandovers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No handovers found</div>
          ) : (
            filteredHandovers.map((handover) => (
              <div key={handover.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{handover.shift} Shift</h3>
                    <p className="text-sm text-gray-600">{handover.date}</p>
                  </div>
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Notes:</p>
                    <p className="text-sm text-gray-600">{handover.notes}</p>
                  </div>
                  {handover.issues && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Issues:</p>
                      <p className="text-sm text-red-600">{handover.issues}</p>
                    </div>
                  )}
                  {handover.actions_required && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Actions Required:</p>
                      <p className="text-sm text-blue-600">{handover.actions_required}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
