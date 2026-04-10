'use client';

import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';
import { Wrench, ClipboardList, Calendar, Gauge, Activity, AlertTriangle, FileText, Settings } from 'lucide-react';

export default function MaintenancePage() {
  const { hasPermission } = usePermissions();

  const maintenanceModules = [
    {
      title: 'Work Orders',
      description: 'Manage and track maintenance work orders',
      icon: Wrench,
      href: '/maintenance/work-orders',
      permission: 'work_orders.view',
      color: 'bg-blue-500'
    },
    {
      title: 'Maintenance Requests',
      description: 'Submit and review maintenance requests',
      icon: ClipboardList,
      href: '/maintenance/requests',
      permission: 'maintenance_requests.view',
      color: 'bg-green-500'
    },
    {
      title: 'Dashboard',
      description: 'Maintenance overview and KPIs',
      icon: Activity,
      href: '/maintenance/dashboard',
      permission: 'maintenance.view',
      color: 'bg-indigo-500'
    },
    {
      title: 'Analytics',
      description: 'Performance metrics and insights',
      icon: FileText,
      href: '/maintenance/analytics',
      permission: 'maintenance.view',
      color: 'bg-teal-500'
    },
    {
      title: 'Calibration',
      description: 'Equipment calibration tracking',
      icon: Gauge,
      href: '/maintenance/calibration',
      permission: 'maintenance.view',
      color: 'bg-yellow-500'
    },
    {
      title: 'Risk Assessment',
      description: '5×5 risk matrix analysis',
      icon: AlertTriangle,
      href: '/maintenance/risk-assessment',
      permission: 'maintenance.view',
      color: 'bg-red-500'
    },
    {
      title: 'Tool Maintenance',
      description: 'Tool maintenance schedules',
      icon: Settings,
      href: '/maintenance/tools',
      permission: 'maintenance.view',
      color: 'bg-pink-500'
    },
    {
      title: 'PM Schedules',
      description: 'Preventive maintenance scheduling',
      icon: Calendar,
      href: '/pm-schedules',
      permission: 'pm_schedules.view',
      color: 'bg-purple-500'
    }
  ];

  const availableModules = maintenanceModules.filter(module => hasPermission(module.permission));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance Management</h1>
        <p className="text-gray-600 mt-1">Comprehensive maintenance operations and analytics</p>
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
          <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No maintenance modules available</p>
        </div>
      )}
    </div>
  );
}
