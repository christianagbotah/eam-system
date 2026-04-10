'use client';

import { useState } from 'react';

interface PMCalendarFiltersProps {
  onFiltersChange: (filters: {
    facility?: string;
    asset_type?: string;
    status?: string;
    from?: string;
    to?: string;
  }) => void;
}

export default function PMCalendarFilters({ onFiltersChange }: PMCalendarFiltersProps) {
  const [filters, setFilters] = useState({
    facility: '',
    asset_type: '',
    status: '',
    from: '',
    to: ''
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Remove empty filters
    const cleanFilters = Object.fromEntries(
      Object.entries(newFilters).filter(([_, v]) => v !== '')
    );
    
    onFiltersChange(cleanFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      facility: '',
      asset_type: '',
      status: '',
      from: '',
      to: ''
    };
    setFilters(emptyFilters);
    onFiltersChange({});
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-900">Filters</h3>
        <button
          onClick={clearFilters}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Clear All
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Facility</label>
          <select
            value={filters.facility}
            onChange={(e) => handleFilterChange('facility', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="">All Facilities</option>
            <option value="plant_a">Plant A</option>
            <option value="plant_b">Plant B</option>
            <option value="warehouse">Warehouse</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Asset Type</label>
          <select
            value={filters.asset_type}
            onChange={(e) => handleFilterChange('asset_type', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="">All Types</option>
            <option value="machine">Machine</option>
            <option value="assembly">Assembly</option>
            <option value="part">Part</option>
            <option value="subpart">Subpart</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="">All Status</option>
            <option value="waiting">Waiting</option>
            <option value="generated">Generated</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => handleFilterChange('from', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => handleFilterChange('to', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
          />
        </div>
      </div>
    </div>
  );
}
