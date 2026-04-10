'use client';

import { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import api from '@/lib/api';

interface AdvancedFiltersProps {
  onFilter: (filters: any) => void;
  onClear: () => void;
}

export default function AdvancedFilters({ onFilter, onClear }: AdvancedFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    priority: '',
    status: '',
    workflow_status: '',
    sla_status: '',
    machine_id: '',
    department_id: ''
  });
  const [machines, setMachines] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    loadMachines();
    loadDepartments();
  }, []);

  const loadMachines = async () => {
    try {
      const response = await api.get('/machines');
      setMachines(response.data?.data || []);
    } catch (error) {
      console.error('Error loading machines:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data?.data || []);
    } catch (error) {
      // Silently fail - departments filter optional
      setDepartments([]);
    }
  };

  const handleApply = () => {
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    );
    onFilter(activeFilters);
    setShowFilters(false);
  };

  const handleClear = () => {
    setFilters({
      start_date: '',
      end_date: '',
      priority: '',
      status: '',
      workflow_status: '',
      sla_status: '',
      machine_id: '',
      department_id: ''
    });
    onClear();
    setShowFilters(false);
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium inline-flex items-center gap-2"
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeFilterCount > 0 && (
          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {showFilters && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-2xl border-2 border-gray-200 p-6 z-50 w-96">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Advanced Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Status</label>
              <select
                value={filters.workflow_status}
                onChange={(e) => setFilters({ ...filters, workflow_status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Workflow Statuses</option>
                <option value="pending">Pending</option>
                <option value="supervisor_review">Supervisor Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="assigned_to_planner">Assigned to Planner</option>
                <option value="work_order_created">Work Order Created</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SLA Status</label>
              <select
                value={filters.sla_status}
                onChange={(e) => setFilters({ ...filters, sla_status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All SLA Statuses</option>
                <option value="on_time">On Time</option>
                <option value="at_risk">At Risk</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
              <select
                value={filters.machine_id}
                onChange={(e) => setFilters({ ...filters, machine_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Machines</option>
                {machines.map(machine => (
                  <option key={machine.id} value={machine.id}>
                    {machine.machine_name || machine.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={filters.department_id}
                onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleApply}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all font-semibold"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
          </div>
        </div>
      )}
    </div>
  );
}
