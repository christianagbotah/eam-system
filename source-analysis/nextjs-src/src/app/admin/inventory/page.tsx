'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { inventoryService } from '@/services/inventoryService';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import { getCurrencySymbol } from '@/lib/currency';

import RBACGuard from '@/components/RBACGuard';

function InventoryContent() {
  const currencySymbol = getCurrencySymbol();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(filteredItems);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? filteredItems.filter((i: any) => selectedIds.includes(i.id)) : filteredItems;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map((i: any) => Object.values(i).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });
  const [newItem, setNewItem] = useState({ item_name: '', item_code: '', quantity_on_hand: 0, unit_of_measure: 'pcs', reorder_level: 10 });
  const [stockOp, setStockOp] = useState({ quantity: 0, notes: '' });

  useEffect(() => { loadInventory(); }, []);

  useEffect(() => {
    let filtered = items;
    if (searchTerm) {
      filtered = filtered.filter((item: any) => 
        item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter((item: any) => item.category === categoryFilter);
    }
    if (stockFilter === 'low') {
      filtered = filtered.filter((item: any) => item.quantity_on_hand <= item.reorder_level);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter((item: any) => item.quantity_on_hand === 0);
    }
    setFilteredItems(filtered);
  }, [items, searchTerm, categoryFilter, stockFilter]);

  const loadInventory = async () => {
    try {
      const result = await inventoryService.getAll();
      setItems(result || []);
    } catch (error: any) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Creating item...');
    try {
      await inventoryService.create(newItem);
      showToast.dismiss(loadingToast);
      showToast.success('Item created successfully!');
      setShowModal(false);
      setNewItem({ item_name: '', item_code: '', quantity_on_hand: 0, unit_of_measure: 'pcs', reorder_level: 10 });
      loadInventory();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to create item');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} items?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} items...`);
    try {
      await Promise.all(selectedIds.map(id => inventoryService.delete(id)));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} items deleted`);
      clearSelection();
      loadInventory();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete items');
    }
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Adding stock...');
    try {
      console.log('Sending stock in data:', { item_id: selectedItem.id, quantity: stockOp.quantity, reference: stockOp.notes });
      await inventoryService.stockIn({ item_id: selectedItem.id, quantity: stockOp.quantity, reference: stockOp.notes });
      showToast.dismiss(loadingToast);
      showToast.success('Stock added successfully!');
      setShowStockModal(false);
      setStockOp({ quantity: 0, notes: '' });
      loadInventory();
    } catch (error: any) {
      console.error('Stock in error:', error);
      console.error('Error response:', error.response?.data);
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to add stock');
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Inventory Management</h1>
            <p className="text-indigo-100">Real-time stock tracking and control</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleExport} className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all font-semibold inline-flex items-center gap-2 border-2 border-white/30">
              📥 Export
            </button>
            <button onClick={() => setShowModal(true)} className="px-3 py-1.5 text-sm bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all font-bold shadow-lg inline-flex items-center gap-2">
              + Add Item
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Items</p>
                <p className="text-lg font-semibold">{items.length}</p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Low Stock</p>
                <p className="text-lg font-semibold">{items.filter((i: any) => i.quantity_on_hand <= i.reorder_level).length}</p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Out of Stock</p>
                <p className="text-lg font-semibold">{items.filter((i: any) => i.quantity_on_hand === 0).length}</p>
              </div>
              <div className="text-4xl">🚫</div>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Value</p>
                <p className="text-lg font-semibold">{currencySymbol}{items.reduce((sum: number, i: any) => sum + (i.quantity_on_hand * (i.unit_cost || 0)), 0).toLocaleString()}</p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">🔍 Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or code..."
              className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📂 Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              <option value="spare_parts">Spare Parts</option>
              <option value="consumables">Consumables</option>
              <option value="tools">Tools</option>
              <option value="materials">Materials</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📊 Stock Status</label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setSearchTerm(''); setCategoryFilter(''); setStockFilter(''); }}
              className="w-full px-2 py-1 text-xs.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all font-semibold"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalCount={filteredItems.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleExport}
      />

      {/* Items Grid/Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <TableSkeleton rows={10} />
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Inventory Items Found</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first inventory item</p>
            <button onClick={() => setShowModal(true)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              + Add Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input type="checkbox" checked={selectedIds.length === filteredItems.length && filteredItems.length > 0} onChange={selectAll} className="w-4 h-4 text-indigo-600 rounded" />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Item Details</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-indigo-50 transition-colors">
                    <td className="px-6 py-4">
                      <input type="checkbox" checked={isSelected(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4 text-indigo-600 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => { setSelectedItem(item); setShowDetailsModal(true); }}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-2xl">📦</span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-indigo-600 group-hover:text-indigo-800">{item.item_name}</p>
                          <p className="text-xs text-gray-500">{item.category || 'Uncategorized'}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-[10px] font-mono font-semibold">{item.item_code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{Math.floor(item.quantity_on_hand)}</p>
                        <p className="text-xs text-gray-500">{item.unit_of_measure}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        item.quantity_on_hand === 0 ? 'bg-red-100 text-red-800 border border-red-200' :
                        item.quantity_on_hand <= item.reorder_level ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
                        'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        {item.quantity_on_hand === 0 ? '🚫 Out' : item.quantity_on_hand <= item.reorder_level ? '⚠️ Low' : '✅ Good'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{currencySymbol}{((item.quantity_on_hand || 0) * (item.unit_cost || 0)).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{currencySymbol}{item.unit_cost || '0.00'} each</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => { setSelectedItem(item); setShowStockModal(true); }}
                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all text-sm font-semibold inline-flex items-center gap-2"
                      >
                        📥 Stock In
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="">
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 -m-6 mb-4 p-4 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-white/30">
                  <span className="text-2xl">📦</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Add New Item</h2>
                  <p className="text-indigo-100 text-xs">Create inventory item</p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Item Name *</label>
                  <input 
                    type="text" 
                    value={newItem.item_name} 
                    onChange={(e) => setNewItem({...newItem, item_name: e.target.value})} 
                    className="w-full px-2.5 py-1.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" 
                    placeholder="e.g., Hydraulic Pump"
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Item Code *</label>
                  <input 
                    type="text" 
                    value={newItem.item_code} 
                    onChange={(e) => setNewItem({...newItem, item_code: e.target.value.toUpperCase()})} 
                    className="w-full px-2.5 py-1.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm uppercase" 
                    placeholder="INV-001"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select className="w-full px-2.5 py-1.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm">
                    <option value="">Select</option>
                    <option value="spare_parts">Spare Parts</option>
                    <option value="consumables">Consumables</option>
                    <option value="tools">Tools</option>
                    <option value="materials">Materials</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Quantity *</label>
                  <input 
                    type="number" 
                    value={newItem.quantity_on_hand} 
                    onChange={(e) => setNewItem({...newItem, quantity_on_hand: Number(e.target.value)})} 
                    className="w-full px-2.5 py-1.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm" 
                    placeholder="0"
                    min="0"
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Unit *</label>
                  <select
                    value={newItem.unit_of_measure}
                    onChange={(e) => setNewItem({...newItem, unit_of_measure: e.target.value})}
                    className="w-full px-2.5 py-1.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    required
                  >
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="liters">Liters</option>
                    <option value="meters">Meters</option>
                    <option value="boxes">Boxes</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reorder Level</label>
                  <input 
                    type="number" 
                    value={newItem.reorder_level} 
                    onChange={(e) => setNewItem({...newItem, reorder_level: Number(e.target.value)})} 
                    className="w-full px-2.5 py-1.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm" 
                    placeholder="10"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button 
                type="submit" 
                disabled={loading} 
                className="flex-1 px-2 py-1 text-xs.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:shadow-lg transition-all font-bold disabled:opacity-50 text-sm"
              >
                {loading ? 'Creating...' : '✓ Create Item'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="px-2 py-1 text-xs.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Item Details">
          {selectedItem && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Image Section */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-300">
                <label className="block text-xs font-bold text-gray-700 mb-2">🖼️ Item Image</label>
                {selectedItem.image_url ? (
                  <div className="flex justify-center">
                    <img 
                      src={selectedItem.image_url} 
                      alt={selectedItem.item_name} 
                      className="max-w-48 max-h-32 rounded-lg shadow object-cover" 
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">🖼️</div>
                    <p className="text-xs">No image available</p>
                  </div>
                )}
              </div>

              {/* Item Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-200">
                  <label className="block text-xs font-semibold text-indigo-700 mb-1">Item Name</label>
                  <p className="text-sm font-bold text-gray-900">{selectedItem.item_name}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                  <label className="block text-xs font-semibold text-purple-700 mb-1">Item Code</label>
                  <p className="text-sm font-mono font-bold text-gray-900">{selectedItem.item_code}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <label className="block text-xs font-semibold text-blue-700 mb-1">Category</label>
                  <p className="text-sm font-bold text-gray-900">{selectedItem.category || 'N/A'}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                  <label className="block text-xs font-semibold text-green-700 mb-1">Current Stock</label>
                  <p className="text-sm font-bold text-gray-900">{selectedItem.quantity_on_hand} {selectedItem.unit_of_measure}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                  <label className="block text-xs font-semibold text-yellow-700 mb-1">Reorder Level</label>
                  <p className="text-sm font-bold text-gray-900">{selectedItem.reorder_level}</p>
                </div>
                <div className="bg-pink-50 rounded-lg p-2 border border-pink-200">
                  <label className="block text-xs font-semibold text-pink-700 mb-1">Unit Cost</label>
                  <p className="text-sm font-bold text-gray-900">{currencySymbol}{selectedItem.unit_cost || '0.00'}</p>
                </div>
                <div className="col-span-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                  <p className="text-sm text-gray-900">{selectedItem.description || 'No description available'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 sticky bottom-0 bg-white pb-2">
                <button
                  onClick={() => { setShowDetailsModal(false); setShowStockModal(true); }}
                  className="px-2 py-1 text-xs bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md hover:from-green-700 hover:to-emerald-700 transition-all font-semibold text-sm"
                >
                  📥 Stock In
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all font-semibold text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        <Modal isOpen={showStockModal} onClose={() => setShowStockModal(false)} title="">
          <form onSubmit={handleStockIn} className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 -m-6 mb-4 p-4 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-white/30">
                  <span className="text-2xl">📥</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">Stock In</h2>
                  <p className="text-green-100 text-xs truncate">{selectedItem?.item_name}</p>
                </div>
              </div>
            </div>

            {/* Current Stock Info */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-700">Current</p>
                  <p className="text-xl font-bold text-blue-900">{Math.floor(selectedItem?.quantity_on_hand || 0)} <span className="text-sm text-blue-600">{selectedItem?.unit_of_measure}</span></p>
                </div>
                <div className="text-2xl">→</div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-green-700">After</p>
                  <p className="text-xl font-bold text-green-600">{Math.floor((selectedItem?.quantity_on_hand || 0)) + Math.floor(stockOp.quantity || 0)} <span className="text-sm text-green-500">{selectedItem?.unit_of_measure}</span></p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Quantity to Add *</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={stockOp.quantity || ''} 
                    onChange={(e) => setStockOp({...stockOp, quantity: Number(e.target.value)})} 
                    className="w-full px-2 py-1 text-xs.5 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-bold text-center" 
                    placeholder="0"
                    min="1"
                    required 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">
                    {selectedItem?.unit_of_measure}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reference / Notes</label>
                <textarea 
                  value={stockOp.notes} 
                  onChange={(e) => setStockOp({...stockOp, notes: e.target.value})} 
                  className="w-full px-2.5 py-1.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm" 
                  rows={2}
                  placeholder="PO#, Supplier, etc."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button 
                type="submit" 
                disabled={loading || !stockOp.quantity || stockOp.quantity <= 0} 
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-bold disabled:opacity-50 text-sm"
              >
                {loading ? 'Processing...' : `✓ Add ${stockOp.quantity || 0}`}
              </button>
              <button 
                type="button" 
                onClick={() => { setShowStockModal(false); setStockOp({ quantity: 0, notes: '' }); }} 
                className="px-2 py-1 text-xs.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <RBACGuard module="inventory" action="view">
      <InventoryContent />
    </RBACGuard>
  );
}
