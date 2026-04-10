'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Edit, Download, Plus } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/inventory-adjustments');
        setAdjustments(response.data?.data || []);
      } catch (error) {
        toast.error('Failed to load adjustments');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Adjustments</h1>
            <p className="text-gray-600 mt-1">Manage inventory adjustments</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Adjustment
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adjustment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : adjustments.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No adjustments found</td></tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{adj.date}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{adj.item_name}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{adj.adjustment}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{adj.reason}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{adj.adjusted_by}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
