'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';

interface Transformation {
  id: number;
  entity_type: string;
  field_name: string;
  transformation_type: string;
  transformation_rule: any;
  direction: string;
  is_active: boolean;
}

export default function ERPTransformationsPage() {
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transformation | null>(null);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(transformations);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? transformations.filter(t => selectedIds.includes(t.id)) : transformations;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(t => Object.values(t).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp-transformations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Transformations exported');
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} transformations?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} transformations...`);
    try {
      const token = localStorage.getItem('access_token');
      await Promise.all(selectedIds.map(id => api.delete(`/erp/transformations/${id}`)` } })));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} transformations deleted`);
      clearSelection();
      fetchTransformations();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete transformations');
    }
  };

  useKeyboardShortcuts({
    onNew: () => openModal(),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });

  const [formData, setFormData] = useState({
    entity_type: 'assets',
    field_name: '',
    transformation_type: 'value_map',
    transformation_rule: '{}',
    direction: 'both',
    is_active: true
  });

  useEffect(() => {
    fetchTransformations();
  }, []);

  const fetchTransformations = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/eam/erp/transformations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      setTransformations(data.data || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const url = editing 
        ? `/api/v1/eam/erp/transformations/${editing.id}`
        : '/api/v1/eam/erp/transformations';
      
      const payload = {
        ...formData,
        transformation_rule: JSON.parse(formData.transformation_rule)
      };

      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast.success(editing ? 'Transformation updated' : 'Transformation created');
        setShowModal(false);
        setEditing(null);
        fetchTransformations();
      }
    } catch (error) {
      showToast.error('Invalid JSON in transformation rule');
    }
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    try {
      const token = localStorage.getItem('access_token');
      await api.put(`/erp/transformations/${id}`)`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !isActive })
      });
      showToast.success(isActive ? 'Transformation disabled' : 'Transformation enabled');
      fetchTransformations();
    } catch (error) {
      showToast.error('Failed to update transformation');
    }
  };

  const deleteTransformation = async (id: number) => {
    if (!confirm('Delete this transformation?')) return;
    try {
      const token = localStorage.getItem('access_token');
      await api.delete(`/erp/transformations/${id}`)` }
      });
      showToast.success('Transformation deleted');
      fetchTransformations();
    } catch (error) {
      showToast.error('Failed to delete transformation');
    }
  };

  const openModal = (t?: Transformation) => {
    if (t) {
      setEditing(t);
      setFormData({
        entity_type: t.entity_type,
        field_name: t.field_name,
        transformation_type: t.transformation_type,
        transformation_rule: JSON.stringify(t.transformation_rule, null, 2),
        direction: t.direction,
        is_active: t.is_active
      });
    } else {
      setEditing(null);
      setFormData({
        entity_type: 'assets',
        field_name: '',
        transformation_type: 'value_map',
        transformation_rule: '{}',
        direction: 'both',
        is_active: true
      });
    }
    setShowModal(true);
  };

  const getTypeExample = (type: string) => {
    const examples: Record<string, string> = {
      value_map: '{"active":"ACT","inactive":"INA"}',
      formula: '{"expression":"value * 1.15"}',
      concat: '{"fields":["field1","field2"],"separator":" - "}',
      split: '{"delimiter":"-","index":0}',
      date_format: '{"from":"Y-m-d","to":"Ymd"}'
    };
    return examples[type] || '{}';
  };

  if (loading) return <div className="p-6"><TableSkeleton rows={8} /></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-base font-semibold">ERP Data Transformations</h1>
          <p className="text-sm text-xs text-gray-600 mt-0.5">Configure data conversion rules for ERP sync</p>
        </div>
        <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          + New Transformation
        </button>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalCount={transformations.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleExport}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input type="checkbox" checked={selectedIds.length === transformations.length && transformations.length > 0} onChange={selectAll} className="rounded" />
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rule</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transformations.map(t => (
              <tr key={t.id}>
                <td className="px-6 py-4">
                  <input type="checkbox" checked={isSelected(t.id)} onChange={() => toggleSelect(t.id)} className="rounded" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{t.entity_type.replace('_', ' ')}</td>
                <td className="px-3 py-2.5 whitespace-nowrap font-mono text-sm">{t.field_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800 capitalize">
                    {t.transformation_type.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <details className="cursor-pointer">
                    <summary className="text-blue-600 hover:text-blue-800 text-sm">View Rule</summary>
                    <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-w-md">
                      {JSON.stringify(t.transformation_rule, null, 2)}
                    </pre>
                  </details>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm capitalize">{t.direction.replace('_', ' → ')}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleActive(t.id, t.is_active)}
                    className={`px-2 py-1 text-xs rounded ${t.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    {t.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm space-x-2">
                  <button onClick={() => openModal(t)} className="text-blue-600 hover:text-blue-800">Edit</button>
                  <button onClick={() => deleteTransformation(t.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'New'} Transformation</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Entity Type</label>
                  <select value={formData.entity_type} onChange={e => setFormData({...formData, entity_type: e.target.value})} className="w-full border rounded px-3 py-2">
                    <option value="assets">Assets</option>
                    <option value="work_orders">Work Orders</option>
                    <option value="inventory">Inventory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Field Name</label>
                  <input type="text" value={formData.field_name} onChange={e => setFormData({...formData, field_name: e.target.value})} className="w-full border rounded px-3 py-2" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Transformation Type</label>
                  <select 
                    value={formData.transformation_type} 
                    onChange={e => {
                      const type = e.target.value;
                      setFormData({
                        ...formData, 
                        transformation_type: type,
                        transformation_rule: getTypeExample(type)
                      });
                    }} 
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="value_map">Value Map</option>
                    <option value="formula">Formula</option>
                    <option value="concat">Concatenate</option>
                    <option value="split">Split</option>
                    <option value="date_format">Date Format</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Direction</label>
                  <select value={formData.direction} onChange={e => setFormData({...formData, direction: e.target.value})} className="w-full border rounded px-3 py-2">
                    <option value="both">Both</option>
                    <option value="eam_to_erp">EAM → ERP</option>
                    <option value="erp_to_eam">ERP → EAM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Transformation Rule (JSON)</label>
                <textarea 
                  value={formData.transformation_rule} 
                  onChange={e => setFormData({...formData, transformation_rule: e.target.value})} 
                  className="w-full border rounded px-3 py-2 font-mono text-sm" 
                  rows={8}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Must be valid JSON</p>
              </div>
              <div className="flex items-center">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="mr-2" />
                <label className="text-sm">Active</label>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
