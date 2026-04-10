'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { FiPlus, FiEdit2, FiTrash2, FiDownload, FiTool, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

interface Tool {
  id: number;
  tool_code: string;
  tool_name: string;
  category: string;
  status: string;
  location: string;
  condition: string;
  assigned_to: number;
  assigned_to_name: string;
  last_maintenance: string;
  next_maintenance: string;
  purchase_date: string;
  purchase_cost: number;
}

export default function ToolsPage() {
  const { hasPermission } = usePermissions();
  const [tools, setTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [filters, setFilters] = useState({ status: '', category: '', search: '' });
  const [users, setUsers] = useState<any[]>([]);

  const canCreate = hasPermission('tools.create');
  const canEdit = hasPermission('tools.edit');
  const canDelete = hasPermission('tools.delete');
  const canIssue = hasPermission('tools.issue');
  const canReturn = hasPermission('tools.return');

  useEffect(() => {
    fetchTools();
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = tools;
    if (filters.search) {
      filtered = filtered.filter(tool =>
        tool.tool_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        tool.tool_code?.toLowerCase().includes(filters.search.toLowerCase()) ||
        tool.category?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    if (filters.status) {
      filtered = filtered.filter(tool => tool.status === filters.status);
    }
    if (filters.category) {
      filtered = filtered.filter(tool => tool.category === filters.category);
    }
    setFilteredTools(filtered);
  }, [tools, filters]);

  const fetchTools = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost/factorymanager/public/index.php/api/v1/eam/tools', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setTools(data.data);
      }
    } catch (error) {
      console.error('Error fetching tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost/factorymanager/public/index.php/api/v1/eam/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) return;
    if (!confirm('Delete this tool?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost/factorymanager/public/index.php/api/v1/eam/tools/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchTools();
      }
    } catch (error) {
      console.error('Error deleting tool:', error);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Code', 'Name', 'Category', 'Status', 'Condition', 'Location', 'Assigned To', 'Last Maintenance', 'Next Maintenance'],
      ...filteredTools.map(t => [t.tool_code, t.tool_name, t.category, t.status, t.condition, t.location, t.assigned_to_name || 'Unassigned', t.last_maintenance, t.next_maintenance])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tools-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800';
      case 'In Use': return 'bg-blue-100 text-blue-800';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'Retired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-blue-100 text-blue-800';
      case 'Fair': return 'bg-yellow-100 text-yellow-800';
      case 'Poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const availableTools = tools.filter(t => t.status === 'Available').length;
  const inUseTools = tools.filter(t => t.status === 'In Use').length;
  const maintenanceTools = tools.filter(t => t.status === 'Maintenance').length;
  const categories = new Set(tools.map(t => t.category)).size;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tools Management</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2">
            <FiDownload /> Export
          </button>
          {canCreate && (
            <button onClick={() => { setShowModal(true); setSelectedTool(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <FiPlus /> Add Tool
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Tools</div>
              <div className="text-2xl font-bold text-gray-800">{tools.length}</div>
            </div>
            <FiTool className="text-blue-600" size={32} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Available</div>
              <div className="text-2xl font-bold text-green-600">{availableTools}</div>
            </div>
            <FiCheckCircle className="text-green-600" size={32} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">In Use</div>
              <div className="text-2xl font-bold text-blue-600">{inUseTools}</div>
            </div>
            <FiAlertCircle className="text-blue-600" size={32} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">In Maintenance</div>
          <div className="text-2xl font-bold text-yellow-600">{maintenanceTools}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-3 py-2 border rounded-lg flex-1 min-w-[200px]"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="Available">Available</option>
            <option value="In Use">In Use</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Retired">Retired</option>
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Categories</option>
            {Array.from(new Set(tools.map(t => t.category))).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tools Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Maintenance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTools.map((tool) => (
              <tr key={tool.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tool.tool_code}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{tool.tool_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{tool.category}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tool.status)}`}>
                    {tool.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getConditionColor(tool.condition)}`}>
                    {tool.condition}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{tool.location}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{tool.assigned_to_name || 'Unassigned'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{tool.next_maintenance || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    {canEdit && (
                      <button onClick={() => { setSelectedTool(tool); setShowModal(true); }} className="text-indigo-600 hover:text-indigo-900">
                        <FiEdit2 />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(tool.id)} className="text-red-600 hover:text-red-900">
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow mt-6">
          <p className="text-gray-500">No tools found</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <ToolModal
          tool={selectedTool}
          users={users}
          onClose={() => { setShowModal(false); setSelectedTool(null); }}
          onSuccess={() => { fetchTools(); setShowModal(false); setSelectedTool(null); }}
        />
      )}
    </div>
  );
}

function ToolModal({ tool, users, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    tool_code: tool?.tool_code || '',
    tool_name: tool?.tool_name || '',
    category: tool?.category || '',
    status: tool?.status || 'Available',
    condition: tool?.condition || 'Good',
    location: tool?.location || '',
    assigned_to: tool?.assigned_to || '',
    last_maintenance: tool?.last_maintenance || '',
    next_maintenance: tool?.next_maintenance || '',
    purchase_date: tool?.purchase_date || '',
    purchase_cost: tool?.purchase_cost || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = tool
        ? `http://localhost/factorymanager/public/index.php/api/v1/eam/tools/${tool.id}`
        : 'http://localhost/factorymanager/public/index.php/api/v1/eam/tools';

      const response = await fetch(url, {
        method: tool ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.status === 'success') {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving tool:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{tool ? 'Edit' : 'Add'} Tool</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tool Code</label>
              <input
                type="text"
                value={formData.tool_code}
                onChange={(e) => setFormData({ ...formData, tool_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tool Name</label>
              <input
                type="text"
                value={formData.tool_name}
                onChange={(e) => setFormData({ ...formData, tool_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="Available">Available</option>
                <option value="In Use">In Use</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Unassigned</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>{user.full_name || user.username}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Maintenance</label>
              <input
                type="date"
                value={formData.last_maintenance}
                onChange={(e) => setFormData({ ...formData, last_maintenance: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Maintenance</label>
              <input
                type="date"
                value={formData.next_maintenance}
                onChange={(e) => setFormData({ ...formData, next_maintenance: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost</label>
              <input
                type="number"
                step="0.01"
                value={formData.purchase_cost}
                onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {tool ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
