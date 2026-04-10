'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import { checkAuth } from '@/middleware/auth';
import { Wrench, Plus, Edit, Trash2, Search, Download } from 'lucide-react';

export default function ToolsPage() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTool, setEditingTool] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [formData, setFormData] = useState({
    tool_name: '', tool_code: '', category: '', description: '',
    quantity_available: 1, location: '', condition_status: 'good'
  });

  useEffect(() => {
    const auth = checkAuth();
    const role = auth?.user?.role || localStorage.getItem('userRole') || '';
    setUserRole(role);
    if (role) localStorage.setItem('userRole', role);
    loadTools();
  }, []);

  const canCreate = ['admin', 'shop_attendant', 'planner'].includes(userRole);
  const canEdit = ['admin', 'shop_attendant'].includes(userRole);
  const canDelete = ['admin', 'shop_attendant'].includes(userRole);

  const loadTools = async () => {
    try {
      const res = await api.get('/tools');
      setTools(res.data?.data || []);
    } catch (error) {
      console.error('Error loading tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingTool) {
        await api.put(`/tools/${editingTool.id}`, formData);
        alert.success('Success', 'Tool updated successfully');
      } else {
        await api.post('/tools', formData);
        alert.success('Success', 'Tool created successfully');
      }
      setShowModal(false);
      resetForm();
      loadTools();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (tool: any) => {
    setEditingTool(tool);
    setFormData({
      tool_name: tool.tool_name || '',
      tool_code: tool.tool_code || '',
      category: tool.category || '',
      description: tool.description || '',
      quantity_available: tool.quantity_available || 1,
      location: tool.location || '',
      condition_status: tool.condition_status || 'good'
    });
    setShowModal(true);
  };

  const handleDelete = (tool: any) => {
    alert.confirm('Delete Tool', `Delete ${tool.tool_name}?`, async () => {
      try {
        await api.delete(`/tools/${tool.id}`);
        alert.success('Success', 'Tool deleted successfully');
        loadTools();
      } catch (error: any) {
        alert.error('Error', error.response?.data?.message || 'Delete failed');
      }
    });
  };

  const resetForm = () => {
    setEditingTool(null);
    setFormData({
      tool_name: '', tool_code: '', category: '', description: '',
      quantity_available: 1, location: '', condition_status: 'good'
    });
  };

  const filteredTools = tools.filter(t =>
    t.tool_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tool_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const csv = [
      ['Tool Name', 'Tool Code', 'Category', 'Quantity Available', 'Quantity In Use', 'Location', 'Condition'],
      ...filteredTools.map(t => [t.tool_name, t.tool_code, t.category, t.quantity_available, t.quantity_in_use, t.location, t.condition_status])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tools.csv';
    a.click();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Tools Management</h1>
            <p className="text-orange-100">Track and manage maintenance tools</p>
          </div>
          <Wrench className="w-16 h-16 opacity-50" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tools..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={exportToCSV}
            className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            disabled={!canCreate}
            className="px-2 py-1 text-xs bg-orange-600 text-white rounded-md hover:bg-orange-700 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Tool
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tool Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tool Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Available</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">In Use</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Condition</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTools.map(tool => (
                  <tr key={tool.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{tool.tool_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tool.tool_code}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">{tool.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">{tool.quantity_available}</td>
                    <td className="px-4 py-3 text-sm">{tool.quantity_in_use}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tool.location}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tool.condition_status === 'excellent' ? 'bg-green-100 text-green-800' :
                        tool.condition_status === 'good' ? 'bg-blue-100 text-blue-800' :
                        tool.condition_status === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {tool.condition_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(tool)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tool)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FormModal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTool ? 'Edit Tool' : 'Add Tool'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-semibold mb-2">Tool Name *</label>
              <input
                type="text"
                value={formData.tool_name}
                onChange={(e) => setFormData({...formData, tool_name: e.target.value})}
                className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Tool Code</label>
              <input
                type="text"
                value={formData.tool_code}
                onChange={(e) => setFormData({...formData, tool_code: e.target.value})}
                className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-orange-500"
                placeholder="Auto-generated if empty"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Category *</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-orange-500"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-semibold mb-2">Quantity Available</label>
              <input
                type="number"
                value={formData.quantity_available}
                onChange={(e) => setFormData({...formData, quantity_available: parseInt(e.target.value) || 0})}
                className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Condition</label>
              <select
                value={formData.condition_status}
                onChange={(e) => setFormData({...formData, condition_status: e.target.value})}
                className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-orange-500"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="needs_repair">Needs Repair</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-orange-500"
              placeholder="Tool Crib A, Shelf 3"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold"
            >
              {editingTool ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowModal(false)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold">
              Cancel
            </button>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
