'use client';

import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';
import { Clock, Users, BookOpen, ArrowRightLeft, Calendar, ClipboardList, Gauge, GraduationCap, FileText, CheckSquare } from 'lucide-react';

export default function OperationsPage() {
  const { hasPermission } = usePermissions();

  const operationsModules = [
    {
      title: 'Meter Readings',
      description: 'Track equipment meter readings',
      icon: Gauge,
      href: '/operations/meter-readings',
      permission: 'operations.view',
      color: 'bg-blue-500'
    },
    {
      title: 'Training Records',
      description: 'Employee training and certifications',
      icon: GraduationCap,
      href: '/operations/training-records',
      permission: 'operations.view',
      color: 'bg-purple-500'
    },
    {
      title: 'Production Surveys',
      description: 'Track production efficiency',
      icon: ClipboardList,
      href: '/operations/production-surveys',
      permission: 'operations.view',
      color: 'bg-green-500'
    },
    {
      title: 'Time Logs',
      description: 'Track work time and attendance',
      icon: Clock,
      href: '/operations/time-logs',
      permission: 'operations.view',
      color: 'bg-yellow-500'
    },
    {
      title: 'Shift Handover',
      description: 'Document shift transitions',
      icon: ArrowRightLeft,
      href: '/operations/shift-handover',
      permission: 'operations.view',
      color: 'bg-teal-500'
    },
    {
      title: 'Checklists',
      description: 'Operational checklists',
      icon: CheckSquare,
      href: '/operations/checklists',
      permission: 'operations.view',
      color: 'bg-indigo-500'
    }
  ];

  const availableModules = operationsModules.filter(module => hasPermission(module.permission));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operations Management</h1>
        <p className="text-gray-600 mt-1">Manage daily operations and workforce</p>
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
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        module.badge === 'Coming Soon' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
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
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No operations modules available</p>
        </div>
      )}
    </div>
  );
}
