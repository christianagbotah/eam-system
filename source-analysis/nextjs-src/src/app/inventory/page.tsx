'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionSection } from '@/components/guards/PermissionSection';
import { Package, Plus, Search, Download, AlertTriangle, Grid3x3, List, Eye, Edit, Trash2, TrendingUp } from 'lucide-react';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';
import { getCurrencySymbol } from '@/lib/currency';

interface InventoryItem {
  id: number;
  item_code: string;
  item_name: string;
  part_number?: string;
  part_name?: string;
  description: string;
  category: string;
  quantity: number;
  quantity_on_hand: number;
  min_quantity: number;
  reorder_level: number;
  reorder_point: number;
  max_quantity: number;
  unit_cost: number;
  unit_of_measure: string;
  location: string;
  supplier_name: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const currencySymbol = getCurrencySymbol();
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [stockOp, setStockOp] = useState({ quantity: 0, notes: '' });

  const canCreate = hasPermission('inventory.create');
  const canEdit = hasPermission('inventory.update');
  const canDelete = hasPermission('inventory.delete');
  const canStockIn = hasPermission('inventory.stock_in');

  useEffect(() => {
    fetchItems();
    fetchSuppliers();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get('/inventory');
      if (response.data?.status === 'success') {
        setItems(response.data.data || []);
      }
    } catch (error) {
      showToast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      if (response.data?.status === 'success') {
        setSuppliers(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const filteredItems = items.filter(item => {
    const qty = item.quantity_on_hand || item.quantity || 0;
    const reorder = item.reorder_level || item.reorder_point || item.min_quantity || 0;
    const name = item.item_name || item.part_name || '';
    const code = item.item_code || item.part_number || '';
    
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesStock = !stockFilter || 
                        (stockFilter === 'low' && qty <= reorder) ||
                        (stockFilter === 'out' && qty === 0);
    return matchesSearch && matchesCategory && matchesStock;
  });

  const stats = {
    total: items.length,
    lowStock: items.filter(i => (i.quantity_on_hand || i.quantity || 0) <= (i.reorder_level || i.reorder_point || i.min_quantity || 0)).length,
    outOfStock: items.filter(i => (i.quantity_on_hand || i.quantity || 0) === 0).length,
    totalValue: items.reduce((sum, i) => sum + ((i.quantity_on_hand || i.quantity || 0) * (i.unit_cost || 0)), 0)
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) return;
    if (!confirm('Delete this inventory item?')) return;

    const loadingToast = showToast.loading('Deleting item...');
    try {
      await api.delete(`/inventory/${id}`);
      showToast.dismiss(loadingToast);
      showToast.success('Item deleted successfully');
      fetchItems();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete item');
    }
  };

  const handleBulkDelete = async () => {
    if (!canDelete || selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} items?`)) return;

    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} items...`);
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/inventory/${id}`)));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} items deleted`);
      setSelectedIds([]);
      fetchItems();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete items');
    }
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? items.filter(i => selectedIds.includes(i.id)) : filteredItems;
    const csv = [
      ['Code', 'Name', 'Category', 'Quantity', 'Min Qty', 'Unit Cost', 'Location', 'Supplier'],
      ...dataToExport.map(i => [
        i.item_code || i.part_number,
        i.item_name || i.part_name,
        i.category,
        i.quantity_on_hand || i.quantity,
        i.reorder_level || i.min_quantity,
        i.unit_cost,
        i.location,
        i.supplier_name
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast.success('Inventory exported successfully');
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStockIn) return;

    const loadingToast = showToast.loading('Adding stock...');
    try {
      await api.post('/inventory/stock-in', {
        item_id: selectedItem?.id,
        quantity: stockOp.quantity,
        reference: stockOp.notes
      });
      showToast.dismiss(loadingToast);
      showToast.success('Stock added successfully');
      setShowStockModal(false);
      setStockOp({ quantity: 0, notes: '' });
      fetchItems();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to add stock');
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    const qty = item.quantity_on_hand || item.quantity || 0;
    const reorder = item.reorder_level || item.reorder_point || item.min_quantity || 0;
    
    if (qty === 0) return { label: 'Out', color: 'bg-red-100 text-red-800' };
    if (qty <= reorder) return { label: 'Low', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Good', color: 'bg-green-100 text-green-800' };
  };

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-lg shadow p-6 text-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Inventory Management</h1>
            <p className="text-indigo-100">Real-time stock tracking and control</p>
          </div>
          <PermissionSection permissions={['inventory.create']}>
            <button onClick={() => { setShowModal(true); setSelectedItem(null); }} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 font-bold shadow-lg">
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </PermissionSection>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Items</p>
                <p className="text-2xl font-semibold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8" />
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Low Stock</p>
                <p className="text-2xl font-semibold">{stats.lowStock}</p>
              </div>
              <AlertTriangle className="h-8 w-8" />
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Out of Stock</p>
                <p className="text-2xl font-semibold">{stats.outOfStock}</p>
              </div>
              <TrendingDown className="h-8 w-8" />
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Value</p>
                <p className="text-2xl font-semibold">{currencySymbol}{stats.totalValue.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </div>
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
              placeholder="Search by name, code, or description..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

          <div className="flex gap-1 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
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
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-indigo-900">{selectedIds.length} items selected</span>
          <div className="flex gap-2">
            <button onClick={handleExport} className="px-3 py-1.5 text-sm bg-white border border-indigo-300 text-indigo-700 rounded hover:bg-indigo-50">
              Export Selected
            </button>
            <PermissionSection permissions={['inventory.delete']}>
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

      {/* Items Display */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Inventory Items Found</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first inventory item</p>
          <PermissionSection permissions={['inventory.create']}>
            <button onClick={() => setShowModal(true)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Plus className="inline h-4 w-4 mr-2" /> Add Item
            </button>
          </PermissionSection>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const status = getStockStatus(item);
            const qty = item.quantity_on_hand || item.quantity || 0;
            return (
              <div key={item.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden">
                <div className="relative h-32 bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center">
                  <Package className="h-12 w-12 text-white" />
                  <div className="absolute top-2 right-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-3">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{item.item_name || item.part_name}</h3>
                    <p className="text-xs text-gray-500">{item.item_code || item.part_number}</p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Stock:</span>
                      <span className="font-bold text-gray-900">{qty} {item.unit_of_measure}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Value:</span>
                      <span className="font-bold text-gray-900">{currencySymbol}{(qty * (item.unit_cost || 0)).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <PermissionSection permissions={['inventory.stock_in']}>
                      <button
                        onClick={() => { setSelectedItem(item); setShowStockModal(true); }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
                      >
                        <Plus className="h-4 w-4" /> Stock In
                      </button>
                    </PermissionSection>
                    <PermissionSection permissions={['inventory.update']}>
                      <button
                        onClick={() => { setSelectedItem(item); setShowModal(true); }}
                        className="px-2 py-2 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </PermissionSection>
                    <PermissionSection permissions={['inventory.delete']}>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-2 py-2 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </PermissionSection>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const status = getStockStatus(item);
                  const qty = item.quantity_on_hand || item.quantity || 0;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{item.item_name || item.part_name}</div>
                        <div className="text-sm text-gray-500">{item.category}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.item_code || item.part_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{qty}</div>
                        <div className="text-xs text-gray-500">{item.unit_of_measure}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{currencySymbol}{(qty * (item.unit_cost || 0)).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">{currencySymbol}{item.unit_cost || '0.00'} each</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionSection permissions={['inventory.stock_in']}>
                            <button
                              onClick={() => { setSelectedItem(item); setShowStockModal(true); }}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </PermissionSection>
                          <PermissionSection permissions={['inventory.update']}>
                            <button
                              onClick={() => { setSelectedItem(item); setShowModal(true); }}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </PermissionSection>
                          <PermissionSection permissions={['inventory.delete']}>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </PermissionSection>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock In Modal */}
      {showStockModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 rounded-t-xl">
              <h2 className="text-xl font-bold text-white">Stock In</h2>
              <p className="text-green-100 text-sm">{selectedItem.item_name || selectedItem.part_name}</p>
            </div>
            <form onSubmit={handleStockIn} className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-700">Current</p>
                  <p className="text-xl font-bold text-blue-900">{selectedItem.quantity_on_hand || selectedItem.quantity || 0}</p>
                </div>
                <div className="text-2xl">→</div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-green-700">After</p>
                  <p className="text-xl font-bold text-green-600">{(selectedItem.quantity_on_hand || selectedItem.quantity || 0) + (stockOp.quantity || 0)}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Add *</label>
                <input
                  type="number"
                  value={stockOp.quantity || ''}
                  onChange={(e) => setStockOp({...stockOp, quantity: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Notes</label>
                <textarea
                  value={stockOp.notes}
                  onChange={(e) => setStockOp({...stockOp, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="PO#, Supplier, etc."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!stockOp.quantity || stockOp.quantity <= 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Add {stockOp.quantity || 0}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowStockModal(false); setStockOp({ quantity: 0, notes: '' }); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
