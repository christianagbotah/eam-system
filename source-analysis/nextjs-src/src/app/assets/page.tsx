'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionSection } from '@/components/guards/PermissionSection';
import { Package, Plus, Search, Grid3x3, List, Download, Eye, Edit, Trash2, MapPin, Calendar, TrendingUp, AlertCircle, Filter, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { formatDate } from '@/lib/dateUtils';
import api from '@/lib/api';

interface Asset {
  id: number;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  category: string;
  location: string;
  status: string;
  criticality: string;
  purchase_date: string;
  purchase_cost: number;
  department_name: string;
}

export default function AssetsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const canCreate = hasPermission('assets.create');
  const canEdit = hasPermission('assets.update');
  const canDelete = hasPermission('assets.delete');

  useEffect(() => {
    fetchAssets();
    fetchDepartments();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets');
      if (response.data?.status === 'success') {
        setAssets(response.data.data || []);
      }
    } catch (error) {
      showToast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      if (response.data?.status === 'success') {
        setDepartments(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.asset_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.asset_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesType = typeFilter === 'all' || asset.asset_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleDelete = async (id: number) => {
    if (!canDelete) return;
    if (!confirm('Delete this asset?')) return;

    const loadingToast = showToast.loading('Deleting asset...');
    try {
      await api.delete(`/assets/${id}`);
      showToast.dismiss(loadingToast);
      showToast.success('Asset deleted successfully');
      fetchAssets();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete asset');
    }
  };

  const handleBulkDelete = async () => {
    if (!canDelete || selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} assets?`)) return;

    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} assets...`);
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/assets/${id}`)));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} assets deleted`);
      setSelectedIds([]);
      fetchAssets();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete assets');
    }
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? assets.filter(a => selectedIds.includes(a.id)) : filteredAssets;
    const csv = [
      ['Code', 'Name', 'Type', 'Category', 'Location', 'Status', 'Criticality', 'Purchase Date', 'Cost', 'Department'],
      ...dataToExport.map(a => [a.asset_code, a.asset_name, a.asset_type, a.category, a.location, a.status, a.criticality, a.purchase_date, a.purchase_cost, a.department_name])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assets-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast.success('Assets exported successfully');
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      facility: '🏭',
      building: '🏢',
      system: '⚙️',
      equipment: '🔧',
      machine: '🤖',
      tool: '🔨',
      vehicle: '🚗'
    };
    return icons[type] || '📦';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Under Maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'Retired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-sm text-gray-600 mt-1">{filteredAssets.length} total assets</p>
        </div>
        <PermissionSection permissions={['assets.create']}>
          <button onClick={() => { setShowModal(true); setSelectedAsset(null); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Asset
          </button>
        </PermissionSection>
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, code, or location..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Types</option>
            <option value="machine">Machine</option>
            <option value="equipment">Equipment</option>
            <option value="tool">Tool</option>
            <option value="vehicle">Vehicle</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Retired">Retired</option>
          </select>

          <div className="flex gap-1 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">{selectedIds.length} assets selected</span>
          <div className="flex gap-2">
            <button onClick={handleExport} className="px-3 py-1.5 text-sm bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50">
              Export Selected
            </button>
            <PermissionSection permissions={['assets.delete']}>
              <button onClick={handleBulkDelete} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                Delete Selected
              </button>
            </PermissionSection>
            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
              Clear
            </button>
          </div>
        </div>
      )}

      {filteredAssets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg font-medium">No assets found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or create a new asset</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden">
              <div className="relative h-32 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <span className="text-5xl">{getTypeIcon(asset.asset_type)}</span>
                <div className="absolute top-2 right-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(asset.status)}`}>
                    {asset.status}
                  </span>
                </div>
                <div className="absolute top-2 left-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${getCriticalityColor(asset.criticality)}`}>
                    {asset.criticality}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-3">
                  <h3 className="text-base font-semibold text-gray-900 truncate">{asset.asset_name}</h3>
                  <p className="text-xs text-gray-500">{asset.asset_code}</p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-xs text-gray-600">
                    <Package className="h-4 w-4 mr-2" />
                    <span className="capitalize">{asset.asset_type}</span>
                  </div>
                  
                  {asset.location && (
                    <div className="flex items-center text-xs text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="truncate">{asset.location}</span>
                    </div>
                  )}

                  {asset.purchase_date && (
                    <div className="flex items-center text-xs text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{formatDate(asset.purchase_date)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => router.push(`/assets/${asset.id}`)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  >
                    <Eye className="h-4 w-4" /> View
                  </button>
                  <PermissionSection permissions={['assets.update']}>
                    <button
                      onClick={() => { setSelectedAsset(asset); setShowModal(true); }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" /> Edit
                    </button>
                  </PermissionSection>
                  <PermissionSection permissions={['assets.delete']}>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="px-2 py-2 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </PermissionSection>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criticality</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAssets.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.asset_code}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{asset.asset_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{asset.asset_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{asset.location}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(asset.status)}`}>
                    {asset.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCriticalityColor(asset.criticality)}`}>
                    {asset.criticality}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{asset.department_name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <PermissionSection permissions={['assets.update', 'assets.delete']}>
                    <div className="flex items-center justify-end gap-2">
                      <PermissionSection permissions={['assets.update']}>
                        <button onClick={() => { setSelectedAsset(asset); setShowModal(true); }} className="text-indigo-600 hover:text-indigo-900">
                          <Edit className="h-4 w-4" />
                        </button>
                      </PermissionSection>
                      <PermissionSection permissions={['assets.delete']}>
                        <button onClick={() => handleDelete(asset.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </PermissionSection>
                    </div>
                  </PermissionSection>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <AssetModal
          asset={selectedAsset}
          departments={departments}
          onClose={() => { setShowModal(false); setSelectedAsset(null); }}
          onSuccess={() => { fetchAssets(); setShowModal(false); setSelectedAsset(null); }}
        />
      )}
    </div>
  );
}

function AssetModal({ asset, departments, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    asset_code: asset?.asset_code || '',
    asset_name: asset?.asset_name || '',
    asset_type: asset?.asset_type || 'machine',
    category: asset?.category || '',
    location: asset?.location || '',
    status: asset?.status || 'Active',
    criticality: asset?.criticality || 'Medium',
    purchase_date: asset?.purchase_date || '',
    purchase_cost: asset?.purchase_cost || '',
    department_id: asset?.department_id || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading(asset ? 'Updating asset...' : 'Creating asset...');
    try {
      if (asset) {
        await api.put(`/assets/${asset.id}`, formData);
      } else {
        await api.post('/assets', formData);
      }
      showToast.dismiss(loadingToast);
      showToast.success(asset ? 'Asset updated successfully' : 'Asset created successfully');
      onSuccess();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error(asset ? 'Failed to update asset' : 'Failed to create asset');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{asset ? 'Edit' : 'Add'} Asset</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset Code</label>
              <input
                type="text"
                value={formData.asset_code}
                onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
              <input
                type="text"
                value={formData.asset_name}
                onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.asset_type}
                onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="machine">Machine</option>
                <option value="equipment">Equipment</option>
                <option value="tool">Tool</option>
                <option value="vehicle">Vehicle</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Criticality</label>
              <select
                value={formData.criticality}
                onChange={(e) => setFormData({ ...formData, criticality: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select Department</option>
                {departments.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>{dept.department_name || dept.name}</option>
                ))}
              </select>
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
              {asset ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
