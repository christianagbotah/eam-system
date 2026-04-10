'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { MapPin, Download, Plus, Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function LocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const response = await api.get('/inventory-locations');
      setLocations(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Name', 'Type', 'Capacity', 'Utilization'],
      ...locations.map(l => [l.name, l.type, l.capacity, `${l.utilization}%`])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-locations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredLocations = locations.filter(l =>
    l.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Storage Locations</h1>
            <p className="text-gray-600 mt-1">Manage warehouse locations</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Location
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
              placeholder="Search locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500">Loading...</div>
          ) : filteredLocations.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">No locations found</div>
          ) : (
            filteredLocations.map((location) => (
              <div key={location.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{location.name}</h3>
                    <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {location.type}
                    </span>
                  </div>
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Capacity:</span>
                    <span className="font-semibold text-gray-900">{location.capacity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Utilization:</span>
                    <span className="font-semibold text-blue-600">{location.utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        location.utilization >= 90 ? 'bg-red-600' :
                        location.utilization >= 70 ? 'bg-yellow-600' :
                        'bg-green-600'
                      }`}
                      style={{ width: `${location.utilization}%` }}
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
