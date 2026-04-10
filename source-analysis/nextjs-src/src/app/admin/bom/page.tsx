'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';

interface BOMItem {
  id: number;
  parent_asset_id: number;
  child_asset_id: number;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  parent_name?: string;
  child_name?: string;
  child_code?: string;
  level?: number;
}

import RBACGuard from '@/components/RBACGuard';

function BOMContent() {
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);
  const [explosion, setExplosion] = useState<any[]>([]);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(bomItems);
  const [searchTerm, setSearchTerm] = useState('');

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? bomItems.filter(item => selectedIds.includes(item.id)) : bomItems;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(item => Object.values(item).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bom-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });
  const [formData, setFormData] = useState({
    parent_asset_id: '',
    child_asset_id: '',
    quantity: 1,
    unit_cost: 0
  });

  useEffect(() => {
    fetchBOM();
  }, []);

  const fetchBOM = async () => {
    try {
      const res = await api.get('/bom');
      if ((res.data as any)?.status === 'success') {
        setBomItems((res.data as any)?.data);
        setFilteredItems((res.data as any)?.data);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = bomItems.filter(item => 
      (item.parent_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.child_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.child_code?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredItems(filtered);
  }, [searchTerm, bomItems]);

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} items?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} items...`);
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/bom/${id}`)));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} items deleted`);
      clearSelection();
      fetchBOM();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete items');
    }
  };

  const handleExplode = async (assetId: number) => {
    try {
      const res = await api.get(`/bom/${assetId}/explode`);
      if ((res.data as any)?.status === 'success') {
        setExplosion((res.data as any)?.data);
        setSelectedAsset(assetId);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Saving BOM item...');
    try {
      const res = await api.post('/bom', formData);
      if ((res.data as any)?.status === 'success') {
        showToast.dismiss(loadingToast);
        showToast.success('BOM item created successfully!');
        setShowModal(false);
        fetchBOM();
        setFormData({ parent_asset_id: '', child_asset_id: '', quantity: 1, unit_cost: 0 });
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to create BOM item');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this BOM item?')) return;
    try {
      await api.delete(`/bom/${id}`);
      fetchBOM();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Bill of Materials</h1>
            <p className="text-xs text-gray-600 mt-0.5">Manage asset component relationships</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700">📥 Export</button>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <span>➕</span> Add BOM Item
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search BOM items..."
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        <BulkActions
          selectedIds={selectedIds}
          totalCount={bomItems.length}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleExport}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">BOM Items</h2>
            {loading ? (
              <TableSkeleton rows={8} />
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No BOM items found</div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <input type="checkbox" checked={isSelected(item.id)} onChange={() => toggleSelect(item.id)} className="mr-3 mt-1" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.parent_name || `Asset #${item.parent_asset_id}`}</div>
                        <div className="text-sm text-xs text-gray-600 mt-0.5">
                          → {item.child_name || item.child_code || `Asset #${item.child_asset_id}`}
                        </div>
                        <div className="flex gap-2 mt-2 text-sm">
                          <span className="text-gray-600">Qty: <span className="font-medium">{item.quantity}</span></span>
                          <span className="text-gray-600">Unit: <span className="font-medium">${item.unit_cost}</span></span>
                          <span className="text-gray-600">Total: <span className="font-medium text-green-600">${item.total_cost}</span></span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleExplode(item.parent_asset_id)} className="text-blue-600 hover:text-blue-800 text-sm">
                          🔍 Explode
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">BOM Explosion</h2>
            {selectedAsset ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {explosion.map((item, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2" style={{ marginLeft: `${(item.level || 0) * 20}px` }}>
                    <div className="font-medium text-gray-900">{item.child_name || item.child_code}</div>
                    <div className="text-sm text-gray-600">
                      Level {item.level} • Qty: {item.quantity} • Cost: ${item.total_cost}
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t">
                  <div className="text-lg font-semibold text-green-600">
                    Total Cost: ${explosion.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0).toFixed(2)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">🔍</div>
                <p>Click "Explode" on any BOM item to see full breakdown</p>
              </div>
            )}
          </div>
        </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add BOM Item</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Parent Asset ID</label>
                <input type="number" required value={formData.parent_asset_id} onChange={(e) => setFormData({...formData, parent_asset_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Child Asset ID</label>
                <input type="number" required value={formData.child_asset_id} onChange={(e) => setFormData({...formData, child_asset_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                <input type="number" required min="1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit Cost ($)</label>
                <input type="number" required min="0" step="0.01" value={formData.unit_cost} onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BOMPage() {
  return (
    <RBACGuard module="bom" action="view">
      <BOMContent />
    </RBACGuard>
  );
}
