'use client';

import { useState } from 'react';
import Link from 'next/link';

interface WorkOrder {
  id: number;
  pm_order_number?: string;
  description: string;
  priority: string;
  status: string;
  work_type: string;
}

interface WorkOrderKanbanProps {
  workOrders: WorkOrder[];
  onStatusChange?: (id: number, newStatus: string) => void;
}

export default function WorkOrderKanban({ workOrders, onStatusChange }: WorkOrderKanbanProps) {
  const columns = [
    { id: 'open', title: 'Open', color: 'bg-gray-100' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
    { id: 'completed', title: 'Completed', color: 'bg-green-100' }
  ];

  const getWorkOrdersByStatus = (status: string) => {
    return workOrders.filter(wo => wo.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map(column => (
        <div key={column.id} className="bg-white rounded-lg shadow p-4">
          <div className={`${column.color} rounded px-3 py-2 mb-4`}>
            <h3 className="font-bold">{column.title}</h3>
            <span className="text-sm text-gray-600">{getWorkOrdersByStatus(column.id).length} items</span>
          </div>
          <div className="space-y-3">
            {getWorkOrdersByStatus(column.id).map(wo => (
              <Link key={wo.id} href={`/admin/work-orders/${wo.id}`}>
                <div className="border rounded p-3 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm">{wo.pm_order_number || `WO-${wo.id}`}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      wo.priority === 'high' ? 'bg-red-100 text-red-800' :
                      wo.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{wo.priority}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{wo.description}</p>
                  <span className="text-xs text-gray-500">{wo.work_type}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
