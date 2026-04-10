'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { FiPlus, FiEdit2, FiTrash2, FiDownload, FiActivity } from 'react-icons/fi';

interface ProductionRecord {
  id: number;
  production_date: string;
  shift: string;
  asset_id: number;
  asset_name: string;
  product_name: string;
  target_quantity: number;
  actual_quantity: number;
  rejected_quantity: number;
  operator_id: number;
  operator_name: string;
  downtime_minutes: number;
  notes: string;
}

export default function ProductionPage() {
  const { hasPermission } = usePermissions();
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProductionRecord | null>(null);
  const [filters, setFilters] = useState({ shift: '', search: '', date: '' });
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const canCreate = hasPermission('production.create');
  const canEdit = hasPermission('production.edit');
  const canDelete = hasPermission('production.delete');

  useEffect(() => {
    fetchRecords();
    fetchAssets();
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = records;
    if (filters.search) {
      filtered = filtered.filter(r =>
        r.product_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        r.asset_name?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    if (filters.shift) {
      filtered = filtered.filter(r => r.shift === filters.shift);
    }
    if (filters.date) {
      filtered = filtered.filter(r => r.production_date === filters.date);
    }
    setFilteredRecords(filtered);
  }, [records, filters]);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost/factorymanager/public/index.php/api/v1/eam/production', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setRecords(data.data);
      }
    } catch (error) {
      console.error('Error fetching production records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost/factorymanager/public/index.php/api/v1/eam/assets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setAssets(data.data);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
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
    if (!confirm('Delete this production record?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost/factorymanager/public/index.php/api/v1/eam/production/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchRecords();
      }
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Shift', 'Asset', 'Product', 'Target', 'Actual', 'Rejected', 'Operator', 'Downtime (min)'],
      ...filteredRecords.map(r => [r.production_date, r.shift, r.asset_name, r.product_name, r.target_quantity, r.actual_quantity, r.rejected_quantity, r.operator_name, r.downtime_minutes])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `production-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalProduced = records.reduce((sum, r) => sum + r.actual_quantity, 0);
  const totalRejected = records.reduce((sum, r) => sum + r.rejected_quantity, 0);
  const totalDowntime = records.reduce((sum, r) => sum + r.downtime_minutes, 0);
  const avgEfficiency = records.length > 0 
    ? (records.reduce((sum, r) => sum + (r.actual_quantity / r.target_quantity * 100), 0) / records.length).toFixed(1)
    : 0;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Production Records</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2">
            <FiDownload /> Export
          </button>
          {canCreate && (
            <button onClick={() => { setShowModal(true); setSelectedRecord(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <FiPlus /> Add Record
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Produced</div>
              <div className="text-2xl font-bold text-green-600">{totalProduced.toLocaleString()}</div>
            </div>
            <FiActivity className="text-green-600" size={32} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Rejected</div>
          <div className="text-2xl font-bold text-red-600">{totalRejected.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Downtime</div>
          <div className="text-2xl font-bold text-orange-600">{totalDowntime} min</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Avg Efficiency</div>
          <div className="text-2xl font-bold text-blue-600">{avgEfficiency}%</div>
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
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <select
            value={filters.shift}
            onChange={(e) => setFilters({ ...filters, shift: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Shifts</option>
            <option value="Morning">Morning</option>
            <option value="Afternoon">Afternoon</option>
            <option value="Night">Night</option>
          </select>
        </div>
      </div>

      {/* Production Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rejected</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficiency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRecords.map((record) => {
              const efficiency = (record.actual_quantity / record.target_quantity * 100).toFixed(1);
              const efficiencyColor = parseFloat(efficiency) >= 90 ? 'text-green-600' : parseFloat(efficiency) >= 70 ? 'text-yellow-600' : 'text-red-600';
              
              return (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.production_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.shift}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{record.asset_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{record.product_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.target_quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{record.actual_quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{record.rejected_quantity}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${efficiencyColor}`}>{efficiency}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.operator_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      {canEdit && (
                        <button onClick={() => { setSelectedRecord(record); setShowModal(true); }} className="text-indigo-600 hover:text-indigo-900">
                          <FiEdit2 />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(record.id)} className="text-red-600 hover:text-red-900">
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredRecords.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow mt-6">
          <p className="text-gray-500">No production records found</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <ProductionModal
          record={selectedRecord}
          assets={assets}
          users={users}
          onClose={() => { setShowModal(false); setSelectedRecord(null); }}
          onSuccess={() => { fetchRecords(); setShowModal(false); setSelectedRecord(null); }}
        />
      )}
    </div>
  );
}

function ProductionModal({ record, assets, users, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    production_date: record?.production_date || new Date().toISOString().split('T')[0],
    shift: record?.shift || 'Morning',
    asset_id: record?.asset_id || '',
    product_name: record?.product_name || '',
    target_quantity: record?.target_quantity || 0,
    actual_quantity: record?.actual_quantity || 0,
    rejected_quantity: record?.rejected_quantity || 0,
    operator_id: record?.operator_id || '',
    downtime_minutes: record?.downtime_minutes || 0,
    notes: record?.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = record
        ? `http://localhost/factorymanager/public/index.php/api/v1/eam/production/${record.id}`
        : 'http://localhost/factorymanager/public/index.php/api/v1/eam/production';

      const response = await fetch(url, {
        method: record ? 'PUT' : 'POST',
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
      console.error('Error saving record:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{record ? 'Edit' : 'Add'} Production Record</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Production Date</label>
              <input
                type="date"
                value={formData.production_date}
                onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
              <select
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Night">Night</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
              <select
                value={formData.asset_id}
                onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Select Asset</option>
                {assets.map((asset: any) => (
                  <option key={asset.id} value={asset.id}>{asset.asset_name || asset.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Quantity</label>
              <input
                type="number"
                value={formData.target_quantity}
                onChange={(e) => setFormData({ ...formData, target_quantity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actual Quantity</label>
              <input
                type="number"
                value={formData.actual_quantity}
                onChange={(e) => setFormData({ ...formData, actual_quantity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejected Quantity</label>
              <input
                type="number"
                value={formData.rejected_quantity}
                onChange={(e) => setFormData({ ...formData, rejected_quantity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
              <select
                value={formData.operator_id}
                onChange={(e) => setFormData({ ...formData, operator_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Select Operator</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>{user.full_name || user.username}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Downtime (minutes)</label>
              <input
                type="number"
                value={formData.downtime_minutes}
                onChange={(e) => setFormData({ ...formData, downtime_minutes: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {record ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
