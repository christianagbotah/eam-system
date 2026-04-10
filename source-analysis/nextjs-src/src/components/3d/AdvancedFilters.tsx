'use client';

import { useState } from 'react';

export default function AdvancedFilters({ onFilter }: { onFilter: (filters: any) => void }) {
  const [filters, setFilters] = useState({
    status: '',
    format: '',
    machine_id: '',
    date_from: '',
    date_to: '',
    min_size: '',
    max_size: ''
  });

  const handleChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const clearFilters = () => {
    const empty = {
      status: '',
      format: '',
      machine_id: '',
      date_from: '',
      date_to: '',
      min_size: '',
      max_size: ''
    };
    setFilters(empty);
    onFilter(empty);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Advanced Filters</h3>
        <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Format</label>
          <select
            value={filters.format}
            onChange={(e) => handleChange('format', e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="">All</option>
            <option value="glb">GLB</option>
            <option value="gltf">GLTF</option>
            <option value="obj">OBJ</option>
            <option value="fbx">FBX</option>
            <option value="stl">STL</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date From</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => handleChange('date_from', e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date To</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => handleChange('date_to', e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Min Size (KB)</label>
          <input
            type="number"
            value={filters.min_size}
            onChange={(e) => handleChange('min_size', e.target.value)}
            className="w-full border rounded p-2"
            placeholder="0"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Max Size (KB)</label>
          <input
            type="number"
            value={filters.max_size}
            onChange={(e) => handleChange('max_size', e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Unlimited"
          />
        </div>
      </div>
    </div>
  );
}
