'use client';

import { useState } from 'react';

interface FilterBarProps {
  onFilterChange?: (filters: any) => void;
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const [filters, setFilters] = useState({
    department: '',
    dateRange: '7days',
    machineType: '',
  });

  const handleChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-4 items-center">
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <select
        value={filters.department}
        onChange={(e) => handleChange('department', e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Departments</option>
        <option value="production">Production</option>
        <option value="maintenance">Maintenance</option>
        <option value="quality">Quality</option>
      </select>

      <select
        value={filters.dateRange}
        onChange={(e) => handleChange('dateRange', e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="today">Today</option>
        <option value="7days">Last 7 Days</option>
        <option value="30days">Last 30 Days</option>
        <option value="90days">Last 90 Days</option>
      </select>

      <select
        value={filters.machineType}
        onChange={(e) => handleChange('machineType', e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Machine Types</option>
        <option value="cnc">CNC Machine</option>
        <option value="press">Press</option>
        <option value="conveyor">Conveyor</option>
      </select>

      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        Apply Filters
      </button>
    </div>
  );
}
