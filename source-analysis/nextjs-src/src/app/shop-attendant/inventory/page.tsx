'use client';

import { useState, useEffect } from 'react';
import { Package, TrendingDown, AlertTriangle, Search, Filter, Download } from 'lucide-react';

export default function ShopAttendantInventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, outOfStock: 0, value: 0 });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchInventory();
    fetchStats();
  }, [filter]);

  const fetchInventory = async () => {
    try {
      const response = await fetch(`/api/v1/eam/inventory?filter=${filter}`);
      const data = await response.json();
      setInventory(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/eam/inventory/stats');
      const data = await response.json();
      setStats(data.data || stats);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStockStatus = (qty: number, reorder: number) => {
    if (qty === 0) return { label: 'Out', color: 'bg-red-100 text-red-800' };
    if (qty <= reorder) return { label: 'Low', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Good', color: 'bg-green-100 text-green-800' };
  };

  const filteredInventory = inventory.filter((item: any) =>
    item.item_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.item_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-base md:text-3xl font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-8 h-8 text-blue-600" />
          Inventory Management
        </h1>
        <p className="text-xs text-gray-600 mt-0.5">Monitor and manage warehouse stock</p>
      </div>

      {/* Stats Cards - Mobile Responsive */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-base font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600">Low Stock</p>
          <p className="text-base font-semibold text-yellow-600">{stats.lowStock}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
          <p className="text-sm text-gray-600">Out of Stock</p>
          <p className="text-base font-semibold text-red-600">{stats.outOfStock}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Total Value</p>
          <p className="text-base font-semibold text-green-600">${stats.value.toLocaleString()}</p>
        </div>
      </div>

      {/* Search & Filters - Mobile Optimized */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Items</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <button className="px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inventory List - Mobile Cards / Desktop Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInventory.map((item: any) => {
                const status = getStockStatus(item.quantity_on_hand, item.reorder_point);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.item_name}</div>
                      <div className="text-sm text-gray-500">{item.category}</div>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-900">{item.item_code}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.quantity_on_hand} {item.unit_of_measure}</div>
                      <div className="text-xs text-gray-500">Reorder: {item.reorder_point}</div>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-900">{item.location}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredInventory.map((item: any) => {
            const status = getStockStatus(item.quantity_on_hand, item.reorder_point);
            return (
              <div key={item.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.item_name}</h3>
                    <p className="text-sm text-gray-500">{item.item_code}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Quantity</p>
                    <p className="font-medium text-gray-900">{item.quantity_on_hand} {item.unit_of_measure}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="font-medium text-gray-900">{item.location}</p>
                  </div>
                </div>
                <button className="mt-3 w-full py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium">
                  View Details
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
