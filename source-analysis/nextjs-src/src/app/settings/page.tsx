'use client';

import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';
import { Settings, Building2, Users, Shield, Bell, Palette, Database, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { hasPermission } = usePermissions();

  const settingsModules = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      href: '/users',
      permission: 'users.view',
      color: 'bg-green-500'
    },
    {
      title: 'Departments',
      description: 'Manage departments and organization',
      icon: Building2,
      href: '/departments',
      permission: 'departments.view',
      color: 'bg-blue-500'
    },
    {
      title: 'Notification Settings',
      description: 'Configure notification preferences',
      icon: Bell,
      href: '/notifications',
      permission: 'notifications.view',
      color: 'bg-yellow-500'
    },
    {
      title: 'Company Settings',
      description: 'Manage company information (Admin)',
      icon: Building2,
      href: '/admin/company',
      permission: 'admin.access',
      color: 'bg-indigo-500',
      badge: 'Admin'
    },
    {
      title: 'RBAC Settings',
      description: 'Configure roles and permissions (Admin)',
      icon: Shield,
      href: '/admin/rbac',
      permission: 'admin.access',
      color: 'bg-purple-500',
      badge: 'Admin'
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings (Admin)',
      icon: Settings,
      href: '/admin/system',
      permission: 'admin.access',
      color: 'bg-red-500',
      badge: 'Admin'
    },
    {
      title: 'Module Settings',
      description: 'Enable/disable system modules (Admin)',
      icon: Database,
      href: '/admin/module-settings',
      permission: 'admin.access',
      color: 'bg-teal-500',
      badge: 'Admin'
    },
    {
      title: 'Facilities',
      description: 'Manage plants and facilities (Admin)',
      icon: Globe,
      href: '/admin/facilities',
      permission: 'admin.access',
      color: 'bg-pink-500',
      badge: 'Admin'
    }
  ];

  const availableModules = settingsModules.filter(module => hasPermission(module.permission));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage system configuration and preferences</p>
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
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No settings modules available</p>
        </div>
      )}
    </div>
  );
}
