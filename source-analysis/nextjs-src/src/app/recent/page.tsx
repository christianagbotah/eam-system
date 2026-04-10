'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { Clock } from 'lucide-react';

export default function RecentPage() {
  const recent = [
    { id: 1, title: 'Viewed Asset #12345', time: '5 minutes ago', module: 'Assets' },
    { id: 2, title: 'Created Work Order #WO-001', time: '1 hour ago', module: 'Maintenance' },
    { id: 3, title: 'Updated Inventory Item', time: '2 hours ago', module: 'Inventory' },
    { id: 4, title: 'Generated Production Report', time: '3 hours ago', module: 'Reports' },
    { id: 5, title: 'Viewed Safety Incident', time: '5 hours ago', module: 'Safety' }
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Recent Activity</h1>
          <p className="text-gray-600 mt-1">Your recent actions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="divide-y divide-gray-200">
            {recent.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.module}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {item.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
