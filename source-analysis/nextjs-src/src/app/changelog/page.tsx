'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { GitBranch } from 'lucide-react';

export default function ChangelogPage() {
  const versions = [
    { version: '2.0.0', date: '2024-01-20', changes: ['Complete RBAC migration', 'Permission-based routing', '100 pages migrated', 'Zero role-based URLs'] },
    { version: '1.5.0', date: '2024-01-15', changes: ['Advanced reporting', 'Custom report builder', '48 standard reports', 'Export functionality'] },
    { version: '1.0.0', date: '2024-01-01', changes: ['Initial release', 'Core EAM features', 'IoT integration', 'Real-time analytics'] }
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Changelog</h1>
          <p className="text-gray-600 mt-1">System version history and updates</p>
        </div>

        <div className="space-y-6">
          {versions.map((version) => (
            <div key={version.version} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <GitBranch className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Version {version.version}</h2>
                <span className="text-sm text-gray-600">{version.date}</span>
              </div>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                {version.changes.map((change, index) => (
                  <li key={index}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
