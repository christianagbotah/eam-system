'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function MachinesPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', category: '' });

  useEffect(() => {
    fetchMachines();
  }, [filters]);

  const fetchMachines = async () => {
    try {
      const response = await api.get('/assets-unified');
      const data = response.data;
      const allAssets = data.data || [];
      setMachines(allAssets.filter((a: any) => a.asset_type === 'machine'));
    } catch (error) {
      console.error('Error fetching machines:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMachines = machines.filter(m => {
    if (filters.search && !m.name?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status && m.status !== filters.status) return false;
    if (filters.category && m.category !== filters.category) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Machines</h1>
        <Link href="/assets/machines/create" className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700">
          + Add Machine
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Machines</div>
          <div className="text-base font-semibold">{machines.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-base font-semibold text-green-600">{machines.filter(m => m.status === 'active').length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Maintenance</div>
          <div className="text-base font-semibold text-yellow-600">{machines.filter(m => m.status === 'maintenance').length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Idle</div>
          <div className="text-base font-semibold text-gray-600">{machines.filter(m => m.status === 'idle').length}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <input
            type="text"
            placeholder="Search machines..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="border rounded-lg px-3 py-2"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="idle">Idle</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Categories</option>
            <option value="weaving">Weaving</option>
            <option value="spinning">Spinning</option>
            <option value="dyeing">Dyeing</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Asset Tag</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Model</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.map((machine) => (
                  <tr key={machine.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{machine.asset_tag}</td>
                    <td className="px-4 py-2">
                      <div>
                        <p className="font-medium">{machine.name}</p>
                        <div className="flex space-x-4 text-xs text-gray-500 mt-1">
                          <span>{machine.assemblies_count || 0} assemblies</span>
                          <span>{machine.parts_count || 0} parts</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">{machine.model}</td>
                    <td className="px-4 py-2">{machine.category}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        machine.status === 'active' ? 'bg-green-100 text-green-800' :
                        machine.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {machine.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-2">
                        <Link href={`/assets/machines/${machine.id}`} className="text-blue-600 hover:underline text-sm">
                          View
                        </Link>
                        <Link href={`/assembly/assemblyLists?machine_id=${machine.id}`} className="text-green-600 hover:underline text-sm">
                          Assemblies
                        </Link>
                        <Link href={`/parts/partLists?machine_id=${machine.id}`} className="text-purple-600 hover:underline text-sm">
                          Parts
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
