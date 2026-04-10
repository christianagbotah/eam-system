'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { Plug, CheckCircle, XCircle } from 'lucide-react';

export default function IntegrationsPage() {
  const integrations = [
    { id: 1, name: 'ERP System', description: 'Connect to enterprise resource planning', status: 'connected', icon: Plug },
    { id: 2, name: 'IoT Platform', description: 'Real-time sensor data integration', status: 'connected', icon: Plug },
    { id: 3, name: 'Email Service', description: 'SMTP email notifications', status: 'connected', icon: Plug },
    { id: 4, name: 'SMS Gateway', description: 'SMS notification service', status: 'disconnected', icon: Plug },
    { id: 5, name: 'Cloud Storage', description: 'Document backup and storage', status: 'connected', icon: Plug },
    { id: 6, name: 'Analytics Platform', description: 'Advanced analytics and BI', status: 'disconnected', icon: Plug }
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">System Integrations</h1>
          <p className="text-gray-600 mt-1">Manage third-party integrations</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <div key={integration.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{integration.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
                  </div>
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex items-center gap-2">
                  {integration.status === 'connected' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-400">Disconnected</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
