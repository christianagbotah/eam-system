'use client';

import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';
import { Cpu, Activity, Bell, BarChart3, Wifi, AlertCircle } from 'lucide-react';

export default function IoTPage() {
  const { hasPermission } = usePermissions();

  const iotModules = [
    {
      title: 'IoT Devices',
      description: 'Manage connected devices and sensors',
      icon: Cpu,
      href: '/iot/devices',
      permission: 'iot.view',
      color: 'bg-blue-500'
    },
    {
      title: 'Real-time Monitoring',
      description: 'Monitor device data in real-time',
      icon: Activity,
      href: '/iot/monitoring',
      permission: 'iot.view',
      color: 'bg-green-500'
    },
    {
      title: 'Alert Rules',
      description: 'Configure automated alert rules',
      icon: Bell,
      href: '/iot/rules',
      permission: 'iot.view',
      color: 'bg-yellow-500'
    },
    {
      title: 'IoT Analytics',
      description: 'Analyze sensor data and trends',
      icon: BarChart3,
      href: '/analytics',
      permission: 'analytics.view',
      color: 'bg-purple-500'
    },
    {
      title: 'Device Status',
      description: 'View device connectivity status',
      icon: Wifi,
      href: '/iot/devices',
      permission: 'iot.view',
      color: 'bg-indigo-500'
    },
    {
      title: 'Anomaly Detection',
      description: 'AI-powered anomaly detection',
      icon: AlertCircle,
      href: '/admin/predictive',
      permission: 'admin.access',
      color: 'bg-red-500',
      badge: 'Admin'
    }
  ];

  const availableModules = iotModules.filter(module => hasPermission(module.permission));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">IoT Management</h1>
        <p className="text-gray-600 mt-1">Monitor and manage IoT devices and sensor data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.href}
              href={module.href}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="flex items-start space-x-4">
                <div className={`${module.color} p-3 rounded-lg text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {module.title}
                    </h3>
                    {module.badge && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        {module.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{module.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {availableModules.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No IoT modules available</p>
        </div>
      )}
    </div>
  );
}
