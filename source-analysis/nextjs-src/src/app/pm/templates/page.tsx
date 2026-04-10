'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pmService, PMTemplate } from '@/services/pmService';
import { toast } from 'react-hot-toast';

export default function PMTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PMTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    active: true,
    asset_node_type: '',
    maintenance_type: '',
    priority: ''
  });

  useEffect(() => {
    loadTemplates();
  }, [filters]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await pmService.listTemplates(filters);
      if (response.success) {
        setTemplates(response.data);
      }
    } catch (error) {
      toast.error('Failed to load PM templates');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number, active: boolean) => {
    try {
      if (active) {
        await pmService.deactivateTemplate(id);
        toast.success('Template deactivated');
      } else {
        await pmService.activateTemplate(id);
        toast.success('Template activated');
      }
      loadTemplates();
    } catch (error) {
      toast.error('Failed to update template status');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-base font-semibold">PM Templates</h1>
        <button
          onClick={() => router.push('/pm/templates/create')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Template
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1">Status</label>
            <select
              value={filters.active ? 'true' : 'false'}
              onChange={(e) => setFilters({...filters, active: e.target.value === 'true'})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Asset Type</label>
            <select
              value={filters.asset_node_type}
              onChange={(e) => setFilters({...filters, asset_node_type: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="machine">Machine</option>
              <option value="assembly">Assembly</option>
              <option value="part">Part</option>
              <option value="subpart">Subpart</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Maintenance Type</label>
            <select
              value={filters.maintenance_type}
              onChange={(e) => setFilters({...filters, maintenance_type: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="inspection">Inspection</option>
              <option value="lubrication">Lubrication</option>
              <option value="replace">Replace</option>
              <option value="clean">Clean</option>
              <option value="calibration">Calibration</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Maintenance</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center">Loading...</td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">No templates found</td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-sm font-medium">{template.code}</td>
                  <td className="px-3 py-2.5 text-sm">{template.title}</td>
                  <td className="px-3 py-2.5 text-sm capitalize">{template.asset_node_type}</td>
                  <td className="px-3 py-2.5 text-sm capitalize">{template.maintenance_type}</td>
                  <td className="px-3 py-2.5 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      template.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      template.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      template.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {template.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm">{template.estimated_hours}h</td>
                  <td className="px-3 py-2.5 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      template.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm space-x-2">
                    <button
                      onClick={() => router.push(`/pm/templates/${template.id}`)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleToggleActive(template.id, template.active)}
                      className={template.active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}
                    >
                      {template.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
