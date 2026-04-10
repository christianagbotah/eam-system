'use client';

import { useState } from 'react';
import { Package, Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface Material {
  id?: number;
  date: string;
  time: string;
  gt_code: string;
  description: string;
  specification: string;
  quantity_issued: number;
  remarks: string;
}

interface MaterialsManagerProps {
  workOrderId: number;
  materials: Material[];
  onUpdate: () => void;
  readOnly?: boolean;
}

export default function MaterialsManager({ workOrderId, materials, onUpdate, readOnly = false }: MaterialsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Material>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    gt_code: '',
    description: '',
    specification: '',
    quantity_issued: 0,
    remarks: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/materials/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Failed to save material:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this material?')) {
      try {
        await fetch(`/api/v1/eam/maintenance/work-orders/${workOrderId}/materials/${id}`, {
          method: 'DELETE'
        });
        onUpdate();
      } catch (error) {
        console.error('Failed to delete material:', error);
      }
    }
  };

  const handleEdit = (material: Material) => {
    setFormData(material);
    setEditingId(material.id || null);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      gt_code: '',
      description: '',
      specification: '',
      quantity_issued: 0,
      remarks: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
          Materials Request
        </h2>
        {!readOnly && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold inline-flex items-center gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add Material'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-orange-50 rounded-lg p-4 mb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Time</label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">GT Code</label>
              <input
                type="text"
                required
                value={formData.gt_code}
                onChange={(e) => setFormData({...formData, gt_code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., BRG-001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.quantity_issued}
                onChange={(e) => setFormData({...formData, quantity_issued: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Material description"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Specification</label>
              <input
                type="text"
                value={formData.specification}
                onChange={(e) => setFormData({...formData, specification: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Technical specification"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
              <input
                type="text"
                value={formData.remarks}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Additional notes"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Update' : 'Add'} Material
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-orange-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Time</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">GT Code</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Specification</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Remarks</th>
              {!readOnly && <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {materials.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 7 : 8} className="px-4 py-8 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>No materials added yet</p>
                </td>
              </tr>
            ) : (
              materials.map((mat) => (
                <tr key={mat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{mat.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{mat.time}</td>
                  <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">{mat.gt_code}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{mat.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{mat.specification || '-'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{mat.quantity_issued}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{mat.remarks || '-'}</td>
                  {!readOnly && (
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(mat)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => mat.id && handleDelete(mat.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
