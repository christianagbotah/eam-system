'use client';

import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';
import { FileText, Upload, FolderOpen, Search, Archive, FileCheck } from 'lucide-react';

export default function DocumentsPage() {
  const { hasPermission } = usePermissions();

  const documentModules = [
    {
      title: 'Reports',
      description: 'Generated reports',
      icon: FileText,
      href: '/reports',
      permission: 'reports.view',
      color: 'bg-teal-500'
    },
    {
      title: 'All Documents',
      description: 'Browse all documents (Admin)',
      icon: FolderOpen,
      href: '/admin/documents',
      permission: 'admin.access',
      color: 'bg-blue-500',
      badge: 'Admin'
    },
    {
      title: 'Upload Documents',
      description: 'Upload new documents (Admin)',
      icon: Upload,
      href: '/admin/documents',
      permission: 'admin.access',
      color: 'bg-green-500',
      badge: 'Admin'
    },
    {
      title: 'Search Documents',
      description: 'Search document library (Admin)',
      icon: Search,
      href: '/admin/documents',
      permission: 'admin.access',
      color: 'bg-purple-500',
      badge: 'Admin'
    },
    {
      title: 'Document Archive',
      description: 'Archived documents (Admin)',
      icon: Archive,
      href: '/admin/documents',
      permission: 'admin.access',
      color: 'bg-yellow-500',
      badge: 'Admin'
    },
    {
      title: 'Procedures',
      description: 'Standard operating procedures (Admin)',
      icon: FileCheck,
      href: '/admin/documents',
      permission: 'admin.access',
      color: 'bg-indigo-500',
      badge: 'Admin'
    }
  ];

  const availableModules = documentModules.filter(module => hasPermission(module.permission));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
        <p className="text-gray-600 mt-1">Manage and organize documents</p>
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
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No document modules available</p>
        </div>
      )}
    </div>
  );
}
