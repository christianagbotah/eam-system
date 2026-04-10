'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import { checkAuth } from '@/middleware/auth';
import { Package, Plus, Edit, Trash2, Search, Download } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currency';
import SearchableSelect from '@/components/SearchableSelect';

export default function SparePartsPage() {
  const currencySymbol = getCurrencySymbol();
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [formData, setFormData] = useState({
    part_name: '', part_number: '', category: '', description: '',
    quantity: 1, unit_cost: '', reorder_point: '', location: ''
  });

  useEffect(() => {
    const auth = checkAuth();
    const role = auth?.user?.role || localStorage.getItem('userRole') || '';
    setUserRole(role);
    if (role) localStorage.setItem('userRole', role);
    loadParts();
  }, []);

  const canCreate = ['admin', 'shop_attendant', 'planner'].includes(userRole);
  const canEdit = ['admin', 'shop_attendant', 'planner'].includes(userRole);
  const canDelete = ['admin', 'shop_attendant'].includes(userRole);

  const loadParts = async () => {
    try {
      // Fetch directly from parts table
      const res = await fetch('/api/v1/eam/parts');
      const data = await res.json();
      setParts(data || []);
    } catch (error) {
      console.error('Error loading parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingPart) {
        await api.put(`/api/v1/eam/parts/${editingPart.id}`, formData);
        alert.success('Success', 'Part updated successfully');
      } else {
        await api.post('/api/v1/eam/parts', formData);
        alert.success('Success', 'Part created successfully');
      }
      setShowModal(false);
      resetForm();
      loadParts();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (part: any) => {
    setEditingPart(part);
    setFormData({
      part_name: part.part_name || '',
      part_number: part.part_number || '',
      category: part.category || '',
      description: part.description || '',
      quantity: part.quantity || 1,
      unit_cost: part.unit_cost || '',
      reorder_point: part.reorder_point || '',
      location: part.location || ''
    });
    setShowModal(true);
  };

  const handleDelete = (part: any) => {
    alert.confirm('Delete Part', `Delete ${part.part_name}?`, async () => {
      try {
        await api.delete(`/api/v1/eam/parts/${part.id}`);
        alert.success('Success', 'Part deleted successfully');
        loadParts();
      } catch (error: any) {
        alert.error('Error', error.response?.data?.message || 'Delete failed');
      }
    });
  };

  const resetForm = () => {
    setEditingPart(null);
    setFormData({
      part_name: '', part_number: '', category: '', description: '',
      quantity: 1, unit_cost: '', reorder_point: '', location: ''
    });
  };

  const filteredParts = Array.isArray(parts) ? parts.filter(p =>
    p.part_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.part_category?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const exportToCSV = () => {
    const csv = [
      ['Part Name', 'Part Number', 'Category', 'Quantity', 'Unit Cost', 'Location'],
      ...filteredParts.map(p => [p.part_name, p.part_number, p.category, p.quantity, p.unit_cost, p.location])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spare-parts.csv';
    a.click();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-blue-600 rounded-lg shadow-sm p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Spare Parts Management</h1>
            <p className="text-blue-100">Inventory tracking and stock control</p>
          </div>
          <Package className="w-16 h-16 opacity-50" />
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
              placeholder="Search parts..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Part
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : filteredParts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Spare Parts Found</h3>
            <p className="text-gray-500 mb-4">{searchTerm ? 'Try adjusting your search' : 'Get started by adding your first spare part'}</p>
            {canCreate && !searchTerm && (
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add First Part
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Part Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Part Number</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Quantity</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Unit Cost</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredParts.map(part => (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{part.part_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{part.part_number}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{part.part_category || 'Uncategorized'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">{Math.floor(part.quantity)}</td>
                    <td className="px-4 py-3 text-sm">{currencySymbol}{part.unit_cost}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{part.location}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {canEdit && (
                          <button onClick={() => handleEdit(part)} className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded inline-flex items-center gap-1.5 text-sm font-medium" title="Edit">
                            <Edit className="w-4 h-4" />
                            <span className="hidden md:inline">Edit</span>
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(part)} className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded inline-flex items-center gap-1.5 text-sm font-medium" title="Delete">
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden md:inline">Delete</span>
                          </button>
                        )}
                        {!canEdit && !canDelete && userRole && (
                          <span className="text-xs text-gray-500 italic">View only</span>
                        )}
                        {!userRole && (
                          <span className="text-xs text-amber-600 italic">Login required</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FormModal isOpen={showModal} onClose={() => setShowModal(false)} title={editingPart ? 'Edit Part' : 'Add Part'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-semibold mb-2">Part Name *</label>
              <input
                type="text"
                value={formData.part_name}
                onChange={(e) => setFormData({...formData, part_name: e.target.value})}
                className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Part Number *</label>
              <input
                type="text"
                value={formData.part_number}
                onChange={(e) => setFormData({...formData, part_number: e.target.value})}
                className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Category *</label>
            <SearchableSelect
              value={formData.category}
              onChange={(value) => setFormData({...formData, category: value})}
              options={[
                { id: 'bearing', label: 'Bearing' },
                { id: 'motor', label: 'Motor' },
                { id: 'sensor', label: 'Sensor' },
                { id: 'valve', label: 'Valve' },
                { id: 'pump', label: 'Pump' },
                { id: 'belt', label: 'Belt' },
                { id: 'gear', label: 'Gear' },
                { id: 'seal', label: 'Seal' },
                { id: 'filter', label: 'Filter' },
                { id: 'electrical', label: 'Electrical' },
                { id: 'hydraulic', label: 'Hydraulic' },
                { id: 'pneumatic', label: 'Pneumatic' },
                { id: 'mechanical', label: 'Mechanical' },
                { id: 'other', label: 'Other' }
              ]}
              placeholder="Select category"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-semibold mb-2">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Unit Cost</label>
              <input
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Reorder Point</label>
              <input
                type="number"
                value={formData.reorder_point}
                onChange={(e) => setFormData({...formData, reorder_point: e.target.value})}
                className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Warehouse A, Bin B-12"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold"
            >
              {editingPart ? 'Update' : 'Create'}
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
