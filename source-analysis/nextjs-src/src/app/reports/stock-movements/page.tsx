'use client';

import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Package, Download } from 'lucide-react';

interface StockMovement {
  id: number;
  part_name: string;
  part_number: string;
  transaction_type: 'issue' | 'receipt' | 'return' | 'adjustment';
  quantity: number;
  work_order_id?: number;
  work_order_title?: string;
  created_at: string;
  created_by: string;
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7');

  useEffect(() => {
    fetchMovements();
  }, [filter, dateRange]);

  const fetchMovements = async () => {
    try {
      const response = await fetch(`/api/v1/eam/stock-movements?type=${filter}&days=${dateRange}`);
      const data = await response.json();
      setMovements(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'issue' ? (
      <ArrowDownCircle className="w-4 h-4 text-red-600" />
    ) : (
      <ArrowUpCircle className="w-4 h-4 text-green-600" />
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-8 h-8 text-blue-600" />
          Stock Movements
        </h1>
        <button className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-300 rounded-md"
        >
          <option value="all">All Types</option>
          <option value="issue">Issues</option>
          <option value="receipt">Receipts</option>
          <option value="return">Returns</option>
        </select>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-300 rounded-md"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Work Order</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">By</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movements.map((movement) => (
              <tr key={movement.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(movement.transaction_type)}
                    <span className="text-sm font-medium capitalize">{movement.transaction_type}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{movement.part_name}</div>
                  <div className="text-sm text-gray-500">{movement.part_number}</div>
                </td>
                <td className="px-3 py-2.5 text-sm font-medium">{movement.quantity}</td>
                <td className="px-3 py-2.5 text-sm text-gray-900">{movement.work_order_title || '-'}</td>
                <td className="px-3 py-2.5 text-sm text-gray-900">
                  {new Date(movement.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2.5 text-sm text-gray-900">{movement.created_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
