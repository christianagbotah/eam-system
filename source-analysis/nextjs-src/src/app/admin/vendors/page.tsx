'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import RBACGuard from '@/components/RBACGuard';

interface Vendor {
  id: number;
  name: string;
  category: string;
  rating: number;
  total_contracts: number;
  active_contracts: number;
  total_spent: number;
  performance_score: number;
  status: string;
}

function VendorsContent() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(vendors);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? vendors.filter(v => selectedIds.includes(v.id)) : vendors;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(v => Object.values(v).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });
  const [formData, setFormData] = useState({
    name: '',
    category: 'maintenance',
    contact_person: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/eam/vendors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      setVendors(data.data || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Adding vendor...');
    try {
      await api.post('/vendors', formData);
      showToast.dismiss(loadingToast);
      showToast.success('Vendor added successfully!');
      setShowModal(false);
      fetchVendors();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to add vendor');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} vendors?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} vendors...`);
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/vendors/${id}`)));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} vendors deleted`);
      clearSelection();
      fetchVendors();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete vendors');
    }
  };

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(Math.round(rating));
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-base font-semibold">Vendor Management</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded">📥 Export</button>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded">+ Add Vendor</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Total Vendors</div>
          <div className="text-lg font-semibold">{vendors.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Active Contracts</div>
          <div className="text-lg font-semibold">{vendors.reduce((sum, v) => sum + v.active_contracts, 0)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Total Spent</div>
          <div className="text-lg font-semibold">${vendors.reduce((sum, v) => sum + v.total_spent, 0).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Avg Performance</div>
          <div className="text-lg font-semibold">{(vendors.reduce((sum, v) => sum + v.performance_score, 0) / vendors.length || 0).toFixed(1)}%</div>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalCount={vendors.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleExport}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <TableSkeleton rows={10} />
        ) : vendors.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Vendors Found</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first vendor</p>
            <button onClick={() => setShowModal(true)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + Add Vendor
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  <input type="checkbox" checked={selectedIds.length === vendors.length && vendors.length > 0} onChange={selectAll} />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contracts</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-gray-200">
              {vendors.map(vendor => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={isSelected(vendor.id)} onChange={() => toggleSelect(vendor.id)} />
                  </td>
                  <td className="px-6 py-4 font-medium">{vendor.name}</td>
                <td className="px-6 py-4 capitalize">{vendor.category}</td>
                <td className="px-6 py-4">{getRatingStars(vendor.rating)}</td>
                <td className="px-6 py-4">
                  <span className="font-semibold">{vendor.active_contracts}</span> / {vendor.total_contracts}
                </td>
                <td className="px-6 py-4">${vendor.total_spent.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`font-semibold ${getPerformanceColor(vendor.performance_score)}`}>
                    {vendor.performance_score}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded ${vendor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {vendor.status}
                  </span>
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Vendor</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Vendor Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="parts">Parts Supplier</option>
                  <option value="services">Services</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Contact Person</label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={e => setFormData({...formData, contact_person: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                  Add Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VendorsPage() {
  return (
    <RBACGuard module="vendors" action="view">
      <VendorsContent />
    </RBACGuard>
  );
}
