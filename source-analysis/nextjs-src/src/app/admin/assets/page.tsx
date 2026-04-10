'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, Search, Grid3x3, List, Filter, Download, Eye, Edit, Trash2, MapPin, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import RBACGuard from '@/components/RBACGuard';

interface Asset {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  status: string;
  criticality: string;
  health_score: number | null;
  manufacturer: string | null;
  model_number: string | null;
  installation_date: string | null;
  location_id: number | null;
  mtbf_hours: number | null;
  mttr_hours: number | null;
  oee_percent: number | null;
}

function AssetsContent() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(filteredAssets);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? assets.filter(a => selectedIds.includes(a.id)) : assets;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(a => Object.values(a).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Assets exported successfully');
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} assets?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} assets...`);
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/assets-unified/${id}`)));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} assets deleted`);
      clearSelection();
      fetchAssets();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete assets');
    }
  };

  useKeyboardShortcuts({
    onNew: () => router.push('/admin/assets/new'),
    onExport: handleExport
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets-unified');
      if ((response.data as any)?.status === 'success') {
        setAssets((response.data as any)?.data || []);
      }
    } catch (error) {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/assets-unified/${id}`);
      toast.success('Asset deleted successfully');
      fetchAssets();
    } catch (error) {
      toast.error('Failed to delete asset');
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.asset_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.asset_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesType = typeFilter === 'all' || asset.asset_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'idle': return 'info';
      case 'maintenance': return 'warning';
      case 'down': return 'error';
      case 'retired': return 'default';
      default: return 'default';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      facility: '🏭',
      building: '🏢',
      system: '⚙️',
      line: '🔗',
      equipment: '🔧',
      machine: '🤖',
      assembly: '🔩',
      component: '⚡',
      part: '🔹',
      subpart: '▪️'
    };
    return icons[type] || '📦';
  };

  if (loading) return <LoadingSkeleton variant="table" />;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Assets</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{filteredAssets.length} total assets</p>
        </div>
        <button
          onClick={() => router.push('/admin/assets/new')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Asset
        </button>
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or code..."
              className="w-full pl-9 pr-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Types</option>
            <option value="facility">Facility</option>
            <option value="building">Building</option>
            <option value="system">System</option>
            <option value="equipment">Equipment</option>
            <option value="machine">Machine</option>
            <option value="assembly">Assembly</option>
            <option value="component">Component</option>
            <option value="part">Part</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="idle">Idle</option>
            <option value="maintenance">Maintenance</option>
            <option value="down">Down</option>
            <option value="retired">Retired</option>
          </select>

          <div className="flex gap-1 border border-gray-300 dark:border-gray-600 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalCount={filteredAssets.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleExport}
      />

      {filteredAssets.length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="No assets found"
          description="Get started by creating your first asset"
          actionLabel="Create Asset"
          onAction={() => router.push('/admin/assets/new')}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow overflow-hidden group"
            >
              <div className="relative h-28 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <span className="text-4xl">{getTypeIcon(asset.asset_type)}</span>
                <div className="absolute top-2 right-2">
                  <Badge variant={getStatusColor(asset.status)}>
                    {asset.status}
                  </Badge>
                </div>
                <div className="absolute top-2 left-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${getCriticalityColor(asset.criticality)}`}>
                    {asset.criticality}
                  </span>
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{asset.asset_name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{asset.asset_code}</p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                    <Package className="h-3.5 w-3.5 mr-1.5" />
                    <span className="capitalize">{asset.asset_type}</span>
                  </div>
                  
                  {asset.manufacturer && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                      <span className="truncate">{asset.manufacturer}</span>
                    </div>
                  )}

                  {asset.installation_date && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      <span>{formatDate(asset.installation_date)}</span>
                    </div>
                  )}

                  {asset.health_score !== null && (
                    <div className="flex items-center text-xs">
                      <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                      <span className="text-gray-600 dark:text-gray-400">Health: </span>
                      <span className="ml-1 font-semibold text-blue-600">{asset.health_score}%</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => router.push(`/admin/assets/${asset.id}`)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                  <button
                    onClick={() => router.push(`/admin/assets/${asset.id}/edit`)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => { setDeleteId(asset.id); setDeleteConfirm(true); }}
                    className="px-2 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Asset</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Criticality</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Health</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Manufacturer</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{getTypeIcon(asset.asset_type)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{asset.asset_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{asset.asset_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="capitalize text-xs text-gray-700 dark:text-gray-300">{asset.asset_type}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={getStatusColor(asset.status)}>
                        {asset.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${getCriticalityColor(asset.criticality)}`}>
                        {asset.criticality}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {asset.health_score !== null ? (
                        <div className="flex items-center">
                          <div className="w-12 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mr-2">
                            <div
                              className={`h-1.5 rounded-full ${asset.health_score >= 80 ? 'bg-green-500' : asset.health_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${asset.health_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{asset.health_score}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300">
                      {asset.manufacturer || 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/admin/assets/${asset.id}`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/assets/${asset.id}/edit`)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setDeleteId(asset.id); setDeleteConfirm(true); }}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Delete Asset?"
        description="This action cannot be undone. All related data will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}

export default function AssetsPage() {
  return (
    <RBACGuard module="assets" action="view">
      <AssetsContent />
    </RBACGuard>
  );
}
