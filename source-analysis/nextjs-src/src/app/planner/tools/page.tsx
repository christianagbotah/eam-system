'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import { Wrench, Plus, Edit, Trash2, Calendar } from 'lucide-react';

export default function ToolsManagementPage() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTool, setEditingTool] = useState<any>(null);
  const [formData, setFormData] = useState({
    tool_code: '', tool_name: '', category: '', description: '', manufacturer: '',
    model_number: '', serial_number: '', quantity_available: 0, location: '',
    condition_status: 'good', calibration_required: false, last_calibration_date: '',
    next_calibration_date: '', purchase_date: '', purchase_cost: '', image_url: '', notes: ''
  });

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const response = await api.get('/tools');
      setTools(response.data?.data || []);
    } catch (error) {
      console.error('Error loading tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTool(null);
    setFormData({
      tool_code: '', tool_name: '', category: '', description: '', manufacturer: '',
      model_number: '', serial_number: '', quantity_available: 0, location: '',
      condition_status: 'good', calibration_required: false, last_calibration_date: '',
      next_calibration_date: '', purchase_date: '', purchase_cost: '', image_url: '', notes: ''
    });
    setShowModal(true);
  };

  const handleEdit = (tool: any) => {
    setEditingTool(tool);
    setFormData({
      tool_code: tool.tool_code || '', tool_name: tool.tool_name || '', category: tool.category || '',
      description: tool.description || '', manufacturer: tool.manufacturer || '',
      model_number: tool.model_number || '', serial_number: tool.serial_number || '',
      quantity_available: tool.quantity_available || 0, location: tool.location || '',
      condition_status: tool.condition_status || 'good', calibration_required: tool.calibration_required || false,
      last_calibration_date: tool.last_calibration_date || '', next_calibration_date: tool.next_calibration_date || '',
      purchase_date: tool.purchase_date || '', purchase_cost: tool.purchase_cost || '',
      image_url: tool.image_url || '', notes: tool.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTool) {
        await api.put(`/tools/${editingTool.id}`, formData);
        alert.success('Success', 'Tool updated successfully');
      } else {
        await api.post('/tools', formData);
        alert.success('Success', 'Tool created successfully');
      }
      setShowModal(false);
      loadTools();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to save tool');
    }
  };

  const handleDelete = (tool: any) => {
    alert.confirm('Delete Tool', `Are you sure you want to delete ${tool.tool_name}?`, async () => {
      try {
        await api.delete(`/tools/${tool.id}`);
        alert.success('Success', 'Tool deleted successfully');
        loadTools();
      } catch (error: any) {
        alert.error('Error', error.response?.data?.message || 'Failed to delete tool');
      }
    });
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'needs_repair': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Tools Management</h1>
            <p className="text-blue-100">Manage tool inventory, assignments, and calibration</p>
          </div>
          <button onClick={handleCreate} className="bg-white text-blue-600 px-3 py-1.5 text-sm rounded-lg hover:bg-blue-50 transition-all font-semibold shadow-lg inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Tool
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-64" />)
        ) : tools.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Wrench className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tools found</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first tool.</p>
            <button onClick={handleCreate} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Tool
            </button>
          </div>
        ) : (
          tools.map((tool) => (
            <div key={tool.id} className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-all">
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-2">
                  {tool.image_url ? (
                    <img src={tool.image_url} alt={tool.tool_name} className="w-20 h-20 object-cover rounded-lg" />
                  ) : (
                    <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Wrench className="w-10 h-10 text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{tool.tool_name}</h3>
                    <p className="text-sm text-gray-500">{tool.tool_code}</p>
                    {tool.category && <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{tool.category}</span>}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Available:</span><span className="font-semibold text-green-600">{tool.quantity_available}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">In Use:</span><span className="font-semibold text-blue-600">{tool.quantity_in_use}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Total:</span><span className="font-semibold">{tool.quantity_total}</span></div>
                  {tool.location && <div className="flex justify-between"><span className="text-gray-600">Location:</span><span className="font-medium">{tool.location}</span></div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getConditionColor(tool.condition_status)}`}>
                    {tool.condition_status.replace('_', ' ').toUpperCase()}
                  </span>
                  {tool.calibration_required && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-purple-100 text-purple-800 border-purple-200 inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Calibration
                    </span>
                  )}
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <button onClick={() => handleEdit(tool)} className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium inline-flex items-center justify-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button onClick={() => handleDelete(tool)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <FormModal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTool ? 'Edit Tool' : 'Add New Tool'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Tool Code</label><input type="text" value={formData.tool_code} onChange={(e) => setFormData({...formData, tool_code: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Auto-generated if empty" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Tool Name *</label><input type="text" value={formData.tool_name} onChange={(e) => setFormData({...formData, tool_name: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" required /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Category</label><select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"><option value="">Select Category</option><option value="Hand Tools">Hand Tools</option><option value="Power Tools">Power Tools</option><option value="Measuring Instruments">Measuring Instruments</option><option value="Testing Equipment">Testing Equipment</option><option value="Lifting Equipment">Lifting Equipment</option><option value="Safety Equipment">Safety Equipment</option><option value="Specialized Tools">Specialized Tools</option></select></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Quantity Available</label><input type="number" value={formData.quantity_available} onChange={(e) => setFormData({...formData, quantity_available: parseInt(e.target.value) || 0})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" min="0" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Manufacturer</label><input type="text" value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Model Number</label><input type="text" value={formData.model_number} onChange={(e) => setFormData({...formData, model_number: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Serial Number</label><input type="text" value={formData.serial_number} onChange={(e) => setFormData({...formData, serial_number: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Location</label><input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Storage location" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label><select value={formData.condition_status} onChange={(e) => setFormData({...formData, condition_status: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"><option value="excellent">Excellent</option><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option><option value="needs_repair">Needs Repair</option></select></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Image URL</label><input type="text" value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="https://..." /></div>
          </div>
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 mb-4"><input type="checkbox" checked={formData.calibration_required} onChange={(e) => setFormData({...formData, calibration_required: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm font-semibold text-gray-700">Calibration Required</span></label>
            {formData.calibration_required && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Last Calibration</label><input type="date" value={formData.last_calibration_date} onChange={(e) => setFormData({...formData, last_calibration_date: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Next Calibration</label><input type="date" value={formData.next_calibration_date} onChange={(e) => setFormData({...formData, next_calibration_date: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" /></div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border-t pt-4">
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Date</label><input type="date" value={formData.purchase_date} onChange={(e) => setFormData({...formData, purchase_date: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Cost</label><input type="number" step="0.01" value={formData.purchase_cost} onChange={(e) => setFormData({...formData, purchase_cost: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="0.00" /></div>
          </div>
          <div className="space-y-4">
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Description</label><textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" rows={2} /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" rows={2} /></div>
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <button type="submit" className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold shadow-lg">{editingTool ? 'Update Tool' : 'Create Tool'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold">Cancel</button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
