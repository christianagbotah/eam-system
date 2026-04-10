'use client';

import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';
import { CheckCircle, FileText, AlertTriangle, TrendingUp, Gauge, ClipboardCheck } from 'lucide-react';

export default function QualityPage() {
  const { hasPermission } = usePermissions();

  const qualityModules = [
    {
      title: 'Quality Metrics',
      description: 'View quality KPIs and trends',
      icon: TrendingUp,
      href: '/analytics',
      permission: 'analytics.view',
      color: 'bg-purple-500'
    },
    {
      title: 'Checklists',
      description: 'Quality control checklists',
      icon: ClipboardCheck,
      href: '/checklists',
      permission: 'checklists.view',
      color: 'bg-indigo-500'
    },
    {
      title: 'CAPA Management',
      description: 'Corrective and preventive actions',
      icon: FileText,
      href: '/production-surveys/capa',
      permission: 'capa.view',
      color: 'bg-blue-500'
    },
    {
      title: 'Quality Inspections',
      description: 'Manage quality inspection records (Admin)',
      icon: CheckCircle,
      href: '/admin/quality',
      permission: 'admin.access',
      color: 'bg-green-500',
      badge: 'Admin'
    },
    {
      title: 'Non-Conformance',
      description: 'Track non-conformance reports (Admin)',
      icon: AlertTriangle,
      href: '/admin/quality',
      permission: 'admin.access',
      color: 'bg-red-500',
      badge: 'Admin'
    },
    {
      title: 'Calibration',
      description: 'Equipment calibration tracking (Admin)',
      icon: Gauge,
      href: '/admin/calibration',
      permission: 'admin.access',
      color: 'bg-yellow-500',
      badge: 'Admin'
    }
  ];

  const availableModules = qualityModules.filter(module => hasPermission(module.permission));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quality Management</h1>
        <p className="text-gray-600 mt-1">Ensure product quality and compliance</p>
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
          <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No quality modules available</p>
        </div>
      )}
    </div>
  );
}
