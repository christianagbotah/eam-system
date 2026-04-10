'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { Zap, Plus, FileText, Wrench, Package, AlertTriangle } from 'lucide-react';

export default function QuickActionsPage() {
  const actions = [
    { id: 1, title: 'Create Work Order', description: 'New maintenance work order', icon: Plus, color: 'bg-blue-500' },
    { id: 2, title: 'Report Incident', description: 'Safety incident report', icon: AlertTriangle, color: 'bg-red-500' },
    { id: 3, title: 'Request Material', description: 'Inventory requisition', icon: Package, color: 'bg-green-500' },
    { id: 4, title: 'Log Meter Reading', description: 'Equipment meter reading', icon: Wrench, color: 'bg-purple-500' },
    { id: 5, title: 'Generate Report', description: 'Quick report generation', icon: FileText, color: 'bg-yellow-500' },
    { id: 6, title: 'Create Asset', description: 'Add new asset', icon: Plus, color: 'bg-indigo-500' }
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Quick Actions</h1>
          <p className="text-gray-600 mt-1">Frequently used actions</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <div key={action.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className={`${action.color} p-3 rounded-lg text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
