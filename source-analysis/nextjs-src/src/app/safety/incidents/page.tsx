'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertTriangle, Download, Plus, Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'minor',
    location: '',
    reported_by: ''
  });

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const response = await api.get('/safety-incidents');
      setIncidents(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/safety-incidents', formData);
      toast.success('Incident reported successfully');
      setShowForm(false);
      setFormData({ title: '', description: '', severity: 'minor', location: '', reported_by: '' });
      loadIncidents();
    } catch (error) {
      toast.error('Failed to report incident');
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Date', 'Title', 'Severity', 'Location', 'Status'],
      ...incidents.map(i => [i.date, i.title, i.severity, i.location, i.status])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safety-incidents-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredIncidents = incidents.filter(i =>
    i.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Safety Incidents</h1>
            <p className="text-gray-600 mt-1">Track and manage safety incidents</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Report Incident
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
            <h2 className="text-xl font-bold mb-4">Report New Incident</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="serious">Serious</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reported By</label>
                  <input
                    type="text"
                    value={formData.reported_by}
                    onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold"
                >
                  Report Incident
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
              placeholder="Search incidents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No incidents found</div>
          ) : (
            filteredIncidents.map((incident) => (
              <div key={incident.id} className={`bg-white rounded-xl shadow-sm border-l-4 p-6 ${
                incident.severity === 'critical' ? 'border-red-600' :
                incident.severity === 'serious' ? 'border-orange-600' :
                incident.severity === 'moderate' ? 'border-yellow-600' :
                'border-blue-600'
              }`}>
                <div className="flex items-start gap-4">
                  <AlertTriangle className={`w-6 h-6 flex-shrink-0 mt-1 ${
                    incident.severity === 'critical' ? 'text-red-600' :
                    incident.severity === 'serious' ? 'text-orange-600' :
                    incident.severity === 'moderate' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{incident.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        incident.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {incident.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div>
                        <span className="text-xs text-gray-500">Date</span>
                        <p className="text-sm font-semibold text-gray-900">{incident.date}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Location</span>
                        <p className="text-sm font-semibold text-gray-900">{incident.location}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Severity</span>
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          incident.severity === 'serious' ? 'bg-orange-100 text-orange-800' :
                          incident.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {incident.severity?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Reported By</span>
                        <p className="text-sm font-semibold text-gray-900">{incident.reported_by}</p>
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
