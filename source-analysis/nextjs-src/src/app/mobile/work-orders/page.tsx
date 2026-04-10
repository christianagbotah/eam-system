'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface WorkOrder {
  id: number;
  title: string;
  priority: string;
  status: string;
  asset_name: string;
  due_date: string;
}

export default function MobileWorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filter, setFilter] = useState('assigned');
  const router = useRouter();

  useEffect(() => {
    fetchWorkOrders();
  }, [filter]);

  const fetchWorkOrders = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/eam/work-orders?status=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      setWorkOrders(data.data || []);
    } catch (error) {
      console.error('Failed to fetch work orders');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-base font-semibold">Work Orders</h1>
      
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['assigned', 'open', 'in_progress', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${filter === status ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {status.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {workOrders.map(wo => (
          <div key={wo.id} onClick={() => router.push(`/mobile/work-orders/${wo.id}`)} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{wo.title}</h3>
              <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(wo.priority)}`}>
                {wo.priority}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Asset: {wo.asset_name}</p>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Due: {formatDate(wo.due_date)}</span>
              <span className="px-2 py-1 bg-gray-100 rounded">{wo.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
