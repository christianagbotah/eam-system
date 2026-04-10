'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Truck, Download, Plus } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/inventory-transfers');
        setTransfers(response.data?.data || []);
      } catch (error) {
        toast.error('Failed to load transfers');
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
            <h1 className="text-3xl font-bold text-gray-900">Stock Transfers</h1>
            <p className="text-gray-600 mt-1">Inter-location transfers</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Transfer
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfer #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : transfers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No transfers found</td></tr>
              ) : (
                transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{transfer.transfer_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{transfer.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{transfer.from_location}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{transfer.to_location}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        transfer.status === 'completed' ? 'bg-green-100 text-green-800' :
                        transfer.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transfer.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
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
